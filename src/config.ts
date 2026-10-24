// All config is hardcoded on purpose (hosting platform has no env var support yet).
// TEST ONLY — delete the Atlas cluster / rotate the password once done.

export const config = {
  port: 3001,
  host: '0.0.0.0',

  // 👉 Paste your MongoDB Atlas connection string here
  // Atlas → Database → Connect → Drivers → copy the "mongodb+srv://..." string
  // and replace <db_password> with your database user's password.
  mongoUri: 'mongodb+srv://mistryviral0504_db_user:iSiIcpm7TP5zzAcf@todo.1qjlurl.mongodb.net/?retryWrites=true&w=majority&appName=todo',
  dbName: 'fastify_todo',

  // Frontend URLs allowed to call this API with cookies (no trailing slash).
  // Set to `true` to allow ANY origin (fine for a throwaway test).
  corsOrigin: true as true | string[],
  // e.g. corsOrigin: ['http://localhost:5173', 'https://my-frontend.example.com'],

  // Must be at least 32 characters. Any random string is fine.
  sessionSecret: 'change-me-this-is-a-test-secret-at-least-32-chars-long',
  sessionMaxAgeMs: 1000 * 60 * 60 * 24, // 1 day
} as const;
