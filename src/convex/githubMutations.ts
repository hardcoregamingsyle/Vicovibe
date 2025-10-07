import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

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
