import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "local_development_secret_32_chars_minimum",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Production Google OAuth Provider (Active when credentials are provided)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    }),

    // Development & Seeded Account Bypass Provider
    CredentialsProvider({
      id: "credentials",
      name: "SabQuick Dev Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "customer@sabquick.local" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Please provide an email address.");
        }

        const email = credentials.email.trim().toLowerCase();

        // Find user by email in PostgreSQL
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        // If user not found, create a demo customer on the fly
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0],
              role: Role.CUSTOMER,
              phoneVerified: false,
            },
          });
        }

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          phone: dbUser.phone,
          phoneVerified: dbUser.phoneVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.phoneVerified = user.phoneVerified;
      } else if (token.id) {
        // Refresh dynamic user state (e.g., after phone verification) from database
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, phone: true, phoneVerified: true },
          });
          if (freshUser) {
            token.role = freshUser.role;
            token.phone = freshUser.phone;
            token.phoneVerified = freshUser.phoneVerified;
          }
        } catch (err) {
          console.error("Failed to refresh user in JWT callback:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.phone = token.phone as string | null | undefined;
        session.user.phoneVerified = Boolean(token.phoneVerified);
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
};
