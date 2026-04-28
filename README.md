# Type It Out

Browser-based typing speed trainer with adaptive word selection. A fully static single-page application — no backend required.

## Features

- **Real-time typing practice** with instant feedback
- **Adaptive word selection** that focuses on your weakest characters
- **Session tracking** persisted via localStorage (survives page refresh)
- **Per-character statistics** showing speed and accuracy for each letter
- **Minimalistic, modern design** built for focus and clarity

## Tech Stack

- TypeScript + Vite for fast development and optimized builds
- Pure client-side — no server, no database, no authentication
- CSS Variables for easy theming
- localStorage for session persistence

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## How It Works

1. **Start typing**: Words appear one at a time. Type them correctly and press space to continue.
2. **Get instant feedback**: Correct words turn green, mistakes are highlighted in red.
3. **See your stats**: After each passage, view your WPM, accuracy, and per-character performance.
4. **Adaptive learning**: After 2-3 passages, the system starts selecting words that focus on your weakest characters.
5. **Track progress**: Your session stats are saved to localStorage and persist across page refreshes.

## Architecture

```
├── src/
│   ├── main.ts              # Main orchestrator, typing input handling
│   ├── PassageHandler.ts    # Word rendering, validation, formatting
│   ├── PassageStatistics.ts # WPM/accuracy/char stat computation
│   └── SessionTracker.ts    # Session persistence via localStorage
├── static/
│   ├── main.css             # Main stylesheet
│   ├── Words.json           # Flat array of common words
│   └── WordList.json        # 26 arrays of words keyed by letter (A-Z)
├── index.html               # Single-page application entry point
└── AGENTS.md                # Agent guide for development
```

## Data Files

- **Words.json**: Flat array of ~1000 common English words for random passages
- **WordList.json**: Array of 26 arrays, indexed by `charCode - 65`, each containing words that include that letter (for adaptive/weak-char passages)

## Development

- **Dev server**: `npm run dev` — Starts Vite dev server with HMR on port 5173
- **Type check**: `npx tsc --noEmit` — Checks TypeScript compilation without emitting files
- **Build**: `npm run build` — Compiles TypeScript and bundles for production

## Deployment

The `dist/` folder contains the fully static site ready for deployment to any CDN or static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- Or any web server capable of serving static files

## License

MIT
