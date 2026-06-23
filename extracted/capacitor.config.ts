import type { CapacitorConfig } from "@capacitor/cli"

/*
 * LEX AI OS — Capacitor Configuration
 *
 * For APK builds: set CAPACITOR_SERVER_URL to your deployed .replit.app URL.
 * The app wraps the live web app in a native WebView — API routes work normally.
 *
 * Build steps:
 *   1. pnpm cap:build   (runs next build then npx cap sync)
 *   2. npx cap open android
 *   3. Build APK in Android Studio (Build → Generate Signed Bundle/APK)
 */

const serverUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId:   "com.lexai.app",
  appName: "LEX AI OS",
  webDir:  "out",

  server: serverUrl
    ? { url: serverUrl, cleartext: false }
    : undefined,

  android: {
    backgroundColor:             "#09090b",
    allowMixedContent:           false,
    captureInput:                true,
    webContentsDebuggingEnabled: false,
    /*
     * Launcher intent — set in AndroidManifest.xml:
     * <intent-filter>
     *   <action android:name="android.intent.action.MAIN" />
     *   <category android:name="android.intent.category.HOME" />
     *   <category android:name="android.intent.category.DEFAULT" />
     * </intent-filter>
     *
     * Back press: suppressed in MainActivity.kt via onBackPressed() override.
     * Default launcher prompt: trigger via RoleManager API on Android 10+.
     */
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:        2000,
      launchAutoHide:            true,
      backgroundColor:           "#09090b",
      androidSplashResourceName: "splash",
      androidScaleType:          "CENTER_CROP",
      showSpinner:               false,
      splashFullScreen:          true,
      splashImmersive:           true,
    },
    StatusBar: {
      style:           "DARK",
      backgroundColor: "#09090b",
    },
  },
}

export default config
