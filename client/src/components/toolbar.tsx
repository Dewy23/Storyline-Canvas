import { Film, Music, Download, Settings, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/components/theme-provider";

export function Toolbar() {
  const { activeTab, setActiveTab, setSettingsOpen, setExportOpen } = useAppStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 gap-4 bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Film className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg hidden sm:block">StoryForge</span>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        <Button
          variant={activeTab === "timeline" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("timeline")}
          data-testid="tab-timeline"
          className="gap-2"
        >
          <Film className="w-4 h-4" />
          <span className="hidden sm:inline">Timeline</span>
        </Button>
        <Button
          variant={activeTab === "audio" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("audio")}
          data-testid="tab-audio"
          className="gap-2"
        >
          <Music className="w-4 h-4" />
          <span className="hidden sm:inline">Audio</span>
        </Button>
      </nav>

      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => setExportOpen(true)}
          data-testid="button-export"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          data-testid="button-settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
