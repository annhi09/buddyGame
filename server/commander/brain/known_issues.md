# Known Issues

## High Priority Issues

### Smash image hydration inconsistency -> fixed
Symptoms:
- sometimes only one image appears
- sometimes images appear only after re-entering the lesson
Area:
- likely in game JS logic for word modes
Concern:
- hurts a highly visual game mode and creates unreliable first impressions

### Multiplayer countdown fairness / sync
Symptoms:
- countdown may appear for one side but not the other
- host/player behavior can drift
Area:
- multiplayer logic, websocket flow, and client event handling
Concern:
- fairness issue for competitive modes

### First-round duplication in VS flows
Symptoms:
- host may see doubled first word or duplicate state on first load
Area:
- multiplayer initialization / first render state
Concern:
- causes confusion and makes rounds feel broken

### Parent lock panel inconsistency
Symptoms:
- parent controls may appear once, then fail to reappear correctly on later unlock attempts
Area:
- parent mode UI state
Concern:
- parent-facing control reliability is important

## Medium Priority Issues

### Creator page UI is outdated
Symptoms:
- page feels messy or older in style
- not yet matching product quality goals
Area:
- `game/creator.html` and possibly `game/creator1.html`
Concern:
- weakens teacher/parent/creator experience

### Import/export structure not finalized
Symptoms:
- lesson sharing direction exists, but long-term structure is not fully settled
Area:
- lesson schema and creator tooling
Concern:
- important for teacher sharing and future marketplace goals

### Active vs legacy page/file confusion
Symptoms:
- multiple similar files exist such as `creator.html` and `creator1.html`
- multiple entry pages exist such as `index.html` and `index_reorganized.html`
Concern:
- can slow development and create uncertainty about the source of truth

## Ongoing Architecture Concerns
- large JS files may become harder to manage over time
- multiplayer state and UI state can fall out of sync
- project structure should be improved gradually, not all at once
- lesson/content schema should stay forward-compatible