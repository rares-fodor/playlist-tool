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

db.exec(`CREATE TABLE IF NOT EXISTS user_playlist_targets (
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id),
  UNIQUE(user_id, source_id)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS user_track_groups (
  user_id TEXT NOT NULL,
  playlist_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  track_uri TEXT NOT NULL,
  occurrence INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id),
  UNIQUE(user_id, playlist_id, track_uri, occurrence)
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
      stmt.run(userId, playlistId, numericVisibility)
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

export interface TrackGroupMember {
  uri: string;
  // Which occurrence of the URI in the playlist's Spotify order (playlists may hold duplicates)
  occurrence: number;
}

export interface TrackGroup {
  id: string;
  members: TrackGroupMember[];   // In group order
}

interface DatabaseTrackGroupRow {
  group_id: string;
  track_uri: string;
  occurrence: number;
}

export function getUserTrackGroups(userId: string, playlistId: string): TrackGroup[] {
  const stmt = db.prepare(`
    SELECT group_id, track_uri, occurrence FROM user_track_groups
    WHERE user_id = ? AND playlist_id = ?
    ORDER BY group_id, position
  `);
  const rows = stmt.all(userId, playlistId) as DatabaseTrackGroupRow[];

  const result = new Map<string, TrackGroup>();
  for (const row of rows) {
    let group = result.get(row.group_id);
    if (!group) {
      group = { id: row.group_id, members: [] };
      result.set(row.group_id, group);
    }
    group.members.push({ uri: row.track_uri, occurrence: row.occurrence });
  }

  return [...result.values()];
}

// Replaces every saved group of the playlist
export function setUserTrackGroups(userId: string, playlistId: string, groups: TrackGroup[]) {
  const deleteStmt = db.prepare(`DELETE FROM user_track_groups WHERE user_id = ? AND playlist_id = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO user_track_groups (user_id, playlist_id, group_id, position, track_uri, occurrence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const replaceAll = db.transaction(() => {
    deleteStmt.run(userId, playlistId);
    for (const group of groups) {
      group.members.forEach((member, position) => {
        insertStmt.run(userId, playlistId, group.id, position, member.uri, member.occurrence);
      });
    }
  });

  replaceAll();
}
