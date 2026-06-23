import NextAuth from "next-auth"
import Google   from "next-auth/providers/google"

const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

const handler = NextAuth({
  providers: hasGoogle
    ? [
        Google({
          clientId:     process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],

  /*
   * SECURITY: No fallback. If NEXTAUTH_SECRET is missing the server will
   * throw on startup — a missing secret must be an explicit config error,
   * not silently replaced with a known weak default like "lex-dev-secret...".
   * Set NEXTAUTH_SECRET to a random 32-byte hex string.
   */
  secret: process.env.NEXTAUTH_SECRET,

  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7-day sessions

  callbacks: {
    async session({ session }) {
      return session
    },
  },

  pages: {
    signIn: "/lock-signin",
    error:  "/lock-signin",
  },
})

export { handler as GET, handler as POST }
