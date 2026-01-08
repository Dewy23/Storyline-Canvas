import { Volume2, VolumeX, Headphones, Trash2, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/lib/store";
import type { AudioTrack, AudioClip } from "@shared/schema";

interface AudioTrackItemProps {
  track: AudioTrack;
  clips: AudioClip[];
  onAddClip: () => void;
  onDeleteTrack: () => void;
}

export function AudioTrackItem({ track, clips, onAddClip, onDeleteTrack }: AudioTrackItemProps) {
  const { updateAudioTrack } = useAppStore();

  const handleVolumeChange = (value: number[]) => {
    updateAudioTrack(track.id, { volume: value[0] / 100 });
  };

  const handleMuteToggle = () => {
    updateAudioTrack(track.id, { isMuted: !track.isMuted });
  };

  const handleSoloToggle = () => {
    updateAudioTrack(track.id, { isSolo: !track.isSolo });
  };

  const getTrackColor = () => {
    switch (track.type) {
      case "voice":
        return "bg-blue-500/20 border-blue-500/40";
      case "music":
        return "bg-purple-500/20 border-purple-500/40";
      case "sfx":
        return "bg-green-500/20 border-green-500/40";
    }
  };

  return (
    <div className="flex h-24 border-b" data-testid={`audio-track-${track.id}`}>
      <div className="w-40 shrink-0 p-2 border-r bg-card flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate" data-testid={`text-track-name-${track.id}`}>
            {track.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onDeleteTrack}
            data-testid={`button-delete-track-${track.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${track.isMuted ? "text-destructive" : ""}`}
            onClick={handleMuteToggle}
            data-testid={`button-mute-${track.id}`}
            aria-label={track.isMuted ? "Unmute" : "Mute"}
          >
            {track.isMuted ? (
              <VolumeX className="w-3 h-3" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${track.isSolo ? "text-primary" : ""}`}
            onClick={handleSoloToggle}
            data-testid={`button-solo-${track.id}`}
            aria-label={track.isSolo ? "Unsolo" : "Solo"}
          >
            <Headphones className="w-3 h-3" />
          </Button>
          <Slider
            value={[track.volume * 100]}
            onValueChange={handleVolumeChange}
            min={0}
            max={100}
            step={1}
            className="flex-1"
            data-testid={`slider-volume-${track.id}`}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={onAddClip}
          data-testid={`button-add-clip-${track.id}`}
        >
          <Wand2 className="w-3 h-3" />
          Generate
        </Button>
      </div>

      <div className="flex-1 relative overflow-x-auto bg-muted/30">
        {clips.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={onAddClip}
              data-testid={`button-add-first-clip-${track.id}`}
            >
              <Plus className="w-4 h-4" />
              Add audio clip
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center p-2 gap-1">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className={`h-16 rounded-md border flex items-center px-3 ${getTrackColor()}`}
                style={{ width: `${Math.max(clip.duration * 20, 80)}px` }}
                data-testid={`clip-${clip.id}`}
              >
                <span className="text-xs truncate">{clip.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
