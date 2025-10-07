"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const importRepository = action({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Parse GitHub URL to extract owner and repo
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = args.repoUrl.match(urlPattern);
    
    if (!match) {
      throw new Error("Invalid GitHub URL format");
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    
    try {
      // Fetch repository contents from GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/main?recursive=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Vibe-Coder",
          },
        }
      );
      
      if (!response.ok) {
        // Try 'master' branch if 'main' doesn't exist
        const masterResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/master?recursive=1`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Vibe-Coder",
            },
          }
        );
        
        if (!masterResponse.ok) {
          throw new Error("Failed to fetch repository contents");
        }
        
        const data = await masterResponse.json();
        await processRepoFiles(ctx, args.projectId, owner, cleanRepo, data.tree);
      } else {
        const data = await response.json();
        await processRepoFiles(ctx, args.projectId, owner, cleanRepo, data.tree);
      }
      
      // Update project with GitHub info
      await ctx.runMutation(internal.projects.updateGithubInfo, {
        projectId: args.projectId,
        repoUrl: args.repoUrl,
        syncEnabled: true,
      });
      
      return { success: true };
    } catch (error) {
      console.error("GitHub import error:", error);
      throw new Error(`Failed to import repository: ${error}`);
    }
  },
});

async function processRepoFiles(
  ctx: any,
  projectId: any,
  owner: string,
  repo: string,
  tree: any[]
) {
  // Filter only files (not directories)
  const files = tree.filter((item: any) => item.type === "blob");
  
  // Fetch content for each file
  for (const file of files) {
    try {
      const contentResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers: {
            Accept: "application/vnd.github.v3.raw",
            "User-Agent": "Vibe-Coder",
          },
        }
      );
      
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        
        // Save file to project
        await ctx.runMutation(internal.files.upsertInternal, {
          projectId,
          filePath: file.path,
          content,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch file ${file.path}:`, error);
    }
  }
}
