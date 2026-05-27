# kanzo

Where tasks find their groove.

## Features

- **Kanban board** with configurable columns — add, rename, color, and **drag-to-reorder** via grip handles
- **Task management** with title, description, type (task/bug/feature/improvement/epic), priority (critical/high/medium/low/none), tags, category, and assigned person
- **Live select indicators** — every dropdown (type, priority, assigned to, category, column) shows an icon or colored dot that updates as you choose
- **People system** — assign tasks to team members with custom icons, colors, and names
- **Category system** — filter tasks by category with custom colors and hundreds of Lucide icons, displayed as icon dots in the sidebar
- **Card color modes** — color task card borders by priority or category (configurable in settings)
- **Drag-and-drop** between columns (mouse + touch with long-press)
- **Search** and **category/person filtering** — click a category or person in the sidebar to filter the board
- **Collapsible sidebar** — toggle to icon-only mode (52px) for more board space
- **Multiple themes** — Catppuccin (Macchiato, Mocha, Frappé, Latte), Nord, One Dark, Tokyo Night, Dracula, GitHub, Gruvbox (Material), Ayu, Night Owl, Cyberpunk
- **Dark/light mode** toggle
- **Local storage** — IndexedDB with in-memory fallback
- **GitHub repository sync** — push/pull tasks, categories, people, and **board config** (theme, mode, card color, columns) to a GitHub repo for cross-device use
- **Silent pull after onboarding** — fetches existing remote data without toasts
- **GitHub avatar** auto-fetching via /user and /users API
- **Onboarding flow** for first-time setup
- **Data export/import** (JSON)
- **PWA** support (manifest, service worker with offline caching, favicon PNGs + SVG)
- **Mobile-responsive** — scroll-snap columns, full-screen modals, safe-area awareness, floating action button for quick task creation
- **Timestamps** — tasks, categories, and people all track `createdAt` and `updatedAt`
- **Hundreds of Lucide icons** — inline SVG sprite sheet with no external dependencies

## Tech Stack

- Vanilla HTML/CSS/JavaScript (ES5-compatible)
- IndexedDB (with in-memory fallback)
- Lucide icons (inline SVG, no CDN)
- GitHub API v3 (for sync)

## Project Structure

```
kanzo/
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline caching)
├── config.example.json     # Example server config
├── favicon.svg             # SVG favicon
├── favicon-32.png          # 32×32 favicon
├── favicon-192.png         # 192×192 favicon
├── favicon-512.png         # 512×512 favicon
├── apple-touch-icon.png    # 180×180 Apple touch icon
├── LICENSE                 # MIT license
├── .github/
│   └── FUNDING.yml         # Sponsor config
├── css/
│   ├── themes.css          # Theme families (CSS custom properties)
│   └── components.css      # All component styles
└── js/
    ├── config.js           # Constants, DEFAULTS, icon/color arrays
    ├── icons.js            # Lucide SVG icons (inline sprite sheet)
    ├── configStore.js      # Config CRUD (localStorage)
    ├── themes.js           # Theme application and toggle
    ├── storage.js          # IndexedDB backend (LocalBackend + GitHubBackend)
    ├── boardStore.js       # Task, category, and people CRUD + filtering
    ├── sync.js             # GitHub push/pull sync
    ├── app.js              # App init, onboarding, DOM mapping, SW reg, avatar fetch
    ├── utils/
    │   ├── dom.js          # UUID, slugify, sanitize, timeAgo, etc.
    │   └── github.js       # GitHub API client
    └── ui/
        ├── toast.js        # Toast notification system
        ├── modals.js       # Settings, task, category, people, column modals
        ├── sidebar.js      # Sidebar navigation, categories, people
        └── board.js        # Board rendering + mouse & touch drag-and-drop
```

## Getting Started

1. Clone the repository
2. Open `index.html` in a browser, or serve with any static file server
3. Complete the onboarding flow
4. Create categories, people, and tasks — drag them between columns

## GitHub Sync Setup

1. Create a fine-grained GitHub PAT with `repo` scope
2. Open Settings → switch to GitHub storage
3. Enter your token and repository (e.g. `username/kanzo-data`)
4. Use Push/Pull to sync

## License

MIT

## Credits

- [Lucide](https://lucide.dev) — icon library (inline SVG sprite)
- [Catppuccin](https://catppuccin.com) — theme palette inspiration
- [sainnhe/gruvbox-material](https://github.com/sainnhe/gruvbox-material) — Gruvbox Material palette