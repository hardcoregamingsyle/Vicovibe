import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    
    if (!project || project.userId !== user._id) return null;
    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const maxProjects = getMaxProjects(user.subscriptionTier);
    if (projects.length >= maxProjects) {
      throw new Error(`You've reached the maximum of ${maxProjects} projects for your plan`);
    }
    
    const slug = generateSlug(args.name);
    
    return await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      description: args.description,
      slug,
      content: "",
      checksUsed: 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    
    const updates: any = {};
    if (args.name !== undefined) {
      updates.name = args.name;
      updates.slug = generateSlug(args.name);
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.content !== undefined) updates.content = args.content;
    
    await ctx.db.patch(args.id, updates);
  },
});

export const updateGithubInfo = internalMutation({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
    syncEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    
    await ctx.db.patch(args.projectId, {
      githubRepoUrl: args.repoUrl,
      githubSyncEnabled: args.syncEnabled,
      lastGithubSync: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    
    await ctx.db.delete(args.id);
  },
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8);
}

function getMaxProjects(tier?: string): number {
  switch (tier) {
    case "free": return 3;
    case "silver": return 5;
    case "gold": return 8;
    case "platinum": return 15;
    case "diamond": return 30;
    default: return 3;
  }
}