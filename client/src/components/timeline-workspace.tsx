import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TimelineBranch } from "./timeline-branch";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Tile, Timeline } from "@shared/schema";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function TimelineWorkspace() {
  const { 
    timelines, tiles, 
    addTimeline, addTile, updateTile, removeTimeline, removeTile 
  } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rootTimelines = timelines.filter((t) => !t.parentTimelineId);

  const createTileMutation = useMutation({
    mutationFn: (tile: Omit<Tile, "id">) => 
      apiRequest<Tile>("POST", "/api/tiles", tile),
    onSuccess: (newTile) => {
      addTile(newTile);
      queryClient.invalidateQueries({ queryKey: ["/api/tiles"] });
    },
  });

  const updateTileMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tile> }) => 
      apiRequest<Tile>("PATCH", `/api/tiles/${id}`, updates),
    onSuccess: (updatedTile) => {
      updateTile(updatedTile.id, updatedTile);
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: (timeline: Omit<Timeline, "id">) => 
      apiRequest<Timeline>("POST", "/api/timelines", timeline),
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
      }

      const newTile: Omit<Tile, "id"> = {
        type,
        timelineId,
        position,
        prompt: "",
        selectedFrame: 0,
        isGenerating: false,
        mediaUrl: type === "video" ? chainedMediaUrl : undefined,
      };
      
      createTileMutation.mutate(newTile);

      toast({
        title: `${type === "image" ? "Image" : "Video"} tile added`,
        description: prevTile?.mediaUrl 
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

  const generateMutation = useMutation({
    mutationFn: async (tileId: string) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) throw new Error("Tile not found");
      
      updateTile(tileId, { isGenerating: true });
      
      const response = await apiRequest<{ mediaUrl: string }>("POST", `/api/generate/${tile.type}`, {
        prompt: tile.prompt,
        provider: tile.provider,
        tileId,
      });
      
      return { tileId, result: response, tile };
    },
    onSuccess: ({ tileId, result, tile }) => {
      const newMediaUrl = result.mediaUrl || `https://picsum.photos/seed/${tileId}/400/300`;
      updateTile(tileId, { 
        isGenerating: false, 
        mediaUrl: newMediaUrl,
      });
      
      updateTileMutation.mutate({ 
        id: tileId, 
        updates: { isGenerating: false, mediaUrl: newMediaUrl } 
      });

      if (tile.type === "image") {
        const videoTiles = tiles.filter(
          (t) => t.type === "video" && t.timelineId === tile.timelineId && t.position === tile.position
        );
        videoTiles.forEach((vt) => {
          if (!vt.mediaUrl) {
            updateTile(vt.id, { mediaUrl: newMediaUrl });
            updateTileMutation.mutate({ id: vt.id, updates: { mediaUrl: newMediaUrl } });
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
            />
          ))
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
