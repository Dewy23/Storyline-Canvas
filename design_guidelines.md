# Design Guidelines: AI-Powered Video Editor

## Design Approach

**System Selection**: Custom design inspired by professional creative tools (Adobe Premiere, DaVinci Resolve, Figma) with Material Design principles for UI consistency.

**Rationale**: This is a utility-focused, information-dense application requiring efficiency, clear hierarchy, and professional polish. The interface must balance complexity with usability.

## Typography

- **Primary Font**: Inter (via Google Fonts CDN)
- **Heading Scale**: 
  - H1: 24px, semibold (main workspace title)
  - H2: 18px, semibold (panel headers, tab labels)
  - H3: 14px, medium (tile labels, section headers)
- **Body**: 14px regular (primary UI text, prompts)
- **Small**: 12px regular (timestamps, metadata, hints)
- **Mono**: JetBrains Mono 13px (API keys, technical data)

## Layout System

**Spacing Primitives**: Use Tailwind units of 1, 2, 3, 4, 6, 8, 12 exclusively
- Tight spacing: p-1, gap-2 (within tiles, compact controls)
- Standard spacing: p-4, gap-4 (between UI elements, panel padding)
- Section spacing: p-6, gap-6 (major sections, workspace padding)
- Large spacing: p-8, gap-8 (panel separation)

**Grid Structure**:
- App uses fixed sidebar (64px) + main workspace
- Timeline tracks use CSS Grid with fixed row heights
- Panels stack vertically on mobile, side-by-side on desktop (1200px+ breakpoint)

## Application Structure

**Main Layout**:
- Top toolbar (h-14): Logo, workspace tabs, export tool, settings icon
- Workspace area (flex-1): Full-height content container
- No traditional footer (app interface)

**Toolbar Components**:
- Left: Logo + workspace name
- Center: Tab navigation (Timeline, Audio) with active indicator
- Right: Export button (primary action), Settings icon button

## Timeline Interface Components

**Timeline Container**:
- Two-row grid structure per timeline branch
- Row 1 (h-32): Image tiles with preview + controls
- Row 2 (h-32): Video tiles with preview + controls
- Branch controls: Up arrow (absolute, -top-6), Down arrow (absolute, -bottom-6)
- Collapsible branches with indent indicators (pl-12 per nesting level)

**Tile Structure** (w-48 standard):
- Tab switcher at top (h-8): "View" | "Prompt"
- Content area (flex-1): Preview or prompt editor
- Frame slider (View tab): Beneath preview, compact range input
- Insert button (+): Between tiles, vertical divider with centered button
- AI provider dropdown (Prompt tab): Below text area, compact select

**Tile Visual States**:
- Default: Subtle border
- Active/Selected: Emphasized border, no background change
- Hover: Slight border emphasis
- Tabs use underline indicator for active state

## Audio Workspace Components

**Layout** (grid lg:grid-cols-[1fr_400px]):
- Left panel: Multi-track DAW interface
- Right panel: Preview player (aspect-16/9, max-w-md)

**DAW Interface**:
- Track headers (w-40): Track name, mute/solo controls
- Waveform area (flex-1): Horizontal scrollable, stacked tracks
- Track height: h-24 per track
- Playhead: Vertical line (border-l-2), follows playback
- Controls bar (h-12): Play/pause, zoom, add track button

**Waveform Display**:
- Canvas-based or SVG waveforms
- Clip cards with handles for trim operations
- Fade indicators at clip edges
- Time ruler above tracks (h-8, grid showing seconds/beats)

## Settings Panel

**Modal Overlay**: Centered card (max-w-2xl)
- Header (h-14): "Settings" + close button
- Content tabs: "API Keys" | "Preferences"
- API key section per provider:
  - Provider logo/name (h-12)
  - Text input for key (type="password" toggle)
  - Connection status indicator
  - Save button per provider

## Component Library

**Buttons**:
- Primary: Filled, semibold text, h-10 px-4 (Export, Save)
- Secondary: Border, regular text, h-10 px-4 (Cancel, Add Track)
- Icon only: h-8 w-8 (Settings, Close, Playback controls)
- Destructive: Use for delete/remove actions

**Inputs**:
- Text fields: h-10, border, px-3 (consistent across app)
- Textareas: min-h-24, border, p-3 (prompts)
- Selects: h-10, border, px-3 with chevron icon
- Range sliders: h-6 with custom thumb

**Icons**: Use Heroicons (outline style) via CDN
- 20px for inline icons
- 24px for standalone buttons

**Cards**:
- Tiles: border, no shadow, compact
- Panels: border, p-6
- Modals: border, shadow-xl, p-6

## Responsive Behavior

**Desktop (1200px+)**:
- Full timeline with horizontal scrolling
- Side-by-side audio workspace panels
- All features visible

**Tablet (768-1199px)**:
- Maintain timeline two-row structure
- Stack audio workspace panels
- Reduce tile width to w-40

**Mobile (<768px)**:
- Single column tile view
- Simplified timeline (swipe between image/video rows)
- Collapsed branch navigation
- Bottom sheet for settings

## Accessibility

- Focus indicators on all interactive elements
- ARIA labels for icon buttons
- Keyboard shortcuts for playback (spacebar), navigation (arrows)
- Sufficient contrast throughout
- Screen reader announcements for timeline state changes

**Critical**: Maintain consistent spacing, borders, and interaction patterns across all tiles, tracks, and panels for professional coherence.