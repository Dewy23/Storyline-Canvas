import { useAppStore } from "@/lib/store";
import { Film, ImageIcon } from "lucide-react";

export function RenderPreview() {
  const { tiles, tileLinks } = useAppStore();

  const sortedLinks = [...tileLinks].sort((a, b) => a.order - b.order);
  
  const linkedTiles = sortedLinks
    .map((link) => tiles.find((t) => t.id === link.tileId))
    .filter(Boolean);

  if (linkedTiles.length === 0) {
    return (
      <div className="h-full bg-card/30 border-t border-border flex flex-col items-center justify-center p-4">
        <Film className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          No tiles linked for render preview.
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mt-1">
          Use the link tool to create a render sequence.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card/30 border-t border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-sm font-medium">Render Preview</span>
        <span className="text-xs text-muted-foreground">{linkedTiles.length} frames</span>
      </div>
      
      <div className="flex-1 flex items-center p-4 overflow-x-auto gap-1">
        {linkedTiles.map((tile, index) => (
          <div 
            key={tile!.id} 
            className="relative flex-shrink-0"
            data-testid={`preview-frame-${index}`}
          >
            <div className="w-24 h-14 rounded-md overflow-hidden border-2 border-green-500 bg-muted">
              {tile!.mediaUrl ? (
                <img 
                  src={tile!.mediaUrl} 
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-medium">
              {index + 1}
            </div>
          </div>
        ))}
        
        <div className="flex-shrink-0 ml-4 flex flex-col items-center justify-center text-muted-foreground">
          <Film className="w-6 h-6 mb-1" />
          <span className="text-xs">Final Output</span>
        </div>
      </div>
    </div>
  );
}
