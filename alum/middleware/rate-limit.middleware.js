const rateLimit = require('express-rate-limit')
const prisma = require('../lib/prisma')
const { hashToken } = require('../utils/security')
const { parseCookies } = require('../utils/cookies')

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100)
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false'
const RATE_LIMIT_TRUST_PROXY = process.env.RATE_LIMIT_TRUST_PROXY === 'true'

const getWindowStart = (now, windowMs) => {
  const bucket = Math.floor(now.getTime() / windowMs) * windowMs
  return new Date(bucket)
}

class PrismaRateLimitStore {
  constructor({ windowMs }) {
    this.windowMs = windowMs
    this.localKeys = false
  }

  init(options) {
    this.windowMs = options.windowMs
  }

  async increment(key) {
    const now = new Date()
    const windowStart = getWindowStart(now, this.windowMs)
    const expiresAt = new Date(windowStart.getTime() + this.windowMs)

    const counter = await prisma.rateLimitCounter.upsert({
      where: {
        key_window_start: {
          key,
          window_start: windowStart
        }
      },
      create: {
        key,
        window_start: windowStart,
        request_count: 1,
        expires_at: expiresAt
      },
      update: {
        request_count: {
          increment: 1
        },
        expires_at: expiresAt
      }
    })

    return {
      totalHits: counter.request_count,
      resetTime: expiresAt
    }
  }

  async decrement(key) {
    const now = new Date()
    const windowStart = getWindowStart(now, this.windowMs)

    await prisma.rateLimitCounter.updateMany({
      where: {
        key,
        window_start: windowStart,
        request_count: {
          gt: 0
        }
      },
      data: {
        request_count: {
          decrement: 1
        }
      }
    })
  }

  async resetKey(key) {
    await prisma.rateLimitCounter.deleteMany({
      where: {
        key
      }
    })
  }

  async resetAll() {
    await prisma.rateLimitCounter.deleteMany({})
  }
}

const getApiClientKey = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.slice(7).trim()

  if (!token) {
    return null
  }

  return `api-client:${hashToken(token)}`
}

const getSessionKey = (cookieHeader) => {
  const cookies = parseCookies(cookieHeader)
  const token = cookies[ACCESS_TOKEN_COOKIE_NAME]

  if (!token) {
    return null
  }

  return `session:${hashToken(token)}`
}

const keyGenerator = (req) => {
  if (req.path.startsWith('/public/')) {
    const apiClientKey = getApiClientKey(req.headers.authorization)

    if (apiClientKey) {
      return apiClientKey
    }
  }

  const sessionKey = getSessionKey(req.headers.cookie)

  if (sessionKey) {
    return sessionKey
  }

  return req.ip || req.socket?.remoteAddress || 'unknown'
}

const buildApiRateLimiter = () => {
  if (!RATE_LIMIT_ENABLED) {
    return (_req, _res, next) => next()
  }

  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PrismaRateLimitStore({
      windowMs: RATE_LIMIT_WINDOW_MS
    }),
    keyGenerator,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      })
    }
  })
}

const applyRateLimitTrustProxy = (app) => {
  if (RATE_LIMIT_TRUST_PROXY) {
    app.set('trust proxy', 1)
  }
}

module.exports = {
  applyRateLimitTrustProxy,
  buildApiRateLimiter
}
