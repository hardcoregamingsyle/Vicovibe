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
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", user._id).eq("provider", "github")
      )
      .first();
    
    // If they have a GitHub auth account but aren't marked as connected, update it
    if (authAccount && !user.githubConnected) {
      await ctx.db.patch(user._id, {
        githubConnected: true,
        githubUsername: authAccount.providerAccountId,
      });
      return { connected: true };
    }
    
    // If they don't have a GitHub auth account but are marked as connected, fix it
    if (!authAccount && user.githubConnected) {
      await ctx.db.patch(user._id, {
        githubConnected: false,
        githubUsername: undefined,
        githubAccessToken: undefined,
      });
      return { connected: false };
    }
    
    return { connected: !!authAccount };
  },
});

// Store GitHub access token in authAccounts after OAuth
export const storeGithubToken = mutation({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    // Find the GitHub auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", user._id).eq("provider", "github")
      )
      .first();
    
    if (!authAccount) {
      throw new Error("GitHub account not found");
    }
    
    // Store the access token in the authAccounts table
    await ctx.db.patch(authAccount._id, {
      accessToken: args.accessToken,
    });
    
    return { success: true };
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