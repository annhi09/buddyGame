# Coding Prompt Template

Project: BuddyGame by Athena & Aria Studio

Core files:
- words.html = words game page
- reading.html = reading/story page
- creator.html = creator page
- legacy3.js = words game logic
- legacy.js = reading game logic
- server.js = websocket multiplayer server

Rules:
- preserve working features unless explicitly changing them
- do not break parent mode
- do not break offline play
- keep child-facing UI colorful and simple
- keep creator/admin UI cleaner and more professional
- explain root cause first, then provide the updated code

Current status:
[PASTE CURRENT STATUS]

Known issue or goal:
[PASTE ISSUE OR GOAL]

Relevant file:
[PASTE FILE NAME]

Task:
[PASTE TASK]

Output:
1. Root cause
2. What changes
3. Updated code
4. Notes / side effects


# UX/UI
Project: BuddyGame

Current status:
- improving creator page

Task:
Redesign creator.html into a card-based layout with modal popups for create/edit lesson.

Audience:
parents and teachers

Requirements:
- clean layout
- not childish
- easy to use
- modal popup for editing

Output:
- UX structure
- HTML
- CSS
- JS if needed


# Fix issues

Project: BuddyGame (server root)

Current status:
- working on image hydration stability

Known issue:
Smash mode sometimes shows only one image on first entry.
Images only appear after re-entering the lesson.

Relevant file:
legacy3.js (Smash mode logic)

Task:
Find the root cause and fix image hydration so all images load correctly on first entry.

Rules:
- do not break other game modes
- do not remove IndexedDB usage
- explain root cause first
- then give updated function or patch