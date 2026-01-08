import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTileSchema,
  insertTimelineSchema,
  insertTileLinkSchema,
  insertAudioTrackSchema,
  insertAudioClipSchema,
  insertApiSettingSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Timelines
  app.get("/api/timelines", async (req, res) => {
    const timelines = await storage.getTimelines();
    res.json(timelines);
  });

  app.get("/api/timelines/:id", async (req, res) => {
    const timeline = await storage.getTimeline(req.params.id);
    if (!timeline) {
      return res.status(404).json({ error: "Timeline not found" });
    }
    res.json(timeline);
  });

  app.post("/api/timelines", async (req, res) => {
    try {
      const data = insertTimelineSchema.parse(req.body);
      const timeline = await storage.createTimeline(data);
      res.status(201).json(timeline);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/timelines/:id", async (req, res) => {
    const timeline = await storage.updateTimeline(req.params.id, req.body);
    if (!timeline) {
      return res.status(404).json({ error: "Timeline not found" });
    }
    res.json(timeline);
  });

  app.delete("/api/timelines/:id", async (req, res) => {
    const deleted = await storage.deleteTimeline(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Timeline not found" });
    }
    res.status(204).send();
  });

  // Tiles
  app.get("/api/tiles", async (req, res) => {
    const { timelineId } = req.query;
    if (timelineId && typeof timelineId === "string") {
      const tiles = await storage.getTilesByTimeline(timelineId);
      return res.json(tiles);
    }
    const tiles = await storage.getTiles();
    res.json(tiles);
  });

  app.get("/api/tiles/:id", async (req, res) => {
    const tile = await storage.getTile(req.params.id);
    if (!tile) {
      return res.status(404).json({ error: "Tile not found" });
    }
    res.json(tile);
  });

  app.post("/api/tiles", async (req, res) => {
    try {
      const data = insertTileSchema.parse(req.body);
      const tile = await storage.createTile(data);
      res.status(201).json(tile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/tiles/:id", async (req, res) => {
    const tile = await storage.updateTile(req.params.id, req.body);
    if (!tile) {
      return res.status(404).json({ error: "Tile not found" });
    }
    res.json(tile);
  });

  app.delete("/api/tiles/:id", async (req, res) => {
    const deleted = await storage.deleteTile(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Tile not found" });
    }
    res.status(204).send();
  });

  // Tile Links
  app.get("/api/tile-links", async (req, res) => {
    const links = await storage.getTileLinks();
    res.json(links);
  });

  app.post("/api/tile-links", async (req, res) => {
    try {
      const data = insertTileLinkSchema.parse(req.body);
      const link = await storage.createTileLink(data);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/tile-links/:id", async (req, res) => {
    const deleted = await storage.deleteTileLink(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Tile link not found" });
    }
    res.status(204).send();
  });

  app.delete("/api/tile-links", async (req, res) => {
    await storage.clearTileLinks();
    res.status(204).send();
  });

  // Audio Tracks
  app.get("/api/audio-tracks", async (req, res) => {
    const tracks = await storage.getAudioTracks();
    res.json(tracks);
  });

  app.get("/api/audio-tracks/:id", async (req, res) => {
    const track = await storage.getAudioTrack(req.params.id);
    if (!track) {
      return res.status(404).json({ error: "Audio track not found" });
    }
    res.json(track);
  });

  app.post("/api/audio-tracks", async (req, res) => {
    try {
      const data = insertAudioTrackSchema.parse(req.body);
      const track = await storage.createAudioTrack(data);
      res.status(201).json(track);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/audio-tracks/:id", async (req, res) => {
    const track = await storage.updateAudioTrack(req.params.id, req.body);
    if (!track) {
      return res.status(404).json({ error: "Audio track not found" });
    }
    res.json(track);
  });

  app.delete("/api/audio-tracks/:id", async (req, res) => {
    const deleted = await storage.deleteAudioTrack(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Audio track not found" });
    }
    res.status(204).send();
  });

  // Audio Clips
  app.get("/api/audio-clips", async (req, res) => {
    const { trackId } = req.query;
    if (trackId && typeof trackId === "string") {
      const clips = await storage.getAudioClipsByTrack(trackId);
      return res.json(clips);
    }
    const clips = await storage.getAudioClips();
    res.json(clips);
  });

  app.get("/api/audio-clips/:id", async (req, res) => {
    const clip = await storage.getAudioClip(req.params.id);
    if (!clip) {
      return res.status(404).json({ error: "Audio clip not found" });
    }
    res.json(clip);
  });

  app.post("/api/audio-clips", async (req, res) => {
    try {
      const data = insertAudioClipSchema.parse(req.body);
      const clip = await storage.createAudioClip(data);
      res.status(201).json(clip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/audio-clips/:id", async (req, res) => {
    const clip = await storage.updateAudioClip(req.params.id, req.body);
    if (!clip) {
      return res.status(404).json({ error: "Audio clip not found" });
    }
    res.json(clip);
  });

  app.delete("/api/audio-clips/:id", async (req, res) => {
    const deleted = await storage.deleteAudioClip(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Audio clip not found" });
    }
    res.status(204).send();
  });

  // API Settings
  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getApiSettings();
    const sanitized = settings.map((s) => ({
      ...s,
      apiKey: s.apiKey ? "••••••••" : "",
    }));
    res.json(sanitized);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = insertApiSettingSchema.parse(req.body);
      const setting = await storage.saveApiSetting(data);
      res.status(201).json({
        ...setting,
        apiKey: setting.apiKey ? "••••••••" : "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/settings/:provider", async (req, res) => {
    const deleted = await storage.deleteApiSetting(req.params.provider);
    if (!deleted) {
      return res.status(404).json({ error: "Setting not found" });
    }
    res.status(204).send();
  });

  // Generation endpoints (placeholder)
  const generateSchema = z.object({
    prompt: z.string(),
    provider: z.string().optional(),
    tileId: z.string(),
  });

  app.post("/api/generate/image", async (req, res) => {
    try {
      const data = generateSchema.parse(req.body);
      const provider = data.provider || "flux";
      
      console.log(`[Generate Image] Provider: ${provider}, Prompt: "${data.prompt.substring(0, 50)}..."`);
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const imageUrl = `https://picsum.photos/seed/${data.tileId}/800/450`;
      
      res.json({
        success: true,
        mediaUrl: imageUrl,
        provider: provider,
        message: `Image generated with ${provider} (placeholder)`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Generation failed" });
    }
  });

  app.post("/api/generate/video", async (req, res) => {
    try {
      const data = generateSchema.parse(req.body);
      const provider = data.provider || "runway";
      
      console.log(`[Generate Video] Provider: ${provider}, Prompt: "${data.prompt.substring(0, 50)}..."`);
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const videoUrl = `https://picsum.photos/seed/${data.tileId}/800/450`;
      
      res.json({
        success: true,
        mediaUrl: videoUrl,
        provider: provider,
        message: `Video generated with ${provider} (placeholder - showing image)`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Generation failed" });
    }
  });

  app.post("/api/generate/audio", async (req, res) => {
    try {
      const data = z.object({
        prompt: z.string(),
        provider: z.string().optional(),
        clipId: z.string(),
        type: z.enum(["voice", "music", "sfx"]),
      }).parse(req.body);
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      res.json({
        success: true,
        audioUrl: null,
        message: "Audio generated successfully (placeholder)",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Generation failed" });
    }
  });

  // Export endpoint (placeholder)
  app.post("/api/export", async (req, res) => {
    try {
      const data = z.object({
        timelineIds: z.array(z.string()),
        includeAudio: z.boolean().default(true),
      }).parse(req.body);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      res.json({
        success: true,
        exportUrl: null,
        message: "Export completed (placeholder)",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Export failed" });
    }
  });

  return httpServer;
}
