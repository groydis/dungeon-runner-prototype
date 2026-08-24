export const IOS_WAITLIST_PATH = '/api/waitlist';
const MAX_PAYLOAD_BYTES = 512;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface WaitlistPayload {
  readonly email: string;
}

export interface WaitlistStore {
  addEmail(email: string): Promise<void>;
}

export type WaitlistParseResult =
  | { readonly kind: 'ok'; readonly payload: WaitlistPayload }
  | { readonly kind: 'spam' }
  | { readonly kind: 'invalid' };

export function parseWaitlistPayload(input: unknown): WaitlistParseResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { kind: 'invalid' };
  }
  if ('website' in input) {
    const website = input.website;
    if (typeof website === 'string' && website.trim() !== '') {
      return { kind: 'spam' };
    }
  }
  if (!('email' in input) || typeof input.email !== 'string') {
    return { kind: 'invalid' };
  }
  const email = input.email.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { kind: 'invalid' };
  }
  return { kind: 'ok', payload: { email } };
}

export async function handleWaitlistRequest(
  request: Request,
  store: WaitlistStore,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== IOS_WAITLIST_PATH) {
    return new Response('Not found', { status: 404 });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseWaitlistPayload(body);
  if (parsed.kind === 'invalid') {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }
  if (parsed.kind === 'ok') {
    await store.addEmail(parsed.payload.email);
  }
  return new Response(null, { status: 204 });
}

export async function submitWaitlist(
  email: string,
  website = '',
): Promise<'ok' | 'invalid' | 'error'> {
  const parsed = parseWaitlistPayload({ email, website });
  if (parsed.kind === 'invalid') {
    return 'invalid';
  }
  try {
    const response = await fetch(IOS_WAITLIST_PATH, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        parsed.kind === 'spam' ? { email: email.trim(), website } : parsed.payload,
      ),
    });
    if (response.status === 204) {
      return 'ok';
    }
    if (response.status === 400) {
      return 'invalid';
    }
    return 'error';
  } catch {
    return 'error';
  }
}
