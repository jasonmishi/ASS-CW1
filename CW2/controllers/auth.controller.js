const authModel = require('../models/auth.model')
const { generateCsrfToken } = require('../utils/csrf')

const EMAIL_VERIFICATION_TTL_HOURS = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24)
const PASSWORD_RESET_TTL_HOURS = Number(process.env.PASSWORD_RESET_TTL_HOURS || 1)
const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token'

const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.ACCESS_TOKEN_COOKIE_SAMESITE || 'lax',
  path: '/'
})

const getCsrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.CSRF_COOKIE_SAMESITE || 'lax',
  path: '/'
})

const register = async (req, res) => {
  const result = await authModel.registerUserWithVerification({
    ...req.body,
    emailVerificationTtlHours: EMAIL_VERIFICATION_TTL_HOURS
  })

  if (!result.ok && result.reason === 'duplicate') {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.'
    })
  }

  if (!result.ok && result.reason === 'role_config') {
    return res.status(500).json({
      success: false,
      message: 'Role configuration error.'
    })
  }

  const { user } = result

  return res.status(201).json({
    success: true,
    message: 'Please check your email to complete registration.',
    data: {
      id: user.user_id,
      email: user.email,
      role: 'Alumni',
      firstName: user.first_name,
      lastName: user.last_name
    }
  })
}

const verifyEmail = async (req, res) => {
  const { token } = req.params
  const verified = await authModel.verifyEmailByToken(token)

  if (!verified) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token. Please request a new one.'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.'
  })
}

const createEmailVerification = async (req, res) => {
  const { email } = req.body

  const result = await authModel.issueEmailVerification({
    email,
    emailVerificationTtlHours: EMAIL_VERIFICATION_TTL_HOURS
  })

  if (!result.ok && result.reason === 'already_verified') {
    return res.status(409).json({
      success: false,
      message: 'Email is already verified.'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Verification email has been sent. Please check your inbox.'
  })
}

const createCsrfToken = (_req, res) => {
  const token = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions())

  return res.status(200).json({
    success: true,
    message: 'CSRF token issued.',
    data: {
      csrfToken: token
    }
  })
}

const createSession = async (req, res) => {
  const result = await authModel.createSessionForCredentials(req.body)

  if (!result.ok && result.reason === 'invalid_credentials') {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    })
  }

  if (!result.ok && result.reason === 'email_not_verified') {
    return res.status(401).json({
      success: false,
      message: 'Email not verified. Please verify your email before logging in.'
    })
  }

  const { signedToken, user } = result

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, signedToken.token, getAccessTokenCookieOptions())
  res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), getCsrfCookieOptions())

  return res.status(201).json({
    success: true,
    message: 'Login successful.',
    data: {
      token: signedToken.token,
      expiresIn: signedToken.expiresIn,
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    }
  })
}

const deleteSession = async (req, res) => {
  await authModel.revokeAuthSession(req.user.tokenHash)
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getAccessTokenCookieOptions())
  res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieOptions())
  return res.status(204).send()
}

const getSessionSummary = async (req, res) => {
  const summary = await authModel.getSessionSummaryByUserId(req.user.user_id)

  return res.status(200).json({
    success: true,
    data: summary
  })
}

const createPasswordReset = async (req, res) => {
  await authModel.createPasswordResetRequest({
    email: req.body.email,
    passwordResetTtlHours: PASSWORD_RESET_TTL_HOURS
  })

  return res.status(201).json({
    success: true,
    message: 'If an account with that email exists, a password reset token has been sent.'
  })
}

const completePasswordReset = async (req, res) => {
  const { token, newPassword } = req.body

  const completed = await authModel.completePasswordResetByToken({ token, newPassword })

  if (!completed) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token.'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Password has been reset successfully. Please log in with your new password.'
  })
}

module.exports = {
  completePasswordReset,
  createCsrfToken,
  createEmailVerification,
  createPasswordReset,
  getSessionSummary,
  createSession,
  deleteSession,
  register,
  verifyEmail
}
