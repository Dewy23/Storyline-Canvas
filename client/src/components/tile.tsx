import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Video, Wand2, Loader2, Maximize2, X, Film, ImageIcon } from "lucide-react";
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
  onGenerate: () => void;
  previousVideoTile?: TileType;
  aboveImageTile?: TileType;
  onFrameSliderChange?: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
  isLinked?: boolean;
}

const providerLabels: Record<AIProvider, string> = {
  flux: "Flux",
  stability: "Stability AI",
  dalle3: "DALL·E 3",
  ideogram: "Ideogram",
  runway: "Runway",
  kling: "Kling",
  pika: "Pika",
  luma: "Luma Dream Machine",
  elevenlabs: "ElevenLabs",
  openai: "OpenAI",
  replicate: "Replicate",
};

const imageProviders: AIProvider[] = ["flux", "stability", "dalle3", "ideogram"];
const videoProviders: AIProvider[] = ["runway", "kling", "pika", "luma"];

export function Tile({
  tile,
  onGenerate,
  previousVideoTile,
  aboveImageTile,
  onFrameSliderChange,
  isLinked = false,
}: TileProps) {
  const [activeTab, setActiveTab] = useState<"view" | "prompt" | "source">("view");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { updateTile, selectedTileId, setSelectedTileId } = useAppStore();
  const queryClient = useQueryClient();
  const isSelected = selectedTileId === tile.id;
  const providers = tile.type === "image" ? imageProviders : videoProviders;

  const hasPreviousVideo = tile.type === "image" && previousVideoTile?.mediaUrl;
  const hasAboveImage = tile.type === "video" && aboveImageTile?.mediaUrl;
  
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
      const cleanUrl = previousVideoTile.mediaUrl.split('?')[0];
      const frameBasedUrl = `${cleanUrl}?frame=${framePercent}`;
      updateTile(tile.id, { selectedFrame: framePercent });
      updateTileMutation.mutate({ 
        id: tile.id, 
        updates: { selectedFrame: framePercent } 
      });
    }
  };

  const getPreviewImage = () => {
    if (tile.mediaUrl) {
      return tile.mediaUrl;
    }
    return null;
  };

  const getSourceFrameImage = () => {
    if (tile.type === "image" && previousVideoTile?.mediaUrl) {
      const cleanUrl = previousVideoTile.mediaUrl.split('?')[0];
      const framePercent = tile.selectedFrame || 100;
      return `${cleanUrl}?frame=${framePercent}`;
    }
    return null;
  };

  const getReferenceImage = () => {
    if (tile.type === "video" && aboveImageTile?.mediaUrl) {
      return aboveImageTile.mediaUrl;
    }
    return null;
  };

  const previewImage = getPreviewImage();
  const sourceFrameImage = getSourceFrameImage();
  const referenceImage = getReferenceImage();

  const handleFullscreen = useCallback((e: React.MouseEvent, imageUrl?: string | null) => {
    e.stopPropagation();
    
    if (tile.type === "video" && activeTab === "view" && videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else if (imageUrl) {
      setIsLightboxOpen(true);
    }
  }, [tile.type, activeTab]);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    
    if (isLightboxOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  const getLightboxImage = () => {
    if (activeTab === "source" && sourceFrameImage) return sourceFrameImage;
    if (activeTab === "source" && referenceImage) return referenceImage;
    return previewImage;
  };

  return (
    <>
      <div className="relative group flex flex-col">
        <Card
          className={`w-48 flex flex-col cursor-pointer transition-all ${
            isSelected ? "ring-2 ring-primary" : ""
          } ${isLinked ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setSelectedTileId(tile.id)}
          data-testid={`tile-${tile.type}-${tile.id}`}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "view" | "prompt" | "source")} className="flex flex-col h-full">
            <TabsList className="h-8 w-full grid grid-cols-3 shrink-0">
              <TabsTrigger value="view" className="text-xs px-1" data-testid={`tab-view-${tile.id}`}>
                View
              </TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs px-1" data-testid={`tab-prompt-${tile.id}`}>
                Prompt
              </TabsTrigger>
              <TabsTrigger value="source" className="text-xs px-1" data-testid={`tab-source-${tile.id}`}>
                {tile.type === "video" ? "Ref" : "Source"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="flex-1 m-0 p-2 flex flex-col gap-2">
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden relative group/preview">
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
                      ref={videoRef}
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
                
                {previewImage && (
                  <button
                    onClick={(e) => handleFullscreen(e, previewImage)}
                    className="absolute bottom-1 right-1 p-1 rounded bg-black/40 text-white/70 opacity-0 group-hover/preview:opacity-100 hover:text-white hover:bg-black/60 transition-all"
                    data-testid={`button-fullscreen-${tile.id}`}
                    aria-label="View fullscreen"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="flex-1 m-0 p-2 flex flex-col gap-2">
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
              <Textarea
                placeholder={`Describe the ${tile.type} you want to generate...`}
                value={tile.prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                onBlur={handlePromptBlur}
                className="flex-1 min-h-[80px] text-xs resize-none"
                data-testid={`textarea-prompt-${tile.id}`}
              />
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

            <TabsContent value="source" className="flex-1 m-0 p-2 flex flex-col gap-2">
              {tile.type === "image" ? (
                <>
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden relative group/preview">
                    {sourceFrameImage ? (
                      <img
                        src={sourceFrameImage}
                        alt="Source frame from video"
                        className="w-full h-full object-cover"
                        data-testid={`source-frame-image-${tile.id}`}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Film className="w-6 h-6" />
                        <span className="text-xs text-center px-2">No video source</span>
                      </div>
                    )}
                    
                    {sourceFrameImage && (
                      <button
                        onClick={(e) => handleFullscreen(e, sourceFrameImage)}
                        className="absolute bottom-1 right-1 p-1 rounded bg-black/40 text-white/70 opacity-0 group-hover/preview:opacity-100 hover:text-white hover:bg-black/60 transition-all"
                        data-testid={`button-fullscreen-source-${tile.id}`}
                        aria-label="View fullscreen"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {previousVideoTile?.mediaUrl && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Frame</span>
                        <span>{tile.selectedFrame}%</span>
                      </div>
                      <Slider
                        value={[tile.selectedFrame]}
                        onValueChange={handleVideoFrameSelect}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                        data-testid={`slider-source-frame-${tile.id}`}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden relative group/preview">
                  {referenceImage ? (
                    <img
                      src={referenceImage}
                      alt="Reference image"
                      className="w-full h-full object-cover"
                      data-testid={`reference-image-${tile.id}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-xs text-center px-2">No reference image</span>
                    </div>
                  )}
                  
                  {referenceImage && (
                    <button
                      onClick={(e) => handleFullscreen(e, referenceImage)}
                      className="absolute bottom-1 right-1 p-1 rounded bg-black/40 text-white/70 opacity-0 group-hover/preview:opacity-100 hover:text-white hover:bg-black/60 transition-all"
                      data-testid={`button-fullscreen-reference-${tile.id}`}
                      aria-label="View fullscreen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={handleCloseLightbox}
          data-testid={`lightbox-${tile.id}`}
        >
          <button
            onClick={handleCloseLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
            data-testid={`button-close-lightbox-${tile.id}`}
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img
            src={getLightboxImage() || ""}
            alt="Fullscreen view"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            data-testid={`lightbox-image-${tile.id}`}
          />
        </div>
      )}
    </>
  );
}
