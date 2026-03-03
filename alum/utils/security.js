const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const UNIVERSITY_DOMAIN = 'eastminster.ac.uk'

const isUniversityEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false
  }

  return email.toLowerCase().endsWith(`@${UNIVERSITY_DOMAIN}`)
}

const isStrongPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return false
  }

  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
  return strongPasswordPattern.test(password)
}

const hashPassword = async (password) => {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12)
  return bcrypt.hash(password, saltRounds)
}

const comparePassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash)
}

const generateSecureToken = (size = 32) => {
  return crypto.randomBytes(size).toString('hex')
}

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

module.exports = {
  UNIVERSITY_DOMAIN,
  comparePassword,
  generateSecureToken,
  hashPassword,
  hashToken,
  isStrongPassword,
  isUniversityEmail
}
