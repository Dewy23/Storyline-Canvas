# StoryForge AI - Video Editor

## Overview

StoryForge AI is an AI-powered video editor focused on consistent character storytelling. The application provides a professional creative tool interface with branching timelines, AI-generated images and videos, and audio track management. Users can create visual stories by arranging image and video tiles on timelines, generate content using various AI providers (Stability AI, Runway, Kling, Flux, OpenAI, Replicate, ElevenLabs), and manage audio tracks for voice, music, and sound effects.

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
- Layout: Fixed sidebar with main workspace, two-row grid for timeline tracks

## External Dependencies

### AI Service Providers
- **Stability AI**: Stable Diffusion image generation
- **Flux**: Fast image generation
- **OpenAI**: DALL-E image generation
- **Runway**: Video generation and editing
- **Kling**: AI video generation
- **Replicate**: Multi-model platform for various AI capabilities
- **ElevenLabs**: AI voice and audio generation

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