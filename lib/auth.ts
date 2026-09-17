import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "local_development_secret_32_chars_minimum",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Production Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    }),

    // Production Secure Mobile + SMS OTP Credentials Provider
    CredentialsProvider({
      id: "credentials",
      name: "SabQuick Secure Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error("Phone number and 4-digit OTP code are required.");
        }

        const phone = credentials.phone.trim();
        const otp = credentials.otp.trim();

        if (!/^[6-9]\d{9}$/.test(phone)) {
          throw new Error("Must be a valid 10-digit Indian mobile number.");
        }

        if (!/^\d{4}$/.test(otp)) {
          throw new Error("OTP must be exactly 4 digits.");
        }

        // Validate against live Redis OTP record
        const otpKey = `otp:phone:${phone}`;
        const storedOtp = await redis.get(otpKey);

        if (!storedOtp) {
          throw new Error("OTP expired or not found. Please request a new code.");
        }

        if (storedOtp !== otp) {
          throw new Error("Invalid verification OTP. Please try again.");
        }

        // Single-use security: Atomic purge of OTP from Redis
        await redis.del(otpKey);

        // Find existing user in PostgreSQL
        let dbUser = await prisma.user.findUnique({
          where: { phone },
        });

        if (!dbUser) {
          // Strict Role Enforcement: New customer accounts are ALWAYS Role.CUSTOMER
          dbUser = await prisma.user.create({
            data: {
              phone,
              name: credentials.name?.trim() || "Customer",
              role: Role.CUSTOMER,
              phoneVerified: true,
            },
          });
        } else {
          // Existing user (customer or owner-provisioned staff)
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              phoneVerified: true,
              ...(credentials.name && !dbUser.name ? { name: credentials.name.trim() } : {}),
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
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || "Customer",
                role: Role.CUSTOMER,
                phoneVerified: false,
              },
            });
          }
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.phone = dbUser.phone;
          token.phoneVerified = dbUser.phoneVerified;
        } else {
          token.id = user.id;
          token.role = user.role;
          token.phone = user.phone;
          token.phoneVerified = user.phoneVerified;
        }
      } else if (token.id) {
        // Refresh dynamic user state from database
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
