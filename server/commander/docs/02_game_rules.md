# BuddyGame Game Rules

## General Product Rules
- Child-facing gameplay should feel simple, quick, and rewarding
- Parent-facing controls should not clutter child gameplay
- Preserve offline play where possible
- Maintain compatibility with future lesson sharing/import/export
- Keep rules consistent across single-player and multiplayer where reasonable

## Lesson Rules
- A lesson contains educational content such as words, images, audio, or reading text
- Lesson progress may track stars, streaks, completion, and unlocked modes
- Some modes may be gated until study or another prerequisite is completed
- Parent mode may lock or unlock access to certain modes

## Parent Lock Rules
- Parent controls can restrict access to certain games or lessons
- Child users should not accidentally access parent tools
- Parent unlock state may temporarily expose controls
- Parent lock UI should consistently reappear whenever parent mode is re-entered

## Words Game Modes

### Study
Purpose:
- introduce the lesson content
- let the child hear/see the word before challenge modes

Rules:
- should be the first recommended mode
- may unlock additional modes after completion
- should remain calm and instructional

### Smash
Purpose:
- quick recognition game
- child selects the correct answer fast

Rules:
- all required images should load on first entry
- no missing image placeholders once hydration completes
- fast response is important

### Spell / Type Spell
Purpose:
- letter-by-letter learning and correction

Rules:
- player should be able to correct mistakes
- avoid punishing immediate wipe behavior unless intentionally designed
- exact completion should trigger success
- invalid prefixes may provide visual/audio feedback

### Memory
Purpose:
- matching / recall game

Rules:
- should remain visually clear
- card states must stay synchronized with the current round logic

### Warrior Pro
Purpose:
- action-based educational mode
- supports single-player and multiplayer competitive play

Rules:
- if not connected to a multiplayer room, treat as single-player
- in single-player, only one hero/team should appear
- in multiplayer, two sides may appear depending on room/team state
- countdown should appear fairly for all connected players
- first finisher should win the round in VS mode
- lesson-complete logic must not override first-finisher result

### Future Modes
Possible directions:
- sword spelling
- battle quiz
- race modes
- team modes
- reading competition modes

## Multiplayer Rules
- host controls room setup and round start unless explicitly changed later
- both host and player must receive synchronized countdown/start signals
- room state should remain consistent across clients
- round result should be based on actual first completion, not delayed UI actions
- single-player should remain available without room creation

## Reading Game Rules
- reading mode should support calm learning and repeat practice
- future speaking features should be paced for children
- sentence progression should be clear and easy to control
- next-button and repeat flows must be reliable

## Reward Rules
- stars, streaks, and celebration effects should reinforce success
- rewards should feel exciting without overwhelming the child
- progress systems should be simple and visible