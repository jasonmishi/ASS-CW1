const express = require('express')
const helmet = require('helmet')
const { Client } = require('pg')
const app = express()
app.use(helmet())

const port = 3000

const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/alum'
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/db-check', async (req, res) => {
  const client = new Client(dbConfig)
  try {
    await client.connect()
    const result = await client.query('SELECT 1 AS ok')
    res.json({ ok: true, result: result.rows[0] })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  } finally {
    await client.end().catch(() => {})
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
