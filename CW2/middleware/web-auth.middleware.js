const jwt = require('jsonwebtoken')
const authModel = require('../models/auth.model')
const { hashToken } = require('../utils/security')
const { parseCookies } = require('../utils/cookies')

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'

const getSecret = () => {
  return process.env.JWT_SECRET || 'dev-insecure-jwt-secret'
}

const redirectToLogin = (res) => {
  return res.redirect('/login')
}

const authenticateViewSession = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ACCESS_TOKEN_COOKIE_NAME]

  if (!token) {
    return redirectToLogin(res)
  }

  return jwt.verify(token, getSecret(), (verificationError, payload) => {
    if (verificationError) {
      return redirectToLogin(res)
    }

    const tokenHash = hashToken(token)

    return authModel.isAuthSessionActive(tokenHash).then((isSessionActive) => {
      if (!isSessionActive) {
        return redirectToLogin(res)
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

module.exports = {
  authenticateViewSession
}
