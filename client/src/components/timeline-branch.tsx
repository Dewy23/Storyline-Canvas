import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segment } from "./segment";
import { useAppStore } from "@/lib/store";
import type { Timeline, Tile } from "@shared/schema";

interface TimelineBranchProps {
  timeline: Timeline;
  tiles: Tile[];
  onGenerate: (tileId: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onFrameSliderChange?: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
  onAddSegment: (timelineId: string, position: number) => void;
  isFirst?: boolean;
}

export function TimelineBranch({
  timeline,
  tiles,
  onGenerate,
  onDeleteTimeline,
  onFrameSliderChange,
  onAddSegment,
  isFirst = false,
}: TimelineBranchProps) {
  const { updateTimeline, linkedSegments, timelines } = useAppStore();
  const isSingleTimeline = timelines.length === 1;

  const toggleCollapse = () => {
    updateTimeline(timeline.id, { isCollapsed: !timeline.isCollapsed });
  };

  const timelineTiles = tiles.filter((t) => t.timelineId === timeline.id);
  const imageTiles = timelineTiles.filter((t) => t.type === "image").sort((a, b) => a.position - b.position);
  const videoTiles = timelineTiles.filter((t) => t.type === "video");

  const positions = Array.from(new Set(imageTiles.map((t) => t.position))).sort((a, b) => a - b);

  const isSegmentLinked = (position: number) => {
    if (isSingleTimeline) return true;
    return linkedSegments.some(
      (s) => s.timelineId === timeline.id && s.position === position
    );
  };

  return (
    <div className="flex flex-col border-b border-border/50 last:border-b-0">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 z-20 h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
          onClick={toggleCollapse}
          data-testid={`button-toggle-${timeline.id}`}
        >
          {timeline.isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        <div className="flex items-center gap-2 py-2 px-12 bg-card/30 border-b border-border/30">
          <span className="text-sm font-medium flex-1" data-testid={`text-timeline-name-${timeline.id}`}>
            {timeline.name}
          </span>
          {!isFirst && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteTimeline(timeline.id)}
              data-testid={`button-delete-timeline-${timeline.id}`}
              aria-label="Delete timeline"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!timeline.isCollapsed && (
          <div className="flex gap-3 p-3 pl-12 bg-card/20 overflow-x-auto">
            {positions.map((position) => {
              const imageTile = imageTiles.find((t) => t.position === position);
              const videoTile = videoTiles.find((t) => t.position === position);
              
              if (!imageTile) return null;

              return (
                <Segment
                  key={`${timeline.id}-${position}`}
                  imageTile={imageTile}
                  videoTile={videoTile}
                  position={position}
                  timelineId={timeline.id}
                  onGenerate={onGenerate}
                  onFrameSliderChange={onFrameSliderChange || (() => {})}
                  isLinked={isSegmentLinked(position)}
                />
              );
            })}
            
            <Button
              variant="outline"
              className="flex-shrink-0 h-[168px] w-[140px] border-dashed border-2 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2"
              onClick={() => onAddSegment(timeline.id, Math.max(...positions, -1) + 1)}
              data-testid={`button-add-segment-${timeline.id}`}
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs text-muted-foreground">Add Segment</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
