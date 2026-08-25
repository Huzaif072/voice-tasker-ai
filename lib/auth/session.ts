export function isSessionVersionCurrent(
  tokenSessionVersion: number | undefined,
  userSessionVersion: number | undefined
): boolean {
  return tokenSessionVersion === undefined || tokenSessionVersion === (userSessionVersion ?? 0);
}
