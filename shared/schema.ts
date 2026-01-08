import { z } from "zod";

// AI Provider types
export const aiProviders = [
  "stability",
  "runway",
  "kling",
  "flux",
  "elevenlabs",
  "openai",
  "replicate",
  "ideogram",
  "dalle3",
  "pika",
  "luma",
] as const;

export type AIProvider = (typeof aiProviders)[number];

// API Settings schema
export const apiSettingSchema = z.object({
  id: z.string(),
  provider: z.enum(aiProviders),
  apiKey: z.string(),
  isConnected: z.boolean().default(false),
});

export type APISetting = z.infer<typeof apiSettingSchema>;
export type InsertAPISetting = Omit<APISetting, "id" | "isConnected">;

// Tile types
export type TileType = "image" | "video";
export type TileTab = "view" | "prompt";

// Tile schema
export const tileSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video"]),
  timelineId: z.string(),
  position: z.number(),
  prompt: z.string().default(""),
  provider: z.enum(aiProviders).optional(),
  model: z.string().optional(),
  mediaUrl: z.string().optional(),
  selectedFrame: z.number().default(0),
  isGenerating: z.boolean().default(false),
  duration: z.number().optional(), // for videos, in seconds
});

export type Tile = z.infer<typeof tileSchema>;
export type InsertTile = Omit<Tile, "id">;

// Timeline schema (simplified - no branching)
export const timelineSchema = z.object({
  id: z.string(),
  name: z.string().default("Main Timeline"),
  isCollapsed: z.boolean().default(false),
  order: z.number().default(0),
  height: z.number().optional(), // for resizable rows
});

export type Timeline = z.infer<typeof timelineSchema>;
export type InsertTimeline = Omit<Timeline, "id">;

// Tile Link schema - for linking tiles across timelines
export const tileLinkSchema = z.object({
  id: z.string(),
  tileId: z.string(),
  timelineId: z.string(),
  order: z.number(), // position in the linked sequence
});

export type TileLink = z.infer<typeof tileLinkSchema>;
export type InsertTileLink = Omit<TileLink, "id">;

// Audio Track schema
export const audioTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["voice", "music", "sfx"]),
  audioUrl: z.string().optional(),
  startTime: z.number().default(0),
  duration: z.number().default(0),
  volume: z.number().default(1),
  isMuted: z.boolean().default(false),
  isSolo: z.boolean().default(false),
  fadeIn: z.number().default(0),
  fadeOut: z.number().default(0),
});

export type AudioTrack = z.infer<typeof audioTrackSchema>;
export type InsertAudioTrack = Omit<AudioTrack, "id">;

// Audio Clip schema (clips within tracks)
export const audioClipSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  name: z.string(),
  audioUrl: z.string().optional(),
  startTime: z.number(),
  duration: z.number(),
  trimStart: z.number().default(0),
  trimEnd: z.number().default(0),
  prompt: z.string().optional(),
  provider: z.enum(aiProviders).optional(),
});

export type AudioClip = z.infer<typeof audioClipSchema>;
export type InsertAudioClip = Omit<AudioClip, "id">;

// Export Selection for smart export
export const exportSelectionSchema = z.object({
  timelineIds: z.array(z.string()),
  startTileId: z.string().optional(),
  endTileId: z.string().optional(),
  includeAudio: z.boolean().default(true),
});

export type ExportSelection = z.infer<typeof exportSelectionSchema>;

// Project schema (overall project state)
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled Project"),
  timelines: z.array(timelineSchema),
  tiles: z.array(tileSchema),
  tileLinks: z.array(tileLinkSchema),
  audioTracks: z.array(audioTrackSchema),
  audioClips: z.array(audioClipSchema),
});

export type Project = z.infer<typeof projectSchema>;

// Insert schemas for API
export const insertTileSchema = tileSchema.omit({ id: true });
export const insertTimelineSchema = timelineSchema.omit({ id: true });
export const insertTileLinkSchema = tileLinkSchema.omit({ id: true });
export const insertAudioTrackSchema = audioTrackSchema.omit({ id: true });
export const insertAudioClipSchema = audioClipSchema.omit({ id: true });
export const insertApiSettingSchema = apiSettingSchema.omit({ id: true, isConnected: true });

// Legacy user schema for compatibility
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
