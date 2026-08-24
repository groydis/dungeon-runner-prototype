import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  handleRunDeathRequest,
  parseRunDeathPayload,
  reportRunDeath,
  RUN_DEATH_TELEMETRY_PATH,
} from './runDeath';

describe('parseRunDeathPayload', () => {
  it('accepts an integer player level and ignores extra fields', () => {
    expect(parseRunDeathPayload({ level: 1 })).toEqual({ level: 1 });
    expect(parseRunDeathPayload({ level: 6, classId: 'rogue' })).toEqual({
      level: 6,
    });
    expect(parseRunDeathPayload({ level: 99 })).toEqual({ level: 99 });
  });

  it('rejects missing, non-integer, and out-of-range levels', () => {
    expect(parseRunDeathPayload(null)).toBeNull();
    expect(parseRunDeathPayload([])).toBeNull();
    expect(parseRunDeathPayload({ level: '3' })).toBeNull();
    expect(parseRunDeathPayload({ level: 3.5 })).toBeNull();
    expect(parseRunDeathPayload({ level: 0 })).toBeNull();
    expect(parseRunDeathPayload({ level: 100 })).toBeNull();
    expect(parseRunDeathPayload({ playerLevel: 4 })).toBeNull();
  });
});

describe('handleRunDeathRequest', () => {
  it('records a valid death and returns 204', async () => {
    const recorded: number[] = [];
    const response = await handleRunDeathRequest(
      jsonRequest({ level: 4 }),
      {
        async recordPlayerLevel(level) {
          recorded.push(level);
        },
      },
    );

    expect(response.status).toBe(204);
    expect(recorded).toEqual([4]);
  });

  it('rejects the wrong path, method, and invalid bodies', async () => {
    const store = {
      recordPlayerLevel: vi.fn(async () => {}),
    };

    expect(
      (
        await handleRunDeathRequest(
          new Request('https://hollowmile.com/api/other', { method: 'POST' }),
          store,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleRunDeathRequest(
          new Request(`https://hollowmile.com${RUN_DEATH_TELEMETRY_PATH}`, {
            method: 'GET',
          }),
          store,
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await handleRunDeathRequest(
          new Request(`https://hollowmile.com${RUN_DEATH_TELEMETRY_PATH}`, {
            method: 'POST',
            body: '{',
          }),
          store,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleRunDeathRequest(jsonRequest({ level: 0 }), store)).status,
    ).toBe(400);
    expect(
      (
        await handleRunDeathRequest(
          new Request(`https://hollowmile.com${RUN_DEATH_TELEMETRY_PATH}`, {
            method: 'POST',
            body: 'x'.repeat(300),
          }),
          store,
        )
      ).status,
    ).toBe(413);
    expect(store.recordPlayerLevel).not.toHaveBeenCalled();
  });
});

describe('reportRunDeath', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts only the integer level and omits credentials', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    reportRunDeath(5);
    reportRunDeath(1.5);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(RUN_DEATH_TELEMETRY_PATH, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 5 }),
      keepalive: true,
    });
  });
});

function jsonRequest(body: unknown): Request {
  return new Request(`https://hollowmile.com${RUN_DEATH_TELEMETRY_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
