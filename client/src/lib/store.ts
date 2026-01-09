import { create } from "zustand";
import type { Timeline, Tile, TileLink, AudioTrack, AudioClip, APISetting, AIProvider } from "@shared/schema";

export type WorkspacePreset = "default" | "wide-preview" | "tall-timelines" | "compact" | "custom" | "audio";

export type GoldenLayoutConfig = Record<string, unknown>;

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface WorkspaceLayout {
  preview: LayoutItem;
  toolbar: LayoutItem;
  timelines: LayoutItem;
}

export const WORKSPACE_PRESETS: Record<WorkspacePreset, WorkspaceLayout> = {
  default: {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 4, minW: 6, minH: 2 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 4, w: 11, h: 8, minW: 6, minH: 3 },
  },
  "wide-preview": {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 6, minW: 6, minH: 2 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 6, w: 11, h: 6, minW: 6, minH: 3 },
  },
  "tall-timelines": {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 3, minW: 6, minH: 2 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 3, w: 11, h: 9, minW: 6, minH: 3 },
  },
  compact: {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 2, minW: 6, minH: 2 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 2, w: 11, h: 10, minW: 6, minH: 3 },
  },
  custom: {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 4, minW: 6, minH: 2 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 4, w: 11, h: 8, minW: 6, minH: 3 },
  },
  audio: {
    preview: { i: "preview", x: 1, y: 0, w: 11, h: 0, minW: 6, minH: 0 },
    toolbar: { i: "toolbar", x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 4, static: true },
    timelines: { i: "timelines", x: 1, y: 0, w: 11, h: 12, minW: 6, minH: 3 },
  },
};

interface AppState {
  activeTab: "timeline" | "audio";
  setActiveTab: (tab: "timeline" | "audio") => void;
  
  timelines: Timeline[];
  setTimelines: (timelines: Timeline[]) => void;
  addTimeline: (timeline: Timeline) => void;
  updateTimeline: (id: string, updates: Partial<Timeline>) => void;
  removeTimeline: (id: string) => void;
  
  tiles: Tile[];
  setTiles: (tiles: Tile[]) => void;
  addTile: (tile: Tile) => void;
  updateTile: (id: string, updates: Partial<Tile>) => void;
  removeTile: (id: string) => void;
  
  tileLinks: TileLink[];
  setTileLinks: (links: TileLink[]) => void;
  addTileLink: (link: TileLink) => void;
  removeTileLink: (id: string) => void;
  clearTileLinks: () => void;
  
  audioTracks: AudioTrack[];
  setAudioTracks: (tracks: AudioTrack[]) => void;
  addAudioTrack: (track: AudioTrack) => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;
  
  audioClips: AudioClip[];
  setAudioClips: (clips: AudioClip[]) => void;
  addAudioClip: (clip: AudioClip) => void;
  updateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  removeAudioClip: (id: string) => void;
  
  apiSettings: APISetting[];
  setApiSettings: (settings: APISetting[]) => void;
  updateApiSetting: (provider: AIProvider, updates: Partial<APISetting>) => void;
  
  selectedTileId: string | null;
  setSelectedTileId: (id: string | null) => void;
  
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  
  isExportOpen: boolean;
  setExportOpen: (open: boolean) => void;
  
  isLinkModalOpen: boolean;
  setLinkModalOpen: (open: boolean) => void;
  
  activeTool: "select" | "link";
  setActiveTool: (tool: "select" | "link") => void;
  
  linkedSegments: { id?: string; timelineId: string; position: number; order: number }[];
  setLinkedSegments: (segments: { id?: string; timelineId: string; position: number; order: number }[]) => void;
  addLinkedSegment: (segment: { id: string; timelineId: string; position: number; order: number }) => void;
  removeLinkedSegment: (timelineId: string, position: number) => void;
  
  playheadPosition: number;
  setPlayheadPosition: (pos: number) => void;
  
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  
  workspacePreset: WorkspacePreset;
  setWorkspacePreset: (preset: WorkspacePreset) => void;
  customLayout: WorkspaceLayout | null;
  setCustomLayout: (layout: WorkspaceLayout) => void;
  isPreviewCollapsed: boolean;
  setPreviewCollapsed: (collapsed: boolean) => void;
  
  goldenLayoutConfig: GoldenLayoutConfig | null;
  setGoldenLayoutConfig: (config: GoldenLayoutConfig | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "timeline",
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  timelines: [],
  setTimelines: (timelines) => set({ timelines }),
  addTimeline: (timeline) => set((state) => ({ timelines: [...state.timelines, timeline] })),
  updateTimeline: (id, updates) => set((state) => ({
    timelines: state.timelines.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTimeline: (id) => set((state) => ({
    timelines: state.timelines.filter((t) => t.id !== id)
  })),
  
  tiles: [],
  setTiles: (tiles) => set({ tiles }),
  addTile: (tile) => set((state) => ({ tiles: [...state.tiles, tile] })),
  updateTile: (id, updates) => set((state) => ({
    tiles: state.tiles.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTile: (id) => set((state) => ({
    tiles: state.tiles.filter((t) => t.id !== id)
  })),
  
  tileLinks: [],
  setTileLinks: (links) => set({ tileLinks: links }),
  addTileLink: (link) => set((state) => ({ tileLinks: [...state.tileLinks, link] })),
  removeTileLink: (id) => set((state) => ({
    tileLinks: state.tileLinks.filter((l) => l.id !== id)
  })),
  clearTileLinks: () => set({ tileLinks: [] }),
  
  audioTracks: [],
  setAudioTracks: (tracks) => set({ audioTracks: tracks }),
  addAudioTrack: (track) => set((state) => ({ audioTracks: [...state.audioTracks, track] })),
  updateAudioTrack: (id, updates) => set((state) => ({
    audioTracks: state.audioTracks.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  removeAudioTrack: (id) => set((state) => ({
    audioTracks: state.audioTracks.filter((t) => t.id !== id)
  })),
  
  audioClips: [],
  setAudioClips: (clips) => set({ audioClips: clips }),
  addAudioClip: (clip) => set((state) => ({ audioClips: [...state.audioClips, clip] })),
  updateAudioClip: (id, updates) => set((state) => ({
    audioClips: state.audioClips.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  removeAudioClip: (id) => set((state) => ({
    audioClips: state.audioClips.filter((c) => c.id !== id)
  })),
  
  apiSettings: [],
  setApiSettings: (settings) => set({ apiSettings: settings }),
  updateApiSetting: (provider, updates) => set((state) => ({
    apiSettings: state.apiSettings.map((s) => 
      s.provider === provider ? { ...s, ...updates } : s
    )
  })),
  
  selectedTileId: null,
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  
  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  
  isExportOpen: false,
  setExportOpen: (open) => set({ isExportOpen: open }),
  
  isLinkModalOpen: false,
  setLinkModalOpen: (open) => set({ isLinkModalOpen: open }),
  
  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  linkedSegments: [],
  setLinkedSegments: (segments) => set({ linkedSegments: segments }),
  addLinkedSegment: (segment) => set((state) => ({
    linkedSegments: [...state.linkedSegments, segment],
  })),
  removeLinkedSegment: (timelineId, position) => set((state) => ({
    linkedSegments: state.linkedSegments.filter(
      (s) => !(s.timelineId === timelineId && s.position === position)
    ),
  })),
  
  playheadPosition: 0,
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),
  
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  zoomLevel: 1,
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  
  workspacePreset: "default",
  setWorkspacePreset: (preset) => set({ workspacePreset: preset }),
  customLayout: null,
  setCustomLayout: (layout) => set({ customLayout: layout, workspacePreset: "custom" }),
  isPreviewCollapsed: false,
  setPreviewCollapsed: (collapsed) => set({ isPreviewCollapsed: collapsed }),
  
  goldenLayoutConfig: null,
  setGoldenLayoutConfig: (config) => set({ goldenLayoutConfig: config }),
}));
