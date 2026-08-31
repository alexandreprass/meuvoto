import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "meuvoto_admin";
const PAYLOAD = "meuvoto-admin-v1";

function adminPassword() {
  return process.env.SENHA_ADM?.trim() ?? "";
}

function token() {
  const secret = adminPassword() + ":" + (process.env.AUTH_SECRET ?? "");
  return createHmac("sha256", secret).update(PAYLOAD).digest("hex");
}

function equalText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminPassword(value: string) {
  const configured = adminPassword();
  return configured.length > 0 && equalText(value, configured);
}

export async function isAdminAuthenticated() {
  const configured = adminPassword();
  if (!configured) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  return equalText(value, token());
}

export async function setAdminCookie() {
  (await cookies()).set(COOKIE_NAME, token(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
