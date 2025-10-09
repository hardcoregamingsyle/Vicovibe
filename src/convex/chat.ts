// src/convex/chat.ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

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
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Insert user's message
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: user.subject as any,
      role: "user",
      message: args.message
    });

    // Trigger NEW AI orchestrator (multi-stage pipeline)
    await ctx.scheduler.runAfter(0, (internal as any).aiOrchestrator.orchestrateAI, {
      projectId: args.projectId,
      prompt: args.message
    });

    return true;
  }
});

export const addAssistantMessage = internalMutation({
  args: {
    projectId: v.id("projects"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: null as any,
      role: "assistant",
      message: args.message,
    });
  },
});

export const listInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
  }
});