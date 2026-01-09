import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { GoldenLayout, LayoutConfig, ComponentContainer, JsonValue } from "golden-layout";
import { useAppStore, type WorkspacePreset } from "@/lib/store";
import { RenderPreview } from "./render-preview";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelinesPanel } from "./timelines-panel";
import { AudioWorkspace } from "./audio-workspace";

import "golden-layout/dist/css/goldenlayout-base.css";
import "golden-layout/dist/css/themes/goldenlayout-dark-theme.css";

type PanelType = "RenderPreview" | "TimelineToolbar" | "Timelines" | "AudioWorkspace";

const PANEL_COMPONENTS: Record<PanelType, React.FC> = {
  RenderPreview,
  TimelineToolbar,
  Timelines: TimelinesPanel,
  AudioWorkspace,
};

const PANEL_TITLES: Record<PanelType, string> = {
  RenderPreview: "RENDER PREVIEW",
  TimelineToolbar: "TOOLBAR",
  Timelines: "TIMELINES",
  AudioWorkspace: "AUDIO",
};

function createDefaultConfig(): LayoutConfig {
  return {
    root: {
      type: "column",
      content: [
        {
          type: "component",
          componentType: "RenderPreview",
          title: PANEL_TITLES.RenderPreview,
          size: "35%",
        },
        {
          type: "row",
          content: [
            {
              type: "component",
              componentType: "TimelineToolbar",
              title: PANEL_TITLES.TimelineToolbar,
              size: "15%",
            },
            {
              type: "component",
              componentType: "Timelines",
              title: PANEL_TITLES.Timelines,
              size: "85%",
            },
          ],
          size: "50%",
        },
        {
          type: "component",
          componentType: "AudioWorkspace",
          title: PANEL_TITLES.AudioWorkspace,
          size: "15%",
        },
      ],
    },
    settings: {
      showPopoutIcon: false,
      showMaximiseIcon: true,
      showCloseIcon: false,
    },
  };
}

function createPresetConfig(preset: WorkspacePreset): LayoutConfig {
  const baseSettings = {
    showPopoutIcon: false,
    showMaximiseIcon: true,
    showCloseIcon: false,
  };

  const presets: Record<WorkspacePreset, LayoutConfig> = {
    default: createDefaultConfig(),
    "wide-preview": {
      settings: baseSettings,
      root: {
        type: "column",
        content: [
          { type: "component", componentType: "RenderPreview", title: PANEL_TITLES.RenderPreview, size: "50%" },
          {
            type: "row",
            content: [
              { type: "component", componentType: "TimelineToolbar", title: PANEL_TITLES.TimelineToolbar, size: "15%" },
              { type: "component", componentType: "Timelines", title: PANEL_TITLES.Timelines, size: "85%" },
            ],
            size: "35%",
          },
          { type: "component", componentType: "AudioWorkspace", title: PANEL_TITLES.AudioWorkspace, size: "15%" },
        ],
      },
    },
    "tall-timelines": {
      settings: baseSettings,
      root: {
        type: "column",
        content: [
          { type: "component", componentType: "RenderPreview", title: PANEL_TITLES.RenderPreview, size: "20%" },
          {
            type: "row",
            content: [
              { type: "component", componentType: "TimelineToolbar", title: PANEL_TITLES.TimelineToolbar, size: "15%" },
              { type: "component", componentType: "Timelines", title: PANEL_TITLES.Timelines, size: "85%" },
            ],
            size: "70%",
          },
          { type: "component", componentType: "AudioWorkspace", title: PANEL_TITLES.AudioWorkspace, size: "10%" },
        ],
      },
    },
    compact: {
      settings: baseSettings,
      root: {
        type: "column",
        content: [
          { type: "component", componentType: "RenderPreview", title: PANEL_TITLES.RenderPreview, size: "25%" },
          {
            type: "row",
            content: [
              { type: "component", componentType: "TimelineToolbar", title: PANEL_TITLES.TimelineToolbar, size: "12%" },
              { type: "component", componentType: "Timelines", title: PANEL_TITLES.Timelines, size: "88%" },
            ],
            size: "63%",
          },
          { type: "component", componentType: "AudioWorkspace", title: PANEL_TITLES.AudioWorkspace, size: "12%" },
        ],
      },
    },
    audio: {
      settings: baseSettings,
      root: {
        type: "column",
        content: [
          { type: "component", componentType: "RenderPreview", title: PANEL_TITLES.RenderPreview, size: "15%" },
          {
            type: "row",
            content: [
              { type: "component", componentType: "TimelineToolbar", title: PANEL_TITLES.TimelineToolbar, size: "15%" },
              { type: "component", componentType: "Timelines", title: PANEL_TITLES.Timelines, size: "85%" },
            ],
            size: "30%",
          },
          { type: "component", componentType: "AudioWorkspace", title: PANEL_TITLES.AudioWorkspace, size: "55%" },
        ],
      },
    },
    custom: createDefaultConfig(),
  };
  return presets[preset] || createDefaultConfig();
}

interface PortalEntry {
  container: HTMLElement;
  componentType: PanelType;
}

export function GoldenWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<GoldenLayout | null>(null);
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  
  const { workspacePreset, setWorkspacePreset, panelVisibility } = useAppStore();
  const prevPresetRef = useRef(workspacePreset);

  const registerComponent = useCallback((
    container: ComponentContainer,
    _state: JsonValue | undefined
  ) => {
    const componentType = container.componentType as PanelType;
    const element = document.createElement("div");
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.overflow = "hidden";
    container.element.appendChild(element);
    
    setPortals(prev => [...prev, { container: element, componentType }]);
    
    container.on("beforeComponentRelease", () => {
      setPortals(prev => prev.filter(p => p.container !== element));
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = createPresetConfig(workspacePreset);
    const layout = new GoldenLayout(containerRef.current);
    layoutRef.current = layout;

    Object.keys(PANEL_COMPONENTS).forEach(type => {
      layout.registerComponentFactoryFunction(type, registerComponent);
    });

    layout.loadLayout(config);

    layout.on("stateChanged", () => {
      if (prevPresetRef.current !== "custom") {
        setWorkspacePreset("custom");
        prevPresetRef.current = "custom";
      }
    });

    const handleResize = () => {
      if (containerRef.current && layoutRef.current) {
        layoutRef.current.setSize(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      layout.destroy();
      layoutRef.current = null;
      setPortals([]);
    };
  }, []);

  useEffect(() => {
    if (workspacePreset !== prevPresetRef.current && workspacePreset !== "custom") {
      prevPresetRef.current = workspacePreset;
      if (layoutRef.current && containerRef.current) {
        layoutRef.current.destroy();
        setPortals([]);
        
        const config = createPresetConfig(workspacePreset);
        const layout = new GoldenLayout(containerRef.current);
        layoutRef.current = layout;

        Object.keys(PANEL_COMPONENTS).forEach(type => {
          layout.registerComponentFactoryFunction(type, registerComponent);
        });

        layout.loadLayout(config);

        layout.on("stateChanged", () => {
          if (prevPresetRef.current !== "custom") {
            setWorkspacePreset("custom");
            prevPresetRef.current = "custom";
          }
        });
      }
    }
  }, [workspacePreset, registerComponent, setWorkspacePreset]);

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full golden-layout-container"
      data-testid="golden-workspace"
    >
      {portals.map((portal, index) => {
        const Component = PANEL_COMPONENTS[portal.componentType];
        if (!Component) return null;
        
        const isVisible = panelVisibility[portal.componentType] !== false;
        if (!isVisible) return null;
        
        return createPortal(
          <div className="h-full w-full overflow-hidden" data-testid={`panel-${portal.componentType.toLowerCase()}`}>
            <Component />
          </div>,
          portal.container,
          `portal-${portal.componentType}-${index}`
        );
      })}
    </div>
  );
}
