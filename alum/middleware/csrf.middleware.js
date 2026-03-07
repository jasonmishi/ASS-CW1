const { generateCsrfToken, verifyCsrfToken } = require('../utils/csrf')
const { parseCookies } = require('../utils/cookies')

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_EXEMPT_MUTATING_ROUTES = new Set([
  'POST /api/v1/auth/sessions'
])

const isMutatingMethod = (method) => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
}

const getCookieOptions = () => {
  const secure = process.env.NODE_ENV === 'production'
  const sameSite = process.env.CSRF_COOKIE_SAMESITE || 'lax'

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/'
  }
}

const ensureCsrfCookie = (req, res) => {
  const cookies = parseCookies(req.headers.cookie)
  const existingToken = cookies[CSRF_COOKIE_NAME]

  if (existingToken && verifyCsrfToken(existingToken)) {
    return existingToken
  }

  const freshToken = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, freshToken, getCookieOptions())
  return freshToken
}

const csrfProtection = (req, res, next) => {
  const method = (req.method || '').toUpperCase()
  const routeKey = `${method} ${req.path}`

  if (!isMutatingMethod(method)) {
    ensureCsrfCookie(req, res)
    return next()
  }

  if (CSRF_EXEMPT_MUTATING_ROUTES.has(routeKey)) {
    return next()
  }

  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.'
    })
  }

  if (!verifyCsrfToken(cookieToken)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.'
    })
  }

  return next()
}

module.exports = {
  csrfProtection,
  CSRF_COOKIE_NAME
}
