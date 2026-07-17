import nodemailer from 'nodemailer'

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    tls: {
      rejectUnauthorized: true,
    },
    auth: {
      user,
      pass,
    },
  }
}

export async function sendNotificationEmail(input: SendEmailInput) {
  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    console.warn('SMTP is not configured. Skipping email notification.')
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const }
  }

  const transporter = nodemailer.createTransport(smtpConfig)
  const from = sanitizeHeader(process.env.SMTP_FROM || process.env.SMTP_USER || '')
  const to = sanitizeHeader(input.to)
  const subject = sanitizeHeader(input.subject)

  if (!from || !to || !subject) {
    throw new Error('Invalid email notification headers')
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text: input.text,
    html: input.html,
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  return { sent: true as const }
}
