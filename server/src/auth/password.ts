import { argon2id, hash, needsRehash, verify, type HashOptions } from 'argon2';

const passwordHashOptions: HashOptions = {
  type: argon2id,
};

const dummyPasswordHash =
  '$argon2id$v=19$m=65536,p=4,t=3$Db9GRABu+ZXq7BWzoE4y3A$LDjVr23QppadLPcSCJTwh9CTgK6VoSTIuGUCuB+AfOs';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, passwordHashOptions);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

export async function performDummyPasswordCheck(
  password: string,
): Promise<void> {
  await verify(dummyPasswordHash, password);
}

export function passwordNeedsRehash(passwordHash: string): boolean {
  return needsRehash(passwordHash, passwordHashOptions);
}
