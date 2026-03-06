const jwt = require('jsonwebtoken')
const authModel = require('../models/auth.model')
const { hashToken } = require('../utils/security')

const getSecret = () => {
  return process.env.JWT_SECRET || 'dev-insecure-jwt-secret'
}

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }

  return authorizationHeader.slice(7)
}

const authenticateJwt = (req, res, next) => {
  const token = getBearerToken(req.headers.authorization)

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

module.exports = {
  authenticateJwt,
  requireAdmin,
  requireAdminOrAlumni,
  requireAlumni,
  requireSponsor,
  requireSponsorOrAdmin
}
