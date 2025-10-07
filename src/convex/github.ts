"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Helper function to get GitHub access token
async function getGithubAccessToken(ctx: any): Promise<string | null> {
  const user = await ctx.runQuery(internal.users.currentUserInternal);
  if (!user) return null;
  
  // Prioritize getting token from authAccounts (OAuth flow)
  const authAccount = await ctx.runQuery(internal.users.getGithubAuthAccount, { userId: user._id });
  
  // Convex Auth stores the token in the 'access_token' field within authAccount
  if (authAccount?.access_token) {
    return authAccount.access_token;
  }
  
  // Fallback to user record (manual connection)
  if (user.githubAccessToken) {
    return user.githubAccessToken;
  }
  
  return null;
}

// List user's GitHub repositories
export const listUserRepos = action({
  args: {},
  handler: async (ctx): Promise<Array<{
    id: number;
    name: string;
    fullName: string;
    url: string;
    description: string | null;
    private: boolean;
  }>> => {
    const accessToken = await getGithubAccessToken(ctx);
    if (!accessToken) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }
    
    const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vibe-Coder",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch repositories: ${response.status} ${errorText}`);
    }
    
    const repos = await response.json();
    return repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      private: repo.private,
    }));
  },
});

// Import existing repository
export const importRepository = action({
  args: {
    projectId: v.id("projects"),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    const accessToken = await getGithubAccessToken(ctx);
    if (!accessToken) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }
    
    const user = await ctx.runQuery(internal.users.currentUserInternal);
    if (!user) {
      throw new Error("User not found");
    }
    
    try {
      // Fetch repository tree
      const response = await fetch(
        `https://api.github.com/repos/${args.repoFullName}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Vibe-Coder",
          },
        }
      );
      
      if (!response.ok) {
        // Try master branch
        const masterResponse = await fetch(
          `https://api.github.com/repos/${args.repoFullName}/git/trees/master?recursive=1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Vibe-Coder",
            },
          }
        );
        
        if (!masterResponse.ok) {
          throw new Error("Failed to fetch repository contents");
        }
        
        const data = await masterResponse.json();
        await processRepoFiles(ctx, args.projectId, args.repoFullName, data.tree, accessToken);
      } else {
        const data = await response.json();
        await processRepoFiles(ctx, args.projectId, args.repoFullName, data.tree, accessToken);
      }
      
      // Update project with GitHub info
      await ctx.runMutation(internal.projects.updateGithubInfo, {
        projectId: args.projectId,
        repoUrl: `https://github.com/${args.repoFullName}`,
        syncEnabled: true,
      });
      
      return { success: true };
    } catch (error) {
      console.error("GitHub import error:", error);
      throw new Error(`Failed to import repository: ${error}`);
    }
  },
});

// Create new GitHub repository
export const createRepository = action({
  args: {
    projectId: v.id("projects"),
    repoName: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; repoUrl: string }> => {
    const accessToken = await getGithubAccessToken(ctx);
    if (!accessToken) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }
    
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vibe-Coder",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: args.repoName,
        description: args.description || "Created with Vibe Coder",
        private: args.isPrivate,
        auto_init: true,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create repository: ${error.message}`);
    }
    
    const repo = await response.json();
    
    // Update project with GitHub info
    await ctx.runMutation(internal.projects.updateGithubInfo, {
      projectId: args.projectId,
      repoUrl: repo.html_url,
      syncEnabled: true,
    });
    
    return { success: true, repoUrl: repo.html_url };
  },
});

// Sync local changes to GitHub
export const syncToGithub = action({
  args: {
    projectId: v.id("projects"),
    commitMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const accessToken = await getGithubAccessToken(ctx);
    if (!accessToken) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }
    
    // This is a placeholder for the full sync implementation
    // Full implementation would:
    // 1. Get all project files
    // 2. Create a tree with all files
    // 3. Create a commit
    // 4. Update the branch reference
    
    throw new Error("Sync to GitHub not yet fully implemented");
  },
});

// Sync GitHub changes to local
export const syncFromGithub = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const accessToken = await getGithubAccessToken(ctx);
    if (!accessToken) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }
    
    // This is a placeholder for the full sync implementation
    // Full implementation would:
    // 1. Fetch latest commit from GitHub
    // 2. Compare with local version
    // 3. Pull changed files
    // 4. Update local files
    
    throw new Error("Sync from GitHub not yet fully implemented");
  },
});

async function processRepoFiles(
  ctx: any,
  projectId: any,
  repoFullName: string,
  tree: any[],
  accessToken: string
) {
  const files = tree.filter((item: any) => item.type === "blob");
  
  for (const file of files) {
    try {
      const contentResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3.raw",
            "User-Agent": "Vibe-Coder",
          },
        }
      );
      
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        
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