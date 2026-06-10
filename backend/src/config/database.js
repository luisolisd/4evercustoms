const { PrismaClient } = require('@prisma/client');
const { nodeEnv } = require('./index');

const prisma = new PrismaClient({
  log: nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
