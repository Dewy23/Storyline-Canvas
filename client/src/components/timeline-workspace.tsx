import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TimelineBranch } from "./timeline-branch";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Tile, Timeline } from "@shared/schema";

export function TimelineWorkspace() {
  const { 
    timelines, tiles, 
    addTimeline, addTile, updateTile, removeTimeline, removeTile 
  } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const rootTimelines = timelines.filter((t) => !t.parentTimelineId);

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
        provider: tile.provider,
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

  const handleInsertTile = useCallback(
    (timelineId: string, type: "image" | "video", position: number) => {
      const timelineTiles = tiles.filter(
        (t) => t.timelineId === timelineId && t.type === type
      );
      
      timelineTiles
        .filter((t) => t.position >= position)
        .forEach((t) => {
          updateTileMutation.mutate({ id: t.id, updates: { position: t.position + 1 } });
        });

      const newTile: Omit<Tile, "id"> = {
        type,
        timelineId,
        position,
        prompt: "",
        selectedFrame: 100,
        isGenerating: false,
      };
      
      createTileMutation.mutate(newTile);

      toast({
        title: `${type === "image" ? "Image" : "Video"} tile added`,
        description: "Click on the tile to edit the prompt",
      });
    },
    [tiles, createTileMutation, updateTileMutation, toast]
  );

  const handleBranchUp = useCallback(
    (tileId: string) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const branchCount = timelines.filter(
        (t) => t.branchFromTileId === tileId && t.branchDirection === "up"
      ).length;

      const newTimeline: Omit<Timeline, "id"> = {
        name: `Branch ${timelines.length + 1}`,
        parentTimelineId: tile.timelineId,
        branchFromTileId: tileId,
        branchDirection: "up",
        isCollapsed: false,
        order: branchCount,
      };

      createTimelineMutation.mutate(newTimeline, {
        onSuccess: (createdTimeline) => {
          const newImageTile: Omit<Tile, "id"> = {
            type: "image",
            timelineId: createdTimeline.id,
            position: 0,
            prompt: tile.prompt || "",
            selectedFrame: 100,
            isGenerating: false,
            mediaUrl: tile.mediaUrl,
          };
          createTileMutation.mutate(newImageTile);
        }
      });

      toast({
        title: "Branch created",
        description: "New branch created from this image",
      });
    },
    [tiles, timelines, createTimelineMutation, createTileMutation, toast]
  );

  const handleBranchDown = useCallback(
    (tileId: string) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const branchCount = timelines.filter(
        (t) => t.branchFromTileId === tileId && t.branchDirection === "down"
      ).length;

      const newTimeline: Omit<Timeline, "id"> = {
        name: `Branch ${timelines.length + 1}`,
        parentTimelineId: tile.timelineId,
        branchFromTileId: tileId,
        branchDirection: "down",
        isCollapsed: false,
        order: branchCount,
      };

      createTimelineMutation.mutate(newTimeline, {
        onSuccess: (createdTimeline) => {
          const newVideoTile: Omit<Tile, "id"> = {
            type: "video",
            timelineId: createdTimeline.id,
            position: 0,
            prompt: tile.prompt || "",
            selectedFrame: 0,
            isGenerating: false,
            mediaUrl: tile.mediaUrl,
          };
          createTileMutation.mutate(newVideoTile);
        }
      });

      toast({
        title: "Branch created",
        description: "New branch created from this video",
      });
    },
    [tiles, timelines, createTimelineMutation, createTileMutation, toast]
  );

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
      
      const childTimelines = timelines.filter((t) => t.parentTimelineId === timelineId);
      childTimelines.forEach((t) => {
        tiles.filter((tile) => tile.timelineId === t.id).forEach((tile) => {
          removeTile(tile.id);
          deleteTileMutation.mutate(tile.id);
        });
        removeTimeline(t.id);
        deleteTimelineMutation.mutate(t.id);
      });
      
      removeTimeline(timelineId);
      deleteTimelineMutation.mutate(timelineId);

      toast({
        title: "Branch deleted",
        description: "The branch and its contents have been removed",
      });
    },
    [tiles, timelines, removeTile, removeTimeline, deleteTileMutation, deleteTimelineMutation, toast]
  );

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="space-y-6 min-w-max">
        {rootTimelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>Loading timeline...</p>
          </div>
        ) : (
          rootTimelines.map((timeline) => (
            <TimelineBranch
              key={timeline.id}
              timeline={timeline}
              tiles={tiles}
              childTimelines={timelines.filter(
                (t) => t.parentTimelineId === timeline.id
              )}
              allTimelines={timelines}
              onInsertTile={handleInsertTile}
              onBranchUp={handleBranchUp}
              onBranchDown={handleBranchDown}
              onGenerate={handleGenerate}
              onDeleteTimeline={handleDeleteTimeline}
              onFrameSliderChange={handleFrameSliderChange}
            />
          ))
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
