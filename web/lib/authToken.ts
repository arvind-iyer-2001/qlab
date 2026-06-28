import type { useAuth } from '@clerk/nextjs'

/**
 * Clerk's default session token expires in ~60s, which forces constant
 * re-auth — painful for the VS Code extension, which stores the token from the
 * auth callback and reuses it across calls.
 *
 * A Clerk **JWT template** can mint a longer-lived token. Create one in the
 * Clerk dashboard (Configure → JWT Templates) and set its name here via
 * `NEXT_PUBLIC_CLERK_JWT_TEMPLATE`. When unset we fall back to the default
 * session token, so the app keeps working before the template is configured.
 */
export const JWT_TEMPLATE = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ?? ''

type GetToken = ReturnType<typeof useAuth>['getToken']

/** Mint a qLab token, preferring the long-lived JWT template when configured. */
export function getQlabToken(getToken: GetToken): Promise<string | null> {
  return JWT_TEMPLATE ? getToken({ template: JWT_TEMPLATE }) : getToken()
}
