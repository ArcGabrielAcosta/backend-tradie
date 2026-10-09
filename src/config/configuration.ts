export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    name: process.env.POSTGRES_DB,
    synchronize: process.env.TYPEORM_SYNC === 'true', // default false — use migrations
    logging: process.env.TYPEORM_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    url: process.env.REDIS_URL,
    sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '3600', 10),
  },
  firebase: {
    mode: (process.env.FIREBASE_AUTH_MODE ?? 'mock') as 'mock' | 'firebase',
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '',
    apiKey: process.env.FIREBASE_API_KEY ?? '',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    authTtl: parseInt(process.env.THROTTLE_AUTH_TTL ?? '60000', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
  },
  security: {
    loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? '5', 10),
    loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES ?? '15', 10),
  },
  mail: {
    from: process.env.MAIL_FROM ?? 'noreply@tradie.dev',
    frontendResetUrl:
      process.env.FRONTEND_RESET_URL ??
      'http://localhost:3000/reset-password',
    passwordResetTtl: parseInt(process.env.PASSWORD_RESET_TTL ?? '3600', 10),
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@tradie.dev',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    adminName: process.env.SEED_ADMIN_NAME ?? 'Tradie Admin',
  },
});
