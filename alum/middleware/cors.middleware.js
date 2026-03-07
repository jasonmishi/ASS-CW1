const cors = require('cors')

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
]

const parseAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS

  if (!raw || !raw.trim()) {
    return new Set(DEFAULT_DEV_ORIGINS)
  }

  return new Set(
    raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
}

const buildCorsMiddleware = () => {
  const allowedOrigins = parseAllowedOrigins()

  return cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      return callback(null, false)
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token'],
    credentials: false,
    optionsSuccessStatus: 204
  })
}

module.exports = {
  buildCorsMiddleware
}
