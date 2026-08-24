-- Anonymous run-end telemetry. No user identifiers, IPs, or cookies.
CREATE TABLE run_deaths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_level INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_run_deaths_player_level ON run_deaths (player_level);
