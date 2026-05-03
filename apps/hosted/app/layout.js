import './globals.css'

export const metadata = {
  title: 'Flowdown Hosted',
  description: 'Hosted billing and dashboard for Flowdown.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
