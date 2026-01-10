import { useMemo, useState, useRef, useCallback, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { useAppStore } from "@/lib/store";
import { Film, Layers, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, X, ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number }>({ startY: 0, startHeight: 300 });
  
  const isSingleTimeline = timelines.length === 1;

  const handleOpenLightbox = useCallback((imageUrl: string) => {
    setLightboxImage(imageUrl);
    setZoomLevel(1);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null);
    setZoomLevel(1);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleDownload = useCallback(() => {
    if (lightboxImage) {
      const link = document.createElement("a");
      link.href = lightboxImage;
      link.download = `storyforge-preview-${Date.now()}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [lightboxImage]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxImage) {
        handleCloseLightbox();
      }
    };
    
    if (lightboxImage) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [lightboxImage, handleCloseLightbox]);

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

  const hasAnyMedia = segmentPreviews.some(p => p.hasImage || p.hasVideo);
  
  const previewVideoUrl = useMemo(() => {
    const firstVideoSegment = segmentPreviews.find(p => p.hasVideo && p.videoTile?.mediaUrl);
    if (firstVideoSegment?.videoTile?.mediaUrl) {
      return firstVideoSegment.videoTile.mediaUrl;
    }
    return null;
  }, [segmentPreviews]);

  const handlePlayPause = () => {
    if (videoRef.current && previewVideoUrl) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startY: e.clientY, startHeight: playerHeight };
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeRef.current.startY;
      const newHeight = Math.min(600, Math.max(150, resizeRef.current.startHeight + delta));
      setPlayerHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [playerHeight]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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
      {isPlayerOpen && (
        <>
          <div 
            className="relative bg-black flex items-center justify-center"
            style={{ height: playerHeight }}
          >
            {previewVideoUrl ? (
              <video
                ref={videoRef}
                className="max-w-full max-h-full"
                src={previewVideoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="relative">
                  <Film className="w-16 h-16 opacity-30" />
                  <Play className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm">Click Play to preview final render</p>
                <p className="text-xs text-muted-foreground/70">Generate content in your segments first</p>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handlePlayPause}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <span className="text-xs text-white/80 w-16">
                  {formatTime(currentTime)} / {formatTime(duration || 0)}
                </span>
                
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleMuteToggle}
                  data-testid="button-mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleFullscreen}
                  data-testid="button-fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div
            className="h-2 bg-border/50 cursor-ns-resize hover:bg-primary/50 transition-colors flex items-center justify-center"
            onMouseDown={handleResizeStart}
          >
            <div className="w-8 h-0.5 bg-muted-foreground/50 rounded-full" />
          </div>
        </>
      )}
      
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Render Preview</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1"
            onClick={() => setIsPlayerOpen(!isPlayerOpen)}
            data-testid="button-toggle-player"
          >
            <Film className="w-4 h-4" />
            {isPlayerOpen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          {segmentPreviews.some(p => p.imageTile?.mediaUrl) && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1"
              onClick={() => {
                const firstImageUrl = segmentPreviews.find(p => p.imageTile?.mediaUrl)?.imageTile?.mediaUrl;
                if (firstImageUrl) handleOpenLightbox(firstImageUrl);
              }}
              data-testid="button-view-full-image"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="text-xs">View Full Image</span>
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {segmentPreviews.length} segment{segmentPreviews.length !== 1 ? "s" : ""} {isSingleTimeline && "(auto)"}
        </span>
      </div>
      
      <div className="flex-1 flex items-center p-4 overflow-x-auto gap-2">
        {segmentPreviews.map((preview, index) => {
          const imageUrl = preview.imageTile?.mediaUrl;
          const canOpenLightbox = !!imageUrl;
          
          return (
          <div 
            key={preview.segmentId} 
            className="relative flex-shrink-0 group/segment"
            data-testid={`preview-segment-${index}`}
          >
            <div 
              className={`w-24 h-14 rounded-md overflow-hidden border border-border bg-muted ${canOpenLightbox ? "cursor-pointer hover:ring-2 hover:ring-primary transition-all" : ""}`}
              onClick={() => canOpenLightbox && handleOpenLightbox(imageUrl)}
              title={canOpenLightbox ? "Click to view full image" : preview.hasVideo ? "Video only - no image to preview" : "No content"}
            >
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
              
              {canOpenLightbox && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/segment:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-white" />
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
        );
        })}
        
        <div className="flex-shrink-0 ml-4 flex flex-col items-center justify-center text-muted-foreground">
          <Film className="w-6 h-6 mb-1" />
          <span className="text-xs">Export</span>
        </div>
      </div>
      
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={handleCloseLightbox}
        >
          <div className="flex items-center justify-between p-4 bg-black/50">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                disabled={zoomLevel <= 0.5}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <span className="text-sm text-white/70 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                disabled={zoomLevel >= 3}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                data-testid="button-reset-zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                data-testid="button-download-image"
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={handleCloseLightbox}
                data-testid="button-close-lightbox"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Full preview"
              className="max-w-none transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
              draggable={false}
            />
          </div>
          
          <div className="p-4 bg-black/50 text-center">
            <p className="text-sm text-white/50">Press Esc or click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
