"use node";

import { v } from "convex/values";

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || "";
const HF_API_BASE = "https://api-inference.huggingface.co/models";

// Model endpoints organized by task type - using specified Hugging Face repositories
export const MODELS = {
  CODING: [
    "deepseek-ai/DeepSeek-V3.1",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  ],
  THINKING: [
    "unsloth/DeepSeek-R1-0528",
    "unsloth/gpt-oss-120b",
    "databricks/dbrx-instruct",
  ],
  GENERATIVE: [
    "bigscience/bloom",
    "nvidia/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "deepseek-ai/DeepSeek-V3.1",
  ],
  CODE_ANALYSIS: [
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "nvidia/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "deepseek-ai/DeepSeek-V3.1",
  ],
  PLANNING: [
    "nvidia/Llama-3.1-405B-Instruct-FP8",
    "databricks/dbrx-instruct",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "nvidia/Llama-4-Scout-17B-16E-Instruct-FP8",
  ],
  CREATIVITY: [
    "mistralai/Mixtral-8x22B-v0.1",
    "deepseek-ai/DeepSeek-V3.1",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  ],
  WEB_SEARCH: [
    "tiiuae/falcon-180B",
    "deepseek-ai/DeepSeek-V3.1",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  ],
};

interface HFCallOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  retries?: number;
}

export async function callHuggingFaceModel(options: HFCallOptions): Promise<string> {
  const { model, prompt, maxTokens = 2048, temperature = 0.7, retries = 3 } = options;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🤖 [HF] Calling ${model} (attempt ${attempt + 1}/${retries})`);
      
      const response = await fetch(`${HF_API_BASE}/${model}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: temperature,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [HF] Error from ${model}:`, errorText);
        
        // If model is loading, wait and retry
        if (response.status === 503 && attempt < retries - 1) {
          console.log(`⏳ [HF] Model loading, waiting 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        throw new Error(`HF API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ [HF] Success from ${model}`);
      
      // Handle different response formats
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      } else if (data.generated_text) {
        return data.generated_text;
      } else if (typeof data === "string") {
        return data;
      }
      
      return JSON.stringify(data);
      
    } catch (error) {
      console.error(`❌ [HF] Attempt ${attempt + 1} failed:`, error);
      if (attempt === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error(`Failed to call ${model} after ${retries} attempts`);
}

export async function callModelsByType(
  taskType: string,
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const models = MODELS[taskType as keyof typeof MODELS] || MODELS.THINKING;
  
  // Try primary model first
  try {
    return await callHuggingFaceModel({
      model: models[0],
      prompt,
      ...options,
    });
  } catch (error) {
    console.error(`❌ [HF] Primary model failed, trying fallback`);
    
    // Try fallback model
    if (models.length > 1) {
      return await callHuggingFaceModel({
        model: models[1],
        prompt,
        ...options,
      });
    }
    
    throw error;
  }
}