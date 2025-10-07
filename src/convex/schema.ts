import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const subscriptionTierValidator = v.union(
  v.literal("free"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
);

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      subscriptionTier: v.optional(subscriptionTierValidator),
      tokensUsed: v.optional(v.number()),
      checksUsed: v.optional(v.number()),
    }).index("email", ["email"]),

    projects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      description: v.optional(v.string()),
      slug: v.string(),
      content: v.string(),
      checksUsed: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_slug", ["slug"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;