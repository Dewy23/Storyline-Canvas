import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineRow } from "./timeline-row";
import { useAppStore } from "@/lib/store";
import type { Timeline, Tile, TileLink } from "@shared/schema";

interface TimelineBranchProps {
  timeline: Timeline;
  tiles: Tile[];
  onInsertTile: (timelineId: string, type: "image" | "video", position: number) => void;
  onGenerate: (tileId: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onFrameSliderChange?: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
  tileLinks?: TileLink[];
  isFirst?: boolean;
}

export function TimelineBranch({
  timeline,
  tiles,
  onInsertTile,
  onGenerate,
  onDeleteTimeline,
  onFrameSliderChange,
  tileLinks = [],
  isFirst = false,
}: TimelineBranchProps) {
  const { updateTimeline } = useAppStore();

  const toggleCollapse = () => {
    updateTimeline(timeline.id, { isCollapsed: !timeline.isCollapsed });
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
          <div className="flex flex-col gap-4 p-3 pl-12 bg-card/20 overflow-x-auto">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 pl-1">
                Images
              </div>
              <TimelineRow
                timeline={timeline}
                tiles={tiles}
                allTiles={tiles}
                type="image"
                onInsertTile={(pos) => onInsertTile(timeline.id, "image", pos)}
                onGenerate={onGenerate}
                onFrameSliderChange={onFrameSliderChange}
                tileLinks={tileLinks}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 pl-1">
                Videos
              </div>
              <TimelineRow
                timeline={timeline}
                tiles={tiles}
                allTiles={tiles}
                type="video"
                onInsertTile={(pos) => onInsertTile(timeline.id, "video", pos)}
                onGenerate={onGenerate}
                onFrameSliderChange={onFrameSliderChange}
                tileLinks={tileLinks}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
