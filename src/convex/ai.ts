"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateAIResponse = action({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get current user
      const user = await ctx.runQuery(internal.users.currentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call your Cloudflare Worker endpoint
      const response = await fetch(
        "https://vicovibe-worker.hardcorgamingstyle.workers.dev/api/ai",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: args.projectId,
            prompt: args.prompt,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Worker error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "AI returned no response.";

      // Store AI response in chat
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        userId: user._id,
        message: aiReply,
      });

      return aiReply;
    } catch (error: any) {
      console.error("AI Action Error:", error);
      
      // Store error message as assistant response
      const user = await ctx.runQuery(internal.users.currentUserInternal);
      if (user) {
        await ctx.runMutation(internal.chat.addAssistantMessage, {
          projectId: args.projectId,
          userId: user._id,
          message: "Sorry, I encountered an error processing your request. Please try again.",
        });
      }
      
      return "Error contacting AI.";
    }
  },
});