"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-950 p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 shadow-lg shadow-orange-500/10">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1.5 text-sm text-stone-400 leading-relaxed">
            Sign in to continue your LEX experience
          </p>
        </div>

        {/* Clerk sign-in widget */}
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary:         "#f97316",
              colorBackground:      "#1c1917",
              colorText:            "#f5f5f4",
              colorTextSecondary:   "#a8a29e",
              colorInputBackground: "#292524",
              colorInputText:       "#f5f5f4",
              colorDanger:          "#f87171",
              borderRadius:         "0.875rem",
              fontFamily:           "inherit",
              fontSize:             "0.9rem",
            },
            elements: {
              card:                          "shadow-2xl border border-stone-800 bg-stone-900",
              headerTitle:                   "hidden",
              headerSubtitle:                "hidden",
              socialButtonsBlockButton:      "border-stone-700 text-stone-200 hover:bg-stone-800 transition-colors",
              socialButtonsBlockButtonText:  "font-medium",
              dividerLine:                   "bg-stone-800",
              dividerText:                   "text-stone-500 text-xs",
              formFieldLabel:                "text-stone-300 text-sm font-medium",
              formFieldInput:                "border-stone-700 bg-stone-800 text-stone-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all",
              formFieldErrorText:            "text-red-400 text-xs mt-1",
              formFieldWarningText:          "text-amber-400 text-xs mt-1",
              formButtonPrimary:             "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20",
              footerActionLink:              "text-orange-400 hover:text-orange-300 font-medium transition-colors",
              identityPreviewText:           "text-stone-300",
              identityPreviewEditButtonIcon: "text-orange-400",
              alertText:                     "text-red-300 text-sm",
              alertIcon:                     "text-red-400",
            },
          }}
        />

        {/* Terms footer */}
        <p className="mt-5 text-center text-[11px] text-stone-600 leading-relaxed px-2">
          By signing in you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener" className="text-orange-500/80 hover:text-orange-400 underline underline-offset-2 transition-colors">
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="/privacy-policy" target="_blank" rel="noopener" className="text-orange-500/80 hover:text-orange-400 underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}
