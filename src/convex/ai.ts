import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateAIResponse = action({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // ✅ Call your Cloudflare Worker endpoint here:
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
      return data.reply || "AI returned no response.";
    } catch (error: any) {
      console.error("AI Action Error:", error);
      return "Error contacting AI.";
    }
  },
});
