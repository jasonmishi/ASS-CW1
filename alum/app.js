const express = require('express')
const helmet = require('helmet')
const fs = require('node:fs')
const path = require('node:path')
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')
const prisma = require('./lib/prisma')
const { buildCorsMiddleware } = require('./middleware/cors.middleware')
const { csrfProtection } = require('./middleware/csrf.middleware')
const { applyRateLimitTrustProxy, buildApiRateLimiter } = require('./middleware/rate-limit.middleware')
const { ensureFirstAdmin } = require('./lib/bootstrap-admin')
const roleModel = require('./models/role.model')
const userRoutes = require('./routes/user.routes')
const authRoutes = require('./routes/auth.routes')
const clientRoutes = require('./routes/client.routes')
const adminRoutes = require('./routes/admin.routes')
const profileRoutes = require('./routes/profile.routes')
const sponsorshipRoutes = require('./routes/sponsorship.routes')
const biddingRoutes = require('./routes/bidding.routes')
const publicRoutes = require('./routes/public.routes')

const swaggerFilePath = path.resolve(__dirname, 'swagger.yaml')

if (!fs.existsSync(swaggerFilePath)) {
  throw new Error('swagger.yaml not found at alum/swagger.yaml')
}

const swaggerDocument = YAML.load(swaggerFilePath)
const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'csrf_token'
const apiRateLimiter = buildApiRateLimiter()

const app = express()
applyRateLimitTrustProxy(app)
app.use(helmet())
app.use(buildCorsMiddleware())
app.use(express.json())
app.use(csrfProtection)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/assets', express.static(path.join(__dirname, 'public')))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customJs: '/assets/swagger-custom.js',
  customJsStr: `window.__CSRF_COOKIE_NAME__ = ${JSON.stringify(csrfCookieName)};`,
  swaggerOptions: {
    persistAuthorization: true,
    withCredentials: true
  }
}))

app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerDocument)
})

const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World! (nodemon reload check)')
})

app.use('/api/v1', apiRateLimiter)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1', authRoutes)
app.use('/api/v1', clientRoutes)
app.use('/api/v1', adminRoutes)
app.use('/api/v1', profileRoutes)
app.use('/api/v1', sponsorshipRoutes)
app.use('/api/v1', biddingRoutes)
app.use('/api/v1', publicRoutes)

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
