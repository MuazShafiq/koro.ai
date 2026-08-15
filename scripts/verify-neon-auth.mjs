import { randomUUID } from "node:crypto";

import pg from "pg";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;
const databaseUrl = process.env.DATABASE_URL;
const origin = "https://koro-ai-lime.vercel.app";

if (!authUrl || !dataApiUrl || !databaseUrl) {
  throw new Error("Neon Auth, Data API, and database URLs are required.");
}

const email = `koro-e2e-${Date.now()}@example.com`;
const password = randomUUID().replaceAll("-", "");
const headers = {
  "Content-Type": "application/json",
  Origin: origin,
};

const fail = async (label, response) => {
  const rawBody = await response.text();
  const safeBody = rawBody
    .replaceAll(email, "[redacted-email]")
    .replaceAll(password, "[redacted-password]");
  throw new Error(`${label} (${response.status}): ${safeBody}`);
};

const signupResponse = await fetch(`${authUrl}/sign-up/email`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    email,
    password,
    name: "Koro Neon E2E",
    callbackURL: `${origin}/dashboard`,
  }),
});

if (!signupResponse.ok) await fail("Auth signup failed", signupResponse);

const signupData = await signupResponse.json();
const userId = signupData.user?.id;
const cookies = signupResponse.headers
  .getSetCookie()
  .map((cookie) => cookie.split(";", 1)[0])
  .join("; ");

if (!userId || !cookies) {
  throw new Error("Auth signup did not return a user and session cookie.");
}

const tokenResponse = await fetch(`${authUrl}/token`, {
  headers: { Cookie: cookies, Origin: origin },
});

if (!tokenResponse.ok) await fail("JWT retrieval failed", tokenResponse);

const { token } = await tokenResponse.json();

if (!token) throw new Error("JWT retrieval returned no token.");

const tokenClaims = JSON.parse(
  Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
);

if (tokenClaims.role !== "authenticated" || tokenClaims.sub !== userId) {
  throw new Error("JWT claims did not identify the authenticated test user.");
}

const rpcResponse = await fetch(`${dataApiUrl}/rpc/initialize_user_profile`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    profile_data: {
      user_id: userId,
      full_name: "Koro Neon E2E",
      subjects_of_interest: ["Mathematics"],
    },
  }),
});

if (!rpcResponse.ok) await fail("Profile initialization failed", rpcResponse);

const profileResponse = await fetch(
  `${dataApiUrl}/profiles?id=eq.${encodeURIComponent(userId)}&select=id,full_name`,
  { headers: { Authorization: `Bearer ${token}` } },
);

if (!profileResponse.ok) await fail("Profile read failed", profileResponse);

const profiles = await profileResponse.json();

if (profiles.length !== 1) {
  throw new Error("RLS profile read did not return exactly one owned profile.");
}

const database = new pg.Client({ connectionString: databaseUrl });
await database.connect();
try {
  await database.query("delete from public.profiles where id = $1", [userId]);
  await database.query('delete from neon_auth."user" where id = $1', [userId]);
} finally {
  await database.end();
}

console.log("Neon Auth, authenticated RPC, and RLS profile read succeeded.");
