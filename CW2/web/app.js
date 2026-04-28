const express = require('express')
const helmet = require('helmet')
const path = require('node:path')
const webRoutes = require('./routes/web.routes')

const port = Number(process.env.PORT || 3000)
const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL || ''

const resolveApiOrigin = () => {
  if (!publicApiBaseUrl) {
    return null
  }

  try {
    return new URL(publicApiBaseUrl).origin
  } catch (_error) {
    return null
  }
}

const apiOrigin = resolveApiOrigin()

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      connectSrc: apiOrigin ? ["'self'", apiOrigin] : ["'self'"]
    }
  }
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use('/assets', express.static(path.join(__dirname, 'public')))
app.get('/assets/runtime-config.js', (_req, res) => {
  const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || ''
  res.type('application/javascript')
  res.send(`window.__CW2_CONFIG__ = { apiBaseUrl: ${JSON.stringify(apiBaseUrl)} }`)
})
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')))
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')))
app.use('/vendor/jspdf', express.static(path.join(__dirname, 'node_modules', 'jspdf', 'dist')))

app.get('/', (_req, res) => {
  res.redirect('/login')
})

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use(webRoutes)

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Web app listening on port ${port}`)
  })
}

module.exports = app
