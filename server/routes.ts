import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTileSchema,
  insertTimelineSchema,
  insertTileLinkSchema,
  insertLinkedSegmentSchema,
  insertAudioTrackSchema,
  insertAudioClipSchema,
  insertApiSettingSchema,
} from "@shared/schema";
import { z } from "zod";
import {
  validateApiKey,
  generateImage,
  generateVideo,
  checkJobStatus,
  storeJob,
  getJob,
  removeJob,
} from "./providers";

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

  // Linked Segments
  app.get("/api/linked-segments", async (req, res) => {
    const segments = await storage.getLinkedSegments();
    res.json(segments);
  });

  app.post("/api/linked-segments", async (req, res) => {
    try {
      const data = insertLinkedSegmentSchema.parse(req.body);
      const segment = await storage.createLinkedSegment(data);
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/linked-segments/:id", async (req, res) => {
    const deleted = await storage.deleteLinkedSegment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Linked segment not found" });
    }
    res.status(204).send();
  });

  app.delete("/api/linked-segments", async (req, res) => {
    const { timelineId, position } = req.query;
    if (timelineId && position) {
      await storage.deleteLinkedSegmentByTimelinePosition(
        timelineId as string, 
        parseInt(position as string)
      );
    } else {
      await storage.clearLinkedSegments();
    }
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
    const sorted = settings.sort((a, b) => a.priority - b.priority);
    const sanitized = sorted.map((s) => ({
      ...s,
      apiKey: s.apiKey ? "••••••••" : "",
    }));
    res.json(sanitized);
  });

  app.get("/api/settings/connected-providers", async (req, res) => {
    const settings = await storage.getApiSettings();
    const connected = settings.filter((s) => s.isConnected).map((s) => s.provider);
    
    const imageProviders = ["stability", "flux", "openai", "dalle3", "ideogram", "replicate"];
    const videoProviders = ["runway", "kling", "pika", "luma", "replicate"];
    
    res.json({
      image: connected.filter((p) => imageProviders.includes(p)),
      video: connected.filter((p) => videoProviders.includes(p)),
    });
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = insertApiSettingSchema.parse(req.body);
      
      const validation = await validateApiKey(data.provider, data.apiKey);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: validation.error || "Invalid API key",
          validated: false,
        });
      }
      
      const setting = await storage.saveApiSetting(data);
      
      res.status(201).json({
        ...setting,
        apiKey: "••••••••",
        isConnected: true,
        validated: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("[Settings] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/settings/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      if (updates.apiKey) {
        const existingSetting = await storage.getApiSettingById(id);
        if (existingSetting) {
          const validation = await validateApiKey(existingSetting.provider, updates.apiKey);
          if (!validation.valid) {
            return res.status(400).json({ 
              error: validation.error || "Invalid API key",
              validated: false,
            });
          }
          updates.isConnected = true;
        }
      }
      
      const setting = await storage.updateApiSetting(id, updates);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json({
        ...setting,
        apiKey: setting.apiKey ? "••••••••" : "",
      });
    } catch (error) {
      console.error("[Settings Update] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/settings/:id", async (req, res) => {
    const deleted = await storage.deleteApiSettingById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Setting not found" });
    }
    res.status(204).send();
  });

  app.post("/api/settings/reorder", async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds must be an array" });
      }
      const reordered = await storage.reorderApiSettings(orderedIds);
      const sanitized = reordered.map((s) => ({
        ...s,
        apiKey: s.apiKey ? "••••••••" : "",
      }));
      res.json(sanitized);
    } catch (error) {
      console.error("[Settings Reorder] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reset provider status (for manual recovery)
  app.post("/api/settings/:id/reset-status", async (req, res) => {
    try {
      const id = req.params.id;
      const setting = await storage.updateApiSetting(id, {
        status: "active",
        lastFailureAt: undefined,
        failureReason: undefined,
      });
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json({
        ...setting,
        apiKey: setting.apiKey ? "••••••••" : "",
      });
    } catch (error) {
      console.error("[Settings Reset Status] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generation endpoints
  const generateSchema = z.object({
    prompt: z.string(),
    provider: z.string().optional(),
    providerInstanceId: z.string().optional(),
    tileId: z.string(),
    referenceImageUrl: z.string().optional(),
  });

  // Free providers that don't require API keys
  const FREE_IMAGE_PROVIDERS = ["pollinations", "huggingface"];
  const IMAGE_PROVIDERS = ["stability", "flux", "openai", "dalle3", "replicate", "gemini", "ideogram", "huggingface", "pollinations"];

  // Check if error indicates quota/rate limit issues
  function isQuotaOrRateLimitError(error: string): { isDepleted: boolean; isRateLimited: boolean } {
    const lowerError = error.toLowerCase();
    const isDepleted = lowerError.includes("quota") || lowerError.includes("insufficient") || 
                       lowerError.includes("exceeded") || lowerError.includes("limit reached") ||
                       lowerError.includes("billing") || lowerError.includes("payment");
    const isRateLimited = lowerError.includes("rate limit") || lowerError.includes("too many requests") ||
                          lowerError.includes("throttl");
    return { isDepleted, isRateLimited };
  }

  // Update provider status on failure
  async function updateProviderStatusOnFailure(settingId: string, error: string) {
    const { isDepleted, isRateLimited } = isQuotaOrRateLimitError(error);
    if (isDepleted) {
      await storage.updateApiSetting(settingId, {
        status: "depleted",
        lastFailureAt: new Date().toISOString(),
        failureReason: error,
      });
      console.log(`[Provider] Marked ${settingId} as depleted`);
    } else if (isRateLimited) {
      await storage.updateApiSetting(settingId, {
        status: "temporarily_blocked",
        lastFailureAt: new Date().toISOString(),
        failureReason: error,
      });
      console.log(`[Provider] Marked ${settingId} as rate limited`);
    }
    return { isDepleted, isRateLimited };
  }

  // Check if a provider can be retried (cooldown expired)
  const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute for rate limits
  const DEPLETED_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours for depleted (quota exhausted)

  function canRetryProvider(setting: { status?: string; lastFailureAt?: string }): boolean {
    if (setting.status === "active") return true;
    if (!setting.lastFailureAt) return true;
    
    const lastFailure = new Date(setting.lastFailureAt).getTime();
    const now = Date.now();
    
    if (setting.status === "temporarily_blocked") {
      return now - lastFailure > RATE_LIMIT_COOLDOWN_MS;
    }
    if (setting.status === "depleted") {
      return now - lastFailure > DEPLETED_COOLDOWN_MS;
    }
    return true;
  }

  // Get providers sorted by priority, include providers past their cooldown period
  async function getImageProvidersInPriorityOrder(): Promise<Array<{ id: string; provider: string; apiKey: string; isFree: boolean }>> {
    const settings = await storage.getApiSettings();
    const imageSettings = settings
      .filter((s) => IMAGE_PROVIDERS.includes(s.provider) && s.isConnected && (s.status === "active" || canRetryProvider(s)))
      .sort((a, b) => {
        // Active providers first
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        // Then by priority
        return a.priority - b.priority;
      });
    
    // Separate paid and free
    const paidProviders = imageSettings
      .filter((s) => !FREE_IMAGE_PROVIDERS.includes(s.provider))
      .map((s) => ({ id: s.id, provider: s.provider, apiKey: s.apiKey, isFree: false }));
    
    const freeProviders = imageSettings
      .filter((s) => FREE_IMAGE_PROVIDERS.includes(s.provider))
      .map((s) => ({ id: s.id, provider: s.provider, apiKey: s.apiKey, isFree: true }));
    
    // Always include Pollinations as ultimate fallback
    if (!freeProviders.some((p) => p.provider === "pollinations")) {
      freeProviders.push({ id: "__pollinations__", provider: "pollinations", apiKey: "", isFree: true });
    }
    
    return [...paidProviders, ...freeProviders];
  }

  app.post("/api/generate/image", async (req, res) => {
    try {
      const data = generateSchema.parse(req.body);
      const providersToTry = await getImageProvidersInPriorityOrder();
      
      // If specific instance requested, try that first (even if non-active - user explicitly selected it)
      if (data.providerInstanceId) {
        const settings = await storage.getApiSettings();
        const specificSetting = settings.find((s) => s.id === data.providerInstanceId);
        if (specificSetting && specificSetting.isConnected) {
          // Remove from existing position if present
          const existing = providersToTry.findIndex((p) => p.id === specificSetting.id);
          if (existing >= 0) {
            providersToTry.splice(existing, 1);
          }
          // Add at front regardless of status - user explicitly requested this provider
          providersToTry.unshift({
            id: specificSetting.id,
            provider: specificSetting.provider,
            apiKey: specificSetting.apiKey,
            isFree: FREE_IMAGE_PROVIDERS.includes(specificSetting.provider),
          });
        }
      }
      
      let lastError = "";
      let usedProvider = "";
      let usedProviderId = "";
      
      for (const providerInfo of providersToTry) {
        console.log(`[Generate Image] Trying provider: ${providerInfo.provider} (${providerInfo.id})`);
        
        try {
          const result = await generateImage(providerInfo.provider, data.prompt, providerInfo.apiKey, data.referenceImageUrl);
          
          if (result.success) {
            usedProvider = providerInfo.provider;
            usedProviderId = providerInfo.id;
            
            // Reset provider status to active on successful generation
            if (providerInfo.id !== "__pollinations__") {
              await storage.updateApiSetting(providerInfo.id, {
                status: "active",
                lastFailureAt: undefined,
                failureReason: undefined,
              });
            }
            
            if (result.jobId) {
              storeJob(data.tileId, providerInfo.provider, result.jobId, "image");
              return res.json({
                success: true,
                jobId: result.jobId,
                provider: providerInfo.provider,
                providerId: providerInfo.id,
                status: "processing",
                message: "Generation started",
              });
            }
            
            return res.json({
              success: true,
              mediaUrl: result.mediaUrl,
              provider: providerInfo.provider,
              providerId: providerInfo.id,
              message: `Image generated with ${providerInfo.provider}`,
            });
          }
          
          lastError = result.error || "Unknown error";
          console.log(`[Generate Image] ${providerInfo.provider} failed: ${lastError}`);
          
          // Update provider status if it's a quota/rate limit issue
          if (providerInfo.id !== "__pollinations__") {
            const statusUpdate = await updateProviderStatusOnFailure(providerInfo.id, lastError);
            if (statusUpdate.isDepleted || statusUpdate.isRateLimited) {
              continue; // Try next provider
            }
          }
        } catch (providerError: any) {
          lastError = providerError.message || "Provider error";
          console.log(`[Generate Image] ${providerInfo.provider} threw error: ${lastError}`);
          
          if (providerInfo.id !== "__pollinations__") {
            await updateProviderStatusOnFailure(providerInfo.id, lastError);
          }
        }
      }
      
      // All providers failed
      console.error(`[Generate Image] All providers failed. Last error: ${lastError}`);
      return res.status(500).json({ 
        success: false, 
        error: lastError || "All providers failed",
        provider: usedProvider,
      });
    } catch (error) {
      console.error("[Generate Image] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Generation failed" });
    }
  });

  const VIDEO_PROVIDERS = ["runway", "kling", "pika", "luma", "veo", "replicate"];

  // Get video providers sorted by priority, include providers past their cooldown period
  async function getVideoProvidersInPriorityOrder(): Promise<Array<{ id: string; provider: string; apiKey: string }>> {
    const settings = await storage.getApiSettings();
    return settings
      .filter((s) => VIDEO_PROVIDERS.includes(s.provider) && s.isConnected && (s.status === "active" || canRetryProvider(s)))
      .sort((a, b) => {
        // Active providers first
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        // Then by priority
        return a.priority - b.priority;
      })
      .map((s) => ({ id: s.id, provider: s.provider, apiKey: s.apiKey }));
  }

  app.post("/api/generate/video", async (req, res) => {
    try {
      const data = generateSchema.parse(req.body);
      const providersToTry = await getVideoProvidersInPriorityOrder();
      
      // If specific instance requested, try that first (even if non-active - user explicitly selected it)
      if (data.providerInstanceId) {
        const settings = await storage.getApiSettings();
        const specificSetting = settings.find((s) => s.id === data.providerInstanceId);
        if (specificSetting && specificSetting.isConnected) {
          // Remove from existing position if present
          const existing = providersToTry.findIndex((p) => p.id === specificSetting.id);
          if (existing >= 0) {
            providersToTry.splice(existing, 1);
          }
          // Add at front regardless of status - user explicitly requested this provider
          providersToTry.unshift({
            id: specificSetting.id,
            provider: specificSetting.provider,
            apiKey: specificSetting.apiKey,
          });
        }
      }
      
      // If no connected video providers, return placeholder
      if (providersToTry.length === 0) {
        console.log(`[Generate Video] No connected video providers, using placeholder`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return res.json({
          success: true,
          mediaUrl: `https://picsum.photos/seed/${data.tileId}/800/450`,
          provider: "placeholder",
          message: "No video AI provider connected. Add Runway, Luma, or Veo API key in Settings.",
        });
      }
      
      let lastError = "";
      
      for (const providerInfo of providersToTry) {
        console.log(`[Generate Video] Trying provider: ${providerInfo.provider} (${providerInfo.id})`);
        
        try {
          const result = await generateVideo(providerInfo.provider, data.prompt, providerInfo.apiKey, data.referenceImageUrl);
          
          if (result.success) {
            // Reset provider status to active on successful generation
            await storage.updateApiSetting(providerInfo.id, {
              status: "active",
              lastFailureAt: undefined,
              failureReason: undefined,
            });
            
            if (result.jobId) {
              storeJob(data.tileId, providerInfo.provider, result.jobId, "video");
              return res.json({
                success: true,
                jobId: result.jobId,
                provider: providerInfo.provider,
                providerId: providerInfo.id,
                status: "processing",
                message: "Video generation started",
              });
            }
            
            return res.json({
              success: true,
              mediaUrl: result.mediaUrl,
              provider: providerInfo.provider,
              providerId: providerInfo.id,
              message: `Video generated with ${providerInfo.provider}`,
            });
          }
          
          lastError = result.error || "Unknown error";
          console.log(`[Generate Video] ${providerInfo.provider} failed: ${lastError}`);
          
          await updateProviderStatusOnFailure(providerInfo.id, lastError);
        } catch (providerError: any) {
          lastError = providerError.message || "Provider error";
          console.log(`[Generate Video] ${providerInfo.provider} threw error: ${lastError}`);
          await updateProviderStatusOnFailure(providerInfo.id, lastError);
        }
      }
      
      // All providers failed
      console.error(`[Generate Video] All providers failed. Last error: ${lastError}`);
      return res.status(500).json({ 
        success: false, 
        error: lastError || "All providers failed",
      });
    } catch (error) {
      console.error("[Generate Video] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Generation failed" });
    }
  });

  app.get("/api/generate/status/:tileId", async (req, res) => {
    const job = getJob(req.params.tileId);
    
    if (!job) {
      return res.status(404).json({ error: "No active job for this tile" });
    }
    
    const settings = await storage.getApiSettings();
    const providerSetting = settings.find((s) => s.provider === job.provider);
    
    const apiKey = providerSetting?.apiKey || "";
    
    const status = await checkJobStatus(job.provider, job.jobId, apiKey);
    
    if (status.status === "completed" || status.status === "failed") {
      removeJob(req.params.tileId);
    }
    
    res.json({
      ...status,
      provider: job.provider,
      type: job.type,
    });
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
