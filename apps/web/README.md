# DevLens Web Frontend

Next.js 14 frontend application for the DevLens AI-powered development analysis platform.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### Development

```bash
# Start development server on port 3000
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Dashboard pages
│   ├── (editor)/       # Code editor pages
│   ├── api/            # API routes
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Landing page
│   └── globals.css     # Global styles
├── components/
│   ├── editor/         # Editor components
│   ├── dashboard/      # Dashboard components
│   ├── game/          # Gamification components
│   └── ui/            # Reusable UI components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions and helpers
└── stores/            # Zustand store definitions
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:4000)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (default: ws://localhost:4000)

## Key Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Monaco Editor** - Code editing capabilities
- **Zustand** - State management
- **Socket.IO** - Real-time communication
- **D3 & Recharts** - Data visualization

## License

Proprietary - DevLens
