import type { SessionStore } from '@fastify/session';
import type { Session } from 'fastify';
import { config } from './config.js';
import { sessions } from './db.js';

// Minimal MongoDB-backed store for @fastify/session using the native driver.
export class MongoSessionStore implements SessionStore {
  set(sessionId: string, session: Session, callback: (err?: unknown) => void): void {
    const plain = JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
    const expires = session.cookie?.expires;
    const expiresAt = expires ? new Date(expires) : new Date(Date.now() + config.sessionMaxAgeMs);

    sessions()
      .updateOne({ _id: sessionId }, { $set: { session: plain, expiresAt } }, { upsert: true })
      .then(() => callback())
      .catch(callback);
  }

  get(sessionId: string, callback: (err: unknown, result?: Session | null) => void): void {
    sessions()
      .findOne({ _id: sessionId, expiresAt: { $gt: new Date() } })
      .then((doc) => callback(null, (doc?.session as unknown as Session) ?? null))
      .catch((err) => callback(err));
  }

  destroy(sessionId: string, callback: (err?: unknown) => void): void {
    sessions()
      .deleteOne({ _id: sessionId })
      .then(() => callback())
      .catch(callback);
  }
}
