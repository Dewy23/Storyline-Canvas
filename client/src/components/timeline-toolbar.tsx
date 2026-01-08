import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Link, MousePointer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Timeline, Tile } from "@shared/schema";

export function TimelineToolbar() {
  const { timelines, addTimeline, addTile, activeTool, setActiveTool } = useAppStore();
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

  const handleToolClick = (tool: "select" | "link") => {
    if (activeTool === tool) {
      setActiveTool("select");
    } else {
      setActiveTool(tool);
    }
  };

  return (
    <div className="h-full bg-card/50 border-r border-border flex flex-col p-2 gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => handleToolClick("select")}
            data-testid="button-tool-select"
            className={activeTool === "select" ? "ring-2 ring-primary" : ""}
          >
            <MousePointer className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Select Tool</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === "link" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => handleToolClick("link")}
            data-testid="button-tool-link"
            className={activeTool === "link" ? "ring-2 ring-green-500" : ""}
          >
            <Link className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Link Segments for Render</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

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
    </div>
  );
}
