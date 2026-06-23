import NextAuth from "next-auth"
import Google   from "next-auth/providers/google"

const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? "lex-dev-secret-change-in-prod",
  providers: hasGoogle
    ? [
        Google({
          clientId:     process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn:  "/lock-signin",
    error:   "/lock-signin",
  },
})

export { handler as GET, handler as POST }
