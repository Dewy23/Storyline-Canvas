import { Film, Music, Download, Settings, Moon, Sun, Layout, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore, type WorkspacePreset } from "@/lib/store";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

const PRESET_LABELS: Record<WorkspacePreset, string> = {
  default: "Default",
  "wide-preview": "Wide Preview",
  "tall-timelines": "Tall Timelines",
  compact: "Compact",
  custom: "Custom",
  audio: "Audio Focus",
};

export function Toolbar() {
  const { 
    activeTab, setActiveTab, setSettingsOpen, setExportOpen,
    workspacePreset, setWorkspacePreset, customLayout, setCustomLayout,
  } = useAppStore();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handlePresetChange = (preset: WorkspacePreset) => {
    setWorkspacePreset(preset);
    toast({
      title: "Workspace updated",
      description: `Switched to ${PRESET_LABELS[preset]} layout`,
    });
  };

  const handleSaveLayout = () => {
    const currentLayout = useAppStore.getState().customLayout;
    if (currentLayout) {
      setWorkspacePreset("custom");
      toast({
        title: "Layout saved",
        description: "Current layout saved as custom preset",
      });
    } else {
      toast({
        title: "Could not save",
        description: "No layout changes to save",
        variant: "destructive",
      });
    }
  };

  const handleResetLayout = () => {
    setWorkspacePreset("default");
    toast({
      title: "Layout reset",
      description: "Workspace reset to default layout",
    });
  };

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

        <div className="w-px h-6 bg-border mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-workspace">
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline">Workspace</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {(Object.keys(PRESET_LABELS) as WorkspacePreset[]).filter(p => p !== "custom" && p !== "audio").map((preset) => (
              <DropdownMenuItem 
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={workspacePreset === preset ? "bg-accent" : ""}
                data-testid={`workspace-preset-${preset}`}
              >
                {PRESET_LABELS[preset]}
              </DropdownMenuItem>
            ))}
            {customLayout && (
              <DropdownMenuItem 
                onClick={() => handlePresetChange("custom")}
                className={workspacePreset === "custom" ? "bg-accent" : ""}
                data-testid="workspace-preset-custom"
              >
                {PRESET_LABELS.custom}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSaveLayout} data-testid="workspace-save">
              <Save className="w-4 h-4 mr-2" />
              Save Current Layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetLayout} data-testid="workspace-reset">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
