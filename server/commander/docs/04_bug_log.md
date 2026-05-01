# BuddyGame Bug Log

## Purpose
This file tracks known bugs, their status, and possible causes.

It should be updated whenever:
- a bug is discovered
- a fix is attempted
- a fix is confirmed
- behavior changes

---

## High Priority Bugs

### Bug: Smash image hydration inconsistency
Status: fixed

Symptoms:
- only one image appears on first entry
- images sometimes appear only after re-entering the lesson

Area:
- game JS (likely under `game/js/` or words logic)

Possible Causes:
- IndexedDB image loading delay
- hydration not completed before render
- async timing mismatch

Impact:
- visual gameplay breaks
- poor first impression

Fix:
- ensured image hydration completes before rendering
- added await logic before game start

---

### Bug: Multiplayer countdown not synchronized
Status: active

Symptoms:
- countdown appears for player but not host
- inconsistent round start timing

Area:
- WebSocket logic (`ws/`)
- client-side countdown triggers

Possible Causes:
- countdown only triggered locally
- missing broadcast event
- host and player using different triggers

Impact:
- unfair gameplay
- confusing experience

---

### Bug: First-round duplication (VS mode)
Status: active / partially fixed

Symptoms:
- host sees duplicated word on first round (example: "lionlion")
- issue disappears in later rounds

Area:
- multiplayer initialization
- first render state logic

Possible Causes:
- double render call
- duplicated state assignment
- improper reset of round data

Impact:
- confusing first round
- breaks immersion

---

### Bug: Parent lock panel inconsistency
Status: active

Symptoms:
- panel appears first time
- later does not appear again unless another action occurs

Area:
- parent mode UI logic

Possible Causes:
- UI not re-rendered on unlock
- state not reset properly
- missing refresh trigger

Impact:
- unreliable parent control experience

---

## Medium Priority Bugs

### Bug: currentLessonIndex undefined
Status: previously observed

Symptoms:
- clicking back or navigation throws error

Area:
- lesson navigation logic

Cause:
- variable not defined globally or not set before use

Fix Direction:
- ensure consistent global state handling

---

### Bug: Warrior spelling movement not triggering
Status: active

Symptoms:
- character does not move to hit target
- input is recognized but action does not execute

Area:
- warrior spelling logic

Possible Causes:
- movement trigger not firing
- animation state stuck
- mismatch between input and target state

Impact:
- core gameplay broken

---

## Low Priority / Structural Issues

### Duplicate or unclear file roles
Status: ongoing

Examples:
- `creator.html` vs `creator1.html`
- `index.html` vs `index_reorganized.html`

Impact:
- confusion during development
- unclear source of truth

---

## Tracking Rules

Each bug entry should include:
- Status (active / fixed / investigating)
- Symptoms
- Area
- Possible causes
- Impact

When fixing:
- update status
- note the fix approach
- mention if regression risk exists