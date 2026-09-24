export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT ?? '3000'}`,

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',

  upload: {
    driver: process.env.UPLOAD_DRIVER || 'local',
    dest: process.env.UPLOAD_DEST || './uploads',
  },
});
