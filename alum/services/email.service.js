const { sendMail } = require('../lib/mailer')

const getBaseUrl = () => {
  return process.env.APP_BASE_URL || 'http://localhost:3000'
}

const sendVerificationEmail = async ({ to, token }) => {
  const verifyUrl = `${getBaseUrl()}/api/v1/auth/verify-email/${encodeURIComponent(token)}`

  return sendMail({
    to,
    subject: 'Verify your Eastminster Alumni account',
    text: `Please verify your email by visiting: ${verifyUrl}`,
    html: `<p>Please verify your email by visiting <a href="${verifyUrl}">${verifyUrl}</a></p>`
  })
}

const sendPasswordResetEmail = async ({ to, token }) => {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`

  return sendMail({
    to,
    subject: 'Reset your Eastminster Alumni password',
    text: `You can reset your password by visiting: ${resetUrl}`,
    html: `<p>You can reset your password by visiting <a href="${resetUrl}">${resetUrl}</a></p>`
  })
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail
}
