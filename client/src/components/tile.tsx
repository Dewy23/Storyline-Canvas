import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Video, Wand2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import type { Tile as TileType, AIProvider } from "@shared/schema";

interface TileProps {
  tile: TileType;
  onBranchUp: () => void;
  onBranchDown: () => void;
  onGenerate: () => void;
  showBranchUp?: boolean;
  showBranchDown?: boolean;
  previousVideoTile?: TileType;
  onFrameSliderChange?: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
}

const providerLabels: Record<AIProvider, string> = {
  stability: "Stability AI",
  runway: "Runway",
  kling: "Kling",
  flux: "Flux",
  elevenlabs: "ElevenLabs",
  openai: "OpenAI",
  replicate: "Replicate",
};

const imageProviders: AIProvider[] = ["stability", "flux", "openai", "replicate"];
const videoProviders: AIProvider[] = ["runway", "kling", "replicate"];

export function Tile({
  tile,
  onBranchUp,
  onBranchDown,
  onGenerate,
  showBranchUp = true,
  showBranchDown = true,
  previousVideoTile,
  onFrameSliderChange,
}: TileProps) {
  const [activeTab, setActiveTab] = useState<"view" | "prompt">("view");
  const { updateTile, selectedTileId, setSelectedTileId } = useAppStore();
  const queryClient = useQueryClient();
  const isSelected = selectedTileId === tile.id;
  const providers = tile.type === "image" ? imageProviders : videoProviders;

  const hasPreviousVideo = tile.type === "image" && previousVideoTile?.mediaUrl;
  
  const updateTileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TileType> }) => {
      const response = await apiRequest("PATCH", `/api/tiles/${id}`, updates);
      return response.json() as Promise<TileType>;
    },
    onSuccess: (updatedTile) => {
      updateTile(updatedTile.id, updatedTile);
      queryClient.invalidateQueries({ queryKey: ["/api/tiles"] });
    },
  });

  const handlePromptChange = (value: string) => {
    updateTile(tile.id, { prompt: value });
  };

  const handlePromptBlur = () => {
    updateTileMutation.mutate({ id: tile.id, updates: { prompt: tile.prompt } });
  };

  const handleProviderChange = (value: string) => {
    updateTile(tile.id, { provider: value as AIProvider });
    updateTileMutation.mutate({ id: tile.id, updates: { provider: value as AIProvider } });
  };

  const handleFrameChange = (value: number[]) => {
    const frameValue = value[0];
    updateTile(tile.id, { selectedFrame: frameValue });
    updateTileMutation.mutate({ id: tile.id, updates: { selectedFrame: frameValue } });
  };

  const handleVideoFrameSelect = (value: number[]) => {
    const framePercent = value[0];
    
    if (previousVideoTile?.mediaUrl && onFrameSliderChange) {
      onFrameSliderChange(tile.id, framePercent, previousVideoTile.mediaUrl);
    } else if (previousVideoTile?.mediaUrl) {
      const frameBasedUrl = `${previousVideoTile.mediaUrl}?frame=${framePercent}`;
      updateTile(tile.id, { mediaUrl: frameBasedUrl, selectedFrame: framePercent });
      updateTileMutation.mutate({ 
        id: tile.id, 
        updates: { mediaUrl: frameBasedUrl, selectedFrame: framePercent } 
      });
    }
  };

  const getPreviewImage = () => {
    if (tile.mediaUrl) {
      return tile.mediaUrl;
    }
    if (hasPreviousVideo && previousVideoTile?.mediaUrl) {
      const framePercent = tile.selectedFrame || 100;
      return `${previousVideoTile.mediaUrl}?frame=${framePercent}`;
    }
    return null;
  };

  const previewImage = getPreviewImage();

  return (
    <div className="relative group flex flex-col">
      {showBranchUp && tile.type === "image" && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-5 left-1/2 -translate-x-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={onBranchUp}
          data-testid={`button-branch-up-${tile.id}`}
          aria-label="Create branch above"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
      )}

      <Card
        className={`w-48 flex flex-col cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedTileId(tile.id)}
        data-testid={`tile-${tile.type}-${tile.id}`}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "view" | "prompt")} className="flex flex-col h-full">
          <TabsList className="h-8 w-full grid grid-cols-2 shrink-0">
            <TabsTrigger value="view" className="text-xs" data-testid={`tab-view-${tile.id}`}>
              View
            </TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs" data-testid={`tab-prompt-${tile.id}`}>
              Prompt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="flex-1 m-0 p-2 flex flex-col gap-2">
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden relative">
              {previewImage ? (
                tile.type === "image" ? (
                  <img
                    src={previewImage}
                    alt="Generated"
                    className="w-full h-full object-cover"
                    data-testid={`preview-image-${tile.id}`}
                  />
                ) : (
                  <video
                    src={previewImage}
                    className="w-full h-full object-cover"
                    controls={false}
                    data-testid={`preview-video-${tile.id}`}
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  {tile.isGenerating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : tile.type === "image" ? (
                    <Image className="w-6 h-6" />
                  ) : (
                    <Video className="w-6 h-6" />
                  )}
                  <span className="text-xs">
                    {tile.isGenerating ? "Generating..." : `No ${tile.type}`}
                  </span>
                </div>
              )}
            </div>
            
            {tile.type === "image" && tile.mediaUrl && !hasPreviousVideo && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Frame</span>
                  <span>{tile.selectedFrame}%</span>
                </div>
                <Slider
                  value={[tile.selectedFrame]}
                  onValueChange={handleFrameChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid={`slider-frame-${tile.id}`}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="prompt" className="flex-1 m-0 p-2 flex flex-col gap-2">
            <Textarea
              placeholder={`Describe the ${tile.type} you want to generate...`}
              value={tile.prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              onBlur={handlePromptBlur}
              className="flex-1 min-h-[80px] text-xs resize-none"
              data-testid={`textarea-prompt-${tile.id}`}
            />
            <Select
              value={tile.provider || providers[0]}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="h-8 text-xs" data-testid={`select-provider-${tile.id}`}>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider} className="text-xs">
                    {providerLabels[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              disabled={tile.isGenerating || !tile.prompt}
              data-testid={`button-generate-${tile.id}`}
            >
              {tile.isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      {hasPreviousVideo && (
        <div className="w-48 mt-2 px-1 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Video Frame</span>
            <span>{tile.selectedFrame}%</span>
          </div>
          <Slider
            value={[tile.selectedFrame]}
            onValueChange={handleVideoFrameSelect}
            min={0}
            max={100}
            step={1}
            className="w-full"
            data-testid={`slider-video-frame-${tile.id}`}
          />
        </div>
      )}

      {showBranchDown && tile.type === "video" && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={onBranchDown}
          data-testid={`button-branch-down-${tile.id}`}
          aria-label="Create branch below"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
