# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a forked Obsidian plugin for syncing WeChat Read (微信读书) notes and highlights into Obsidian, with enhanced Thino/Memos integration and custom tagging support.

## Development Commands

### Build & Development
- `npm run build` - Full build with linting and type checking
- `npm run dev` - Development build with file watching + sync to Obsidian vault
- `npm run lint` - Run ESLint with auto-fix
- `npm run clean` - Clean build artifacts

### Manual Sync (macOS)
- `./sync.sh` - Copy built files to Obsidian iCloud vault (update path for your system)

### Testing & Validation
- `svelte-check` - Type checking for Svelte components (via build script)
- Plugin reloads automatically in Obsidian when files are updated

## Architecture Overview

### Core Components
- **main.ts** - Plugin entry point, UI integration, command registration
- **src/api.ts** - WeChat Read API client with cookie authentication
- **src/fileManager.ts** - File operations, vault management, Daily Notes integration
- **src/syncNotebooks.ts** - Sync orchestration, filtering, progress tracking
- **src/renderer.ts** - Template rendering with Nunjucks
- **src/settings.ts** - Configuration management with reactive stores

### Key Data Flow
```
WeChat Read API → ApiManager → Parser → SyncNotebooks → Renderer → FileManager → Obsidian Vault
```

### Template System
- **Templates**: `src/assets/*.njk` files for note formatting
- **Custom Tags**: Supports dynamic variables like `{{metaData.title}}`
- **Daily Notes**: Integration with configurable templates and auto-creation

## File Structure
```
src/
├── api.ts              # WeChat Read API client
├── fileManager.ts      # File operations
├── syncNotebooks.ts    # Sync orchestration
├── renderer.ts         # Template rendering
├── settings.ts         # Configuration
├── models.ts           # TypeScript interfaces
├── settingTab.ts       # Settings UI
├── components/         # UI components
├── parser/             # Data transformation
└── utils/              # Shared utilities
```

## Key Settings & Configuration
- **Cookie Authentication**: Stored in plugin settings
- **File Organization**: Configurable folder structure and naming
- **Template Variables**: Supports book metadata, highlights, reviews
- **Daily Notes**: Integration with Thino/Memos format
- **Custom Tags**: Dynamic tagging system with template variables

## Development Notes
- **Build Target**: Node.js (Obsidian plugin environment)
- **Dependencies**: Uses Obsidian API, Nunjucks templating, crypto-js for auth
- **Testing**: Manual testing via Obsidian plugin reload
- **Error Handling**: Comprehensive error messages for API failures and sync issues

## Common Development Tasks
1. **Add new API endpoint**: Extend `ApiManager` class in `src/api.ts`
2. **Modify note format**: Update templates in `src/assets/` or renderer
3. **Add new setting**: Extend settings interface and settings tab
4. **Test sync**: Use `npm run dev` to build and auto-sync to vault