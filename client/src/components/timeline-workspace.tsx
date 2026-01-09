import { useCallback, useRef, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TimelineBranch } from "./timeline-branch";
import { TimelineToolbar } from "./timeline-toolbar";
import { RenderPreview } from "./render-preview";
import { useAppStore, WORKSPACE_PRESETS } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Tile, Timeline } from "@shared/schema";

interface GenerationResult {
  success: boolean;
  mediaUrl?: string;
  jobId?: string;
  status?: string;
  error?: string;
  provider?: string;
  message?: string;
}

export function TimelineWorkspace() {
  const { 
    timelines, tiles,
    addTimeline, addTile, updateTile, removeTimeline, removeTile,
    workspacePreset, isPreviewCollapsed, setPreviewCollapsed,
  } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingJobs, setPendingJobs] = useState<Map<string, { provider: string; tileId: string }>>(new Map());
  
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  // Get panel sizes from preset
  const getPresetSizes = () => {
    const preset = WORKSPACE_PRESETS[workspacePreset];
    const totalHeight = preset.preview.h + preset.timelines.h;
    const previewPercent = Math.round((preset.preview.h / totalHeight) * 100);
    const timelinesPercent = 100 - previewPercent;
    const toolbarPercent = Math.round((preset.toolbar.w / 12) * 100);
    const mainPercent = 100 - toolbarPercent;
    
    return {
      toolbar: toolbarPercent,
      main: mainPercent,
      preview: previewPercent,
      timelines: timelinesPercent,
    };
  };

  const sizes = getPresetSizes();

  // Poll for job status
  useEffect(() => {
    if (pendingJobs.size === 0) return;

    const pollInterval = setInterval(async () => {
      const jobs = Array.from(pendingJobs.entries());
      for (const [tileId, job] of jobs) {
        try {
          const response = await fetch(`/api/generate/status/${tileId}`);
          if (!response.ok) continue;

          const status = await response.json();

          if (status.status === "completed" && status.mediaUrl) {
            updateTile(tileId, { isGenerating: false, mediaUrl: status.mediaUrl });
            setPendingJobs((prev) => {
              const next = new Map(prev);
              next.delete(tileId);
              return next;
            });
            toast({
              title: "Generation complete",
              description: `${status.type === "video" ? "Video" : "Image"} generated with ${job.provider}`,
            });
          } else if (status.status === "failed") {
            updateTile(tileId, { isGenerating: false });
            setPendingJobs((prev) => {
              const next = new Map(prev);
              next.delete(tileId);
              return next;
            });
            toast({
              title: "Generation failed",
              description: status.error || "Check your API key and try again",
              variant: "destructive",
            });
          }
        } catch (e) {
          console.error("Job polling error:", e);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pendingJobs, updateTile, toast]);

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
        referenceImageUrl: referenceFrame || tile.mediaUrl,
      });
      
      const result = await response.json() as GenerationResult;
      return { tileId, result, tile, provider };
    },
    onSuccess: ({ tileId, result, tile, provider }) => {
      const currentTiles = tilesRef.current;
      
      if (result.jobId && result.status === "processing") {
        setPendingJobs((prev) => {
          const next = new Map(prev);
          next.set(tileId, { provider, tileId });
          return next;
        });
        toast({
          title: "Generation started",
          description: `${tile.type === "video" ? "Video" : "Image"} is being generated. This may take a few minutes.`,
        });
        return;
      }
      
      if (!result.success || result.error) {
        updateTile(tileId, { isGenerating: false });
        toast({
          title: "Generation failed",
          description: result.error || "Check your API key and credits",
          variant: "destructive",
        });
        return;
      }
      
      const newMediaUrl = result.mediaUrl;
      
      if (!newMediaUrl) {
        updateTile(tileId, { isGenerating: false });
        toast({
          title: "Generation failed",
          description: "No media returned. Check your API key and credits.",
          variant: "destructive",
        });
        return;
      }
      
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
        description: result.message || `Generated with ${result.provider || provider}`,
      });
    },
    onError: (error: Error, tileId) => {
      updateTile(tileId, { isGenerating: false });
      
      const errorMessage = error.message || "Generation failed";
      const isApiError = errorMessage.includes("API") || errorMessage.includes("key") || errorMessage.includes("401");
      
      toast({
        title: "Generation failed",
        description: isApiError 
          ? "API call failed: check your key and credits" 
          : errorMessage,
        variant: "destructive",
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

  const handleAddSegment = useCallback(
    async (timelineId: string, position: number) => {
      const imageResult = await createTileMutation.mutateAsync({
        type: "image",
        timelineId,
        position,
        prompt: "",
        selectedFrame: 0,
        isGenerating: false,
      });
      
      await createTileMutation.mutateAsync({
        type: "video",
        timelineId,
        position,
        prompt: "",
        selectedFrame: 0,
        isGenerating: false,
      });

      toast({
        title: "Segment added",
        description: "New image and video tiles created",
      });
    },
    [createTileMutation, toast]
  );

  const sortedTimelines = [...timelines].sort((a, b) => a.order - b.order);

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel 
        defaultSize={sizes.toolbar} 
        minSize={4} 
        maxSize={15}
        className="bg-card"
      >
        <div className="h-full flex flex-col">
          <TimelineToolbar />
          {isPreviewCollapsed && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={() => setPreviewCollapsed(false)}
                data-testid="button-expand-preview"
              >
                <ChevronDown className="w-4 h-4" />
                Preview
              </Button>
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={sizes.main} minSize={60}>
        <ResizablePanelGroup direction="vertical">
          {!isPreviewCollapsed && (
            <>
              <ResizablePanel 
                defaultSize={sizes.preview} 
                minSize={10} 
                maxSize={60} 
                collapsible
                onCollapse={() => setPreviewCollapsed(true)}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-b">
                    <span className="text-xs font-medium text-muted-foreground">Render Preview</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setPreviewCollapsed(true)}
                      data-testid="button-collapse-preview"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <RenderPreview />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel 
            defaultSize={isPreviewCollapsed ? 100 : sizes.timelines} 
            minSize={30}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-b">
                <span className="text-xs font-medium text-muted-foreground">Timelines</span>
              </div>
              <ScrollArea className="flex-1">
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
                        onAddSegment={handleAddSegment}
                        isFirst={index === 0}
                      />
                    ))
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
