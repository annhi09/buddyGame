# BuddyGame Project Memory

## Project Identity
BuddyGame is an educational game project under Athena & Aria Studio.

The project is designed for:
- toddlers
- preschool learners
- kindergarten learners
- elementary learners

It also supports:
- parents
- teachers
- homeschool users
- future lesson/content creators

## Real Project Root
The true working project root is:

`studybudy/server/`

Inside that root:
- backend/server logic lives directly in the root and supporting folders
- frontend/game files live under `game/`
- project workflow and planning files live under `commander/`

## Main Product Areas
Current major areas of the project include:
- words-based educational games
- reading/story learning activities
- future math learning activities
- multiplayer competition modes
- creator/admin lesson tools

## Current Important Folders

### game/
Main frontend/game area.

Contains:
- child-facing gameplay pages
- creator/admin pages
- game assets
- JavaScript for game logic
- reading and words sections

### ws/
WebSocket / multiplayer-related logic.

Likely supports:
- room connection
- multiplayer events
- sync behavior
- round or countdown coordination

### routes/
Backend route handling.

### services/
Reusable backend logic and helpers.

### config/
Configuration or environment-related logic.

### commander/
Project command center.

Contains:
- docs
- brain
- prompts
- content support files

## Current Important Files

### server.js
Main backend/server entry point or main Node server file.

### app.js
Application bootstrap or server setup helper.

### game/creator.html
Creator/admin interface.

### game/creator1.html
Alternative or older creator page version that should later be reviewed for current relevance.

### game/index_reorganized.html
Likely the newer or reorganized game landing page.

### game/math.html
Math learning page or future expansion page.

## Product Direction
BuddyGame should feel:
- fun first
- educational without boredom
- visually exciting but safe
- rewarding for children
- manageable for adults

## Design Direction

### Child-facing pages
Should be:
- colorful
- exciting
- easy to tap/click
- visually rewarding
- low confusion
- simple navigation

### Adult-facing pages
Should be:
- cleaner
- more structured
- more professional
- still warm and friendly
- better organized with cards, sections, and modals

## Important Product Truths
- offline-friendly behavior matters
- parent/teacher usability matters
- lesson import/export matters
- schema decisions should consider future sharing and marketplace use
- multiplayer needs fairness and clarity
- maintainability is more important than clever complexity

## Current UX Direction
- "Games" is clearer than "Play Offline"
- creator/admin tools should not look messy or outdated
- child-facing game pages can be playful
- adult-facing management pages should be more polished and organized
- large buttons and visible actions are preferred

## Current Technical Direction
- do not break working offline features
- do not casually rewrite large working systems unless necessary
- improve structure gradually
- keep future refactoring possible
- use commander files as the project brain and workflow source of truth

## Long-Term Vision
BuddyGame should grow into a polished educational platform that includes:
- engaging word games
- engaging reading/story systems
- future math content
- strong single-player and multiplayer experiences
- lesson creation and sharing
- future premium or marketplace content
- stronger Athena & Aria Studio branding