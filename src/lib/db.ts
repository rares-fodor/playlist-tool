import Database from "better-sqlite3";

export const db = new Database("app.db");

db.exec(`CREATE TABLE IF NOT EXISTS user (
  id TEXT NOT NULL PRIMARY KEY,
  username TEXT NOT NULL,
  spotify_id TEXT NOT NULL UNIQUE
)`);

db.exec(`CREATE TABLE IF NOT EXISTS session (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS user_hidden_playlists (
  user_id TEXT NOT NULL,
  playlist_id TEXT NOT NULL,
  isVisible INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id),
  UNIQUE(user_id, playlist_id)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS user_playlist_targets (
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id),
  UNIQUE(user_id, source_id)
)`)

export interface DatabaseUserAttributes {
  id: string;             // Local identifier, not the spotify user_id
  username: string;       // Spotify username
  spotify_id: string;
}

export interface DatabaseSessionAttributes {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
}

export interface DatabaseUserHiddenPlaylist {
  user_id: string;
  playlist_id: string;
  visibility: number;
}

interface DatabasePlaylistTarget {
  source_id: string;
  target_id: string;
}

type PlaylistVisibility = Omit<DatabaseUserHiddenPlaylist, 'user_id'>;
export function getUserPlaylistVisibility(userId: string): Map<string, boolean> {
  const stmt = db.prepare(`SELECT playlist_id, visibility FROM user_hidden_playlists WHERE user_id = ?`);
  const rows = stmt.all(userId) as PlaylistVisibility[];

  const result = new Map<string, boolean>() 
  for (const row of rows) {
    const booleanVis = row.visibility === 0 ? false : true;
    result.set(row.playlist_id, booleanVis);
  }

  return result;
}

export function toggleUserPlaylistVisibility(userId: string, playlistIds: string[]) {
  const selectStmt = db.prepare(
    `SELECT visibility FROM user_hidden_playlists WHERE user_id = ? AND playlist_id = ?`
  );
  const updateStmt = db.prepare(
    `UPDATE user_hidden_playlists SET visibility = ? WHERE user_id = ? AND playlist_id = ?`
  );

  const toggleMany = db.transaction((userId: string, playlistIds: string[]) => {
    for (const playlistId of playlistIds) {
      const row = selectStmt.get(userId, playlistId) as PlaylistVisibility;
      // Toggle visibility
      const newVisibility = row.visibility ? 0 : 1;
      updateStmt.run(newVisibility, userId, playlistId);
    }
  });

  toggleMany(userId, playlistIds);
}

export function setUserPlaylistVisibility(userId: string, playlistIds: string[], isVisible: boolean) {
  let numericVisibility: number = isVisible ? 1 : 0;
  const stmt = db.prepare(
    `INSERT INTO user_hidden_playlists (user_id, playlist_id, visibility)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id, playlist_id)
     DO UPDATE SET visibility = excluded.visibility`
  );

  const insertMany = db.transaction((userId: string, playlistIds: string[]) => {
    for (const playlistId of playlistIds) {
      const info = stmt.run(userId, playlistId, numericVisibility)
      console.log(info)
    }
  })

  insertMany(userId, playlistIds);
}

export function getUserPlaylistTargets(userId: string): Map<string, string> {
  const stmt = db.prepare(`SELECT source_id, target_id FROM user_playlist_targets WHERE user_id = ?`);
  const rows = stmt.all(userId) as DatabasePlaylistTarget[];

  const result = new Map<string, string>() 
  for (const row of rows) {
    result.set(row.source_id, row.target_id);
  }

  return result;
}

export function setUserPlaylistTarget(userId: string, sourceId: string, targetId: string) {
  const stmt = db.prepare(`
    INSERT INTO user_playlist_targets (user_id, source_id, target_id)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, source_id) DO UPDATE SET target_id = excluded.target_id
  `);

  stmt.run(userId, sourceId, targetId);
}
