import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toolbar } from "@/components/toolbar";
import { WorkspaceGrid } from "@/components/workspace-grid";
import { SettingsModal } from "@/components/settings-modal";
import { ExportModal } from "@/components/export-modal";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import type { Timeline, Tile, TileLink, LinkedSegment, AudioTrack, AudioClip, APISetting, AIProvider } from "@shared/schema";
import { aiProviders } from "@shared/schema";
import { Loader2 } from "lucide-react";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function Home() {
  const { 
    activeTab, 
    timelines, 
    setTimelines, 
    tiles,
    setTiles,
    tileLinks,
    setTileLinks,
    audioTracks,
    setAudioTracks,
    audioClips,
    setAudioClips,
    apiSettings,
    setApiSettings,
    linkedSegments,
    setLinkedSegments,
  } = useAppStore();
  const queryClient = useQueryClient();

  const { data: timelinesData, isLoading: timelinesLoading } = useQuery<Timeline[]>({
    queryKey: ["/api/timelines"],
  });

  const { data: tilesData, isLoading: tilesLoading } = useQuery<Tile[]>({
    queryKey: ["/api/tiles"],
  });

  const { data: audioTracksData, isLoading: tracksLoading } = useQuery<AudioTrack[]>({
    queryKey: ["/api/audio-tracks"],
  });

  const { data: audioClipsData, isLoading: clipsLoading } = useQuery<AudioClip[]>({
    queryKey: ["/api/audio-clips"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<APISetting[]>({
    queryKey: ["/api/settings"],
  });

  const { data: tileLinksData, isLoading: linksLoading } = useQuery<TileLink[]>({
    queryKey: ["/api/tile-links"],
  });

  const { data: linkedSegmentsData, isLoading: segmentsLoading } = useQuery<LinkedSegment[]>({
    queryKey: ["/api/linked-segments"],
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (timeline: Omit<Timeline, "id">) => {
      const response = await apiRequest("POST", "/api/timelines", timeline);
      return response.json() as Promise<Timeline>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/timelines"] }),
  });

  const createTileMutation = useMutation({
    mutationFn: async (tile: Omit<Tile, "id">) => {
      const response = await apiRequest("POST", "/api/tiles", tile);
      return response.json() as Promise<Tile>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tiles"] }),
  });

  useEffect(() => {
    if (timelinesData) {
      setTimelines(timelinesData);
    }
  }, [timelinesData, setTimelines]);

  useEffect(() => {
    if (tilesData) {
      setTiles(tilesData);
    }
  }, [tilesData, setTiles]);

  useEffect(() => {
    if (audioTracksData) {
      setAudioTracks(audioTracksData);
    }
  }, [audioTracksData, setAudioTracks]);

  useEffect(() => {
    if (audioClipsData) {
      setAudioClips(audioClipsData);
    }
  }, [audioClipsData, setAudioClips]);

  useEffect(() => {
    if (settingsData) {
      setApiSettings(settingsData);
    }
  }, [settingsData, setApiSettings]);

  useEffect(() => {
    if (tileLinksData) {
      setTileLinks(tileLinksData);
    }
  }, [tileLinksData, setTileLinks]);

  useEffect(() => {
    if (linkedSegmentsData) {
      setLinkedSegments(linkedSegmentsData);
    }
  }, [linkedSegmentsData, setLinkedSegments]);

  useEffect(() => {
    if (!timelinesLoading && timelinesData && timelinesData.length === 0) {
      const mainTimeline: Omit<Timeline, "id"> = {
        name: "Main Timeline",
        isCollapsed: false,
        order: 0,
      };
      createTimelineMutation.mutate(mainTimeline);
    }
  }, [timelinesLoading, timelinesData]);

  useEffect(() => {
    if (!tilesLoading && tilesData && tilesData.length === 0 && timelines.length > 0) {
      const mainTimelineId = timelines[0].id;
      
      const initialTiles: Omit<Tile, "id">[] = [
        { type: "image", timelineId: mainTimelineId, position: 0, prompt: "", selectedFrame: 0, isGenerating: false },
        { type: "image", timelineId: mainTimelineId, position: 1, prompt: "", selectedFrame: 0, isGenerating: false },
        { type: "image", timelineId: mainTimelineId, position: 2, prompt: "", selectedFrame: 0, isGenerating: false },
        { type: "video", timelineId: mainTimelineId, position: 0, prompt: "", selectedFrame: 0, isGenerating: false },
        { type: "video", timelineId: mainTimelineId, position: 1, prompt: "", selectedFrame: 0, isGenerating: false },
        { type: "video", timelineId: mainTimelineId, position: 2, prompt: "", selectedFrame: 0, isGenerating: false },
      ];
      
      initialTiles.forEach((tile) => createTileMutation.mutate(tile));
    }
  }, [tilesLoading, tilesData, timelines]);

  useEffect(() => {
    if (apiSettings.length === 0 && !settingsLoading) {
      const initialSettings: APISetting[] = aiProviders.map((provider) => ({
        id: generateId(),
        provider,
        apiKey: "",
        isConnected: false,
      }));
      setApiSettings(initialSettings);
    }
  }, [apiSettings, settingsLoading, setApiSettings]);

  const isLoading = timelinesLoading || tilesLoading || tracksLoading || clipsLoading;

  if (isLoading && timelines.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Toolbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Loading project...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toolbar />
      <main className="flex-1 overflow-hidden">
        <WorkspaceGrid />
      </main>
      <SettingsModal />
      <ExportModal />
    </div>
  );
}
