import { useAppStore } from "@/lib/store";
import { Film, ImageIcon, Video } from "lucide-react";

export function RenderPreview() {
  const { tiles, linkedSegments, timelines } = useAppStore();
  const isSingleTimeline = timelines.length === 1;

  const getLinkedTiles = () => {
    if (isSingleTimeline && timelines.length > 0) {
      const timelineId = timelines[0].id;
      const timelineTiles = tiles.filter((t) => t.timelineId === timelineId);
      const positions = Array.from(new Set(timelineTiles.map((t) => t.position))).sort((a, b) => a - b);
      
      return positions.flatMap((position) => {
        const imageTile = timelineTiles.find((t) => t.type === "image" && t.position === position);
        const videoTile = timelineTiles.find((t) => t.type === "video" && t.position === position);
        return [imageTile, videoTile].filter(Boolean);
      });
    }

    const sortedSegments = [...linkedSegments].sort((a, b) => a.order - b.order);

    return sortedSegments.flatMap((segment) => {
      const imageTile = tiles.find(
        (t) => t.type === "image" && t.timelineId === segment.timelineId && t.position === segment.position
      );
      const videoTile = tiles.find(
        (t) => t.type === "video" && t.timelineId === segment.timelineId && t.position === segment.position
      );
      return [imageTile, videoTile].filter(Boolean);
    });
  };

  const linkedTiles = getLinkedTiles();

  if (linkedTiles.length === 0) {
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
          {linkedTiles.length} frames {isSingleTimeline && "(auto)"}
        </span>
      </div>
      
      <div className="flex-1 flex items-center p-4 overflow-x-auto gap-1">
        {linkedTiles.map((tile, index) => (
          <div 
            key={tile!.id} 
            className="relative flex-shrink-0"
            data-testid={`preview-frame-${index}`}
          >
            <div className={`w-20 h-12 rounded-md overflow-hidden border-2 ${tile!.type === "video" ? "border-blue-500" : "border-green-500"} bg-muted`}>
              {tile!.mediaUrl ? (
                <img 
                  src={tile!.mediaUrl} 
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {tile!.type === "video" ? (
                    <Video className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
            <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full ${tile!.type === "video" ? "bg-blue-500" : "bg-green-500"} text-white text-[10px] flex items-center justify-center font-medium`}>
              {index + 1}
            </div>
          </div>
        ))}
        
        <div className="flex-shrink-0 ml-4 flex flex-col items-center justify-center text-muted-foreground">
          <Film className="w-6 h-6 mb-1" />
          <span className="text-xs">Output</span>
        </div>
      </div>
    </div>
  );
}
