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

    // 1️⃣ Insert user message into Convex
    const msgId = await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      userId: user._id,
      role: "user",
      message: args.message,
    });

    // 2️⃣ Call Cloudflare Worker AI Gateway
    try {
      const aiRes = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: args.message, task: "auto" }),
      });

      const data = await aiRes.json();

      // 3️⃣ Store AI reply
      if (data.ok && data.reply) {
        await ctx.db.insert("chatMessages", {
          projectId: args.projectId,
          userId: user._id,
          role: "assistant",
          message: data.reply,
        });
      } else {
        await ctx.db.insert("chatMessages", {
          projectId: args.projectId,
          userId: user._id,
          role: "assistant",
          message: `Error: ${data.error || "AI failed to respond"}`,
        });
      }
    } catch (err) {
      await ctx.db.insert("chatMessages", {
        projectId: args.projectId,
        userId: user._id,
        role: "assistant",
        message: `Error contacting AI: ${String(err)}`,
      });
    }

    return msgId;
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
