import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Video, Wand2, Loader2, Maximize2, X, Film, ImageIcon, Settings } from "lucide-react";
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

// Free providers that don't require API keys (built-in, no settings required)
const FREE_PROVIDERS: AIProvider[] = ["pollinations"];

// All provider types by category
const imageProviderTypes: AIProvider[] = ["pollinations", "openai", "gemini", "stability", "flux", "ideogram", "huggingface", "hunyuan", "firefly", "bria", "runware", "replicate"];
const videoProviderTypes: AIProvider[] = ["runway", "veo", "kling", "pika", "luma", "tavus", "mootion", "akool", "mirage", "pictory", "replicate"];

// Built-in free provider entry (always available, no settings needed)
const BUILTIN_POLLINATIONS = {
  id: "__pollinations__",
  provider: "pollinations" as AIProvider,
  instanceName: "Pollinations.ai (Free)",
  apiKey: "",
  isConnected: true,
};

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
  const { updateTile, selectedTileId, setSelectedTileId, apiSettings, setSettingsOpen } = useAppStore();
  const queryClient = useQueryClient();
  const isSelected = selectedTileId === tile.id;
  
  // Get provider types for this tile type
  const providerTypesForTile = tile.type === "image" ? imageProviderTypes : videoProviderTypes;
  
  // Build list of available provider instances:
  // 1. Built-in free providers (Pollinations for images)
  // 2. Connected settings from apiSettings that match tile type (only show connected ones)
  const availableInstances = [
    ...(tile.type === "image" ? [BUILTIN_POLLINATIONS] : []),
    ...apiSettings.filter((s) => 
      providerTypesForTile.includes(s.provider) && s.isConnected
    ),
  ];
  
  const hasAvailableProviders = availableInstances.length > 0;
  
  // Get current selected instance
  const currentInstanceId = tile.providerInstanceId || (tile.type === "image" ? "__pollinations__" : "");
  const currentInstance = availableInstances.find((i) => i.id === currentInstanceId);

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

  // Auto-select first available instance when current selection is invalid
  // Only runs when there are available instances and no valid current selection
  useEffect(() => {
    if (availableInstances.length === 0) return; // No providers available, nothing to auto-select
    if (currentInstance) return; // Already have a valid selection
    
    const firstInstance = availableInstances[0];
    const newInstanceId = firstInstance.id;
    const newProvider = firstInstance.provider;
    
    // Skip if already set to avoid loops
    if (tile.providerInstanceId === newInstanceId && tile.provider === newProvider) return;
    
    updateTile(tile.id, { 
      provider: newProvider, 
      providerInstanceId: newInstanceId 
    });
    updateTileMutation.mutate({ 
      id: tile.id, 
      updates: { 
        provider: newProvider,
        providerInstanceId: newInstanceId 
      } 
    });
  }, [availableInstances.length, currentInstance, tile.id, tile.providerInstanceId, tile.provider]);

  const handlePromptChange = (value: string) => {
    updateTile(tile.id, { prompt: value });
  };

  const handlePromptBlur = () => {
    updateTileMutation.mutate({ id: tile.id, updates: { prompt: tile.prompt } });
  };

  const handleInstanceChange = (instanceId: string) => {
    if (instanceId === "__manage_providers__") {
      setSettingsOpen(true);
      return;
    }
    const instance = availableInstances.find((i) => i.id === instanceId);
    // Only allow selecting connected instances (validated API keys)
    if (instance && instance.isConnected) {
      updateTile(tile.id, { 
        provider: instance.provider, 
        providerInstanceId: instance.id 
      });
      updateTileMutation.mutate({ 
        id: tile.id, 
        updates: { 
          provider: instance.provider,
          providerInstanceId: instance.id 
        } 
      });
    }
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
              {hasAvailableProviders ? (
                <>
                  <Select
                    value={currentInstanceId}
                    onValueChange={handleInstanceChange}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid={`select-provider-${tile.id}`}>
                      <SelectValue placeholder="Select provider">
                        {currentInstance?.instanceName || "Select provider"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableInstances.map((instance) => {
                        const isFree = FREE_PROVIDERS.includes(instance.provider);
                        return (
                          <SelectItem key={instance.id} value={instance.id} className="text-xs">
                            <span className="flex items-center gap-2">
                              {instance.instanceName}
                              {isFree ? (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                                  Free
                                </span>
                              ) : instance.isConnected ? (
                                <span className="w-2 h-2 rounded-full bg-green-500" title="API key connected" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-yellow-500" title="Key pending" />
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                      <div className="border-t border-border my-1" />
                      <SelectItem value="__manage_providers__" className="text-xs">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Settings className="w-3 h-3" />
                          Manage Providers...
                        </span>
                      </SelectItem>
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
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No {tile.type} providers available</p>
                    <p className="text-xs text-muted-foreground">
                      Add an API key in Settings to generate {tile.type === "video" ? "videos" : "content"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettingsOpen(true);
                    }}
                    data-testid={`button-open-settings-${tile.id}`}
                  >
                    <Settings className="w-4 h-4" />
                    Open Settings
                  </Button>
                </div>
              )}
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
