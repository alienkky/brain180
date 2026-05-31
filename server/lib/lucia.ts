// Lucia v3 session manager — owner: ALI-67 방연동[MCP].
// Custom Drizzle adapter (no @lucia-auth/adapter-drizzle dep) reading
// users + sessions tables landed by ALI-62.
//
// Session cookie: SESSION_COOKIE_NAME (default b180_session)
// TTL: SESSION_TTL_HOURS (default 720 = 30 days)

import { Lucia, TimeSpan } from "lucia";
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";
import { eq, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { loadEnv } from "./env.js";

export interface AppDatabaseUserAttributes {
  email: string;
  name: string;
  role: "student" | "admin";
}

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: AppDatabaseUserAttributes;
  }
}

const drizzleAdapter: Adapter = {
  async getSessionAndUser(
    sessionId: string,
  ): Promise<[DatabaseSession | null, DatabaseUser | null]> {
    const rows = await db
      .select({
        sessionId: sessions.id,
        sessionUserId: sessions.userId,
        sessionExpiresAt: sessions.expiresAt,
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    const row = rows[0];
    if (!row) return [null, null];

    const session: DatabaseSession = {
      id: row.sessionId,
      userId: row.sessionUserId as UserId,
      expiresAt: row.sessionExpiresAt,
      attributes: {},
    };
    const user: DatabaseUser = {
      id: row.userId as UserId,
      attributes: {
        email: row.email,
        name: row.name,
        role: row.role,
      },
    };
    return [session, user];
  },

  async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const rows = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId as string));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId as UserId,
      expiresAt: r.expiresAt,
      attributes: {},
    }));
  },

  async setSession(session: DatabaseSession): Promise<void> {
    await db.insert(sessions).values({
      id: session.id,
      userId: session.userId as string,
      expiresAt: session.expiresAt,
    });
  },

  async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date,
  ): Promise<void> {
    await db
      .update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.id, sessionId));
  },

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  },

  async deleteUserSessions(userId: UserId): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId as string));
  },

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  },
};

const env = loadEnv();

export const lucia = new Lucia(drizzleAdapter, {
  sessionExpiresIn: new TimeSpan(env.SESSION_TTL_HOURS, "h"),
  sessionCookie: {
    name: env.SESSION_COOKIE_NAME,
    expires: false,
    attributes: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  getUserAttributes: (attr) => ({
    email: attr.email,
    name: attr.name,
    role: attr.role,
  }),
});

export type AppLucia = typeof lucia;
