import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getPrivateKey(): string {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  return rawKey.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  const currentApps = getApps();
  if (currentApps.length > 0 && currentApps[0]) {
    return currentApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in environment variables.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const decodedToken = await auth.verifyIdToken(idToken);
  return decodedToken;
}
