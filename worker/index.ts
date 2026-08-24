import {
  handleRunDeathRequest,
  type RunDeathStore,
} from '../src/telemetry/runDeath';

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

export default {
  async fetch(request, env): Promise<Response> {
    return handleRunDeathRequest(request, d1DeathStore(env.DB));
  },
} satisfies ExportedHandler<Env>;
