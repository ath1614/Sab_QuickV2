import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { Role } from "@prisma/client";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import {
  MASTER_OTP,
  isMasterOtpEnabled,
  isOtpLocked,
  otpStorageKey,
  recordOtpFailure,
  resetOtpAttempts,
  verifyOtpHash,
} from "@/lib/otp";
import {
  hashPasscode,
  verifyPasscode,
  isPasscodeHashed,
  isPinLocked,
  recordPinFailure,
  resetPinAttempts,
} from "@/lib/passcode";

export const authOptions: NextAuthOptions = {
  // No fallback: NextAuth refuses to run without a secret, and instrumentation.ts
  // refuses to boot production with a missing or published value.
  secret: process.env.NEXTAUTH_SECRET,
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
        googleIdToken: { label: "Google ID Token (native sign-in)", type: "text" },
      },
      async authorize(credentials) {
        // Self-heal: Guarantee columns like "pin" exist in PostgreSQL before queries execute
        await ensureDatabaseSchema();

        // 0b. Native in-app Google sign-in (Flutter google_sign_in plugin).
        // The app obtains an ID token from the native Google consent sheet and
        // exchanges it here for a NextAuth session cookie — no browser, no
        // deep-link round-trip. Mirrors the mobileExchangeToken user
        // resolution below (resolve-or-create by email).
        if (credentials?.googleIdToken) {
          const idToken = credentials.googleIdToken.trim();

          const clientId = process.env.GOOGLE_CLIENT_ID;
          if (!clientId) {
            throw new Error("Google sign-in is not configured on the server.");
          }

          // Verifies signature, expiry, audience AND issuer.
          const oauthClient = new OAuth2Client(clientId);
          let ticket;
          try {
            ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
          } catch {
            throw new Error("Invalid or expired Google token. Please try again.");
          }

          const payload = ticket.getPayload();
          if (!payload?.email || payload.email_verified === false) {
            throw new Error("Google account has no verified email address.");
          }

          let dbUser = await prisma.user.findUnique({
            where: { email: payload.email },
          });
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: payload.email,
                name: payload.name || "Customer",
                role: Role.CUSTOMER,
                roles: [Role.CUSTOMER],
                phoneVerified: false,
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
        const authCode = (pin || otp || "").trim();
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

        // 1. Store Owner Verification (via Passcode)
        //
        // There is deliberately no fallback phone or passcode here. The owner
        // phone and passcode are provisioned through the production environment;
        // a fresh install with no owner row and no OWNER_PASSCODE cannot log in.
        const ownerPhone = process.env.OWNER_PHONE?.trim();
        if (ownerPhone && phone === ownerPhone) {
          if (await isPinLocked(phone)) {
            throw new Error(
              "Too many incorrect attempts. Access locked for 15 minutes to protect your account."
            );
          }

          const ownerRecord = await prisma.user.findUnique({
            where: { phone: ownerPhone },
            select: { id: true, pin: true },
          });

          let storedOwnerPin = ownerRecord?.pin ?? null;

          if (!storedOwnerPin) {
            const provisioned = process.env.OWNER_PASSCODE?.trim();
            if (!provisioned) {
              throw new Error(
                "Owner account is not provisioned. Set OWNER_PASSCODE on the server."
              );
            }
            storedOwnerPin = hashPasscode(provisioned);
            if (ownerRecord) {
              await prisma.user.update({
                where: { id: ownerRecord.id },
                data: { pin: storedOwnerPin, pinChangedAt: new Date() },
              });
            }
          }

          const ownerPinOk = verifyPasscode(authCode, storedOwnerPin);

          if (!ownerPinOk) {
            await recordPinFailure(phone);
            throw new Error("Invalid verification code. Please try again.");
          }

          await resetPinAttempts(phone);

          if (storedOwnerPin && !isPasscodeHashed(storedOwnerPin)) {
            await prisma.user.update({
              where: { phone: ownerPhone },
              data: { pin: hashPasscode(authCode), pinChangedAt: new Date() },
            });
          }

          const ownerUser = await prisma.user.upsert({
            where: { phone: ownerPhone },
            update: {
              role: Role.OWNER,
              roles: [Role.OWNER],
              phoneVerified: true,
              disabledAt: null,
            },
            create: {
              phone: ownerPhone,
              name: process.env.OWNER_NAME || "Store Owner",
              email: process.env.OWNER_EMAIL || null,
              role: Role.OWNER,
              roles: [Role.OWNER],
              pin: storedOwnerPin ?? hashPasscode(authCode),
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

        // 2. Internal Staff Verification (Manager, Packer, Rider via Staff PIN)
        const staffUser = await prisma.user.findUnique({
          where: { phone },
        });

        if (staffUser && staffUser.role !== Role.CUSTOMER) {
          if (await isPinLocked(phone)) {
            throw new Error(
              "Too many incorrect attempts. Access locked for 15 minutes to protect your account."
            );
          }

          const staffPinOk = verifyPasscode(authCode, staffUser.pin);

          if (!staffPinOk) {
            await recordPinFailure(phone);
            throw new Error("Invalid verification code. Please check with the store owner.");
          }

          await resetPinAttempts(phone);

          if (staffUser.pin && !isPasscodeHashed(staffUser.pin)) {
            await prisma.user.update({
              where: { id: staffUser.id },
              data: { pin: hashPasscode(authCode) },
            });
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

        // 4. Firebase ID Token Verification (10,000 Free Phone SMS/Month)
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

        // 5. Customer OTP Verification
        if (!authCode) {
          throw new Error("Verification code is required.");
        }

        if (await isOtpLocked(phone)) {
          throw new Error(
            "Too many incorrect attempts. Please request a fresh OTP and try again."
          );
        }

        const storedOtpHash = await redis.get(otpStorageKey(phone));
        const isMasterTestOtp = authCode === MASTER_OTP && isMasterOtpEnabled();

        if (!isMasterTestOtp && !verifyOtpHash(phone, authCode, storedOtpHash)) {
          await recordOtpFailure(phone);
          throw new Error("Invalid or expired verification code. Please request a new one.");
        }

        if (!isMasterTestOtp) {
          await redis.del(otpStorageKey(phone));
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
      /**
       * Every callback tick re-reads the authoritative user row. This is what
       * makes role changes, deactivation, and sessionVersion rotation effective
       * without waiting for the 30-day JWT to expire.
       */
      let dbUser:
        | {
            id: string;
            role: Role;
            roles: Role[];
            phone: string | null;
            phoneVerified: boolean;
            sessionVersion: number;
            disabledAt: Date | null;
          }
        | null = null;

      try {
        if (user) {
          if (account?.provider === "google" && user.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: {
                id: true,
                role: true,
                roles: true,
                phone: true,
                phoneVerified: true,
                sessionVersion: true,
                disabledAt: true,
              },
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
                select: {
                  id: true,
                  role: true,
                  roles: true,
                  phone: true,
                  phoneVerified: true,
                  sessionVersion: true,
                  disabledAt: true,
                },
              });
            }
          } else {
            dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: {
                id: true,
                role: true,
                roles: true,
                phone: true,
                phoneVerified: true,
                sessionVersion: true,
                disabledAt: true,
              },
            });
          }
        } else if (token.id) {
          dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              role: true,
              roles: true,
              phone: true,
              phoneVerified: true,
              sessionVersion: true,
              disabledAt: true,
            },
          });
        }
      } catch (err) {
        console.error("Failed to refresh user in JWT callback:", err);
      }

      if (user) {
        if (!dbUser || dbUser.disabledAt) {
          (token as any).invalid = true;
          token.id = "";
          token.role = Role.CUSTOMER;
          token.roles = [Role.CUSTOMER];
          token.phone = undefined;
          token.phoneVerified = false;
          return token;
        }

        token.id = dbUser.id;
        token.role = dbUser.role;
        token.roles = dbUser.roles?.length ? dbUser.roles : [dbUser.role];
        token.phone = dbUser.phone;
        token.phoneVerified = dbUser.phoneVerified;
        (token as any).sessionVersion = dbUser.sessionVersion;
        (token as any).invalid = false;
        return token;
      }

      if (token.id) {
        const tokenVersion =
          typeof (token as any).sessionVersion === "number"
            ? ((token as any).sessionVersion as number)
            : 0;

        if (!dbUser || dbUser.disabledAt || dbUser.sessionVersion !== tokenVersion) {
          (token as any).invalid = true;
          token.id = "";
          token.role = Role.CUSTOMER;
          token.roles = [Role.CUSTOMER];
          token.phone = undefined;
          token.phoneVerified = false;
          return token;
        }

        token.role = dbUser.role;
        token.roles = dbUser.roles?.length ? dbUser.roles : [dbUser.role];
        token.phone = dbUser.phone;
        token.phoneVerified = dbUser.phoneVerified;
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
