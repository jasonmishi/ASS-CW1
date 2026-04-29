const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex === -1) {
        return cookies
      }

      const key = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()
      cookies[key] = decodeURIComponent(value)
      return cookies
    }, {})
}

const getSecret = () => {
  return process.env.JWT_SECRET || 'dev-insecure-jwt-secret'
}

const getInternalApiBaseUrl = () => {
  return process.env.INTERNAL_API_BASE_URL || 'http://127.0.0.1:3000'
}

const resolveSessionUser = async (req) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ACCESS_TOKEN_COOKIE_NAME]

  if (!token) {
    return null
  }

  let payload

  try {
    payload = jwt.verify(token, getSecret())
  } catch (_error) {
    return null
  }

  const response = await fetch(`${getInternalApiBaseUrl()}/api/v1/auth/sessions/summary`, {
    headers: {
      Cookie: req.headers.cookie || ''
    }
  })

  if (!response.ok) {
    return null
  }

  return {
    user_id: payload.sub,
    email: payload.email,
    role: payload.role,
    token
  }
}

const authenticateViewSession = async (req, res, next) => {
  try {
    const user = await resolveSessionUser(req)

    if (!user) {
      return res.redirect('/login')
    }

    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

const authenticateSessionApi = async (req, res, next) => {
  try {
    const user = await resolveSessionUser(req)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      })
    }

    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  authenticateSessionApi,
  authenticateViewSession
}
