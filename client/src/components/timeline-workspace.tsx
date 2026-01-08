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
      
      const response = await apiRequest("POST", `/api/generate/${tile.type}`, {
        prompt: tile.prompt,
        provider: tile.provider,
        tileId,
        initialFrame: tile.mediaUrl,
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
          updateTile(videoTile.id, { mediaUrl: newMediaUrl });
          updateTileMutation.mutate({ 
            id: videoTile.id, 
            updates: { mediaUrl: newMediaUrl } 
          });
          
          if (videoTile.prompt && !videoTile.isGenerating) {
            setTimeout(() => {
              generateMutation.mutate(videoTile.id);
            }, 200);
          }
        });
      }

      if (tile.type === "video") {
        const nextImageTiles = currentTiles.filter(
          (t) => t.type === "image" && t.timelineId === tile.timelineId && t.position === tile.position + 1
        );
        
        nextImageTiles.forEach((imageTile) => {
          const framePercent = 100;
          const frameBasedUrl = `${newMediaUrl}?frame=${framePercent}`;
          
          updateTile(imageTile.id, { 
            mediaUrl: frameBasedUrl,
            selectedFrame: framePercent
          });
          updateTileMutation.mutate({ 
            id: imageTile.id, 
            updates: { 
              mediaUrl: frameBasedUrl,
              selectedFrame: framePercent
            } 
          });
        });
      }

      toast({
        title: "Generation complete",
        description: "Your content has been generated",
      });
    },
    onError: (error, tileId) => {
      const placeholderUrl = `https://picsum.photos/seed/${tileId}/400/300`;
      const currentTiles = tilesRef.current;
      const tile = currentTiles.find((t) => t.id === tileId);
      
      updateTile(tileId, { 
        isGenerating: false,
        mediaUrl: placeholderUrl,
      });
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { isGenerating: false, mediaUrl: placeholderUrl } 
      });
      
      if (tile) {
        if (tile.type === "image") {
          const videoTiles = currentTiles.filter(
            (t) => t.type === "video" && t.timelineId === tile.timelineId && t.position === tile.position
          );
          videoTiles.forEach((videoTile) => {
            updateTile(videoTile.id, { mediaUrl: placeholderUrl });
            updateTileMutation.mutate({ id: videoTile.id, updates: { mediaUrl: placeholderUrl } });
          });
        }
        if (tile.type === "video") {
          const nextImageTiles = currentTiles.filter(
            (t) => t.type === "image" && t.timelineId === tile.timelineId && t.position === tile.position + 1
          );
          nextImageTiles.forEach((imageTile) => {
            const frameBasedUrl = `${placeholderUrl}?frame=100`;
            updateTile(imageTile.id, { mediaUrl: frameBasedUrl, selectedFrame: 100 });
            updateTileMutation.mutate({ id: imageTile.id, updates: { mediaUrl: frameBasedUrl, selectedFrame: 100 } });
          });
        }
      }
      
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

      const prevTile = timelineTiles.find((t) => t.position === position - 1);
      let chainedMediaUrl: string | undefined;
      
      if (prevTile?.mediaUrl) {
        chainedMediaUrl = prevTile.mediaUrl;
      } else if (type === "image") {
        const videoTiles = tiles.filter(
          (t) => t.type === "video" && t.timelineId === timelineId && t.position === position - 1
        );
        if (videoTiles.length > 0 && videoTiles[0].mediaUrl) {
          chainedMediaUrl = `${videoTiles[0].mediaUrl}?frame=100`;
        }
      } else if (type === "video") {
        const imageTiles = tiles.filter(
          (t) => t.type === "image" && t.timelineId === timelineId && t.position === position
        );
        if (imageTiles.length > 0 && imageTiles[0].mediaUrl) {
          chainedMediaUrl = imageTiles[0].mediaUrl;
        }
      }

      const newTile: Omit<Tile, "id"> = {
        type,
        timelineId,
        position,
        prompt: "",
        selectedFrame: type === "image" ? 100 : 0,
        isGenerating: false,
        mediaUrl: chainedMediaUrl,
      };
      
      createTileMutation.mutate(newTile);

      toast({
        title: `${type === "image" ? "Image" : "Video"} tile added`,
        description: chainedMediaUrl 
          ? "Chained from previous tile's frame" 
          : "Click on the tile to edit the prompt",
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
            selectedFrame: 0,
            isGenerating: false,
            mediaUrl: tile.mediaUrl,
          };
          createTileMutation.mutate(newImageTile);
        }
      });

      toast({
        title: "Branch created",
        description: "New branch created from this image with chained frame",
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
        description: "New branch created from this video with chained frame",
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
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const cleanVideoUrl = previousVideoUrl.split('?')[0];
      const frameBasedUrl = `${cleanVideoUrl}?frame=${framePercent}`;
      
      updateTile(tileId, { 
        selectedFrame: framePercent, 
        mediaUrl: frameBasedUrl 
      });
      
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { selectedFrame: framePercent, mediaUrl: frameBasedUrl } 
      });

      const videoTiles = tiles.filter(
        (t) => t.type === "video" && t.timelineId === tile.timelineId && t.position === tile.position
      );
      videoTiles.forEach((vt) => {
        updateTile(vt.id, { mediaUrl: frameBasedUrl });
        updateTileMutation.mutate({ id: vt.id, updates: { mediaUrl: frameBasedUrl } });
      });

      const nextImageTiles = tiles.filter(
        (t) => t.type === "image" && t.timelineId === tile.timelineId && t.position === tile.position + 1
      );
      nextImageTiles.forEach((nextTile) => {
        const nextFrameUrl = `${cleanVideoUrl}?frame=${nextTile.selectedFrame || 100}`;
        updateTile(nextTile.id, { mediaUrl: nextFrameUrl });
        updateTileMutation.mutate({ id: nextTile.id, updates: { mediaUrl: nextFrameUrl } });
      });
    },
    [tiles, updateTile, updateTileMutation]
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
