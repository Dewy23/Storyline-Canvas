import { Tile } from "./tile";
import { InsertButton } from "./insert-button";
import type { Tile as TileType, Timeline, TileLink } from "@shared/schema";

interface TimelineRowProps {
  timeline: Timeline;
  tiles: TileType[];
  allTiles?: TileType[];
  type: "image" | "video";
  onInsertTile: (position: number) => void;
  onGenerate: (tileId: string) => void;
  onFrameSliderChange?: (tileId: string, framePercent: number, previousVideoUrl: string) => void;
  tileLinks?: TileLink[];
}

export function TimelineRow({
  timeline,
  tiles,
  allTiles = tiles,
  type,
  onInsertTile,
  onGenerate,
  onFrameSliderChange,
  tileLinks = [],
}: TimelineRowProps) {
  const filteredTiles = tiles
    .filter((t) => t.type === type && t.timelineId === timeline.id)
    .sort((a, b) => a.position - b.position);

  const imageTiles = allTiles
    .filter((t) => t.type === "image" && t.timelineId === timeline.id)
    .sort((a, b) => a.position - b.position);

  const videoTiles = allTiles
    .filter((t) => t.type === "video" && t.timelineId === timeline.id)
    .sort((a, b) => a.position - b.position);

  const getPreviousVideoTile = (imageTile: TileType): TileType | undefined => {
    if (imageTile.type !== "image") return undefined;
    return videoTiles.find((vt) => vt.position === imageTile.position - 1);
  };

  const getAboveImageTile = (videoTile: TileType): TileType | undefined => {
    if (videoTile.type !== "video") return undefined;
    return imageTiles.find((it) => it.position === videoTile.position);
  };

  const isTileLinked = (tileId: string): boolean => {
    return tileLinks.some((link) => link.tileId === tileId);
  };

  return (
    <div className="flex items-start gap-1 min-h-[180px]">
      {filteredTiles.length === 0 ? (
        <div className="flex items-center justify-center w-full min-h-[180px]">
          <InsertButton
            onClick={() => onInsertTile(0)}
            testId={`button-insert-first-${type}-${timeline.id}`}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start min-h-[180px]">
            <InsertButton
              onClick={() => onInsertTile(0)}
              testId={`button-insert-start-${type}-${timeline.id}`}
            />
          </div>
          {filteredTiles.map((tile, index) => (
            <div key={tile.id} className="flex items-start">
              <Tile
                tile={tile}
                onGenerate={() => onGenerate(tile.id)}
                previousVideoTile={type === "image" ? getPreviousVideoTile(tile) : undefined}
                aboveImageTile={type === "video" ? getAboveImageTile(tile) : undefined}
                onFrameSliderChange={onFrameSliderChange}
                isLinked={isTileLinked(tile.id)}
              />
              <InsertButton
                onClick={() => onInsertTile(index + 1)}
                testId={`button-insert-after-${tile.id}`}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
