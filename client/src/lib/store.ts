import { create } from "zustand";
import type { Timeline, Tile, AudioTrack, AudioClip, APISetting, AIProvider } from "@shared/schema";

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
  
  playheadPosition: number;
  setPlayheadPosition: (pos: number) => void;
  
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
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
  
  playheadPosition: 0,
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),
  
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  zoomLevel: 1,
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
}));
