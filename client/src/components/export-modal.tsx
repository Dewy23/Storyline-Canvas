import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ExportModal() {
  const { isExportOpen, setExportOpen, timelines, tiles, audioTracks } = useAppStore();
  const [selectedTimelines, setSelectedTimelines] = useState<Set<string>>(new Set());
  const [includeAudio, setIncludeAudio] = useState(true);
  const [exportProgress, setExportProgress] = useState(0);
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        timelineIds: Array.from(selectedTimelines),
        includeAudio,
        tiles: tiles.filter((t) => selectedTimelines.has(t.timelineId)),
        audioTracks: includeAudio ? audioTracks : [],
      };
      
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExportProgress(i);
      }
      
      return apiRequest("POST", "/api/export", payload);
    },
    onSuccess: () => {
      toast({
        title: "Export complete",
        description: "Your video has been exported successfully",
      });
      setExportOpen(false);
      setExportProgress(0);
      setSelectedTimelines(new Set());
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting",
        variant: "destructive",
      });
      setExportProgress(0);
    },
  });

  const handleTimelineToggle = (timelineId: string) => {
    setSelectedTimelines((prev) => {
      const next = new Set(prev);
      if (next.has(timelineId)) {
        next.delete(timelineId);
      } else {
        next.add(timelineId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTimelines.size === timelines.length) {
      setSelectedTimelines(new Set());
    } else {
      setSelectedTimelines(new Set(timelines.map((t) => t.id)));
    }
  };

  const handleExport = async () => {
    if (selectedTimelines.size === 0) {
      toast({
        title: "No timelines selected",
        description: "Please select at least one timeline to export",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate();
  };

  const getTileCount = (timelineId: string) => {
    return tiles.filter((t) => t.timelineId === timelineId).length;
  };

  const getMediaCount = (timelineId: string) => {
    return tiles.filter((t) => t.timelineId === timelineId && t.mediaUrl).length;
  };

  return (
    <Dialog open={isExportOpen} onOpenChange={setExportOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Download className="w-5 h-5" />
            Smart Export
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Select Timelines</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all"
              >
                {selectedTimelines.size === timelines.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-48 border rounded-md">
              <div className="p-3 space-y-2">
                {timelines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No timelines available
                  </p>
                ) : (
                  timelines.map((timeline) => (
                    <div
                      key={timeline.id}
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                      onClick={() => handleTimelineToggle(timeline.id)}
                      data-testid={`timeline-checkbox-${timeline.id}`}
                    >
                      <Checkbox
                        checked={selectedTimelines.has(timeline.id)}
                        onCheckedChange={() => handleTimelineToggle(timeline.id)}
                        id={`timeline-${timeline.id}`}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`timeline-${timeline.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {timeline.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {getTileCount(timeline.id)} tiles, {getMediaCount(timeline.id)} with media
                        </p>
                      </div>
                      {selectedTimelines.has(timeline.id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-md">
            <Checkbox
              id="include-audio"
              checked={includeAudio}
              onCheckedChange={(checked) => setIncludeAudio(checked as boolean)}
              data-testid="checkbox-include-audio"
            />
            <div>
              <Label htmlFor="include-audio" className="text-sm font-medium cursor-pointer">
                Include Audio Tracks
              </Label>
              <p className="text-xs text-muted-foreground">
                {audioTracks.length} audio track{audioTracks.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          {exportMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setExportOpen(false)}
            disabled={exportMutation.isPending}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending || selectedTimelines.size === 0}
            data-testid="button-start-export"
            className="gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Video
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
