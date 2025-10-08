"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const WORKER_URL = process.env.VICOVIBE_WORKER_URL ||
  "https://vicovibe-worker.hardcorgamingstyle.workers.dev/api/vicovibe";

export const generateAIResponse = action({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Log input
    console.log("✨ [AI Action] Called with prompt:", args.prompt);

    // Fetch recent chat history (last 10 messages)
    let chatHistory = [];
    try {
      const recent = await ctx.runQuery(internal.chat.listInternal, {
        projectId: args.projectId,
      });
      chatHistory = recent.slice(-10).map((m) => ({
        role: m.role,
        message: m.message,
      }));
      console.log("📝 [AI Action] Chat history:", chatHistory);
    } catch (err) {
      console.error("⚠️ [AI Action] Failed to fetch chat history:", err);
    }

    // Prepare the payload to Worker
    const payload = {
      message: args.prompt,
      projectId: args.projectId,
      chatHistory,
    };

    console.log("➡️ [AI Action] Sending payload to Worker:", payload);

    // Call your Worker
    let data: any = null;
    try {
      const resp = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("⬅️ [AI Action] Worker response status:", resp.status);
      const text = await resp.text();
      console.log("📬 [AI Action] Worker raw text:", text);
      try {
        data = JSON.parse(text);
      } catch {
        data = { final: text, reply: text };
      }
      console.log("📦 [AI Action] Parsed data:", data);
    } catch (err: any) {
      console.error("🚨 [AI Action] Error calling Worker:", err);
      // Insert an assistant message indicating failure
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        message: `Error contacting AI server: ${String(err)}`,
      });
      return { ok: false, error: String(err) };
    }

    // Extract final reply
    let finalText = "";
    if (data && (data.final || data.reply)) {
      finalText = data.final ?? data.reply;
    } else {
      finalText = "⚠️ AI returned no reply.";
    }

    console.log("✅ [AI Action] Final AI reply:", finalText);

    // Insert assistant message
    try {
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        message: finalText,
      });
      console.log("📝 [AI Action] Assistant message inserted");
    } catch (err) {
      console.error("🚨 [AI Action] Failed to insert assistant message:", err);
    }

    return { ok: true, final: finalText };
  },
});