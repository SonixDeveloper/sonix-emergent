CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  banner TEXT NOT NULL DEFAULT '',
  banner_source TEXT NOT NULL DEFAULT '',
  banner_position INTEGER NOT NULL DEFAULT 50,
  banner_horizontal INTEGER NOT NULL DEFAULT 50,
  banner_zoom REAL NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'red',
  language TEXT NOT NULL DEFAULT 'en',
  presence TEXT NOT NULL DEFAULT 'online',
  status_text TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  owner TEXT REFERENCES accounts(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  channels TEXT NOT NULL DEFAULT '[]',
  icon TEXT NOT NULL DEFAULT '',
  banner TEXT NOT NULL DEFAULT '',
  banner_source TEXT NOT NULL DEFAULT '',
  banner_position INTEGER NOT NULL DEFAULT 50,
  banner_horizontal INTEGER NOT NULL DEFAULT 50,
  banner_zoom REAL NOT NULL DEFAULT 1,
  protected INTEGER NOT NULL DEFAULT 0,
  group_chat INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  account TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY(space, account)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  author TEXT NOT NULL REFERENCES accounts(id),
  body TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_space_channel ON messages(space, channel, id);
CREATE TABLE IF NOT EXISTS friendships (
  sender TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  accepted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(sender, recipient)
);
CREATE TABLE IF NOT EXISTS space_invites (
  code TEXT PRIMARY KEY,
  space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  author TEXT NOT NULL REFERENCES accounts(id),
  question TEXT NOT NULL,
  choices TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS votes (
  poll INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  account TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  choice INTEGER NOT NULL,
  PRIMARY KEY(poll, account)
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO spaces(id, owner, name, description, channels, created_at) VALUES
('overdrive', NULL, 'Sonix Official Server', 'A home for creators, gamers, and everyone in between.', '["general","announcements","introductions","off-topic","clips","game-night"]', 0),
('sonix-developers', NULL, 'Sonix Developers', 'Build apps, bots, and integrations with the Sonix community.', '["general","announcements","app-development","bot-development","feedback"]', 0);
