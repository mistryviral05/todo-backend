import type { FastifyPluginAsync } from 'fastify';
import { MongoServerError } from 'mongodb';
import { hashPassword, requireAuth, verifyPassword } from '../auth.js';
import { users } from '../db.js';

interface Credentials {
  username: string;
  password: string;
}

const credentialsSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 50 },
      password: { type: 'string', minLength: 6, maxLength: 100 },
    },
  },
} as const;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: Credentials }>('/register', { schema: credentialsSchema }, async (request, reply) => {
    const { username, password } = request.body;
    try {
      const { insertedId } = await users().insertOne({
        username,
        passwordHash: await hashPassword(password),
        createdAt: new Date(),
      });
      request.session.userId = insertedId.toHexString();
      request.session.username = username;
      return reply.code(201).send({ id: insertedId, username });
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        return reply.code(409).send({ error: 'Username already taken' });
      }
      throw err;
    }
  });

  app.post<{ Body: Credentials }>('/login', { schema: credentialsSchema }, async (request, reply) => {
    const { username, password } = request.body;
    const user = await users().findOne({ username });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password' });
    }
    await request.session.regenerate();
    request.session.userId = user._id.toHexString();
    request.session.username = user.username;
    return { id: user._id, username: user.username };
  });

  app.post('/logout', async (request, reply) => {
    await request.session.destroy();
    return reply.send({ ok: true });
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return { id: request.session.userId, username: request.session.username };
  });
};
