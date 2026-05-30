// argon2id password hashing per api-contracts.md §0-4
// Owner seam: ALI-67 방연동[MCP]. Routes import these via auth handler.

import { hash, verify, Algorithm } from "@node-rs/argon2";

const PARAMS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 64 * 1024, // 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, PARAMS);
}

export async function verifyPassword(
  storedHash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext);
  } catch {
    return false;
  }
}
