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
  visibility INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id),
  UNIQUE(user_id, playlist_id)
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

export function setUserPlaylistVisibility(userId: string, playlistIds: string[], visibility: boolean) {
  let numericVisibility: number = visibility ? 1 : 0;
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
