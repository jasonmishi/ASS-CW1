const jwt = require('jsonwebtoken')
const authModel = require('../models/auth.model')
const prisma = require('../lib/prisma')
const { hashToken } = require('../utils/security')
const { parseCookies } = require('../utils/cookies')

const getSecret = () => {
  return process.env.JWT_SECRET || 'dev-insecure-jwt-secret'
}

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }

  return authorizationHeader.slice(7)
}

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'

const authenticateJwt = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ACCESS_TOKEN_COOKIE_NAME]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    })
  }

  return jwt.verify(token, getSecret(), (verificationError, payload) => {
    if (verificationError) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      })
    }

    const tokenHash = hashToken(token)

    return authModel.isAuthSessionActive(tokenHash).then((isSessionActive) => {
      if (!isSessionActive) {
        return res.status(401).json({
          success: false,
          message: 'Session is invalid or expired. Please log in again.'
        })
      }

      req.user = {
        user_id: payload.sub,
        email: payload.email,
        role: payload.role,
        token,
        tokenHash
      }

      return next()
    }, next)
  })
}

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin access is required.'
    })
  }

  return next()
}

const requireSponsorOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'sponsor' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Sponsor or Admin access is required.'
    })
  }

  return next()
}

const requireSponsor = (req, res, next) => {
  if (!req.user || req.user.role !== 'sponsor') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Sponsor access is required.'
    })
  }

  return next()
}

const requireAlumni = (req, res, next) => {
  if (!req.user || req.user.role !== 'alumni') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Alumni access is required.'
    })
  }

  return next()
}

const requireAdminOrAlumni = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'alumni')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin or Alumni access is required.'
    })
  }

  return next()
}

const authenticateApiClient = async (req, res, next) => {
  const token = getBearerToken(req.headers.authorization)

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Valid API client bearer token is required.'
    })
  }

  const tokenHash = hashToken(token)

  const tokenRecord = await prisma.apiClientToken.findFirst({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } }
      ],
      client: {
        is_revoked: false
      }
    },
    include: {
      client: true
    }
  })

  if (!tokenRecord) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Valid API client bearer token is required.'
    })
  }

  req.apiClient = {
    client_id: tokenRecord.client_id,
    client_name: tokenRecord.client.client_name,
    token_id: tokenRecord.token_id
  }

  return next()
}

const recordApiClientUsage = (req, _res, next) => {
  if (!req.apiClient?.token_id) {
    return next()
  }

  const endpoint = req.originalUrl.split('?')[0]
  const httpMethod = req.method.toUpperCase()
  const now = new Date()
  const usageDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const nextDay = new Date(usageDate)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  void (async () => {
    const existing = await prisma.apiClientEndpointUsage.findFirst({
      where: {
        token_id: req.apiClient.token_id,
        endpoint,
        http_method: httpMethod,
        usage_date: {
          gte: usageDate,
          lt: nextDay
        }
      },
      select: {
        usage_id: true
      }
    })

    if (existing) {
      await prisma.apiClientEndpointUsage.update({
        where: {
          usage_id: existing.usage_id
        },
        data: {
          request_count: {
            increment: 1
          },
          last_accessed_at: now
        }
      })

      return
    }

    await prisma.apiClientEndpointUsage.create({
      data: {
        token_id: req.apiClient.token_id,
        endpoint,
        http_method: httpMethod,
        usage_date: usageDate,
        request_count: 1,
        last_accessed_at: now
      }
    })
  })().catch(() => {})

  return next()
}

module.exports = {
  authenticateApiClient,
  authenticateJwt,
  recordApiClientUsage,
  requireAdmin,
  requireAdminOrAlumni,
  requireAlumni,
  requireSponsor,
  requireSponsorOrAdmin
}
