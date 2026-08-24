import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  handleWaitlistRequest,
  IOS_WAITLIST_PATH,
  parseWaitlistPayload,
  submitWaitlist,
} from './iosWaitlist';

describe('parseWaitlistPayload', () => {
  it('normalises a valid email and ignores extra fields', () => {
    expect(parseWaitlistPayload({ email: '  Grey@HollowMile.com ' })).toEqual({
      kind: 'ok',
      payload: { email: 'grey@hollowmile.com' },
    });
    expect(parseWaitlistPayload({ email: 'a@b.co', extra: true })).toEqual({
      kind: 'ok',
      payload: { email: 'a@b.co' },
    });
  });

  it('treats a filled honeypot as spam without storing a verdict email', () => {
    expect(
      parseWaitlistPayload({ email: 'grey@hollowmile.com', website: 'https://spam.test' }),
    ).toEqual({ kind: 'spam' });
  });

  it('rejects missing and malformed emails', () => {
    expect(parseWaitlistPayload(null).kind).toBe('invalid');
    expect(parseWaitlistPayload({ email: '' }).kind).toBe('invalid');
    expect(parseWaitlistPayload({ email: 'not-an-email' }).kind).toBe('invalid');
    expect(parseWaitlistPayload({ email: 'a@b' }).kind).toBe('invalid');
  });
});

describe('handleWaitlistRequest', () => {
  it('stores a valid email and returns 204', async () => {
    const recorded: string[] = [];
    const response = await handleWaitlistRequest(jsonRequest({ email: 'grey@hollowmile.com' }), {
      async addEmail(email) {
        recorded.push(email);
      },
    });

    expect(response.status).toBe(204);
    expect(recorded).toEqual(['grey@hollowmile.com']);
  });

  it('returns 204 for spam and duplicate-looking success without storing spam', async () => {
    const recorded: string[] = [];
    const store = {
      async addEmail(email: string) {
        recorded.push(email);
      },
    };

    const spam = await handleWaitlistRequest(
      jsonRequest({ email: 'grey@hollowmile.com', website: 'bot' }),
      store,
    );
    expect(spam.status).toBe(204);
    expect(recorded).toEqual([]);
  });

  it('rejects the wrong path, method, and invalid bodies', async () => {
    const store = {
      addEmail: vi.fn(async () => {}),
    };

    expect(
      (
        await handleWaitlistRequest(
          new Request('https://hollowmile.com/api/other', { method: 'POST' }),
          store,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleWaitlistRequest(
          new Request(`https://hollowmile.com${IOS_WAITLIST_PATH}`, { method: 'GET' }),
          store,
        )
      ).status,
    ).toBe(405);
    expect((await handleWaitlistRequest(jsonRequest({ email: 'nope' }), store)).status).toBe(400);
    const oversized = new Request(`https://hollowmile.com${IOS_WAITLIST_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${'a'.repeat(500)}@b.co` }),
    });
    expect((await handleWaitlistRequest(oversized, store)).status).toBe(413);
    expect(store.addEmail).not.toHaveBeenCalled();
  });
});

describe('submitWaitlist', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a normalised email and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitWaitlist('  Grey@HollowMile.com ')).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith(IOS_WAITLIST_PATH, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'grey@hollowmile.com' }),
    });
  });

  it('returns invalid without posting a bad address', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(submitWaitlist('nope')).resolves.toBe('invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown): Request {
  return new Request(`https://hollowmile.com${IOS_WAITLIST_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
