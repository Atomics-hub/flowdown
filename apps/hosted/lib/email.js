export async function sendLoginLink(email, loginUrl) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LOGIN_FROM_EMAIL

  if (!apiKey || !from) {
    return {
      sent: false,
      devLink: process.env.NODE_ENV === 'production' ? '' : loginUrl,
      skipped: true,
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Flowdown login link',
      html: `<p>Use this link to open your Flowdown dashboard:</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>This link expires in 15 minutes.</p>`,
      text: `Use this link to open your Flowdown dashboard:\n\n${loginUrl}\n\nThis link expires in 15 minutes.`,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Could not send login email: ${message}`)
  }

  return { sent: true, devLink: '', skipped: false }
}
