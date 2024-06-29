import { Lucia } from "lucia";
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { db } from "./db";
import { dev } from "$app/environment";
import { Spotify } from "arctic";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from "$env/static/private";

import type { DatabaseSessionAttributes, DatabaseUserAttributes } from "./db";

export const spotify_auth = new Spotify(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);


const adapter = new BetterSqlite3Adapter(db, {
  user: "user",
  session: "session",
});

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev,
    }
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      spotify_id: attributes.spotify_id,
    };
  },
  getSessionAttributes: (attributes) => {
    return {
      access_token: attributes.access_token,
      refresh_token: attributes.refresh_token,
      access_token_expires_at: attributes.access_token_expires_at,
    };
  }
});


declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<DatabaseUserAttributes, "id">;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}

