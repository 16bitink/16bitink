import { optionalEnv, requireEnv } from './env';
import { parseServiceAccount, playClient, type PlayClient } from './googlePlay';

/** The Android app's package name; PLAY_PACKAGE_NAME overrides it for a build with another id. */
export const playPackage = (): string => optionalEnv('PLAY_PACKAGE_NAME') ?? 'ink.sixteenbit.games';

let client: PlayClient | null = null;

/** The Google Play Developer API client, signed in with PLAY_SERVICE_ACCOUNT (its access token is reused until it expires). */
export function play(): PlayClient {
  client ??= playClient(playPackage(), parseServiceAccount(requireEnv('PLAY_SERVICE_ACCOUNT')));
  return client;
}
