import { Tile } from "./tile";
import { InsertButton } from "./insert-button";
import type { Tile as TileType, Timeline } from "@shared/schema";

interface TimelineRowProps {
  timeline: Timeline;
  tiles: TileType[];
  type: "image" | "video";
  onInsertTile: (position: number) => void;
  onBranchUp: (tileId: string) => void;
  onBranchDown: (tileId: string) => void;
  onGenerate: (tileId: string) => void;
}

export function TimelineRow({
  timeline,
  tiles,
  type,
  onInsertTile,
  onBranchUp,
  onBranchDown,
  onGenerate,
}: TimelineRowProps) {
  const filteredTiles = tiles
    .filter((t) => t.type === type && t.timelineId === timeline.id)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="flex items-stretch gap-1 min-h-[180px]">
      {filteredTiles.length === 0 ? (
        <div className="flex items-center justify-center w-full">
          <InsertButton
            onClick={() => onInsertTile(0)}
            testId={`button-insert-first-${type}-${timeline.id}`}
          />
        </div>
      ) : (
        <>
          <InsertButton
            onClick={() => onInsertTile(0)}
            testId={`button-insert-start-${type}-${timeline.id}`}
          />
          {filteredTiles.map((tile, index) => (
            <div key={tile.id} className="flex items-stretch">
              <Tile
                tile={tile}
                onBranchUp={() => onBranchUp(tile.id)}
                onBranchDown={() => onBranchDown(tile.id)}
                onGenerate={() => onGenerate(tile.id)}
                showBranchUp={type === "image"}
                showBranchDown={type === "video"}
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
