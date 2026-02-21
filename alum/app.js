const express = require('express')
const helmet = require('helmet')
const { PrismaClient } = require('@prisma/client')
const userRoutes = require('./routes/user.routes')
const app = express()
app.use(helmet())
app.use(express.json())

const port = 3000

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/alum'
const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
})

app.get('/', (req, res) => {
  res.send('Hello World! (nodemon reload check)')
})

app.use('/api/v1/users', userRoutes)

app.get('/db-check', async (req, res) => {
  try {
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT 1 AS ok`
    res.json({ ok: true, result: result[0] })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  } finally {
    await prisma.$disconnect()
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
