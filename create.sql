CREATE TABLE tanka(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanka TEXT NOT NULL,
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  comment TEXT,
  supplement TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);

CREATE TABLE tanka_reaction(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanka_id INTEGER NOT NULL,
  ip TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (tanka_id) REFERENCES tanka(id)
);

-- LEFT JOIN ON tanka_id AND reaction = 'plusone' 用
CREATE INDEX idx_tanka_reaction_tanka_reaction ON tanka_reaction(tanka_id, reaction);

-- WHERE deleted_at IS NULL 用
CREATE INDEX idx_tanka_deleted_at ON tanka(deleted_at);

-- SELECT count(*) WHERE tanka_id = ? AND ip = ? 用
CREATE INDEX idx_tanka_reaction_tanka_ip ON tanka_reaction(tanka_id, ip);
