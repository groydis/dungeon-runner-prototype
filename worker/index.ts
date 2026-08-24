import {
  handleRunDeathRequest,
  RUN_DEATH_TELEMETRY_PATH,
  type RunDeathStore,
} from '../src/telemetry/runDeath';
import {
  handleWaitlistRequest,
  IOS_WAITLIST_PATH,
  type WaitlistStore,
} from '../src/waitlist/iosWaitlist';

function d1DeathStore(db: D1Database): RunDeathStore {
  return {
    async recordPlayerLevel(level) {
      await db
        .prepare('INSERT INTO run_deaths (player_level) VALUES (?)')
        .bind(level)
        .run();
    },
  };
}

function d1WaitlistStore(db: D1Database): WaitlistStore {
  return {
    async addEmail(email) {
      await db
        .prepare('INSERT OR IGNORE INTO ios_waitlist (email) VALUES (?)')
        .bind(email)
        .run();
    },
  };
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === RUN_DEATH_TELEMETRY_PATH) {
      return handleRunDeathRequest(request, d1DeathStore(env.DB));
    }
    if (pathname === IOS_WAITLIST_PATH) {
      return handleWaitlistRequest(request, d1WaitlistStore(env.DB));
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
