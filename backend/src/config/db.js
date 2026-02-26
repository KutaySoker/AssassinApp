const { PrismaClient } = require('@prisma/client');

// Global değişken kontrolü (Hot-reload sırasında defalarca bağlantı açmasın diye)
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;