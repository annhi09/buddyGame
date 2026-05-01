# BuddyGame File Map

## Project Root
The active project root is the `server/` folder inside `studybudy/`.

This root contains:
- backend/server logic
- WebSocket and routing logic
- main game files
- project command center files under `commander/`

---

## Root-Level Files

### app.js
Likely application entry or server bootstrap logic.
Purpose:
- may initialize Express or app middleware
- may coordinate server setup

### index.html
Top-level HTML entry at the server root.
Purpose:
- may serve as an earlier landing page or test entry
- should be reviewed for whether it is still active or legacy

### package.json
Project package definition.
Purpose:
- stores dependencies
- stores npm scripts
- defines Node project behavior

### package-lock.json
Dependency lock file.
Purpose:
- preserves exact installed package versions

### server.js
Main Node.js server file.
Purpose:
- likely runs the backend server
- may initialize routing, static serving, or websocket integration

---

## Root-Level Folders

### config/
Purpose:
- configuration files
- environment-specific settings
- server or app constants

### routes/
Purpose:
- API or page routes
- request handling logic

### services/
Purpose:
- reusable business logic
- helpers for data or feature operations

### db/
Purpose:
- database connection logic
- DB helpers
- persistence-related code

### middleware/
Purpose:
- Express middleware
- auth, logging, validation, or request processing helpers

### saves/
Purpose:
- saved outputs or user-generated stored data
- should be reviewed for whether it is permanent content or runtime storage

### storage/
Purpose:
- storage-related logic or persisted content
- should be reviewed for overlap with `saves/`

### ws/
Purpose:
- WebSocket logic
- multiplayer communication helpers
- room or event synchronization support

### icons/
Purpose:
- icon files
- sprite graphics
- visual assets used by game or UI

### node_modules/
Purpose:
- installed dependencies
- should not be manually edited
- should not be committed if already ignored by Git

---

## Game Folder

### game/
This is the main frontend/game area of the project.

Purpose:
- contains child-facing gameplay pages
- contains creator/admin pages
- contains game-specific JS and assets
- contains reading, words, and math-related content/pages

---

## Inside `game/`

### assets/
Purpose:
- shared frontend assets
- images, media, UI resources, or supporting files

### creator.html
Creator/admin page.
Purpose:
- lesson creation and management UI
- likely used for parent/teacher/content creation workflows

### creator1.html
Alternate or older creator page version.
Purpose:
- should be reviewed to determine whether it is legacy, backup, or still active

### index_reorganized.html
A reorganized index/home page for the game area.
Purpose:
- likely a newer launcher or navigation page for game modes
- should be reviewed as a possible primary front door for BuddyGame

### math.html
Math game page or placeholder.
Purpose:
- future or current math-focused learning page

### js/
Purpose:
- shared or central JavaScript files for game pages
- may include major files like legacy3.js, legacy.js, networking logic, or UI helpers

### reading/
Purpose:
- reading/story game files
- reading lessons, reading-specific pages, or related scripts/assets

### words/
Purpose:
- word-learning game files
- lesson/game mode pages and assets related to word activities

---

## Commander Folder

### commander/
This is the project command center / project brain folder.

Purpose:
- stores documentation
- stores project memory/state files
- stores reusable prompts
- stores organized lesson/content support files

This folder should support development workflow without interfering with runtime game code.

### commander/docs/
Purpose:
- stable project documentation
- product overview
- file maps
- rules
- schema
- roadmap
- bug logs

### commander/brain/
Purpose:
- current working memory for the project
- active status
- current issues
- next tasks
- session notes

### commander/prompts/
Purpose:
- reusable prompt templates for coding, debugging, redesign, and content generation

### commander/content/
Purpose:
- organized lesson content
- sample packs
- future marketplace-ready content structure
- non-runtime project content references

---

## Important Structural Notes

- The true working root is `server/`
- The `game/` folder is the main frontend game area
- `ws/` likely supports multiplayer behavior and should be considered part of the game architecture
- `commander/` is for workflow, project memory, planning, and structured content support
- current HTML files may include active and legacy versions, so part of future cleanup should identify which files are the current source of truth

---

## Known Cleanup Candidates

These areas may need later review:
- `creator.html` vs `creator1.html`
- `index.html` vs `index_reorganized.html`
- `saves/` vs `storage/`
- which files in `game/js/`, `game/reading/`, and `game/words/` are current vs old

This file map should be updated whenever major file responsibilities change.