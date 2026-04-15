const crypto = require('node:crypto')

const DEFAULT_CSRF_SECRET = 'dev-insecure-csrf-secret'

const getCsrfSecret = () => {
  return process.env.CSRF_SECRET || DEFAULT_CSRF_SECRET
}

const signNonce = (nonce) => {
  return crypto
    .createHmac('sha256', getCsrfSecret())
    .update(nonce)
    .digest('hex')
}

const generateCsrfToken = () => {
  const nonce = crypto.randomBytes(24).toString('hex')
  const signature = signNonce(nonce)
  return `${nonce}.${signature}`
}

const verifyCsrfToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false
  }

  const [nonce, signature] = token.split('.')

  if (!nonce || !signature) {
    return false
  }

  const expectedSignature = signNonce(nonce)

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )
  } catch {
    return false
  }
}

module.exports = {
  generateCsrfToken,
  verifyCsrfToken
}
