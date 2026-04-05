const nodemailer = require('nodemailer')

const EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT || 'smtp'

const createTransporter = () => {
  if (EMAIL_TRANSPORT === 'log') {
    return nodemailer.createTransport({ jsonTransport: true })
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true'
  })
}

const transporter = createTransporter()

const sendMail = async ({ to, subject, text, html }) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@eastminster.local',
    to,
    subject,
    text,
    html
  })

  if (EMAIL_TRANSPORT === 'log') {
    console.log('[email_preview]', info.message)
  }

  return info
}

module.exports = {
  sendMail
}
