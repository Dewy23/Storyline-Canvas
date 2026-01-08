import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Link } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Timeline, Tile } from "@shared/schema";

export function TimelineToolbar() {
  const { timelines, setLinkModalOpen, addTimeline, addTile } = useAppStore();
  const queryClient = useQueryClient();

  const createTimelineMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/timelines", {
        name: `Timeline ${timelines.length + 1}`,
        isCollapsed: false,
        order: timelines.length,
      });
      return response.json() as Promise<Timeline>;
    },
    onSuccess: async (newTimeline) => {
      addTimeline(newTimeline);
      queryClient.invalidateQueries({ queryKey: ["/api/timelines"] });

      for (let pos = 0; pos < 3; pos++) {
        const imgResponse = await apiRequest("POST", "/api/tiles", {
          type: "image",
          timelineId: newTimeline.id,
          position: pos,
          prompt: "",
          selectedFrame: 0,
          isGenerating: false,
        });
        const imgTile = await imgResponse.json() as Tile;
        addTile(imgTile);

        const vidResponse = await apiRequest("POST", "/api/tiles", {
          type: "video",
          timelineId: newTimeline.id,
          position: pos,
          prompt: "",
          selectedFrame: 0,
          isGenerating: false,
        });
        const vidTile = await vidResponse.json() as Tile;
        addTile(vidTile);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tiles"] });
    },
  });

  return (
    <div className="h-full bg-card/50 border-r border-border flex flex-col p-2 gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createTimelineMutation.mutate()}
            disabled={createTimelineMutation.isPending}
            data-testid="button-add-timeline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Add Timeline</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLinkModalOpen(true)}
            data-testid="button-link-tiles"
          >
            <Link className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Link Tiles</TooltipContent>
      </Tooltip>
    </div>
  );
}
