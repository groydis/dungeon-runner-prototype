export const RUN_DEATH_TELEMETRY_PATH = '/api/telemetry/deaths';
export const MIN_PLAYER_LEVEL = 1;
export const MAX_PLAYER_LEVEL = 99;
const MAX_PAYLOAD_BYTES = 256;

export interface RunDeathPayload {
  readonly level: number;
}

export interface RunDeathStore {
  recordPlayerLevel(level: number): Promise<void>;
}

/** Anonymous run-end telemetry. Accepts only an integer player level. */
export function parseRunDeathPayload(input: unknown): RunDeathPayload | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  if (!('level' in input)) {
    return null;
  }
  const level = input.level;
  if (
    typeof level !== 'number' ||
    !Number.isInteger(level) ||
    level < MIN_PLAYER_LEVEL ||
    level > MAX_PLAYER_LEVEL
  ) {
    return null;
  }
  return { level };
}

export async function handleRunDeathRequest(
  request: Request,
  store: RunDeathStore,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== RUN_DEATH_TELEMETRY_PATH) {
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

  const payload = parseRunDeathPayload(body);
  if (!payload) {
    return Response.json({ error: 'Invalid telemetry' }, { status: 400 });
  }

  await store.recordPlayerLevel(payload.level);
  return new Response(null, { status: 204 });
}

/** Fire-and-forget. Local Vite has no Worker, so failures are ignored. */
export function reportRunDeath(level: number): void {
  const payload = parseRunDeathPayload({ level });
  if (!payload) {
    return;
  }
  void fetch(RUN_DEATH_TELEMETRY_PATH, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
