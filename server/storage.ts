import { randomUUID } from "crypto";
import type {
  Tile,
  InsertTile,
  Timeline,
  InsertTimeline,
  TileLink,
  InsertTileLink,
  LinkedSegment,
  InsertLinkedSegment,
  AudioTrack,
  InsertAudioTrack,
  AudioClip,
  InsertAudioClip,
  APISetting,
  InsertAPISetting,
} from "@shared/schema";

export interface IStorage {
  // Timelines
  getTimelines(): Promise<Timeline[]>;
  getTimeline(id: string): Promise<Timeline | undefined>;
  createTimeline(timeline: InsertTimeline): Promise<Timeline>;
  updateTimeline(id: string, updates: Partial<Timeline>): Promise<Timeline | undefined>;
  deleteTimeline(id: string): Promise<boolean>;

  // Tiles
  getTiles(): Promise<Tile[]>;
  getTilesByTimeline(timelineId: string): Promise<Tile[]>;
  getTile(id: string): Promise<Tile | undefined>;
  createTile(tile: InsertTile): Promise<Tile>;
  updateTile(id: string, updates: Partial<Tile>): Promise<Tile | undefined>;
  deleteTile(id: string): Promise<boolean>;

  // Tile Links (legacy)
  getTileLinks(): Promise<TileLink[]>;
  getTileLink(id: string): Promise<TileLink | undefined>;
  createTileLink(link: InsertTileLink): Promise<TileLink>;
  deleteTileLink(id: string): Promise<boolean>;
  clearTileLinks(): Promise<boolean>;

  // Linked Segments
  getLinkedSegments(): Promise<LinkedSegment[]>;
  getLinkedSegment(id: string): Promise<LinkedSegment | undefined>;
  createLinkedSegment(segment: InsertLinkedSegment): Promise<LinkedSegment>;
  deleteLinkedSegment(id: string): Promise<boolean>;
  deleteLinkedSegmentByTimelinePosition(timelineId: string, position: number): Promise<boolean>;
  clearLinkedSegments(): Promise<boolean>;

  // Audio Tracks
  getAudioTracks(): Promise<AudioTrack[]>;
  getAudioTrack(id: string): Promise<AudioTrack | undefined>;
  createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  updateAudioTrack(id: string, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined>;
  deleteAudioTrack(id: string): Promise<boolean>;

  // Audio Clips
  getAudioClips(): Promise<AudioClip[]>;
  getAudioClipsByTrack(trackId: string): Promise<AudioClip[]>;
  getAudioClip(id: string): Promise<AudioClip | undefined>;
  createAudioClip(clip: InsertAudioClip): Promise<AudioClip>;
  updateAudioClip(id: string, updates: Partial<AudioClip>): Promise<AudioClip | undefined>;
  deleteAudioClip(id: string): Promise<boolean>;

  // API Settings
  getApiSettings(): Promise<APISetting[]>;
  getApiSetting(provider: string): Promise<APISetting | undefined>;
  saveApiSetting(setting: InsertAPISetting): Promise<APISetting>;
  deleteApiSetting(provider: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private timelines: Map<string, Timeline>;
  private tiles: Map<string, Tile>;
  private tileLinks: Map<string, TileLink>;
  private linkedSegments: Map<string, LinkedSegment>;
  private audioTracks: Map<string, AudioTrack>;
  private audioClips: Map<string, AudioClip>;
  private apiSettings: Map<string, APISetting>;

  constructor() {
    this.timelines = new Map();
    this.tiles = new Map();
    this.tileLinks = new Map();
    this.linkedSegments = new Map();
    this.audioTracks = new Map();
    this.audioClips = new Map();
    this.apiSettings = new Map();
  }

  // Timelines
  async getTimelines(): Promise<Timeline[]> {
    return Array.from(this.timelines.values());
  }

  async getTimeline(id: string): Promise<Timeline | undefined> {
    return this.timelines.get(id);
  }

  async createTimeline(insertTimeline: InsertTimeline): Promise<Timeline> {
    const id = randomUUID();
    const timeline: Timeline = { ...insertTimeline, id };
    this.timelines.set(id, timeline);
    return timeline;
  }

  async updateTimeline(id: string, updates: Partial<Timeline>): Promise<Timeline | undefined> {
    const existing = this.timelines.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.timelines.set(id, updated);
    return updated;
  }

  async deleteTimeline(id: string): Promise<boolean> {
    const tilesToDelete = Array.from(this.tiles.values()).filter((t) => t.timelineId === id);
    tilesToDelete.forEach((t) => this.tiles.delete(t.id));
    
    const linksToDelete = Array.from(this.tileLinks.values()).filter((l) => l.timelineId === id);
    linksToDelete.forEach((l) => this.tileLinks.delete(l.id));
    
    const segmentsToDelete = Array.from(this.linkedSegments.values()).filter((s) => s.timelineId === id);
    segmentsToDelete.forEach((s) => this.linkedSegments.delete(s.id));
    this.reindexLinkedSegments();
    
    return this.timelines.delete(id);
  }

  // Tiles
  async getTiles(): Promise<Tile[]> {
    return Array.from(this.tiles.values());
  }

  async getTilesByTimeline(timelineId: string): Promise<Tile[]> {
    return Array.from(this.tiles.values()).filter((t) => t.timelineId === timelineId);
  }

  async getTile(id: string): Promise<Tile | undefined> {
    return this.tiles.get(id);
  }

  async createTile(insertTile: InsertTile): Promise<Tile> {
    const id = randomUUID();
    const tile: Tile = { ...insertTile, id };
    this.tiles.set(id, tile);
    return tile;
  }

  async updateTile(id: string, updates: Partial<Tile>): Promise<Tile | undefined> {
    const existing = this.tiles.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.tiles.set(id, updated);
    return updated;
  }

  async deleteTile(id: string): Promise<boolean> {
    const tile = this.tiles.get(id);
    
    const linksToDelete = Array.from(this.tileLinks.values()).filter((l) => l.tileId === id);
    linksToDelete.forEach((l) => this.tileLinks.delete(l.id));
    
    if (tile) {
      const segmentsToDelete = Array.from(this.linkedSegments.values()).filter(
        (s) => s.timelineId === tile.timelineId && s.position === tile.position
      );
      segmentsToDelete.forEach((s) => this.linkedSegments.delete(s.id));
      this.reindexLinkedSegments();
    }
    
    return this.tiles.delete(id);
  }

  // Tile Links
  async getTileLinks(): Promise<TileLink[]> {
    return Array.from(this.tileLinks.values()).sort((a, b) => a.order - b.order);
  }

  async getTileLink(id: string): Promise<TileLink | undefined> {
    return this.tileLinks.get(id);
  }

  async createTileLink(insertLink: InsertTileLink): Promise<TileLink> {
    const id = randomUUID();
    const link: TileLink = { ...insertLink, id };
    this.tileLinks.set(id, link);
    return link;
  }

  async deleteTileLink(id: string): Promise<boolean> {
    return this.tileLinks.delete(id);
  }

  async clearTileLinks(): Promise<boolean> {
    this.tileLinks.clear();
    return true;
  }

  // Linked Segments
  async getLinkedSegments(): Promise<LinkedSegment[]> {
    return Array.from(this.linkedSegments.values()).sort((a, b) => a.order - b.order);
  }

  async getLinkedSegment(id: string): Promise<LinkedSegment | undefined> {
    return this.linkedSegments.get(id);
  }

  async createLinkedSegment(insertSegment: InsertLinkedSegment): Promise<LinkedSegment> {
    const id = randomUUID();
    const existingSegments = Array.from(this.linkedSegments.values());
    const maxOrder = existingSegments.length > 0 
      ? Math.max(...existingSegments.map((s) => s.order)) + 1 
      : 0;
    const segment: LinkedSegment = { ...insertSegment, id, order: maxOrder };
    this.linkedSegments.set(id, segment);
    return segment;
  }

  async deleteLinkedSegment(id: string): Promise<boolean> {
    const result = this.linkedSegments.delete(id);
    this.reindexLinkedSegments();
    return result;
  }

  async deleteLinkedSegmentByTimelinePosition(timelineId: string, position: number): Promise<boolean> {
    const segment = Array.from(this.linkedSegments.values()).find(
      (s) => s.timelineId === timelineId && s.position === position
    );
    if (segment) {
      const result = this.linkedSegments.delete(segment.id);
      this.reindexLinkedSegments();
      return result;
    }
    return false;
  }

  private reindexLinkedSegments(): void {
    const sorted = Array.from(this.linkedSegments.values()).sort((a, b) => a.order - b.order);
    sorted.forEach((segment, index) => {
      if (segment.order !== index) {
        this.linkedSegments.set(segment.id, { ...segment, order: index });
      }
    });
  }

  async clearLinkedSegments(): Promise<boolean> {
    this.linkedSegments.clear();
    return true;
  }

  // Audio Tracks
  async getAudioTracks(): Promise<AudioTrack[]> {
    return Array.from(this.audioTracks.values());
  }

  async getAudioTrack(id: string): Promise<AudioTrack | undefined> {
    return this.audioTracks.get(id);
  }

  async createAudioTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const id = randomUUID();
    const track: AudioTrack = { ...insertTrack, id };
    this.audioTracks.set(id, track);
    return track;
  }

  async updateAudioTrack(id: string, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    const existing = this.audioTracks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.audioTracks.set(id, updated);
    return updated;
  }

  async deleteAudioTrack(id: string): Promise<boolean> {
    return this.audioTracks.delete(id);
  }

  // Audio Clips
  async getAudioClips(): Promise<AudioClip[]> {
    return Array.from(this.audioClips.values());
  }

  async getAudioClipsByTrack(trackId: string): Promise<AudioClip[]> {
    return Array.from(this.audioClips.values()).filter((c) => c.trackId === trackId);
  }

  async getAudioClip(id: string): Promise<AudioClip | undefined> {
    return this.audioClips.get(id);
  }

  async createAudioClip(insertClip: InsertAudioClip): Promise<AudioClip> {
    const id = randomUUID();
    const clip: AudioClip = { ...insertClip, id };
    this.audioClips.set(id, clip);
    return clip;
  }

  async updateAudioClip(id: string, updates: Partial<AudioClip>): Promise<AudioClip | undefined> {
    const existing = this.audioClips.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.audioClips.set(id, updated);
    return updated;
  }

  async deleteAudioClip(id: string): Promise<boolean> {
    return this.audioClips.delete(id);
  }

  // API Settings
  async getApiSettings(): Promise<APISetting[]> {
    return Array.from(this.apiSettings.values());
  }

  async getApiSetting(provider: string): Promise<APISetting | undefined> {
    return Array.from(this.apiSettings.values()).find((s) => s.provider === provider);
  }

  async saveApiSetting(insertSetting: InsertAPISetting): Promise<APISetting> {
    const existing = Array.from(this.apiSettings.values()).find(
      (s) => s.provider === insertSetting.provider
    );
    
    if (existing) {
      const updated: APISetting = { 
        ...existing, 
        ...insertSetting, 
        isConnected: insertSetting.apiKey ? true : false 
      };
      this.apiSettings.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const setting: APISetting = { 
      ...insertSetting, 
      id, 
      isConnected: insertSetting.apiKey ? true : false 
    };
    this.apiSettings.set(id, setting);
    return setting;
  }

  async deleteApiSetting(provider: string): Promise<boolean> {
    const setting = Array.from(this.apiSettings.values()).find((s) => s.provider === provider);
    if (!setting) return false;
    return this.apiSettings.delete(setting.id);
  }
}

export const storage = new MemStorage();
