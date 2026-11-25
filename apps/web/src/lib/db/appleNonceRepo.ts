import { UsedAppleNonce } from './appleNonceModel';

const DUPLICATE_KEY = 11000;

/**
 * Uses up a Sign in with Apple nonce: true the first time, false ever after
 * (until `expiresAt`, when the nonce itself has stopped working). The unique
 * index makes two sign-ins with it at once come out one true, one false.
 */
export async function useAppleNonce(nonceHash: string, expiresAt: Date): Promise<boolean> {
  try {
    await UsedAppleNonce.create({ nonceHash, expiresAt });
    return true;
  } catch (err) {
    if ((err as { code?: unknown })?.code === DUPLICATE_KEY) return false;
    throw err;
  }
}
