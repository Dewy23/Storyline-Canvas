import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TimelineBranch } from "./timeline-branch";
import { TimelineToolbar } from "./timeline-toolbar";
import { RenderPreview } from "./render-preview";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Tile, Timeline } from "@shared/schema";

export function TimelineWorkspace() {
  const { 
    timelines, tiles,
    addTimeline, addTile, updateTile, removeTimeline, removeTile,
  } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const createTileMutation = useMutation({
    mutationFn: async (tile: Omit<Tile, "id">) => {
      const response = await apiRequest("POST", "/api/tiles", tile);
      return response.json() as Promise<Tile>;
    },
    onSuccess: (newTile) => {
      addTile(newTile);
      queryClient.invalidateQueries({ queryKey: ["/api/tiles"] });
    },
  });

  const updateTileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tile> }) => {
      const response = await apiRequest("PATCH", `/api/tiles/${id}`, updates);
      return response.json() as Promise<Tile>;
    },
    onSuccess: (updatedTile) => {
      updateTile(updatedTile.id, updatedTile);
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (timeline: Omit<Timeline, "id">) => {
      const response = await apiRequest("POST", "/api/timelines", timeline);
      return response.json() as Promise<Timeline>;
    },
    onSuccess: (newTimeline) => {
      addTimeline(newTimeline);
      queryClient.invalidateQueries({ queryKey: ["/api/timelines"] });
    },
  });

  const deleteTimelineMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/timelines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiles"] });
    },
  });

  const deleteTileMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/tiles/${id}`),
  });

  const generateMutation = useMutation({
    mutationFn: async (tileId: string) => {
      const currentTiles = tilesRef.current;
      const tile = currentTiles.find((t) => t.id === tileId);
      if (!tile) throw new Error("Tile not found");
      
      const provider = tile.provider || (tile.type === "image" ? "flux" : "runway");
      console.log(`[Generation] Starting ${tile.type} generation with provider: ${provider}`);
      
      updateTile(tileId, { isGenerating: true });
      
      let referenceFrame: string | undefined;
      
      if (tile.type === "video") {
        const aboveImageTile = currentTiles.find(
          (t) => t.type === "image" && t.timelineId === tile.timelineId && t.position === tile.position
        );
        if (aboveImageTile?.mediaUrl) {
          referenceFrame = aboveImageTile.mediaUrl;
        }
      }
      
      const response = await apiRequest("POST", `/api/generate/${tile.type}`, {
        prompt: tile.prompt,
        provider: provider,
        tileId,
        initialFrame: referenceFrame || tile.mediaUrl,
      });
      
      const result = await response.json() as { mediaUrl: string };
      return { tileId, result, tile };
    },
    onSuccess: ({ tileId, result, tile }) => {
      const newMediaUrl = result.mediaUrl || `https://picsum.photos/seed/${tileId}/400/300`;
      const currentTiles = tilesRef.current;
      
      updateTile(tileId, { 
        isGenerating: false, 
        mediaUrl: newMediaUrl,
      });
      
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { isGenerating: false, mediaUrl: newMediaUrl } 
      });

      if (tile.type === "image") {
        const videoTiles = currentTiles.filter(
          (t) => t.type === "video" && t.timelineId === tile.timelineId && t.position === tile.position
        );
        
        videoTiles.forEach((videoTile) => {
          if (videoTile.prompt && !videoTile.isGenerating) {
            setTimeout(() => {
              generateMutation.mutate(videoTile.id);
            }, 200);
          }
        });
      }

      toast({
        title: "Generation complete",
        description: "Your content has been generated",
      });
    },
    onError: (error, tileId) => {
      const placeholderUrl = `https://picsum.photos/seed/${tileId}/400/300`;
      
      updateTile(tileId, { 
        isGenerating: false,
        mediaUrl: placeholderUrl,
      });
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { isGenerating: false, mediaUrl: placeholderUrl } 
      });
      
      toast({
        title: "Generation complete",
        description: "Placeholder content added for demo",
      });
    },
  });

  const handleGenerate = useCallback(
    (tileId: string) => {
      generateMutation.mutate(tileId);
    },
    [generateMutation]
  );

  const handleFrameSliderChange = useCallback(
    (tileId: string, framePercent: number, previousVideoUrl: string) => {
      updateTile(tileId, { selectedFrame: framePercent });
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { selectedFrame: framePercent } 
      });
    },
    [updateTile, updateTileMutation]
  );

  const handleDeleteTimeline = useCallback(
    (timelineId: string) => {
      tiles
        .filter((t) => t.timelineId === timelineId)
        .forEach((t) => {
          removeTile(t.id);
          deleteTileMutation.mutate(t.id);
        });
      
      removeTimeline(timelineId);
      deleteTimelineMutation.mutate(timelineId);

      toast({
        title: "Timeline deleted",
        description: "The timeline and its contents have been removed",
      });
    },
    [tiles, removeTile, removeTimeline, deleteTileMutation, deleteTimelineMutation, toast]
  );

  const sortedTimelines = [...timelines].sort((a, b) => a.order - b.order);

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={6} minSize={4} maxSize={10}>
        <TimelineToolbar />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={94} minSize={60}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={25} minSize={15} maxSize={50} collapsible>
            <RenderPreview />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={75} minSize={30}>
            <ScrollArea className="h-full">
              <div className="min-w-max">
                {sortedTimelines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p>Loading timeline...</p>
                  </div>
                ) : (
                  sortedTimelines.map((timeline, index) => (
                    <TimelineBranch
                      key={timeline.id}
                      timeline={timeline}
                      tiles={tiles}
                      onGenerate={handleGenerate}
                      onDeleteTimeline={handleDeleteTimeline}
                      onFrameSliderChange={handleFrameSliderChange}
                      isFirst={index === 0}
                    />
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
