const express = require('express')
const helmet = require('helmet')
const prisma = require('./lib/prisma')
const { ensureFirstAdmin } = require('./lib/bootstrap-admin')
const roleModel = require('./models/role.model')
const userRoutes = require('./routes/user.routes')
const authRoutes = require('./routes/auth.routes')
const clientRoutes = require('./routes/client.routes')
const adminRoutes = require('./routes/admin.routes')
const profileRoutes = require('./routes/profile.routes')

const app = express()
app.use(helmet())
app.use(express.json())

const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World! (nodemon reload check)')
})

app.use('/api/v1/users', userRoutes)
app.use('/api/v1', authRoutes)
app.use('/api/v1', clientRoutes)
app.use('/api/v1', adminRoutes)
app.use('/api/v1', profileRoutes)

app.get('/db-check', async (req, res) => {
  const result = await prisma.$queryRaw`SELECT 1 AS ok`
  res.json({ ok: true, result: result[0] })
})

const bootstrap = async () => {
  await roleModel.ensureDefaultRoles()
  await ensureFirstAdmin()

  return app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}

if (require.main === module) {
  bootstrap()
}

module.exports = app
