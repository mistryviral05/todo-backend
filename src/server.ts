import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { config } from './config.js';
import { client, connectDb } from './db.js';
import { MongoSessionStore } from './session-store.js';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todos.js';

const app = Fastify({ logger: true, trustProxy: true });

await app.register(fastifyCors, {
  origin: config.corsOrigin,
  credentials: true, // allow the session cookie cross-origin
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(fastifyCookie);
await app.register(fastifySession, {
  secret: config.sessionSecret,
  cookieName: 'sid',
  store: new MongoSessionStore(),
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // https → Secure + SameSite=None (works when frontend is on another domain)
    // http  → plugin falls back to SameSite=Lax, not Secure (local testing)
    secure: 'auto',
    sameSite: 'none',
    maxAge: config.sessionMaxAgeMs,
  },
});

app.get('/', async () => ({ name: 'fastify-todo', status: 'ok' }));
app.get('/health', async () => {
  await client.db(config.dbName).command({ ping: 1 });
  return { status: 'ok', db: 'up' };
});

await app.register(authRoutes, { prefix: '/auth' });
await app.register(todoRoutes, { prefix: '/todos' });

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await client.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await connectDb();
  app.log.info('Connected to MongoDB');
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
