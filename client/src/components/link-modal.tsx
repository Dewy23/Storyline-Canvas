import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { Link2, Unlink, Plus, Trash2 } from "lucide-react";
import type { TileLink } from "@shared/schema";

interface LinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkModal({ open, onOpenChange }: LinkModalProps) {
  const { 
    timelines, tiles, tileLinks,
    addTileLink, removeTileLink, clearTileLinks
  } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedTimelineId, setSelectedTimelineId] = useState<string>("");
  const [selectedTileId, setSelectedTileId] = useState<string>("");

  const availableTiles = selectedTimelineId 
    ? tiles.filter((t) => t.timelineId === selectedTimelineId && t.type === "image")
    : [];

  const createLinkMutation = useMutation({
    mutationFn: async (link: Omit<TileLink, "id">) => {
      const response = await apiRequest("POST", "/api/tile-links", link);
      return response.json() as Promise<TileLink>;
    },
    onSuccess: (newLink) => {
      addTileLink(newLink);
      queryClient.invalidateQueries({ queryKey: ["/api/tile-links"] });
      setSelectedTileId("");
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tile-links/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeTileLink(id);
      queryClient.invalidateQueries({ queryKey: ["/api/tile-links"] });
    },
  });

  const clearLinksMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/tile-links");
    },
    onSuccess: () => {
      clearTileLinks();
      queryClient.invalidateQueries({ queryKey: ["/api/tile-links"] });
    },
  });

  const handleAddLink = () => {
    if (!selectedTileId || !selectedTimelineId) return;
    
    const existingLink = tileLinks.find((l) => l.tileId === selectedTileId);
    if (existingLink) return;

    createLinkMutation.mutate({
      tileId: selectedTileId,
      timelineId: selectedTimelineId,
      order: tileLinks.length,
    });
  };

  const handleRemoveLink = (linkId: string) => {
    deleteLinkMutation.mutate(linkId);
  };

  const sortedLinks = [...tileLinks].sort((a, b) => a.order - b.order);

  const getTileLabel = (tileId: string) => {
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) return "Unknown tile";
    return `Tile ${tile.position + 1}`;
  };

  const getTimelineLabel = (timelineId: string) => {
    const timeline = timelines.find((t) => t.id === timelineId);
    return timeline?.name || "Unknown timeline";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Link Tiles for Render
          </DialogTitle>
          <DialogDescription>
            Link tiles from different timelines to create your final render sequence. 
            Linked tiles will be outlined in green.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Timeline</label>
            <Select value={selectedTimelineId} onValueChange={setSelectedTimelineId}>
              <SelectTrigger data-testid="select-link-timeline">
                <SelectValue placeholder="Choose a timeline" />
              </SelectTrigger>
              <SelectContent>
                {timelines.map((timeline) => (
                  <SelectItem key={timeline.id} value={timeline.id}>
                    {timeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTimelineId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Tile</label>
              <Select value={selectedTileId} onValueChange={setSelectedTileId}>
                <SelectTrigger data-testid="select-link-tile">
                  <SelectValue placeholder="Choose a tile" />
                </SelectTrigger>
                <SelectContent>
                  {availableTiles.map((tile) => (
                    <SelectItem 
                      key={tile.id} 
                      value={tile.id}
                      disabled={tileLinks.some((l) => l.tileId === tile.id)}
                    >
                      Image Tile {tile.position + 1}
                      {tile.prompt && ` - "${tile.prompt.substring(0, 20)}..."`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleAddLink}
            disabled={!selectedTileId || createLinkMutation.isPending}
            className="w-full gap-2"
            data-testid="button-add-link"
          >
            <Plus className="w-4 h-4" />
            {createLinkMutation.isPending ? "Adding..." : "Add to Sequence"}
          </Button>

          {sortedLinks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked Sequence</label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {sortedLinks.map((link, index) => (
                    <div 
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-2 bg-card rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          {index + 1}
                        </Badge>
                        <span className="text-sm">
                          {getTimelineLabel(link.timelineId)} - {getTileLabel(link.tileId)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveLink(link.id)}
                        data-testid={`button-remove-link-${link.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {tileLinks.length > 0 && (
            <Button
              variant="outline"
              onClick={() => clearLinksMutation.mutate()}
              disabled={clearLinksMutation.isPending}
              className="gap-2"
              data-testid="button-clear-links"
            >
              <Unlink className="w-4 h-4" />
              {clearLinksMutation.isPending ? "Clearing..." : "Clear All"}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-link-modal">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
