# Spec: scaffold-shell

## Overview
Bootstrap the complete project structure for the Pokemon Store microfrontends application: a Webpack 5 shell/host and three microfrontend skeletons (React, React, Vanilla JS) with foundational documentation and a defined Custom Events communication contract. All artifacts are placeholders — no feature logic.

---

## REQ-001: docs/CONCEPTS.md

### Requirements
- R1: The file must exist at `docs/CONCEPTS.md` from the project root.
- R2: The file must contain exactly 8 numbered concepts relevant to the Module Federation / microfrontend mental model.
- R3: Each concept must have a title and a short explanation (2–5 sentences minimum).
- R4: Concepts must cover, at minimum: Module Federation, Host/Remote distinction, remoteEntry.js, Shared Singletons, Custom Events as a communication contract, the microfrontend independence principle, the shell routing responsibility, and the difference between a monolith and a microfrontend architecture.
- R5: The file must be written in Markdown with clear heading structure.

### Acceptance Scenarios
- S1 (Happy path): Running `wc -l docs/CONCEPTS.md` returns a non-zero value; the file opens and displays 8 distinct concept sections, each with title and explanation.
- S2 (Coverage check): A reviewer reads the file and can identify all 8 required topics from R4 without ambiguity.
- S3 (Format check): The file renders correctly in any standard Markdown viewer with no broken headings or missing sections.

---

## REQ-002: shell/ — Webpack 5 Host

### Requirements
- R1: Directory `shell/` must exist with its own `package.json` declaring its dependencies independently.
- R2: `shell/webpack.config.js` must configure `ModuleFederationPlugin` as a host (no `name` exposed, only `remotes`).
- R3: The `remotes` config must declare exactly 3 entries: `mfDashboard` (port 4200), `mfCart` (port 3001), `mfTopbar` (port 3002).
- R4: `shell/src/index.html` must contain at minimum three mount-point elements: one for the topbar, one for the dashboard, and one for the cart.
- R5: `shell/src/index.js` (or equivalent entry) must implement a client-side router handling at least two routes: `/` (dashboard view) and `/cart` (cart view), using the History API — no full page reloads.
- R6: The router must be self-contained (~20 lines), with no external routing library.
- R7: The dev server must be configured to run on port 3000.
- R8: No feature logic — the shell only mounts/unmounts MF elements; all content is delegated to remotes.

### Acceptance Scenarios
- S1 (Happy path): Running `npm start` inside `shell/` starts a dev server on `localhost:3000` without errors.
- S2 (Routing): Navigating to `localhost:3000/` renders the dashboard mount point; navigating to `localhost:3000/cart` renders the cart mount point — no full page reload occurs.
- S3 (Remote config): Inspecting `webpack.config.js` shows `remotes` with exactly 3 entries pointing to the correct ports.
- S4 (No feature logic): The shell source contains no domain logic, no API calls, no state management — only mount/unmount calls and routing.

---

## REQ-003: mf-dashboard/ — React Microfrontend

### Requirements
- R1: Directory `mf-dashboard/` must exist with a React + custom Webpack configuration (no Create React App).
- R2: `mf-dashboard/webpack.config.js` must configure `ModuleFederationPlugin` as a remote, with `name: 'mfDashboard'` and `exposes` containing `Dashboard` mapped to its source path.
- R3: `react` and `react-dom` must both be listed as **singletons** in the `shared` config (`singleton: true`, `strictVersion: false`).
- R4: The dev server must be configured to run on port 4200.
- R5: `Dashboard` must be a React component that renders a placeholder — no feature logic.
- R6: The component entry must use the async bootstrap pattern (`import('./bootstrap')`) to avoid eager consumption issues with Module Federation.
- R7: `Dashboard.jsx` must export both a default component and a named `mount(element)` function.

### Acceptance Scenarios
- S1 (Happy path): Running `npm start` inside `mf-dashboard/` starts a dev server on `localhost:4200` and serves `remoteEntry.js` at `localhost:4200/remoteEntry.js`.
- S2 (Singleton check): The webpack config's `shared` block includes `react` and `react-dom` with `singleton: true`.
- S3 (Expose check): `ModuleFederationPlugin` exposes `./Dashboard` and the file exists at the declared path.
- S4 (Standalone check): Navigating to `localhost:4200` directly shows a placeholder page without errors in the console.
- S5 (No CRA): There is no `react-scripts` dependency in `mf-dashboard/package.json`.

---

## REQ-004: mf-cart/ — React Microfrontend

### Requirements
- R1: Directory `mf-cart/` must exist with a custom Webpack configuration (no Create React App).
- R2: `mf-cart/webpack.config.js` must configure `ModuleFederationPlugin` as a remote, with `name: 'mfCart'` and `exposes` containing `CartApp` mapped to its source path.
- R3: `react` and `react-dom` must both be listed as **singletons** in the `shared` config (`singleton: true`, `strictVersion: false`).
- R4: The dev server must be configured to run on port 3001.
- R5: `CartApp` must be a React component that renders a placeholder (e.g., "Cart MF placeholder") — no feature logic.
- R6: The component entry must be in a bootstrap file pattern (async import) to avoid eager consumption issues with Module Federation.

### Acceptance Scenarios
- S1 (Happy path): Running `npm start` inside `mf-cart/` starts a dev server on `localhost:3001` and serves `remoteEntry.js` at `localhost:3001/remoteEntry.js`.
- S2 (Singleton check): The webpack config's `shared` block includes both `react` and `react-dom` with `singleton: true`.
- S3 (Bootstrap pattern): The entry file uses a dynamic `import('./bootstrap')` pattern, not a direct render call.
- S4 (Standalone check): Navigating to `localhost:3001` directly renders the placeholder React component without console errors.
- S5 (No CRA): There is no `react-scripts` dependency in `mf-cart/package.json`.

---

## REQ-005: mf-topbar/ — Vanilla JS Microfrontend

### Requirements
- R1: Directory `mf-topbar/` must exist with a plain JavaScript project structure and a custom `webpack.config.js`.
- R2: `mf-topbar/webpack.config.js` must configure `ModuleFederationPlugin` as a remote, with `name: 'mfTopbar'` and `exposes` containing `TopbarElement` mapped to its source path.
- R3: The dev server must be configured to run on port 3002.
- R4: `TopbarElement` must be a plain JS module (no framework) that exports a mount/unmount interface or renders a placeholder DOM element — no feature logic.
- R5: No framework dependencies (no React, no Vue) in `mf-topbar/package.json`.

### Acceptance Scenarios
- S1 (Happy path): Running `npm start` inside `mf-topbar/` starts a dev server on `localhost:3002` and serves `remoteEntry.js` at `localhost:3002/remoteEntry.js`.
- S2 (Expose check): `ModuleFederationPlugin` exposes `./TopbarElement` and the file exists at the declared path.
- S3 (No framework): `mf-topbar/package.json` contains no references to `react`, `vue`, or any UI framework.
- S4 (Standalone check): Navigating to `localhost:3002` renders a placeholder topbar element in the browser without console errors.

---

## REQ-006: Root configs

### Requirements
- R1: A root `package.json` must exist defining npm workspaces that include all four apps: `shell`, `mf-dashboard`, `mf-cart`, `mf-topbar`.
- R2: The root `package.json` must include scripts to start all apps concurrently (e.g., `npm run start:all`) and to install all workspace dependencies from the root.
- R3: A `.gitignore` file must exist at the root and must include at minimum: `node_modules/`, `dist/`, `.env`.
- R4: A `README.md` must exist at the root documenting: project purpose, port assignments, how to install, and how to run each app.
- R5: The root `package.json` must NOT contain application source dependencies — only workspace tooling (e.g., `concurrently`).

### Acceptance Scenarios
- S1 (Workspaces): Running `npm install` from the project root installs dependencies for all four workspaces without errors.
- S2 (Start script): Running `npm run start:all` from the root starts all four dev servers concurrently on their designated ports.
- S3 (Gitignore): `node_modules/` and `dist/` are present in `.gitignore` and would not be committed to git.
- S4 (README): The README can be read by a new developer and they can understand ports, install steps, and run commands without further context.

---

## REQ-007: Integration — All MFs load from shell

### Requirements
- R1: With all four dev servers running, the shell at `localhost:3000` must load all three `remoteEntry.js` files without network errors (HTTP 200).
- R2: The browser console must show zero Module Federation-related errors (e.g., no "Shared module is not available", no "Failed to fetch remote entry").
- R3: Only one copy of `react` and `react-dom` must be loaded in the shell's runtime (singleton enforcement for mf-cart).
- R4: Only one copy of `react-dom` must be loaded in the shell's runtime (singleton enforcement across all React MFs).
- R5: Custom Events communication contract must be defined: at minimum two event names must be documented with their payload shapes (e.g., `pokemon:selected` with `{ id, name }` and `cart:updated` with `{ items: Array<{ id, name, qty }> }`). This contract must appear in either `docs/CONCEPTS.md` or a dedicated `docs/EVENTS.md`.
- R6: The shell must render placeholder content from all three MFs on the appropriate routes — no blank screens, no unhandled errors.

### Acceptance Scenarios
- S1 (Network): Opening DevTools Network tab while on `localhost:3000` shows successful requests to `localhost:4200/remoteEntry.js`, `localhost:3001/remoteEntry.js`, and `localhost:3002/remoteEntry.js` (HTTP 200).
- S2 (Console clean): The browser console on `localhost:3000` shows zero errors after all MFs are loaded.
- S3 (Singleton react): In the browser console, `window.__webpack_share_scopes__.default.react` shows a single loaded version — not multiple instances.
- S4 (Singleton react-dom): In the browser console, `window.__webpack_share_scopes__.default['react-dom']` shows a single loaded version.
- S5 (Events contract): The documented event contract lists at least 2 events with their exact names (kebab-case with namespace) and TypeScript-style or JSDoc payload shapes.
- S6 (Route dashboard): Navigating to `localhost:3000/` shows placeholder content from both `mf-topbar` and `mf-dashboard` — no blank areas caused by MF load failures.
- S7 (Route cart): Navigating to `localhost:3000/cart` shows placeholder content from both `mf-topbar` and `mf-cart` — no blank areas caused by MF load failures.
