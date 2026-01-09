import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, type WorkspacePreset, type GridLayout } from "@/lib/store";
import { RenderPreview } from "./render-preview";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelinesPanel } from "./timelines-panel";
import { AudioWorkspace } from "./audio-workspace";

const PRESET_LAYOUTS: Record<WorkspacePreset, GridLayout> = {
  default: { previewHeight: 35, toolbarWidth: 60, audioHeight: 15 },
  "wide-preview": { previewHeight: 50, toolbarWidth: 60, audioHeight: 15 },
  "tall-timelines": { previewHeight: 20, toolbarWidth: 60, audioHeight: 10 },
  compact: { previewHeight: 25, toolbarWidth: 50, audioHeight: 12 },
  custom: { previewHeight: 35, toolbarWidth: 60, audioHeight: 15 },
  audio: { previewHeight: 15, toolbarWidth: 60, audioHeight: 55 },
};

const MIN_PANEL_PERCENT = 5;
const MIN_PANEL_PX = 50;
const HANDLE_SIZE = 24;

type ResizeTarget = "preview" | "toolbar" | "audio" | null;

export function WorkspaceGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    workspacePreset, 
    panelVisibility, 
    setWorkspacePreset,
    customLayout,
    setCustomLayout,
    activeTab,
  } = useAppStore();
  
  const [layout, setLayout] = useState<GridLayout>(() => {
    if (workspacePreset === "custom" && customLayout) {
      return customLayout;
    }
    return PRESET_LAYOUTS[workspacePreset];
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState<ResizeTarget>(null);
  const resizeStartRef = useRef({ y: 0, x: 0, startValue: 0 });

  useEffect(() => {
    if (workspacePreset === "custom" && customLayout) {
      setLayout(customLayout);
    } else if (workspacePreset !== "custom") {
      setLayout(PRESET_LAYOUTS[workspacePreset]);
    }
  }, [workspacePreset, customLayout]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    target: ResizeTarget
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeTarget(target);
    
    let startValue = 0;
    if (target === "preview") startValue = layout.previewHeight;
    else if (target === "toolbar") startValue = layout.toolbarWidth;
    else if (target === "audio") startValue = layout.audioHeight;
    
    resizeStartRef.current = {
      y: e.clientY,
      x: e.clientX,
      startValue,
    };
  }, [layout]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeTarget || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const { y: startY, x: startX, startValue } = resizeStartRef.current;
    
    if (resizeTarget === "preview") {
      const deltaY = e.clientY - startY;
      const deltaPercent = (deltaY / containerRect.height) * 100;
      const newHeight = Math.max(MIN_PANEL_PERCENT, Math.min(70, startValue + deltaPercent));
      setLayout(prev => ({ ...prev, previewHeight: newHeight }));
    } else if (resizeTarget === "toolbar") {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(MIN_PANEL_PX, Math.min(300, startValue + deltaX));
      setLayout(prev => ({ ...prev, toolbarWidth: newWidth }));
    } else if (resizeTarget === "audio") {
      const deltaY = startY - e.clientY;
      const deltaPercent = (deltaY / containerRect.height) * 100;
      const newHeight = Math.max(MIN_PANEL_PERCENT, Math.min(70, startValue + deltaPercent));
      setLayout(prev => ({ ...prev, audioHeight: newHeight }));
    }
  }, [isResizing, resizeTarget]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      if (workspacePreset !== "custom") {
        const presetLayout = PRESET_LAYOUTS[workspacePreset];
        const hasChanged = 
          Math.abs(layout.previewHeight - presetLayout.previewHeight) > 0.5 ||
          Math.abs(layout.toolbarWidth - presetLayout.toolbarWidth) > 0.5 ||
          Math.abs(layout.audioHeight - presetLayout.audioHeight) > 0.5;
        
        if (hasChanged) {
          setCustomLayout(layout);
        }
      } else {
        setCustomLayout(layout);
      }
      setIsResizing(false);
      setResizeTarget(null);
    }
  }, [isResizing, layout, setCustomLayout, workspacePreset]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = resizeTarget === "toolbar" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, resizeTarget]);

  const showPreview = panelVisibility.RenderPreview !== false;
  const showToolbar = panelVisibility.TimelineToolbar !== false;
  const showTimelines = panelVisibility.Timelines !== false;
  // Only show audio panel when Audio tab is active
  const showAudio = panelVisibility.AudioWorkspace !== false && activeTab === "audio";

  const gridTemplateRows = [
    showPreview ? `${layout.previewHeight}%` : "0fr",
    showPreview ? `${HANDLE_SIZE}px` : "0fr",
    "1fr",
    showAudio ? `${HANDLE_SIZE}px` : "0fr",
    showAudio ? `${layout.audioHeight}%` : "0fr",
  ].join(" ");

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background overflow-hidden"
      data-testid="workspace-grid"
      style={{
        display: "grid",
        gridTemplateRows,
        gridTemplateColumns: "1fr",
      }}
    >
      {showPreview && (
        <div 
          className="overflow-hidden bg-background border-b border-border"
          style={{ minHeight: MIN_PANEL_PX }}
          data-testid="panel-preview"
        >
          <PanelHeader title="Render Preview" />
          <div className="h-[calc(100%-28px)] overflow-hidden">
            <RenderPreview />
          </div>
        </div>
      )}

      {showPreview && (
        <ResizeHandle
          direction="horizontal"
          onMouseDown={(e) => handleMouseDown(e, "preview")}
          isActive={resizeTarget === "preview"}
          testId="resize-handle-preview"
        />
      )}

      <div 
        className="overflow-hidden bg-background"
        style={{ 
          display: "grid",
          gridTemplateColumns: showToolbar 
            ? `${layout.toolbarWidth}px ${HANDLE_SIZE}px 1fr` 
            : "1fr",
          minHeight: MIN_PANEL_PX,
        }}
        data-testid="panel-middle-row"
      >
        {showToolbar && (
          <>
            <div 
              className="overflow-hidden bg-background border-r border-border"
              style={{ minWidth: MIN_PANEL_PX }}
              data-testid="panel-toolbar"
            >
              <PanelHeader title="Toolbar" />
              <div className="h-[calc(100%-28px)] overflow-hidden">
                <TimelineToolbar />
              </div>
            </div>

            <ResizeHandle
              direction="vertical"
              onMouseDown={(e) => handleMouseDown(e, "toolbar")}
              isActive={resizeTarget === "toolbar"}
              testId="resize-handle-toolbar"
            />
          </>
        )}

        {showTimelines && (
          <div 
            className="overflow-hidden bg-background"
            data-testid="panel-timelines"
          >
            <PanelHeader title="Timelines" />
            <div className="h-[calc(100%-28px)] overflow-hidden">
              <TimelinesPanel />
            </div>
          </div>
        )}
      </div>

      {showAudio && (
        <>
          <ResizeHandle
            direction="horizontal"
            onMouseDown={(e) => handleMouseDown(e, "audio")}
            isActive={resizeTarget === "audio"}
            testId="resize-handle-audio"
          />

          <div 
            className="overflow-hidden bg-background border-t border-border"
            style={{ minHeight: MIN_PANEL_PX }}
            data-testid="panel-audio"
          >
            <PanelHeader title="Audio" />
            <div className="h-[calc(100%-28px)] overflow-hidden">
              <AudioWorkspace />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div 
      className="h-7 flex items-center px-3 border-b border-border select-none workspace-panel-header"
      data-testid={`panel-header-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </span>
    </div>
  );
}

function ResizeHandle({ 
  direction, 
  onMouseDown, 
  isActive,
  testId,
}: { 
  direction: "horizontal" | "vertical";
  onMouseDown: (e: React.MouseEvent) => void;
  isActive: boolean;
  testId: string;
}) {
  const isHorizontal = direction === "horizontal";
  
  return (
    <div
      className={`
        relative flex items-center justify-center
        transition-colors duration-150
        ${isHorizontal 
          ? "w-full h-full cursor-row-resize" 
          : "h-full w-full cursor-col-resize"
        }
        ${isActive ? "bg-primary/30" : "bg-transparent hover:bg-primary/20"}
      `}
      style={{
        zIndex: 100,
      }}
      onMouseDown={onMouseDown}
      data-testid={testId}
      role="separator"
      aria-orientation={isHorizontal ? "horizontal" : "vertical"}
    >
      <div 
        className={`
          rounded-full transition-all duration-150
          ${isActive ? "bg-primary" : "bg-border hover:bg-primary/60"}
        `}
        style={{
          [isHorizontal ? "width" : "height"]: "48px",
          [isHorizontal ? "height" : "width"]: "4px",
        }}
      />
    </div>
  );
}
