import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { GoldenLayout, LayoutConfig, ComponentContainer, ResolvedComponentItemConfig } from "golden-layout";
import { useAppStore, type WorkspacePreset } from "@/lib/store";
import { RenderPreview } from "./render-preview";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelinesPanel } from "./timelines-panel";
import { AudioWorkspace } from "./audio-workspace";
import "golden-layout/dist/css/goldenlayout-base.css";
import "golden-layout/dist/css/themes/goldenlayout-dark-theme.css";

type PanelType = "RenderPreview" | "TimelineToolbar" | "Timelines" | "AudioWorkspace";

interface PortalEntry {
  container: HTMLElement;
  panelType: PanelType;
  componentContainer: ComponentContainer;
  isVisible: boolean;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  root: {
    type: "column",
    content: [
      {
        type: "component",
        componentType: "RenderPreview",
        title: "Render Preview",
        header: { show: "top", popout: false },
        height: 35,
      },
      {
        type: "row",
        height: 50,
        content: [
          {
            type: "component",
            componentType: "TimelineToolbar",
            title: "Toolbar",
            header: { show: "top", popout: false },
            width: 8,
          },
          {
            type: "component",
            componentType: "Timelines",
            title: "Timelines",
            header: { show: "top", popout: false },
            width: 92,
          },
        ],
      },
      {
        type: "component",
        componentType: "AudioWorkspace",
        title: "Audio",
        header: { show: "top", popout: false },
        height: 15,
      },
    ],
  },
  header: {
    popout: false,
  },
};

const WIDE_PREVIEW_LAYOUT: LayoutConfig = {
  root: {
    type: "column",
    content: [
      {
        type: "component",
        componentType: "RenderPreview",
        title: "Render Preview",
        header: { show: "top", popout: false },
        height: 50,
      },
      {
        type: "row",
        height: 35,
        content: [
          {
            type: "component",
            componentType: "TimelineToolbar",
            title: "Toolbar",
            header: { show: "top", popout: false },
            width: 10,
          },
          {
            type: "component",
            componentType: "Timelines",
            title: "Timelines",
            header: { show: "top", popout: false },
            width: 90,
          },
        ],
      },
      {
        type: "component",
        componentType: "AudioWorkspace",
        title: "Audio",
        header: { show: "top", popout: false },
        height: 15,
      },
    ],
  },
  header: { popout: false },
};

const TALL_TIMELINES_LAYOUT: LayoutConfig = {
  root: {
    type: "column",
    content: [
      {
        type: "component",
        componentType: "RenderPreview",
        title: "Render Preview",
        header: { show: "top", popout: false },
        height: 20,
      },
      {
        type: "row",
        height: 70,
        content: [
          {
            type: "component",
            componentType: "TimelineToolbar",
            title: "Toolbar",
            header: { show: "top", popout: false },
            width: 8,
          },
          {
            type: "component",
            componentType: "Timelines",
            title: "Timelines",
            header: { show: "top", popout: false },
            width: 92,
          },
        ],
      },
      {
        type: "component",
        componentType: "AudioWorkspace",
        title: "Audio",
        header: { show: "top", popout: false },
        height: 10,
      },
    ],
  },
  header: { popout: false },
};

const COMPACT_LAYOUT: LayoutConfig = {
  root: {
    type: "row",
    content: [
      {
        type: "stack",
        width: 25,
        content: [
          {
            type: "component",
            componentType: "TimelineToolbar",
            title: "Toolbar",
            header: { show: "top", popout: false },
          },
          {
            type: "component",
            componentType: "RenderPreview",
            title: "Preview",
            header: { show: "top", popout: false },
          },
          {
            type: "component",
            componentType: "AudioWorkspace",
            title: "Audio",
            header: { show: "top", popout: false },
          },
        ],
      },
      {
        type: "component",
        componentType: "Timelines",
        title: "Timelines",
        header: { show: "top", popout: false },
        width: 75,
      },
    ],
  },
  header: { popout: false },
};

const AUDIO_FOCUS_LAYOUT: LayoutConfig = {
  root: {
    type: "column",
    content: [
      {
        type: "row",
        height: 30,
        content: [
          {
            type: "component",
            componentType: "TimelineToolbar",
            title: "Toolbar",
            header: { show: "top", popout: false },
            width: 15,
          },
          {
            type: "component",
            componentType: "RenderPreview",
            title: "Preview",
            header: { show: "top", popout: false },
            width: 85,
          },
        ],
      },
      {
        type: "component",
        componentType: "AudioWorkspace",
        title: "Audio Workspace",
        header: { show: "top", popout: false },
        height: 70,
      },
    ],
  },
  header: { popout: false },
};

export const GOLDEN_LAYOUT_PRESETS: Record<string, LayoutConfig> = {
  default: DEFAULT_LAYOUT,
  "wide-preview": WIDE_PREVIEW_LAYOUT,
  "tall-timelines": TALL_TIMELINES_LAYOUT,
  compact: COMPACT_LAYOUT,
  audio: AUDIO_FOCUS_LAYOUT,
};

function PanelComponent({ panelType }: { panelType: PanelType }) {
  switch (panelType) {
    case "RenderPreview":
      return <RenderPreview />;
    case "TimelineToolbar":
      return <TimelineToolbar />;
    case "Timelines":
      return <TimelinesPanel />;
    case "AudioWorkspace":
      return <AudioWorkspace />;
    default:
      return <div>Unknown panel</div>;
  }
}

export function GoldenWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const goldenLayoutRef = useRef<GoldenLayout | null>(null);
  const [portals, setPortals] = useState<Map<string, PortalEntry>>(new Map());
  const currentPresetRef = useRef<string>("");
  const isInitializedRef = useRef(false);
  const prevPanelVisibilityRef = useRef<Record<string, boolean>>({});

  const { 
    workspacePreset, 
    setGoldenLayoutConfig,
    savedCustomGoldenLayout,
  } = useAppStore();

  const bindComponent = useCallback((
    container: ComponentContainer,
    itemConfig: ResolvedComponentItemConfig
  ) => {
    const panelType = itemConfig.componentType as PanelType;
    const element = container.element;
    const id = `${panelType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    element.style.overflow = "hidden";
    element.classList.add("gl-panel-content");

    setPortals(prev => {
      const next = new Map(prev);
      next.set(id, {
        container: element,
        panelType,
        componentContainer: container,
        isVisible: true,
      });
      return next;
    });

    container.on("show", () => {
      setPortals(prev => {
        const next = new Map(prev);
        const entry = next.get(id);
        if (entry) {
          next.set(id, { ...entry, isVisible: true });
        }
        return next;
      });
    });

    container.on("hide", () => {
      setPortals(prev => {
        const next = new Map(prev);
        const entry = next.get(id);
        if (entry) {
          next.set(id, { ...entry, isVisible: false });
        }
        return next;
      });
    });

    container.on("destroy", () => {
      setPortals(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });

    return {
      component: {},
      virtual: false,
    };
  }, []);

  const unbindComponent = useCallback((container: ComponentContainer) => {
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    isInitializedRef.current = true;
    currentPresetRef.current = workspacePreset;

    const layoutConfig = GOLDEN_LAYOUT_PRESETS[workspacePreset] || GOLDEN_LAYOUT_PRESETS.default;

    const gl = new GoldenLayout(
      containerRef.current,
      bindComponent,
      unbindComponent
    );

    gl.resizeWithContainerAutomatically = true;
    goldenLayoutRef.current = gl;

    gl.loadLayout(layoutConfig);

    gl.on("stateChanged", () => {
      try {
        if (goldenLayoutRef.current) {
          const config = goldenLayoutRef.current.saveLayout();
          setGoldenLayoutConfig(config as any);
        }
      } catch (e) {
        console.warn("Could not save layout:", e);
      }
    });

    return () => {
      if (goldenLayoutRef.current) {
        goldenLayoutRef.current.destroy();
        goldenLayoutRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [bindComponent, unbindComponent, setGoldenLayoutConfig]);

  useEffect(() => {
    if (!goldenLayoutRef.current || !isInitializedRef.current) return;
    if (currentPresetRef.current === workspacePreset) return;

    currentPresetRef.current = workspacePreset;
    
    let layoutConfig: LayoutConfig;
    if (workspacePreset === "custom" && savedCustomGoldenLayout) {
      layoutConfig = savedCustomGoldenLayout as LayoutConfig;
    } else {
      layoutConfig = GOLDEN_LAYOUT_PRESETS[workspacePreset] || GOLDEN_LAYOUT_PRESETS.default;
    }

    try {
      goldenLayoutRef.current.loadLayout(layoutConfig);
    } catch (e) {
      console.warn("Could not load preset layout:", e);
    }
  }, [workspacePreset, savedCustomGoldenLayout]);

  const portalElements = useMemo(() => {
    return Array.from(portals.entries()).map(([id, entry]) => {
      return createPortal(
        <div 
          className="h-full w-full overflow-hidden bg-background"
          style={{ 
            visibility: entry.isVisible ? 'visible' : 'hidden',
            position: 'relative',
          }}
        >
          <PanelComponent panelType={entry.panelType} />
        </div>,
        entry.container,
        id
      );
    });
  }, [portals]);

  return (
    <>
      <div 
        ref={containerRef} 
        className="flex-1 h-full w-full golden-layout-container"
        data-testid="golden-workspace"
      />
      {portalElements}
    </>
  );
}
