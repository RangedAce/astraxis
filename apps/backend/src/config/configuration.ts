export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'astraxis-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'astraxis-refresh',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? '7d'
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    bullPrefix: process.env.BULLMQ_PREFIX ?? 'astraxis'
  },
  adminToken: process.env.ADMIN_TOKEN ?? ''
});
