import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
    
    return messages;
  },
});

export const send = mutation({
  args: {
    projectId: v.id("projects"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Store user message
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: userId.subject as any,
      role: "user",
      message: args.message,
    });

    // Schedule AI response action (non-blocking)
    await ctx.scheduler.runAfter(0, api.ai.generateAIResponse, {
      projectId: args.projectId,
      prompt: args.message,
    });

    return { success: true };
  },
});

export const addAssistantMessage = internalMutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: args.userId,
      role: "assistant",
      message: args.message,
    });
  },
});