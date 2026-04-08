import { createHmac, timingSafeEqual } from "crypto";

const OAUTH_STATE_TTL_MS = 30 * 60 * 1000;

interface OAuthStatePayload {
  userId: string;
  provider: "google" | "slack";
  issuedAt: number;
}

function getOAuthStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing OAUTH_STATE_SECRET or ENCRYPTION_KEY");
  }
  return secret;
}

function signState(payload: string) {
  return createHmac("sha256", getOAuthStateSecret()).update(payload).digest("base64url");
}

export function createOAuthState(userId: string, provider: OAuthStatePayload["provider"]) {
  const payload = JSON.stringify({
    userId,
    provider,
    issuedAt: Date.now(),
  } satisfies OAuthStatePayload);

  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = signState(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(state: string, provider: OAuthStatePayload["provider"]) {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signState(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as OAuthStatePayload;

    if (payload.provider !== provider) {
      return null;
    }

    if (!payload.userId || typeof payload.issuedAt !== "number") {
      return null;
    }

    if (Date.now() - payload.issuedAt > OAUTH_STATE_TTL_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
