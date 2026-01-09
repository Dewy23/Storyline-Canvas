# StoryForge AI - Video Editor

## Overview

StoryForge AI is an AI-powered video editor focused on consistent character storytelling. The application provides a professional creative tool interface with branching timelines, AI-generated images and videos, and audio track management. Users can create visual stories by arranging image and video tiles on timelines, generate content using various AI providers (Stability AI, Runway, Kling, Flux, OpenAI, Replicate, ElevenLabs), and manage audio tracks for voice, music, and sound effects.

## Recent Changes (January 2026)

- **GoldenLayout Integration**: Added After Effects-style panel management with drag-and-drop docking
  - Full drag-and-dock support: drag panel headers to reposition, embed, or dock anywhere
  - Grab cursor on headers, grabbing cursor when dragging
  - Dockable panels: Render Preview, Timelines, Toolbar, Audio Workspace
  - Workspace presets: Default, Wide Preview, Tall Timelines, Compact, Audio Focus
  - React Portal-based rendering to preserve QueryClient and other React contexts across panels
  - Custom CSS styling for headers with gradient highlights as drag cues
- Expanded AI provider support with 20+ providers across Image, Video, and Audio categories
- Settings modal reorganized into 3 tabs: Image Providers, Video Providers, Audio Providers
- Working image generation: OpenAI/DALL-E, Stability AI, Flux, Ideogram, Pollinations, Gemini, Replicate
- Working video generation: Runway ML, Luma Dream Machine, Replicate
- API key validation on save with real API test calls
- Connected providers shown with green status indicator in tile dropdowns
- Completed full frontend-backend integration with React Query for data persistence
- Implemented bi-directional automatic chaining between image and video tiles
- Added API key management with backend persistence (masked display for security)
- Built audio workspace with DAW-style interface, track management, and preview player
- Created smart export modal with timeline selection and audio inclusion options
- All data persists through page reloads via REST API endpoints

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for global application state (stores timelines, tiles, audio tracks, API settings, UI state)
- **Data Fetching**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS styling
- **Theming**: Custom theme provider supporting light/dark modes with CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful API endpoints under `/api/` prefix for CRUD operations on timelines, tiles, audio tracks, audio clips, and API settings
- **Build System**: esbuild for server bundling, Vite for client bundling
- **Development**: Hot module replacement via Vite middleware in development mode

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod schemas with drizzle-zod integration for type-safe database operations
- **Storage Interface**: Abstract storage interface (`IStorage`) allowing for different backend implementations (currently in-memory with database schema defined)

### Key Data Models
- **Timeline**: Represents a video timeline/branch with parent-child relationships for branching narratives
- **Tile**: Individual image or video segments within timelines, containing prompts and AI generation settings
- **AudioTrack**: Audio channels (voice, music, sfx) with volume and mute/solo controls
- **AudioClip**: Individual audio segments within tracks
- **APISetting**: Stores API keys and connection status for AI providers

### Design System
The application follows a professional creative tool aesthetic inspired by Adobe Premiere and DaVinci Resolve:
- Typography: Inter font family with defined heading scales
- Spacing: Tailwind units (1, 2, 3, 4, 6, 8, 12) for consistent spacing
- Layout: GoldenLayout-based panel system with drag/dock/resize capabilities
- Panel Headers: Gradient backgrounds with cursor:grab for drag affordance

## External Dependencies

### AI Service Providers (Implemented)
**Image Generation:**
- OpenAI (DALL-E 3)
- Google Gemini
- Stability AI (Stable Diffusion XL)
- Flux (via Replicate)
- Ideogram
- Pollinations.ai (free, no key required)
- Replicate (multi-model)

**Video Generation:**
- Runway ML (Gen-3 Alpha)
- Luma Dream Machine
- Replicate (Stable Video Diffusion)

**Audio Generation:**
- ElevenLabs (voice synthesis)

**Coming Soon:** Hunyuan, Adobe Firefly, Bria.ai, Runware, Google Veo, Kling, Pika Labs, Tavus, Mootion, Akool, Mirage, Pictory

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migration management

### Frontend Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Embla Carousel**: Carousel functionality
- **react-day-picker**: Calendar component
- **react-hook-form**: Form handling with zod resolver
- **recharts**: Charting library for data visualization

### Infrastructure
- **Replit-specific plugins**: Runtime error overlay, cartographer, dev banner for Replit environment
- **connect-pg-simple**: PostgreSQL session store for Express sessions