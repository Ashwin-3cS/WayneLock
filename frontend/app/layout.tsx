import React from "react"
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Polyfills } from "./polyfills"
import { Providers } from "./providers"

const instrumentSans = localFont({
  src: [
    { path: '../public/fonts/instrument-sans/InstrumentSans-400.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/instrument-sans/InstrumentSans-500.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/instrument-sans/InstrumentSans-600.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/instrument-sans/InstrumentSans-700.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-instrument',
  display: 'swap',
})

const instrumentSerif = localFont({
  src: '../public/fonts/instrument-serif/InstrumentSerif-400.ttf',
  weight: '400',
  style: 'normal',
  variable: '--font-instrument-serif',
  display: 'swap',
})

const jetbrainsMono = localFont({
  src: [
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-100.ttf', weight: '100', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-200.ttf', weight: '200', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-300.ttf', weight: '300', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-400.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-500.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-600.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-700.ttf', weight: '700', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono/JetBrainsMono-800.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WayneLock - Decentralized Password Vault',
  description: 'Self-custodial password vault with multi-layer crypto, IPFS/Filecoin storage, Lit Protocol key management, and guardian recovery on FVM. No central servers, no single point of trust.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Polyfills />
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
