# AGENTS.md

Guidance for AI coding assistants working on the Kanzo codebase. Read this before making changes.

## Tech Constraints

- **Vanilla HTML/CSS/JavaScript** — no frameworks, no bundler, no npm, no TypeScript. All `.js` files are loaded via `<script>` tags in `index.html`.
- **ES5-compatible** — use `var` and `function`, avoid arrow functions, destructuring, template literals, `const`/`let`, and `class`. The codebase targets broad browser compatibility with no transpilation.
- **No build step** — editing a file and refreshing the browser is the entire dev loop. `index.html` loads scripts directly from `js/`.
- **Namespacing** — everything lives under `window.Kanzo`. Each module is either an IIFE (`Kanzo.Board = (function () { ... })()`) or a constructor (`Kanzo.LocalBackend = function () { ... }`). Keep new code in this pattern.
- **No external CDN dependencies** — Lucide icons are inlined as an SVG sprite sheet in `js/icons.js`. Do not add CDN links.

## Module Map

| File | Namespace | Responsibility |
|---|---|---|
| `js/config.js` | `Kanzo.DEFAULTS`, `Kanzo.STORE`, `Kanzo.DB` | Constants, default settings, task types, priority arrays, icon lists, store names |
| `js/icons.js` | Inline SVG strings + `window.refreshIcons()` | Lucide icon sprite sheet and the global icon renderer |
| `js/app.js` | `Kanzo.App` | Init, DOM mapping (`mapDomRefs`), onboarding flow, service worker registration, GitHub avatar fetching. **All `getElementById` calls live here** — DOM refs are passed to modules via `init(dom)`. |
| `js/themes.js` | `Kanzo.Themes` | Theme application, dark/light/system mode toggle, `meta[name="theme-color"]` update |
| `js/boardStore.js` | `Kanzo.BoardStore` | Data layer — CRUD for tasks, categories, people, filtering (category/person/search), sorting |
| `js/storage.js` | `Kanzo.LocalBackend`, `Kanzo.GitHubBackend` | IndexedDB backend (with in-memory fallback), GitHub API backend. `init()` auto-selects backend based on config storage setting. |
| `js/sync.js` | `Kanzo.Sync` | Push/pull/silentPull orchestrators for GitHub sync |
| `js/ui/board.js` | `Kanzo.Board` | Board rendering, mouse + touch drag-and-drop, FAB click handler |
| `js/ui/sidebar.js` | `Kanzo.Sidebar` | Sidebar categories/people list, collapsed state, mobile overlay behavior |
| `js/ui/modals.js` | `Kanzo.Modals` | All modal logic — settings, task, category, person, column config, confirm, help, keyboard shortcuts |
| `js/ui/toast.js` | `Kanzo.Toast` | Toast notification system |
| `js/utils/dom.js` | Utility functions | `uuid()`, `slugify()`, `sanitize()`, `timeAgo()`, `debounce()`, etc. |
| `js/utils/github.js` | `Kanzo.GitHubClient` | GitHub API v3 client — `getFile()`, `putFile()`, `listFiles()`, `getUser()` |

## Patterns

### DOM Mapping

In `js/app.js`, the `mapDomRefs()` function does all `document.getElementById()` calls and assembles a single `Kanzo.DOM` object. This object is passed to every module's `init()` method. When adding a new element, add its ID lookup in `mapDomRefs()` and access it through the module's local `DOM` variable. Never call `getElementById` directly inside UI modules.

### Modals

- All modals live in `index.html` as `<div class="modal-overlay hidden" id="...">` blocks.
- `Kanzo.Modals.show(el)` and `hide(el)` toggle the `hidden` class and `body.modal-open`.
- `window.refreshIcons(el)` is called after showing a modal to render Lucide icons within it.
- Each modal has its own `bind*Events()` function wired in `Modals.init()`.
- Keyboard shortcut `Esc` closes the topmost visible modal.

### Themes

- Theme CSS custom properties are defined in `css/themes.css` under `[data-theme="..."]` selectors.
- Dark/light variants use `[data-mode="dark"]` and `[data-mode="light"]` combined with the theme attribute.
- `Kanzo.Themes.apply(theme, mode)` sets both attributes on `<html>` and updates `<meta name="theme-color">`.
- Adding a theme: add its CSS block in `themes.css`, add an `<option>` in the settings theme dropdown in `index.html`, and add an entry in the theme objects in `config.js`.

### Storage Layer

- `Kanzo.Storage.init()` picks `LocalBackend` or `GitHubBackend` based on config.
- Both backends implement the same interface: `getCategories()`, `saveCategories()`, `getPeople()`, `savePeople()`, `getTasks()`, `saveTasks()`, `getConfig()`, `saveConfig()`.
- `BoardStore` calls the active backend. Don't bypass the store to talk directly to a backend.

### Icons

- All Lucide icons are stored as inline SVG strings keyed by name in `js/icons.js`.
- `window.refreshIcons(rootEl)` scans the given element for `<i data-lucide="icon-name">` tags and replaces their inner HTML with the SVG.
- To add an icon: find the SVG from [Lucide](https://lucide.dev), add it to the `ICONS` object in `icons.js`, and use `<i data-lucide="icon-name"></i>` in HTML.

## Gotchas

- **IndexedDB fallback** — if IndexedDB fails to open, `LocalBackend` falls back to an in-memory store. Data is lost on page reload. This is transparent to callers.
- **GitHub SHA caching** — `GitHubBackend` caches file SHAs. On push, each `save*` method re-fetches the file's SHA immediately before its own PUT to avoid 409 conflicts with stale caches. Don't remove these re-fetches.
- **`refreshIcons()` must be called** — after inserting HTML that contains `<i data-lucide="...">` tags, call `window.refreshIcons(containerEl)` or the icons won't render.
- **Viewport meta** — `index.html` sets `maximum-scale=1.0, user-scalable=no` to prevent iOS input zoom. Don't remove these.
- **Script load order** — `index.html` loads scripts in dependency order: config → icons → themes → configStore → utils → storage → boardStore → sync → UI modules → app. New scripts must be inserted in the right spot.
- **Quotes** — `icons.js` uses double quotes. Keep it consistent within each file.

## Release Workflow

- **Normal push** — when told "send to GitHub" or "push", do a standard `git add`, `git commit`, and `git push origin main`. This is just committing code.
- **Tagged release** — version bumps and git tags are only done when explicitly requested. Don't tag without being asked.
- The app version string lives in `js/config.js` as `Kanzo.VERSION`. When tagging a release, update this to match the tag.