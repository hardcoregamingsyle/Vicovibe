// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";

// Build providers array conditionally based on environment variables
const providers: any[] = [Password];

// Only add Google if credentials are configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

// Only add GitHub if credentials are configured
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});