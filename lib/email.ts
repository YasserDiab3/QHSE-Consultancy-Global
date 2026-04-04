import nodemailer from 'nodemailer'

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
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
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })

  return { sent: true as const }
}
