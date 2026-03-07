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

const formatDate = (dateInput) => {
  const date = new Date(dateInput)
  return date.toISOString().slice(0, 10)
}

const sendWinnerNotificationEmail = async ({ to, firstName, featuredDate, winningBidAmount }) => {
  const displayName = firstName || 'Alumni'
  const dateLabel = formatDate(featuredDate)
  const amountLabel = Number(winningBidAmount).toFixed(2)

  return sendMail({
    to,
    subject: `You won Alumni of the Day for ${dateLabel}`,
    text: `Hi ${displayName}, congratulations. You won Alumni of the Day for ${dateLabel} with a bid of £${amountLabel}.`,
    html: `<p>Hi ${displayName},</p><p>Congratulations. You won Alumni of the Day for <strong>${dateLabel}</strong> with a bid of <strong>£${amountLabel}</strong>.</p>`
  })
}

const sendLosingBidNotificationEmail = async ({ to, firstName, featuredDate }) => {
  const displayName = firstName || 'Alumni'
  const dateLabel = formatDate(featuredDate)

  return sendMail({
    to,
    subject: `Alumni of the Day result for ${dateLabel}`,
    text: `Hi ${displayName}, the bidding result for ${dateLabel} is now available. Your bid was not selected this time.`,
    html: `<p>Hi ${displayName},</p><p>The bidding result for <strong>${dateLabel}</strong> is now available. Your bid was not selected this time.</p>`
  })
}

const sendOutbidNotificationEmail = async ({ to, firstName, bidDate }) => {
  const displayName = firstName || 'Alumni'
  const dateLabel = formatDate(bidDate)

  return sendMail({
    to,
    subject: `You have been outbid for ${dateLabel}`,
    text: `Hi ${displayName}, your bid for ${dateLabel} is no longer leading. You can increase your bid before bidding closes.`,
    html: `<p>Hi ${displayName},</p><p>Your bid for <strong>${dateLabel}</strong> is no longer leading. You can increase your bid before bidding closes.</p>`
  })
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWinnerNotificationEmail,
  sendLosingBidNotificationEmail,
  sendOutbidNotificationEmail
}
