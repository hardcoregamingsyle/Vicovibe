import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

const WORKER_URL = "https://vicovibe-worker.hardcorgamingstyle.workers.dev/api/vicovibe"; // 🔧 replace this

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const send = mutation({
  args: {
    projectId: v.id("projects"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Insert user message
    await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: user._id,
      role: "user",
      message: args.message,
    });

    // 🔹 Run the AI action asynchronously
    ctx.runAction(api.ai.generateAIResponse, {
      projectId: args.projectId,
      prompt: args.message,
    });

    return true;
  },
});

export const sendAI = mutation({
  args: { projectId: v.id("projects"), message: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    return await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: user._id,
      role: "assistant",
      message: args.message,
    });
  },
});
