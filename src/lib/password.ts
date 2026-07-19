import { randomBytes } from "crypto";

export function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}
