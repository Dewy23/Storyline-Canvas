import { useMemo, useState, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { useAppStore } from "@/lib/store";
import { Film, Layers, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number }>({ startY: 0, startHeight: 300 });
  
  const isSingleTimeline = timelines.length === 1;

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
        </div>
        <span className="text-xs text-muted-foreground">
          {segmentPreviews.length} segment{segmentPreviews.length !== 1 ? "s" : ""} {isSingleTimeline && "(auto)"}
        </span>
      </div>
      
      <div className="flex-1 flex items-center p-4 overflow-x-auto gap-2">
        {segmentPreviews.map((preview, index) => (
          <div 
            key={preview.segmentId} 
            className="relative flex-shrink-0"
            data-testid={`preview-segment-${index}`}
          >
            <div className="w-24 h-14 rounded-md overflow-hidden border border-border bg-muted">
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
        ))}
        
        <div className="flex-shrink-0 ml-4 flex flex-col items-center justify-center text-muted-foreground">
          <Film className="w-6 h-6 mb-1" />
          <span className="text-xs">Export</span>
        </div>
      </div>
    </div>
  );
}
