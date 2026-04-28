const request = require('supertest')
const app = require('../../app')
const { generateCsrfToken } = require('../../utils/csrf')

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token'

const api = () => {
  const client = request(app)
  const csrfToken = generateCsrfToken()
  const csrfCookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`

  return {
    delete: (url) => client.delete(url).set('Cookie', csrfCookie).set('X-CSRF-Token', csrfToken),
    get: (url) => client.get(url),
    options: (url) => client.options(url),
    patch: (url) => client.patch(url).set('Cookie', csrfCookie).set('X-CSRF-Token', csrfToken),
    post: (url) => client.post(url).set('Cookie', csrfCookie).set('X-CSRF-Token', csrfToken),
    put: (url) => client.put(url).set('Cookie', csrfCookie).set('X-CSRF-Token', csrfToken)
  }
}

const authHeader = (token) => {
  const csrfToken = generateCsrfToken()

  return {
    Authorization: `Bearer ${token}`,
    Cookie: [
      `${ACCESS_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}`,
      `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`
    ],
    'X-CSRF-Token': csrfToken
  }
}

const combinedAuthHeader = (sessionToken, apiClientToken) => {
  const csrfToken = generateCsrfToken()

  return {
    Authorization: `Bearer ${apiClientToken}`,
    Cookie: [
      `${ACCESS_TOKEN_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
      `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`
    ],
    'X-CSRF-Token': csrfToken
  }
}

module.exports = {
  api,
  authHeader,
  combinedAuthHeader
}
