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
