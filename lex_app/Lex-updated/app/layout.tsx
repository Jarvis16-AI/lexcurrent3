import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LEX — AI Launcher',
  description: 'An intelligent launcher experience.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)'  },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)',  color: 'black' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark bg-background`}>
      {/*
        Start with `dark` class — applyTheme() will correct it immediately
        on the client if the user has chosen light or system theme.
        This prevents a flash of un-themed content on dark-default installs.
      */}
      <head>
        {/* Inline script runs before first paint to apply saved theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var s = localStorage.getItem('lex-settings-v1');
              var theme = s ? JSON.parse(s).theme : 'dark';
              var root = document.documentElement;
              if (theme === 'light') {
                root.classList.remove('dark');
              } else if (theme === 'dark') {
                root.classList.add('dark');
              } else {
                // system
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  root.classList.add('dark');
                } else {
                  root.classList.remove('dark');
                }
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
