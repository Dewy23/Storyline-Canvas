import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Film, Layers } from "lucide-react";
import type { Tile, LinkedSegment } from "@shared/schema";

interface SegmentPreview {
  segmentId: string;
  order: number;
  imageTile: Tile | undefined;
  videoTile: Tile | undefined;
  thumbnailUrl: string | null;
  hasImage: boolean;
  hasVideo: boolean;
}

export function RenderPreview() {
  const tiles = useAppStore((state) => state.tiles);
  const linkedSegments = useAppStore((state) => state.linkedSegments);
  const timelines = useAppStore((state) => state.timelines);
  
  const isSingleTimeline = timelines.length === 1;

  const segmentPreviews = useMemo((): SegmentPreview[] => {
    let segments: { timelineId: string; position: number; order: number; id: string }[] = [];

    if (isSingleTimeline && timelines.length > 0) {
      const timelineId = timelines[0].id;
      const timelineTiles = tiles.filter((t) => t.timelineId === timelineId);
      const positions = Array.from(new Set(timelineTiles.map((t) => t.position))).sort((a, b) => a - b);
      
      segments = positions.map((position, index) => ({
        timelineId,
        position,
        order: index,
        id: `auto-${timelineId}-${position}`,
      }));
    } else {
      segments = [...linkedSegments]
        .filter((seg) => seg.id)
        .sort((a, b) => a.order - b.order)
        .map((seg) => ({
          timelineId: seg.timelineId,
          position: seg.position,
          order: seg.order,
          id: seg.id!,
        }));
    }

    return segments.map((segment) => {
      const imageTile = tiles.find(
        (t) => t.type === "image" && t.timelineId === segment.timelineId && t.position === segment.position
      );
      const videoTile = tiles.find(
        (t) => t.type === "video" && t.timelineId === segment.timelineId && t.position === segment.position
      );

      const hasImage = !!(imageTile?.mediaUrl);
      const hasVideo = !!(videoTile?.mediaUrl);
      
      const thumbnailUrl = videoTile?.mediaUrl || imageTile?.mediaUrl || null;

      return {
        segmentId: segment.id,
        order: segment.order,
        imageTile,
        videoTile,
        thumbnailUrl,
        hasImage,
        hasVideo,
      };
    });
  }, [tiles, linkedSegments, timelines, isSingleTimeline]);

  if (segmentPreviews.length === 0) {
    return (
      <div className="h-full bg-card/30 flex flex-col items-center justify-center p-4">
        <Film className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          {isSingleTimeline 
            ? "Add content to segments to preview render."
            : "No segments linked for render preview."}
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mt-1">
          {isSingleTimeline 
            ? "All segments auto-included with single timeline."
            : "Select the link tool and click segments to include them."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card/30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-sm font-medium">Render Preview</span>
        <span className="text-xs text-muted-foreground">
          {segmentPreviews.length} segment{segmentPreviews.length !== 1 ? "s" : ""} {isSingleTimeline && "(auto)"}
        </span>
      </div>
      
      <div className="flex-1 flex items-center p-4 overflow-x-auto gap-2">
        {segmentPreviews.map((preview, index) => (
          <div 
            key={preview.segmentId} 
            className="relative flex-shrink-0"
            data-testid={`preview-segment-${index}`}
          >
            <div className="w-24 h-14 rounded-md overflow-hidden border border-border bg-muted">
              {preview.thumbnailUrl ? (
                <img 
                  src={preview.thumbnailUrl} 
                  alt={`Segment ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-foreground text-background text-[10px] flex items-center justify-center font-medium">
              {index + 1}
            </div>
            
            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
              {preview.hasImage && (
                <div className="w-3 h-3 rounded-full bg-green-500" title="Image generated" />
              )}
              {preview.hasVideo && (
                <div className="w-3 h-3 rounded-full bg-blue-500" title="Video generated" />
              )}
            </div>
          </div>
        ))}
        
        <div className="flex-shrink-0 ml-4 flex flex-col items-center justify-center text-muted-foreground">
          <Film className="w-6 h-6 mb-1" />
          <span className="text-xs">Export</span>
        </div>
      </div>
    </div>
  );
}
