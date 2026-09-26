import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_FIREBASE_PROJECT_ID = "sabquick-17da6";
const DEFAULT_FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@sabquick-17da6.iam.gserviceaccount.com";

function getPrivateKey(): string {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not set. Provide the Firebase Admin service account key via environment (never commit it to the repository)."
    );
  }
  return rawKey.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  const currentApps = getApps();
  if (currentApps.length > 0 && currentApps[0]) {
    return currentApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_FIREBASE_CLIENT_EMAIL;
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
