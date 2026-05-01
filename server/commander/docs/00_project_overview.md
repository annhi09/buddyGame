# BuddyGame Project Overview

## Project Name
BuddyGame by Athena & Aria Studio

## Real Project Root
The working project root is:

`studybudy/server/`

This contains:
- backend/server logic
- WebSocket/multiplayer logic
- frontend game files under `game/`
- project command center under `commander/`

---

## Purpose
BuddyGame is an educational web game platform designed to make learning fun for children while remaining useful for parents and teachers.

It focuses on:
- word learning
- reading/story interaction
- future math learning
- competitive and cooperative play
- lesson creation and sharing

---

## Target Audience

### Children
- toddlers
- preschool learners
- kindergarten
- elementary students

### Adults
- parents
- teachers
- homeschool educators
- future content creators

---

## Core Product Areas

### 1. Words Game
Located under:
`server/game/words/`

Purpose:
- vocabulary learning
- spelling practice
- recognition games
- action-based learning (Warrior Pro)

---

### 2. Reading Game
Located under:
`server/game/reading/`

Purpose:
- reading practice
- sentence repetition
- story-based learning
- future speaking challenges

---

### 3. Math Game (Early Stage)
Located under:
`server/game/math.html`

Purpose:
- future expansion into math learning

---

### 4. Creator Tools
Located under:
- `server/game/creator.html`
- `server/game/creator1.html`

Purpose:
- create lessons
- edit lessons
- manage import/export
- support parent/teacher workflows
- future marketplace content creation

---

### 5. Multiplayer System
Located under:
- `server/ws/`
- related backend files

Purpose:
- real-time gameplay
- room-based connection
- VS (player vs player) modes
- synchronization of rounds and results

---

## Experience Goals

### For Children
- fun first
- visually exciting
- fast feedback
- rewarding interactions
- easy navigation

### For Adults
- clean UI
- structured tools
- reliable controls
- easy lesson management
- simple import/export

---

## Product Principles

- learning should feel like play
- avoid complexity in child-facing UI
- keep adult tools powerful but simple
- preserve offline capability where possible
- support lesson sharing and future marketplace
- maintain consistent behavior across modes

---

## Current Strengths

- multiple word game modes
- early multiplayer system
- flexible lesson concept
- local storage support (IndexedDB / JSON)
- strong potential for expansion

---

## Current Challenges

- some UI inconsistency between pages
- image loading reliability (Smash mode)
- multiplayer synchronization issues
- unclear separation between active and legacy files
- creator page needs redesign

---

## Monetization Direction (Future)

- Free and Pro versions
- lesson/story marketplace
- premium content packs
- optional ad removal subscription

---

## Long-Term Vision

BuddyGame should evolve into:
- a complete educational platform
- a content creation ecosystem
- a multiplayer learning experience
- a recognizable brand under Athena & Aria Studio