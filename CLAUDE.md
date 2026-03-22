# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Listen AI (开听) - A cross-platform local language learning tool for English listening and reading practice. Built with Electron + Vue3 + Pinia + SQLite, supporting custom audio import with AI-assisted learning.

## Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist        # All platforms
npm run dist:win    # Windows only
npm run dist:android # Android APK
```

## Architecture

### Main Process (src/main/index.js)
- Electron main process handling window creation, IPC, and database
- Uses `sql.js` for SQLite database stored in user data directory
- Database tables: `episodes`, `user_progress`, `wrong_answers`, `favorites`, `vocabularies`, `settings`
- IPC handlers for all CRUD operations
- Uses `electron-log` for logging

### Preload (src/preload/index.js)
- Exposes secure API to renderer via `contextBridge.exposeInMainWorld('api', {...})`
- All communication between renderer and main process goes through IPC invoke pattern

### Renderer (src/renderer)
- Vue 3 application with Pinia state management
- Vue Router with hash history (`createWebHashHistory`)
- Views: Home, Learn, WrongAnswers, Favorites, Vocabulary, Settings
- Uses `Howler.js` for audio playback (loaded at runtime)

### IPC API Structure
```javascript
window.api.episodes     // getAll, getById, add, delete
window.api.progress     // get, save
window.api.wrongAnswers // add, getAll, delete, updateReviewCount
window.api.favorites    // add, remove, getAll
window.api.vocabulary   // add, getAll, delete
window.api.dialog       // openFile, openDirectory
window.api.file          // readAsBase64
```

### Database Schema (v2.0)
- `episodes`: id, title, difficulty, category, audioPath, transcript, translation, lrc, questions (JSON), createdAt, isCollected
- `user_progress`: episodeId, status, audioPosition, wrongAnswers (JSON), completedAt, studyDuration, lastStudyTime
- `wrong_answers`: id, questionId, episodeId, question, options (JSON), correctAnswer, userAnswer, explanation, wrongAt, reviewCount, isMastered
- `favorites`: episodeId, addedAt
- `vocabularies`: id, word, meaning, episodeId, createdAt, reviewCount, isMastered
- `settings`: key, value
- `questions`: (planned) id, episodeId, type, question, options, correctAnswer, explanation, createByAI

## Key Patterns

- Use `ipcRenderer.invoke('channel', ...args)` in preload → `ipcMain.handle('channel', handler)` in main
- Audio files loaded via Howler.js using file:// protocol for local files
- All database JSON fields stored as stringified JSON
- Window shows on `ready-to-show` event with 1200x800 default size (min 900x600)
- Protocol `local-file://` registered for handling local file paths

## UI Structure

```
Home (首页) - Episode list with difficulty filters
Learn (学习页面) - Audio player + subtitle sync + practice
WrongAnswers (错题本) - Wrong question review
Favorites (收藏) - Favorite episodes
Vocabulary (生词本) - Word collection
Settings (设置) - App configuration + AI config (future)
```

## Key Implementation Details

### Episode Import
- Audio files: MP3, M4A, WAV, FLAC supported
- Subtitle formats: SRT, LRC, VTT
- Demo data added automatically on first run

### Audio Playback
- Howler.js handles playback with support for playback rate control
- LRC parsing for synchronized lyrics display
- Audio position saved to database for resume

### Data Flow
```
User Action → Vue Component → Pinia Store → IPC → Main Process → SQLite
```