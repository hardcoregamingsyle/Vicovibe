import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Ensure GitHub connection is marked for users who signed in via GitHub
export const ensureGithubConnected = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    // Check if user has a GitHub auth account
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", user._id).eq("provider", "github")
      )
      .first();
    
    // If they have a GitHub auth account but aren't marked as connected, update it
    if (authAccounts && !user.githubConnected) {
      await ctx.db.patch(user._id, {
        githubConnected: true,
        githubUsername: authAccounts.providerAccountId,
      });
    }
  },
});

// Connect GitHub account (store access token)
export const connectGithubAccount = mutation({
  args: {
    accessToken: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    await ctx.db.patch(user._id, {
      githubAccessToken: args.accessToken,
      githubUsername: args.username,
      githubConnected: true,
    });
  },
});

// Disconnect GitHub account
export const disconnectGithubAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    await ctx.db.patch(user._id, {
      githubAccessToken: undefined,
      githubUsername: undefined,
      githubConnected: false,
    });
  },
});