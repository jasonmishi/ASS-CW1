const { PrismaClient } = require('@prisma/client')
const path = require('node:path')

// this function detects we are using jest through JEST_WORKER_ID
// prevents using prod for running integration tests by mistake
const ensureJestDatabaseUrl = () => {
  if (process.env.DATABASE_URL || !process.env.JEST_WORKER_ID) {
    return
  }

  const envTestPath = path.resolve(__dirname, '..', '.env.test')

  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envTestPath)
  }
}

ensureJestDatabaseUrl()

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/alum'

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
})

prisma.databaseUrl = databaseUrl

module.exports = prisma
