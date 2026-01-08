import { Tile as TileComponent } from "./tile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import type { Tile, LinkedSegment } from "@shared/schema";

interface SegmentProps {
  imageTile: Tile;
  videoTile: Tile | undefined;
  position: number;
  timelineId: string;
  onGenerate: (tileId: string) => void;
  onFrameSliderChange: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
  isLinked: boolean;
}

export function Segment({
  imageTile,
  videoTile,
  position,
  timelineId,
  onGenerate,
  onFrameSliderChange,
  isLinked,
}: SegmentProps) {
  const { activeTool, linkedSegments, addLinkedSegment, removeLinkedSegment, timelines } = useAppStore();
  const queryClient = useQueryClient();
  const isLinkMode = activeTool === "link";
  const isSingleTimeline = timelines.length === 1;

  const createSegmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/linked-segments", {
        timelineId,
        position,
        order: 0,
      });
      return response.json() as Promise<LinkedSegment>;
    },
    onSuccess: (segment) => {
      addLinkedSegment(segment);
      queryClient.invalidateQueries({ queryKey: ["/api/linked-segments"] });
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async () => {
      const segment = linkedSegments.find(
        (s) => s.timelineId === timelineId && s.position === position
      );
      if (segment?.id) {
        await apiRequest("DELETE", `/api/linked-segments/${segment.id}`);
      }
    },
    onSuccess: () => {
      removeLinkedSegment(timelineId, position);
      queryClient.invalidateQueries({ queryKey: ["/api/linked-segments"] });
    },
  });

  const handleSegmentClick = () => {
    if (!isLinkMode || isSingleTimeline) return;
    
    if (isLinked) {
      deleteSegmentMutation.mutate();
    } else {
      createSegmentMutation.mutate();
    }
  };

  const isPending = createSegmentMutation.isPending || deleteSegmentMutation.isPending;

  return (
    <div
      onClick={handleSegmentClick}
      className={`
        flex flex-col gap-1 p-2 rounded-md transition-all
        ${isLinkMode && !isSingleTimeline ? "cursor-pointer" : ""}
        ${isLinked || isSingleTimeline ? "ring-2 ring-green-500 bg-green-500/5" : "bg-muted/30"}
        ${isLinkMode && !isLinked && !isSingleTimeline ? "hover:bg-muted/50" : ""}
        ${isPending ? "opacity-50" : ""}
      `}
      style={{ cursor: isLinkMode && !isSingleTimeline ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2322c55e\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\'%3E%3C/path%3E%3Cpath d=\'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\'%3E%3C/path%3E%3C/svg%3E"), pointer' : undefined }}
      data-testid={`segment-${timelineId}-${position}`}
    >
      <TileComponent
        tile={imageTile}
        onGenerate={() => onGenerate(imageTile.id)}
        onFrameSliderChange={onFrameSliderChange}
        isLinked={false}
      />
      {videoTile && (
        <TileComponent
          tile={videoTile}
          onGenerate={() => onGenerate(videoTile.id)}
          onFrameSliderChange={onFrameSliderChange}
          isLinked={false}
        />
      )}
    </div>
  );
}
