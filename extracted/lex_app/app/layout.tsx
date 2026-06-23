import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LEX — AI OS',
  description: 'Your personal AI operating system. Chat, reason, remember, and control your digital life.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LEX AI OS',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/lex-orb.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-light-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  sizes: '32x32', media: '(prefers-color-scheme: dark)'  },
    ],
    apple: '/apple-icon.png',
    shortcut: '/lex-orb.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'LEX',
    'apple-mobile-web-app-title': 'LEX',
    'msapplication-TileColor': '#09090b',
    'msapplication-TileImage': '/lex-orb.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#f97316" } }}>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark bg-background`}>
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="LEX" />
          <meta name="mobile-web-app-capable" content="yes" />
          <link rel="apple-touch-icon" href="/apple-icon.png" />
          <link rel="icon" type="image/png" sizes="512x512" href="/lex-orb.png" />

          {/* Theme flash prevention */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              try {
                var s = localStorage.getItem('lex-settings-v1');
                var theme = s ? JSON.parse(s).theme : 'dark';
                var root = document.documentElement;
                if (theme === 'light') { root.classList.remove('dark'); }
                else if (theme === 'dark') { root.classList.add('dark'); }
                else { if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark'); else root.classList.remove('dark'); }
              } catch(e) {}
            })();
          `}} />

          {/* Global error handler + SW registration */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              function sendErr(msg, extra) {
                try { fetch('/api/errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:'error',message:String(msg),context:'global',extra:extra,ts:Date.now()})}).catch(function(){}); } catch(e) {}
              }
              window.onerror = function(msg,src,line,col,err){ sendErr(err ? (err.message||msg) : msg, {src:src,line:line,col:col}); };
              window.onunhandledrejection = function(e){ sendErr(e.reason instanceof Error ? e.reason.message : String(e.reason), {type:'unhandledrejection'}); };
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function(){}); });
              }
            })();
          `}} />
        </head>
        <body className="font-sans antialiased">
          <ToastProvider>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
