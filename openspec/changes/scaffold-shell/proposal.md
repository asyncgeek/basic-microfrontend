# Change Proposal: scaffold-shell

## Intent

Bootstrap the complete project structure for the Pokemon Store microfrontends application — the shell/host, three microfrontend skeletons (React, React, Vanilla JS), and foundational documentation. This is the "empty building with plumbing and wiring" that all future feature work builds on top of.

**Why now**: Nothing exists yet. Every subsequent change (dashboard features, cart logic, topbar navigation) depends on having a working Module Federation setup where the shell can load remote entries and MFs can communicate via Custom Events. Without this scaffold, there is no project.

## Scope

### Created

| Artifact | Description |
|----------|-------------|
| `shell/` | Plain HTML/JS + Webpack 5 host app (port 3000). Module Federation `remotes` config pointing to all three MF entry points. Minimal index.html with mount-point divs. History API router (~20 lines) for `/` and `/cart` routes. |
| `mf-dashboard/` | React app with custom webpack.config.js. Exposes `Dashboard` component. Port 4200. Shared singletons: `react`, `react-dom`. |
| `mf-cart/` | React app with custom webpack.config.js (no CRA). Exposes `CartApp` component. Port 3001. Shared singletons: `react`, `react-dom`. |
| `mf-topbar/` | Vanilla JS + Webpack with Module Federation plugin. Exposes `TopbarElement` (custom element or plain render function). Port 3002. |
| `docs/CONCEPTS.md` | 8 foundational concepts the learner must understand before touching code: Host vs Remote, remoteEntry.js, shared singletons, lazy vs eager loading, framework-agnostic shell, Custom Events bus, port isolation, version conflict prevention. |
| Root configs | Root-level `package.json` (workspaces or npm scripts to orchestrate all 4 apps), `.gitignore`, optional root `README.md` with quick-start instructions. |

### Modified

- None — greenfield project, no existing code.

### NOT created (see Out of Scope)

- No actual feature logic (Pokemon API calls, cart state, topbar navigation links).
- No CI/CD pipeline.
- No production build or deployment config.

## Approach

1. **Shell first**: Create the Webpack 5 host with Module Federation plugin configured for three remotes. Verify it serves on port 3000 with placeholder mount points.
2. **MFs in parallel**: Scaffold each microfrontend independently, each with its own `webpack.config.js` exposing the agreed module via Module Federation.
3. **Wiring**: Configure `shared` in each webpack config — `react`/`react-dom` as singletons for all React MFs. Shell's `remotes` point to each MF's `remoteEntry.js`.
4. **Communication contract**: Establish the Custom Events contract (event names, payload shapes) as comments or a thin `events.js` file in the shell. No implementation yet — just the contract definition.
5. **Documentation**: Write `docs/CONCEPTS.md` covering the 8 key concepts BEFORE any code scaffolding, so the learner has context.
6. **Smoke test**: Each app starts independently (`npm start` per MF). Shell loads all three remote entries without errors. No feature logic needed — just "it loads."

**Key technical decisions**:
- Plain Webpack 5 for shell (no framework — the shell IS the orchestrator, not a framework app)
- No CRA for React MF (CRA doesn't support Module Federation without ejecting)
- All React MFs use custom webpack.config.js — no CLI scaffolding required
- History API routing (not hash-based) — shell owns all navigation

## Out of Scope

- **Feature implementation**: No Pokemon API integration, no cart logic, no topbar navigation behavior. MFs export placeholder components only.
- **Styling/UI**: No CSS framework, no design system. Minimal placeholder styles only.
- **State management**: No Redux, Zustand, or RxJS stores. Custom Events contract is defined but not wired to real data.
- **Testing setup**: No test runners, no E2E framework. Will be addressed in a dedicated change.
- **CI/CD**: No GitHub Actions, no Docker, no deployment config.
- **Production builds**: Dev-only webpack configs. Production optimization is a separate change.
- **Monorepo tooling**: No Nx, Turborepo, or Lerna. Simple npm scripts or workspaces for now.

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| React version mismatch between MFs | Duplicate React instance, hooks broken | Medium | Pin `react` and `react-dom` to the same version across all MFs. Use `singleton: true` in shared config. |
| React MF custom webpack config complexity | Learner confusion, misconfigured loaders | Medium | Provide a minimal webpack config with inline comments explaining each section. Keep it under 50 lines. |
| Shared singleton negotiation failures (e.g., react loaded twice) | Runtime errors, hooks broken | Medium | Use `singleton: true` + `strictVersion: false` in shared config. Verify via `window.__webpack_share_scopes__`. |
| Port conflicts on developer machines | Apps fail to start | Low | Document ports clearly. Add `--port` flags in npm scripts. Consider a root-level `start:all` script. |
| Learner skips CONCEPTS.md and jumps to code | Confusion about WHY things are configured this way | High | Write CONCEPTS.md first. Reference it in README quick-start. Structure it as "read this before you code." |

## Success Criteria

1. **Shell serves on port 3000** — `npm start` in `shell/` opens a page with three visible mount-point containers.
2. **Each MF starts independently** — `npm start` in each MF directory serves its `remoteEntry.js` on the assigned port.
3. **Shell loads all three remotes** — With all 4 apps running, the shell successfully imports each remote's exposed module. No console errors related to Module Federation.
4. **Shared singletons work** — Only ONE copy of `react` and `react-dom` loads (verifiable via `window.__webpack_share_scopes__` in browser console).
5. **CONCEPTS.md exists** — Contains all 8 concepts from exploration, written for a learner audience.
6. **Custom Events contract defined** — Event names and payload shapes are documented (in code comments or a dedicated file).
7. **Zero feature logic** — MFs render placeholder content only ("Dashboard works", "Cart works", "Topbar works"). No API calls, no business logic.
