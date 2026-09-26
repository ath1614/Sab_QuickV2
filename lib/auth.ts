import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { Role } from "@prisma/client";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import {
  isMasterOtpEnabled,
  isOtpLocked,
  recordOtpFailure,
  resetOtpAttempts,
} from "@/lib/otp";

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

    // Production Secure Mobile + Staff PIN & Phone OTP Credentials Provider
    CredentialsProvider({
      id: "credentials",
      name: "SabQuick Authentication",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        pin: { label: "PIN", type: "password" },
        name: { label: "Name", type: "text" },
        idToken: { label: "Firebase ID Token", type: "text" },
        mobileExchangeToken: { label: "Mobile Exchange Token", type: "text" },
      },
      async authorize(credentials) {
        // Self-heal: Guarantee columns like "pin" exist in PostgreSQL before queries execute
        await ensureDatabaseSchema();

        // 0. Mobile Deep Link Exchange Token (Return from External Chrome Browser to SabQuick APK)
        if (credentials?.mobileExchangeToken) {
          const exchangeToken = credentials.mobileExchangeToken.trim();
          const exchangeKey = `auth:mobile-exchange:${exchangeToken}`;
          const cachedData = await redis.get(exchangeKey);

          if (!cachedData) {
            throw new Error("Invalid or expired mobile exchange session.");
          }

          // Single-use token: Delete immediately
          await redis.del(exchangeKey);

          const { userId, email, phone: userPhone, name: userName } = JSON.parse(cachedData);

          let dbUser = null;
          if (userId) {
            dbUser = await prisma.user.findUnique({ where: { id: userId } });
          }
          if (!dbUser && email) {
            dbUser = await prisma.user.findUnique({ where: { email } });
          }
          if (!dbUser && userPhone) {
            dbUser = await prisma.user.findUnique({ where: { phone: userPhone } });
          }

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: email || undefined,
                name: userName || "Customer",
                phone: userPhone || undefined,
                role: Role.CUSTOMER,
                roles: [Role.CUSTOMER],
                phoneVerified: Boolean(userPhone),
              },
            });
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            roles: dbUser.roles?.length ? dbUser.roles : [dbUser.role],
            phone: dbUser.phone,
            phoneVerified: dbUser.phoneVerified,
          };
        }

        if (!credentials?.phone) {
          throw new Error("Mobile number is required.");
        }

        const phone = credentials.phone.trim();
        const pin = credentials.pin?.trim();
        const otp = credentials.otp?.trim();
        const rawIdToken = credentials.idToken?.trim();
        const idToken =
          rawIdToken &&
          rawIdToken !== "undefined" &&
          rawIdToken !== "null" &&
          rawIdToken.length > 20
            ? rawIdToken
            : undefined;

        if (!/^[6-9]\d{9}$/.test(phone)) {
          throw new Error("Must be a valid 10-digit Indian mobile number.");
        }

        // 1. PIN / Passcode Authentication (For Owner and Staff)
        if (pin) {
          // A. Owner Verification: the owner passcode lives in the database
          // (provisioned to 140974 for 9109066668 via seed/first-login) and is
          // compared with a constant-time equality check.
          if (phone === "9109066668") {
            const ownerRecord = await prisma.user.findUnique({
              where: { phone: "9109066668" },
              select: { id: true, pin: true },
            });

            let storedOwnerPin = ownerRecord?.pin ?? null;

            // Self-heal: a fresh database may have the owner row without a PIN.
            // Provision it from OWNER_PASSCODE (defaults to the documented passcode).
            if (ownerRecord && !storedOwnerPin) {
              const provisioned = process.env.OWNER_PASSCODE || "140974";
              await prisma.user.update({
                where: { id: ownerRecord.id },
                data: { pin: provisioned },
              });
              storedOwnerPin = provisioned;
            }

            const ownerPinOk =
              !!storedOwnerPin &&
              storedOwnerPin.length === pin.length &&
              crypto.timingSafeEqual(Buffer.from(storedOwnerPin), Buffer.from(pin));

            if (!ownerPinOk) {
              throw new Error("Incorrect Owner Passcode. Access denied.");
            }

            const ownerUser = await prisma.user.upsert({
              where: { phone: "9109066668" },
              update: { role: Role.OWNER, phoneVerified: true, pin: "140974" },
              create: {
                phone: "9109066668",
                name: "Anurag Soni",
                email: "sabsupermart68@gmail.com",
                role: Role.OWNER,
                pin: "140974",
                phoneVerified: true,
              },
            });

            return {
              id: ownerUser.id,
              name: ownerUser.name,
              email: ownerUser.email,
              role: ownerUser.role,
              roles: ownerUser.roles?.length ? ownerUser.roles : [ownerUser.role],
              phone: ownerUser.phone,
              phoneVerified: ownerUser.phoneVerified,
            };
          }

          // B. Staff Verification (Manager, Packer, Rider)
          const staffUser = await prisma.user.findUnique({
            where: { phone },
          });

          if (!staffUser || staffUser.role === Role.CUSTOMER) {
            throw new Error("No staff account found for this mobile number.");
          }

          if (
            !staffUser.pin ||
            staffUser.pin.length !== pin.length ||
            !crypto.timingSafeEqual(Buffer.from(staffUser.pin), Buffer.from(pin))
          ) {
            throw new Error("Incorrect Staff PIN. Please check with the store owner.");
          }

          return {
            id: staffUser.id,
            name: staffUser.name,
            email: staffUser.email,
            role: staffUser.role,
            roles: staffUser.roles?.length ? staffUser.roles : [staffUser.role],
            phone: staffUser.phone,
            phoneVerified: staffUser.phoneVerified,
          };
        }

        // 2. Firebase ID Token Verification (10,000 Free Phone SMS/Month)
        if (idToken) {
          try {
            const decodedToken = await verifyFirebaseIdToken(idToken);
            const rawPhone = decodedToken.phone_number || "";
            const verifiedPhone = rawPhone.replace("+91", "").trim();

            if (!verifiedPhone || verifiedPhone !== phone) {
              throw new Error("Verified mobile number does not match submitted phone.");
            }

            let dbUser = await prisma.user.findUnique({
              where: { phone },
            });

            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  phone,
                  name: credentials.name?.trim() || "Customer",
                  role: Role.CUSTOMER,
                  roles: [Role.CUSTOMER],
                  phoneVerified: true,
                },
              });
            } else {
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
              roles: dbUser.roles?.length ? dbUser.roles : [dbUser.role],
              phone: dbUser.phone,
              phoneVerified: dbUser.phoneVerified,
            };
          } catch (fbErr: any) {
            console.error("[Firebase Token Verification Failed]:", fbErr);
            throw new Error(fbErr.message || "Failed to verify Firebase authentication code.");
          }
        }

        // 3. Customer OTP Verification (Fallback for Dev/Staging/CI tests)
        if (!otp) {
          throw new Error("Verification code, PIN, or Firebase token required.");
        }

        if (!/^\d{4}$/.test(otp)) {
          throw new Error("OTP must be exactly 4 digits.");
        }

        const getOtp = async (p: string) => await redis.get(`otp:phone:${p}`);
        const deleteOtp = async (p: string) => await redis.del(`otp:phone:${p}`);

        if (await isOtpLocked(phone)) {
          throw new Error(
            "Too many incorrect attempts. Please request a fresh OTP and try again."
          );
        }

        const validOtp = await getOtp(phone);
        const isMasterTestOtp = otp === "1234" && isMasterOtpEnabled();

        if (!isMasterTestOtp && (!validOtp || validOtp !== otp)) {
          await recordOtpFailure(phone);
          throw new Error("Invalid or expired OTP. Please request a new one.");
        }

        if (!isMasterTestOtp) {
          await deleteOtp(phone);
        }

        await resetOtpAttempts(phone);

        let dbUser = await prisma.user.findUnique({
          where: { phone },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              phone,
              name: credentials.name?.trim() || "Customer",
              role: Role.CUSTOMER,
              roles: [Role.CUSTOMER],
              phoneVerified: true,
            },
          });
        } else if (!dbUser.phoneVerified) {
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
          roles: dbUser.roles?.length ? dbUser.roles : [dbUser.role],
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
                roles: [Role.CUSTOMER],
                phoneVerified: false,
              },
            });
          }
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.roles = dbUser.roles?.length ? dbUser.roles : [dbUser.role];
          token.phone = dbUser.phone;
          token.phoneVerified = dbUser.phoneVerified;
        } else {
          token.id = user.id;
          token.role = user.role;
          token.roles = (user as any).roles || [user.role];
          token.phone = user.phone;
          token.phoneVerified = user.phoneVerified;
        }
      } else if (token.id) {
        // Refresh dynamic user state from database
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, roles: true, phone: true, phoneVerified: true },
          });
          if (freshUser) {
            token.role = freshUser.role;
            token.roles = freshUser.roles?.length ? freshUser.roles : [freshUser.role];
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
        session.user.roles = (token.roles as Role[]) || [token.role as Role];
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
