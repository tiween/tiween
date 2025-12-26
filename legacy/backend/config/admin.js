module.exports = ({ env }) => ({
  apiToken: {
    salt: env('API_TOKEN_SALT', 'iA%S24NYOV!9Duj85kQ*Uf6$vB^F@p8Q')
  },
  auth: {
    secret: env('ADMIN_JWT_SECRET', '9da900d0ec18cc351fb25f3ff1464a12'),
  },
  watchIgnoreFiles: [
    '**/config/sync/**',
  ],
});

