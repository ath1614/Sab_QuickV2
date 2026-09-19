import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_FIREBASE_PROJECT_ID = "sabquick-17da6";
const DEFAULT_FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@sabquick-17da6.iam.gserviceaccount.com";
const DEFAULT_FIREBASE_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDB9DibnWYlWH0G\nIfG5SGl6/c6lY6IMlq0EJ0TE5Z1YN1crmLuP1Shfuxdrlr+kIhkP+Emc24PPz+Mm\nd4emyfS5DRthJ6y1gflFV+MOahevEezeX2ETRK+cEJMfNChUu0QJqUqThrbENxMe\nfWfEONXRvhjkcrvW3xxnG5FdoROiYa8OXq/91cH3b5aMSjEMiLZLi0d3EPHAOciM\nbZAQwb+Hd72NNf5EwCGGSQS6Qz9dJEAAzItKz0G9hgsug/Ffs4GSQtJ8UI7KvQDt\nuozUtDI8T3tQ/IX/kfydXb9obbNMWyO6DyM+NzXjpFNlylUCoik+F/HlLpithDqD\n909V6q+RAgMBAAECggEABwrCeWf0GvwFAhF+cM8/wS7w71FYQ2O/IWz5krqRhW/w\n8szHVpgTMLKezZG6II/6X/mQVqkjtopiQXXKj5Q6lfNzYIoru6Vd8xYXUOEqPfmF\nI6fL4wK165EwfkwLANSRylYCtquH/ETRpWRBPb8giE6CId1Gk60jH11BYGhmSZl5\nKh4fDgU5IA3HREIF2lRBYXnM3s6IepGkxSqbqVgvxmfRHFjcNlshyYMRqKGw4Wiv\n/nmU83FvIKE/pxs39PR9OzkQA+OoPxmM38tPbg+DaGCIXxpBNOty/tsuanpgdRPc\nRWcdxtoPl8awNFgN7yNLlTmk3bgBPEWTfNdnWEhjSQKBgQDptVgQr6VFxrFSpB5W\n8zTtZ6K5yZSXU7s9HTjo7gfi71PXOqfFkuUi1zHb3dQwh4bTMcwTS6shHOjBp92K\nKNiVCQPV155oqm4sDDiGkqIJKlZedX3m6HpPVoImvGMHSteV1bhkffWg/LGboBQK\n+TIaMBaVb3PL4T1rB44PGNhCdQKBgQDUdCkVvfDi56YvdjT8HKaaY26Dm14y0kHU\nc6E5rCETxpt6uB6YUKsoW56XcADxWGDB1mrFdKMSJnbZRqaBBCJlAlsYTEu2enyO\n6cWr9C9fkvmELci29Jgyb1hCQ32iU/90lLzTFo6sNkMj5HQl3g5Y6Piw0l/y6ETm\nW1caS2jdLQKBgQDhUUSmUbE1pGoxEqltiuzsNY5dMEth2gga06GacGKKF9LtHk/B\n2+2tuWsIXsXEQ+VomAn4UGuccRK2IfEk0lx800QvVsIShr3RGbclhxlRXNAIIZ5Q\nkLHa67xvPBD9ZtqSSoqL2CSIIRfawmqQadA0D0i2qc0qMu3T0mTTiVB2QQKBgGZB\n4uSMH72XMe32P1p5j9cPtMmzpotfmD/hx+AycVlLZtqSdGdrrHYoYxUQ2+NOXoPt\n6EZR9Ytu6BV8Y/gFPWjQ0XfIgUi7e+htrK8vQP4HiAGO5+TnpbngzeJXCclwFKzQ\nSnJvkQxisb4834q6br1spQa2u2f3U/JsVGhbk4WhAoGBAJ62gA1BTcJy+Yk4xBlO\n8yIMvL22SJk8vRxA/eBJhD7xdOgKhhqyzBMSL01dCM0Aonz/zeZX2cMoiyP/WjDm\nNIs6BjgBg0vYZWVXTSimxwHWtgPZPLC8qABz9LtrZrcX3j/LcK57Or+HDv29W8SF\nxPXX7UtWHSDUbf7TOPiXAhSM\n-----END PRIVATE KEY-----\n";

function getPrivateKey(): string {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_FIREBASE_PRIVATE_KEY;
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
