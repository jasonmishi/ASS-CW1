const jwt = require('jsonwebtoken')
const { generateSecureToken } = require('./security')

const getSecret = () => {
  return process.env.JWT_SECRET || 'dev-insecure-jwt-secret'
}

const getExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '1h'
}

const signUserToken = (user) => {
  const token = jwt.sign(
    {
      sub: user.user_id,
      email: user.email,
      role: user.role ? user.role.name : undefined
    },
    getSecret(),
    {
      expiresIn: getExpiresIn(),
      jwtid: generateSecureToken(12)
    }
  )

  const decoded = jwt.decode(token)

  return {
    token,
    expiresAt: new Date(decoded.exp * 1000),
    expiresIn: decoded.exp - decoded.iat
  }
}

const verifyToken = (token) => {
  return jwt.verify(token, getSecret())
}

module.exports = {
  signUserToken,
  verifyToken
}
