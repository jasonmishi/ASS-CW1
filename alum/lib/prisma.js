const { PrismaClient } = require('@prisma/client')

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/alum'

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
})

module.exports = prisma
