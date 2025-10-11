"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { callModelsByType } from "./huggingface";

export const orchestrateAI = internalAction({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🎭 [Orchestrator] Starting AI pipeline for:", args.prompt);
    
    try {
      // Quick check for simple interactions that don't need full pipeline
      const simpleResponse = await handleSimpleInteraction(ctx, args.projectId, args.prompt);
      if (simpleResponse) {
        console.log("⚡ [Orchestrator] Handled as simple interaction");
        return { ok: true, final: simpleResponse };
      }
      
      // Stage 1: Classify Task
      console.log("📋 [Stage 1] Classifying task...");
      let taskTypes: string[];
      try {
        taskTypes = await classifyTask(args.prompt);
        console.log("✅ [Stage 1] Task types:", taskTypes);
        
        // Send status update to user
        await ctx.runMutation(internal.chat.addAssistantMessage, {
          projectId: args.projectId,
          message: `🔍 Analyzing your request... (Task type: ${taskTypes.join(", ")})`,
          metadata: {
            taskTypes,
            processingStage: "CLASSIFYING",
          },
        });
      } catch (error) {
        console.warn("⚠️ [Stage 1] Task classification failed, using default:", error);
        // Don't fail the entire pipeline - use default task type
        taskTypes = ["THINKING"];
        console.log("✅ [Stage 1] Using default task type: THINKING");
      }
      
      // Stage 2: Inject Context
      console.log("📚 [Stage 2] Injecting context...");
      const context = await injectContext(ctx, args.projectId, args.prompt);
      console.log("✅ [Stage 2] Context injected");
      
      // Stage 3: Optimize Prompt
      console.log("✨ [Stage 3] Optimizing prompt...");
      let optimizedPrompt: string;
      try {
        optimizedPrompt = await optimizePrompt(args.prompt, context);
        console.log("✅ [Stage 3] Prompt optimized");
      } catch (error) {
        console.warn("⚠️ [Stage 3] Prompt optimization failed, using original prompt:", error);
        optimizedPrompt = args.prompt;
      }
      
      // Stage 4: Create Plan
      console.log("🗺️ [Stage 4] Creating execution plan...");
      let plan: string;
      try {
        plan = await createPlan(optimizedPrompt, taskTypes);
        console.log("✅ [Stage 4] Plan created:", plan);
      } catch (error) {
        console.warn("⚠️ [Stage 4] Planning failed, using simplified plan:", error);
        plan = `Execute the following task: ${optimizedPrompt}`;
      }
      
      // If task is planning, return plan and stop
      if (taskTypes.includes("PLANNING") && taskTypes.length === 1) {
        await ctx.runMutation(internal.chat.addAssistantMessage, {
          projectId: args.projectId,
          message: `📋 **Execution Plan:**\n\n${plan}`,
          metadata: {
            taskTypes,
            processingStage: "COMPLETED",
          },
        });
        return { ok: true, final: plan };
      }
      
      // Stage 5: Break Task into Chunks
      console.log("🔨 [Stage 5] Breaking task into chunks...");
      let chunks: string[];
      try {
        chunks = await breakTask(optimizedPrompt, plan);
        console.log("✅ [Stage 5] Task broken into", chunks.length, "chunks");
      } catch (error) {
        console.warn("⚠️ [Stage 5] Task breaking failed, using single chunk:", error);
        chunks = [optimizedPrompt];
      }
      
      // Stage 6: Execute Chunks
      console.log("⚡ [Stage 6] Executing chunks...");
      
      // Send progress update
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        message: `⚙️ Processing ${chunks.length} task${chunks.length > 1 ? 's' : ''}...`,
        metadata: {
          taskTypes,
          processingStage: "EXECUTING",
        },
      });
      
      const results: string[] = [];
      let memory = context;
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🔄 [Stage 6.${i + 1}] Processing chunk ${i + 1}/${chunks.length}`);
        try {
          const chunkResult = await executeChunk(chunks[i], taskTypes, memory);
          results.push(chunkResult);
          memory += `\n\nPrevious chunk result:\n${chunkResult}`;
        } catch (error) {
          console.warn(`⚠️ [Stage 6.${i + 1}] Chunk execution had issues, but continuing:`, error);
          // Add a generic response instead of failing
          results.push("I'm processing your request. Please note that some models may be temporarily unavailable, but I'll do my best to help you.");
        }
      }
      
      let finalResult = results.join("\n\n");
      
      // Stage 7: Code Analysis & Refinement (for coding tasks)
      if (taskTypes.includes("CODING")) {
        console.log("🔍 [Stage 7] Analyzing and refining code...");
        try {
          finalResult = await analyzeAndRefineCode(finalResult, context);
          console.log("✅ [Stage 7] Code refined");
        } catch (error) {
          console.warn("⚠️ [Stage 7] Code analysis failed, using unrefined code:", error);
        }
      }
      
      // Stage 8: Web Search Integration (for search tasks)
      if (taskTypes.includes("WEB_SEARCH")) {
        console.log("🌐 [Stage 8] Performing web search...");
        try {
          finalResult = await searchWeb(args.prompt, finalResult);
          console.log("✅ [Stage 8] Web search completed");
        } catch (error) {
          console.warn("⚠️ [Stage 8] Web search failed, using existing result:", error);
        }
      }
      
      // Store final result
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        message: finalResult,
        metadata: {
          taskTypes,
          processingStage: "COMPLETED",
        },
      });
      
      console.log("🎉 [Orchestrator] Pipeline completed successfully");
      return { ok: true, final: finalResult };
      
    } catch (error: any) {
      console.error("🚨 [Orchestrator] Pipeline failed:", error);
      const errorMessage = `❌ AI Pipeline Error: ${error.message || String(error)}`;
      
      await ctx.runMutation(internal.chat.addAssistantMessage, {
        projectId: args.projectId,
        message: errorMessage,
      });
      
      return { ok: false, error: errorMessage };
    }
  },
});

async function handleSimpleInteraction(ctx: any, projectId: string, prompt: string): Promise<string | null> {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // Get user info for personalization
  let userName = "there";
  try {
    const chatHistory = await ctx.runQuery(internal.chat.listInternal, { projectId });
    const userMessages = chatHistory.filter((m: any) => m.role === "user");
    // Try to extract name from context if available
  } catch (error) {
    console.warn("⚠️ [Simple] Could not fetch user context");
  }
  
  // Greetings
  const greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"];
  if (greetings.some(g => lowerPrompt.startsWith(g) || lowerPrompt === g)) {
    const response = `Hello ${userName}! 👋 I'm Vicovibe, your AI coding assistant. What shall we build today?`;
    await ctx.runMutation(internal.chat.addAssistantMessage, {
      projectId,
      message: response,
    });
    return response;
  }
  
  // Help requests
  if (lowerPrompt.includes("help") && lowerPrompt.split(" ").length < 5) {
    const response = `I'm here to help you build amazing projects! 🚀\n\nYou can ask me to:\n• Write code in any language\n• Debug and fix errors\n• Explain concepts\n• Create project structures\n• And much more!\n\nWhat would you like to work on?`;
    await ctx.runMutation(internal.chat.addAssistantMessage, {
      projectId,
      message: response,
    });
    return response;
  }
  
  // Thank you
  if (lowerPrompt.includes("thank") || lowerPrompt.includes("thanks")) {
    const response = `You're welcome! 😊 Happy to help. Let me know if you need anything else!`;
    await ctx.runMutation(internal.chat.addAssistantMessage, {
      projectId,
      message: response,
    });
    return response;
  }
  
  // Goodbye
  const goodbyes = ["bye", "goodbye", "see you", "later"];
  if (goodbyes.some(g => lowerPrompt.includes(g))) {
    const response = `Goodbye! 👋 Come back anytime you want to build something awesome!`;
    await ctx.runMutation(internal.chat.addAssistantMessage, {
      projectId,
      message: response,
    });
    return response;
  }
  
  // Not a simple interaction, proceed with full pipeline
  return null;
}

async function classifyTask(prompt: string): Promise<string[]> {
  const classificationPrompt = `Analyze this user request and classify it into one or more of these categories:
- CODING: Writing, modifying, or debugging code
- THINKING: Logical reasoning, problem-solving, analysis
- GENERATIVE: Creative writing, content generation
- CODE_ANALYSIS: Reviewing, analyzing, or critiquing code
- PLANNING: Creating plans, strategies, or roadmaps
- CREATIVITY: Brainstorming, ideation, creative solutions
- WEB_SEARCH: Searching for information, research

User request: "${prompt}"

Respond with ONLY the category names separated by commas (e.g., "CODING,PLANNING" or "THINKING").`;

  const response = await callModelsByType("THINKING", classificationPrompt, {
    maxTokens: 100,
    temperature: 0.3,
  });
  
  const categories = response
    .trim()
    .toUpperCase()
    .split(/[,\s]+/)
    .filter(cat => ["CODING", "THINKING", "GENERATIVE", "CODE_ANALYSIS", "PLANNING", "CREATIVITY", "WEB_SEARCH"].includes(cat));
  
  return categories.length > 0 ? categories : ["THINKING"];
}

async function injectContext(ctx: any, projectId: string, prompt: string): Promise<string> {
  try {
    const chatHistory = await ctx.runQuery(internal.chat.listInternal, { projectId });
    const recentChat = chatHistory.slice(-5).map((m: any) => `${m.role}: ${m.message}`).join("\n");
    
    const projectFiles = await ctx.runQuery(internal.files.listInternal, { projectId });
    const codeContext = projectFiles.slice(0, 3).map((f: any) => 
      `File: ${f.filePath}\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``
    ).join("\n\n");
    
    return `Recent Chat:\n${recentChat}\n\nProject Code:\n${codeContext}`;
  } catch (error) {
    console.error("⚠️ [Context] Failed to inject context:", error);
    return "";
  }
}

async function optimizePrompt(prompt: string, context: string): Promise<string> {
  const optimizationPrompt = `Rewrite this user request to be more efficient and clear while preserving the original intent. Make it concise and actionable.

Context:
${context}

User request: "${prompt}"

Rewritten request:`;

  const optimized = await callModelsByType("GENERATIVE", optimizationPrompt, {
    maxTokens: 500,
    temperature: 0.5,
  });
  
  return optimized.trim() || prompt;
}

async function createPlan(prompt: string, taskTypes: string[]): Promise<string> {
  const planningPrompt = `Create a detailed execution plan for this request. Break it down into clear, actionable steps.

Task types: ${taskTypes.join(", ")}
Request: "${prompt}"

Execution plan:`;

  const plan = await callModelsByType("PLANNING", planningPrompt, {
    maxTokens: 1000,
    temperature: 0.6,
  });
  
  return plan.trim();
}

async function breakTask(prompt: string, plan: string): Promise<string[]> {
  const breakingPrompt = `Break this task into 3-5 executable chunks. Each chunk should be a specific, manageable subtask.

Plan:
${plan}

Request: "${prompt}"

List each chunk on a new line starting with "CHUNK:".`;

  const response = await callModelsByType("PLANNING", breakingPrompt, {
    maxTokens: 800,
    temperature: 0.5,
  });
  
  const chunks = response
    .split("\n")
    .filter(line => line.trim().startsWith("CHUNK:"))
    .map(line => line.replace(/^CHUNK:\s*/i, "").trim())
    .filter(chunk => chunk.length > 0);
  
  return chunks.length > 0 ? chunks : [prompt];
}

async function executeChunk(chunk: string, taskTypes: string[], memory: string): Promise<string> {
  const primaryTaskType = taskTypes[0];
  
  const executionPrompt = `${memory}

Current task: ${chunk}

Provide a detailed solution:`;

  return await callModelsByType(primaryTaskType, executionPrompt, {
    maxTokens: 2048,
    temperature: 0.7,
  });
}

async function analyzeAndRefineCode(code: string, context: string): Promise<string> {
  const maxIterations = 2;
  let refinedCode = code;
  
  for (let i = 0; i < maxIterations; i++) {
    console.log(`🔄 [Code Analysis] Iteration ${i + 1}/${maxIterations}`);
    
    try {
      const analysisPrompt = `Analyze this code and suggest improvements. Focus on correctness, efficiency, and best practices.

Context:
${context}

Code:
${refinedCode}

Analysis and improved code:`;

      const analysis = await callModelsByType("CODE_ANALYSIS", analysisPrompt, {
        maxTokens: 2048,
        temperature: 0.4,
      });
      
      // If analysis suggests no changes, we're done
      if (analysis.toLowerCase().includes("no changes needed") || 
          analysis.toLowerCase().includes("looks good")) {
        break;
      }
      
      refinedCode = analysis;
    } catch (error) {
      console.error(`⚠️ [Code Analysis] Iteration ${i + 1} failed:`, error);
      break;
    }
  }
  
  return refinedCode;
}

async function searchWeb(query: string, currentResult: string): Promise<string> {
  // Simplified web search - in production, integrate with actual web scraping
  const searchPrompt = `Based on this query, provide comprehensive information:

Query: "${query}"

Current analysis:
${currentResult}

Enhanced response with additional context:`;

  return await callModelsByType("WEB_SEARCH", searchPrompt, {
    maxTokens: 2048,
    temperature: 0.6,
  });
}