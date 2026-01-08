import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, SkipBack, Plus, ZoomIn, ZoomOut, Mic, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioTrackItem } from "./audio-track-item";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AudioTrack, AudioClip } from "@shared/schema";

export function AudioWorkspace() {
  const {
    audioTracks,
    audioClips,
    addAudioTrack,
    removeAudioTrack,
    addAudioClip,
    removeAudioClip,
    playheadPosition,
    setPlayheadPosition,
    isPlaying,
    setIsPlaying,
    zoomLevel,
    setZoomLevel,
    tiles,
  } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTrackType, setNewTrackType] = useState<"voice" | "music" | "sfx">("voice");

  const createTrackMutation = useMutation({
    mutationFn: (track: Omit<AudioTrack, "id">) => 
      apiRequest<AudioTrack>("POST", "/api/audio-tracks", track),
    onSuccess: (newTrack) => {
      addAudioTrack(newTrack);
      queryClient.invalidateQueries({ queryKey: ["/api/audio-tracks"] });
      toast({
        title: "Track added",
        description: `New ${newTrack.type} track created`,
      });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/audio-tracks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audio-tracks"] });
    },
  });

  const createClipMutation = useMutation({
    mutationFn: (clip: Omit<AudioClip, "id">) => 
      apiRequest<AudioClip>("POST", "/api/audio-clips", clip),
    onSuccess: (newClip) => {
      addAudioClip(newClip);
      queryClient.invalidateQueries({ queryKey: ["/api/audio-clips"] });
      toast({
        title: "Clip added",
        description: "New audio clip created",
      });
    },
  });

  const deleteClipMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/audio-clips/${id}`),
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRewind = () => {
    setPlayheadPosition(0);
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.25, 0.5));
  };

  const handleAddTrack = useCallback(() => {
    const typeNames = { voice: "Voice", music: "Music", sfx: "SFX" };
    const trackCount = audioTracks.filter((t) => t.type === newTrackType).length;
    
    const newTrack: Omit<AudioTrack, "id"> = {
      name: `${typeNames[newTrackType]} ${trackCount + 1}`,
      type: newTrackType,
      startTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      isSolo: false,
      fadeIn: 0,
      fadeOut: 0,
    };
    
    createTrackMutation.mutate(newTrack);
  }, [newTrackType, audioTracks, createTrackMutation]);

  const handleDeleteTrack = useCallback((trackId: string) => {
    audioClips
      .filter((c) => c.trackId === trackId)
      .forEach((c) => {
        removeAudioClip(c.id);
        deleteClipMutation.mutate(c.id);
      });
    removeAudioTrack(trackId);
    deleteTrackMutation.mutate(trackId);
    toast({
      title: "Track deleted",
      description: "Audio track has been removed",
    });
  }, [audioClips, removeAudioClip, removeAudioTrack, deleteClipMutation, deleteTrackMutation, toast]);

  const handleAddClip = useCallback((trackId: string) => {
    const track = audioTracks.find((t) => t.id === trackId);
    if (!track) return;

    const trackClips = audioClips.filter((c) => c.trackId === trackId);
    const lastClipEnd = trackClips.reduce((max, clip) => 
      Math.max(max, clip.startTime + clip.duration), 0
    );

    const newClip: Omit<AudioClip, "id"> = {
      trackId,
      name: `Clip ${trackClips.length + 1}`,
      startTime: lastClipEnd,
      duration: 3,
      trimStart: 0,
      trimEnd: 0,
      prompt: "",
    };

    createClipMutation.mutate(newClip);
  }, [audioTracks, audioClips, createClipMutation]);

  const videoTilesWithMedia = tiles.filter((t) => t.type === "video" && t.mediaUrl);
  const previewVideoUrl = videoTilesWithMedia[0]?.mediaUrl;

  const timeRulerMarks = Array.from({ length: 31 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-6 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-12 flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRewind}
              data-testid="button-rewind"
              aria-label="Rewind"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handlePlayPause}
              data-testid="button-play-pause"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <span className="text-sm font-mono text-muted-foreground w-16" data-testid="text-playhead-time">
              {Math.floor(playheadPosition / 60).toString().padStart(2, "0")}:
              {(playheadPosition % 60).toString().padStart(2, "0")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              data-testid="button-zoom-out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              data-testid="button-zoom-in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={newTrackType} onValueChange={(v) => setNewTrackType(v as typeof newTrackType)}>
              <SelectTrigger className="w-32" data-testid="select-track-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voice">
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice
                  </span>
                </SelectItem>
                <SelectItem value="music">
                  <span className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Music
                  </span>
                </SelectItem>
                <SelectItem value="sfx">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    SFX
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddTrack} 
              className="gap-2" 
              data-testid="button-add-track"
              disabled={createTrackMutation.isPending}
            >
              <Plus className="w-4 h-4" />
              Add Track
            </Button>
          </div>
        </div>

        <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
          <div className="h-8 flex border-b bg-muted/30">
            <div className="w-40 shrink-0 border-r" />
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 flex" style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: "left" }}>
                {timeRulerMarks.map((second) => (
                  <div
                    key={second}
                    className="flex-none w-[20px] text-center border-r border-border/50"
                  >
                    <span className="text-[10px] text-muted-foreground">{second}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {audioTracks.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Music className="w-8 h-8" />
                <p className="text-sm">No audio tracks yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddTrack} 
                  className="gap-2" 
                  data-testid="button-add-first-track"
                  disabled={createTrackMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                  Add your first track
                </Button>
              </div>
            ) : (
              audioTracks.map((track) => (
                <AudioTrackItem
                  key={track.id}
                  track={track}
                  clips={audioClips.filter((c) => c.trackId === track.id)}
                  onAddClip={() => handleAddClip(track.id)}
                  onDeleteTrack={() => handleDeleteTrack(track.id)}
                />
              ))
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <Card className="lg:w-[400px] shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium">Preview</h3>
        </div>
        <div className="flex-1 p-3">
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
            {previewVideoUrl ? (
              <img
                src={previewVideoUrl}
                alt="Video preview"
                className="w-full h-full object-cover"
                data-testid="preview-video"
              />
            ) : (
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Play className="w-8 h-8" />
                <span>No video preview available</span>
                <span className="text-xs">Generate videos in the Timeline tab</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
