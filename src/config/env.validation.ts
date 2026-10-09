import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'local', 'dev')
    .default('development'),
  PORT: Joi.number().default(3001),
  SWAGGER_PATH: Joi.string().default('docs'),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5433),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  DATABASE_URL: Joi.string().optional(),
  TYPEORM_SYNC: Joi.boolean().truthy('true').falsy('false').default(false), // prefer migration:run
  TYPEORM_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_URL: Joi.string().optional(),
  SESSION_TTL_SECONDS: Joi.number().default(3600),

  FIREBASE_AUTH_MODE: Joi.string().valid('mock', 'firebase').default('mock'),
  FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().allow('').optional(),
  FIREBASE_API_KEY: Joi.string().allow('').optional(),
  FIREBASE_AUTH_EMULATOR_HOST: Joi.string().allow('').optional(),

  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  THROTTLE_AUTH_TTL: Joi.number().default(60000),
  THROTTLE_AUTH_LIMIT: Joi.number().default(10),
  LOGIN_MAX_ATTEMPTS: Joi.number().default(5),
  LOGIN_LOCK_MINUTES: Joi.number().default(15),

  FRONTEND_RESET_URL: Joi.string().default(
    'http://localhost:3000/reset-password',
  ),
  PASSWORD_RESET_TTL: Joi.number().default(3600),
  MAIL_FROM: Joi.string().default('noreply@tradie.dev'),

  SEED_ADMIN_EMAIL: Joi.string().email().default('admin@tradie.dev'),
  SEED_ADMIN_PASSWORD: Joi.string().default('Admin123!'),
  SEED_ADMIN_NAME: Joi.string().default('Tradie Admin'),
});
