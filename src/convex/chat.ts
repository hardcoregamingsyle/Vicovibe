// src/convex/chat.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
  }
});

export const send = mutation({
  args: { projectId: v.id("projects"), message: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Insert user's message
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: user._id,
      role: "user",
      message: args.message
    });

    // Trigger AI action asynchronously (non-blocking)
    ctx.runAction(api.ai.generateAIResponse, {
      projectId: args.projectId,
      prompt: args.message
    });

    return true;
  }
});
