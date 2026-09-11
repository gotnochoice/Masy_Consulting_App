import { randomInt } from "crypto";

// Excludes visually ambiguous characters (0/O, 1/l/I) so codes are easy to read and retype.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const CODE_LENGTH = 6;

export function generateShortCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
