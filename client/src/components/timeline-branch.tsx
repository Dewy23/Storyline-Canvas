import { ChevronDown, ChevronRight, GitBranch, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineRow } from "./timeline-row";
import { useAppStore } from "@/lib/store";
import type { Timeline, Tile } from "@shared/schema";

interface TimelineBranchProps {
  timeline: Timeline;
  tiles: Tile[];
  depth?: number;
  childTimelines: Timeline[];
  allTimelines: Timeline[];
  onInsertTile: (timelineId: string, type: "image" | "video", position: number) => void;
  onBranchUp: (tileId: string) => void;
  onBranchDown: (tileId: string) => void;
  onGenerate: (tileId: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
}

export function TimelineBranch({
  timeline,
  tiles,
  depth = 0,
  childTimelines,
  allTimelines,
  onInsertTile,
  onBranchUp,
  onBranchDown,
  onGenerate,
  onDeleteTimeline,
}: TimelineBranchProps) {
  const { updateTimeline } = useAppStore();

  const toggleCollapse = () => {
    updateTimeline(timeline.id, { isCollapsed: !timeline.isCollapsed });
  };

  const isMainTimeline = !timeline.parentTimelineId;
  const directChildren = childTimelines.filter(
    (t) => t.parentTimelineId === timeline.id
  );

  return (
    <div
      className="flex flex-col"
      style={{ paddingLeft: depth > 0 ? "2rem" : 0 }}
    >
      <div className="flex items-center gap-2 py-2 px-3 bg-card/50 rounded-t-md border-l-2 border-primary/50">
        {directChildren.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleCollapse}
            data-testid={`button-toggle-${timeline.id}`}
          >
            {timeline.isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
        {!isMainTimeline && <GitBranch className="w-4 h-4 text-muted-foreground" />}
        <span className="text-sm font-medium flex-1" data-testid={`text-timeline-name-${timeline.id}`}>
          {timeline.name}
        </span>
        {!isMainTimeline && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteTimeline(timeline.id)}
            data-testid={`button-delete-timeline-${timeline.id}`}
            aria-label="Delete branch"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!timeline.isCollapsed && (
        <>
          <div className="flex flex-col gap-4 p-3 bg-card/30 border-l-2 border-primary/30 rounded-b-md">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 pl-1">
                Images
              </div>
              <TimelineRow
                timeline={timeline}
                tiles={tiles}
                type="image"
                onInsertTile={(pos) => onInsertTile(timeline.id, "image", pos)}
                onBranchUp={onBranchUp}
                onBranchDown={onBranchDown}
                onGenerate={onGenerate}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 pl-1">
                Videos
              </div>
              <TimelineRow
                timeline={timeline}
                tiles={tiles}
                type="video"
                onInsertTile={(pos) => onInsertTile(timeline.id, "video", pos)}
                onBranchUp={onBranchUp}
                onBranchDown={onBranchDown}
                onGenerate={onGenerate}
              />
            </div>
          </div>

          {directChildren.map((child) => (
            <TimelineBranch
              key={child.id}
              timeline={child}
              tiles={tiles}
              depth={depth + 1}
              childTimelines={allTimelines.filter(
                (t) => t.parentTimelineId === child.id
              )}
              allTimelines={allTimelines}
              onInsertTile={onInsertTile}
              onBranchUp={onBranchUp}
              onBranchDown={onBranchDown}
              onGenerate={onGenerate}
              onDeleteTimeline={onDeleteTimeline}
            />
          ))}
        </>
      )}
    </div>
  );
}
