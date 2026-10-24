import dns from 'node:dns';
import { MongoClient, type Db, type ObjectId } from 'mongodb';
import { config } from './config.js';

// mongodb+srv needs SRV DNS lookups; some local/system resolvers refuse them
// (querySrv ECONNREFUSED), so use public DNS servers.
dns.setServers(['1.1.1.1', '8.8.8.8']);

export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Todo {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id: string;
  session: Record<string, unknown>;
  expiresAt: Date;
}

export const client = new MongoClient(config.mongoUri);
export let db: Db;

export async function connectDb(): Promise<Db> {
  await client.connect();
  db = client.db(config.dbName);

  await Promise.all([
    db.collection<User>('users').createIndex({ username: 1 }, { unique: true }),
    db.collection<Todo>('todos').createIndex({ userId: 1, createdAt: -1 }),
    // MongoDB auto-deletes expired sessions
    db.collection<SessionDoc>('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);

  return db;
}

export const users = () => db.collection<User>('users');
export const todos = () => db.collection<Todo>('todos');
export const sessions = () => db.collection<SessionDoc>('sessions');
