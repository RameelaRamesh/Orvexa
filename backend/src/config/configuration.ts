export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:vattara%40123@localhost:5432/orvexa_db?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'orvexa-super-secret-jwt-key-2026',
    jwtExpiration: process.env.JWT_EXPIRATION || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'orvexa-super-secret-refresh-key-2026',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TCr9Me1AydiZMF',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'uPUkfk9gWbTOaewirN8KHI0T',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_orvexa_test_12345',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || 'dummy_r2_account',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy_r2_access_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy_r2_secret_key',
    bucketName: process.env.R2_BUCKET_NAME || 'orvexa-storage',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://assets.orvexa.io',
  },
});
