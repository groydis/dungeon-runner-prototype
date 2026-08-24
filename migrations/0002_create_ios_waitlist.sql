-- iOS launch waitlist. Email is the only identifier stored.
CREATE TABLE ios_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
