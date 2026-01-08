import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsertButtonProps {
  onClick: () => void;
  testId: string;
}

export function InsertButton({ onClick, testId }: InsertButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
      <div className="h-full w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full shrink-0 my-1"
        onClick={onClick}
        data-testid={testId}
        aria-label="Insert tile"
      >
        <Plus className="w-4 h-4" />
      </Button>
      <div className="h-full w-px bg-border" />
    </div>
  );
}
