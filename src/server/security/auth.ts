import { createHash, timingSafeEqual } from "node:crypto";
export function verifySystemKey(provided: string | null, expected = process.env.SYSTEM_API_KEY): boolean {
  if (!provided || !expected || expected.length < 16 || provided.length > 4096) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
