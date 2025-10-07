import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];
    
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    projectId: v.id("projects"),
    filePath: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("filePath"), args.filePath))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        lastModified: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("projectFiles", {
        projectId: args.projectId,
        filePath: args.filePath,
        content: args.content,
        lastModified: Date.now(),
      });
    }
  },
});

export const upsertInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    filePath: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("filePath"), args.filePath))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        lastModified: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("projectFiles", {
        projectId: args.projectId,
        filePath: args.filePath,
        content: args.content,
        lastModified: Date.now(),
      });
    }
  },
});