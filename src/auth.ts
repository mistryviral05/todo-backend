import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyReply, FastifyRequest } from 'fastify';

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

declare module 'fastify' {
  interface Session {
    userId?: string;
    username?: string;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const hash = await scrypt(password, salt, 64);
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

// preHandler hook: rejects requests without a logged-in session
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.session.userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
