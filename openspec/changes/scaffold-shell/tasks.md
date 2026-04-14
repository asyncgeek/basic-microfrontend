# Tasks: scaffold-shell

## Phase 1: Setup

- [x] TASK-001: Root package.json (npm workspaces + concurrently)
  - **Creates**: `package.json`
  - **Acceptance**: `npm install` from root resolves all workspace deps; `npm run start:all` launches 4 processes via concurrently
  - **Depends on**: —

- [x] TASK-002: .nvmrc
  - **Creates**: `.nvmrc` with content `"18"`
  - **Acceptance**: `nvm use` picks Node 18 without error
  - **Depends on**: —

- [x] TASK-003: .gitignore
  - **Creates**: `.gitignore` — covers node_modules, dist, *.log, .DS_Store
  - **Acceptance**: `git status` does not show node_modules or dist for any workspace
  - **Depends on**: —

- [x] TASK-004: README.md (root)
  - **Creates**: `README.md` — project overview, prerequisites, start commands, port map, architecture diagram link
  - **Acceptance**: File exists; documents all 4 ports and the `npm run start:all` command
  - **Depends on**: TASK-001

---

## Phase 2: Documentation

- [x] TASK-005: docs/CONCEPTS.md
  - **Creates**: `docs/CONCEPTS.md` — 8 foundational MF concepts: (1) Micro-Frontend pattern, (2) Module Federation, (3) Host/Remote split, (4) Async Bootstrap, (5) Singleton Shared Deps, (6) Mount/Unmount contract, (7) Custom Events bus, (8) Technology-agnostic integration
  - **Acceptance**: File contains exactly 8 numbered/headed concept sections; each concept explains problem → solution; no placeholder content
  - **Depends on**: —

- [x] TASK-006: docs/EVENTS.md
  - **Creates**: `docs/EVENTS.md` — documents all 3 custom events: `pokemon:selected` (payload: {id, name, sprite}), `cart:updated` (payload: {items: CartItem[], totalCount}), `cart:cleared` (no payload); includes who fires and who listens
  - **Acceptance**: All 3 events documented with payload shapes, emitter, and consumer
  - **Depends on**: —

---

## Phase 3: Shell

- [x] TASK-007: shell/package.json
  - **Creates**: `shell/package.json` — name: shell, private, scripts: start (webpack serve --port 3000), dependencies: webpack 5.91.0, webpack-cli 5.1.4, webpack-dev-server 5.0.4, html-webpack-plugin 5.6.0
  - **Acceptance**: `npm install` inside shell/ resolves without error
  - **Depends on**: TASK-001

- [x] TASK-008: shell/webpack.config.js
  - **Creates**: `shell/webpack.config.js` — ModuleFederationPlugin as host; remotes: mfDashboard@http://localhost:4200/remoteEntry.js, mfCart@http://localhost:3001/remoteEntry.js, mfTopbar@http://localhost:3002/remoteEntry.js; shared: react, react-dom (singleton:true, requiredVersion from package.json)
  - **Acceptance**: Config exports a valid webpack object; remotes map to the 3 correct ports; shell includes react/react-dom in shared (required for singleton enforcement)
  - **Depends on**: TASK-007

- [x] TASK-009: shell/src/index.html
  - **Creates**: `shell/src/index.html` — mount point divs: #topbar-root, #dashboard-root, #cart-root; nav links for "/" and "/cart" with data-link attribute; HtmlWebpackPlugin template
  - **Acceptance**: HTML has all 3 mount-point divs and 2 nav anchors with data-link
  - **Depends on**: TASK-007

- [x] TASK-010: shell/src/index.js (async bootstrap entry)
  - **Creates**: `shell/src/index.js` — single line: `import('./bootstrap')`
  - **Acceptance**: File contains only the dynamic import; no direct MF imports at top level
  - **Depends on**: TASK-009

- [x] TASK-011: shell/src/events.js
  - **Creates**: `shell/src/events.js` — EVENTS constants object ({POKEMON_SELECTED, CART_UPDATED, CART_CLEARED}); dispatch(eventName, detail) helper; listen(eventName, handler) helper (returns unlisten fn)
  - **Acceptance**: Exports EVENTS, dispatch, and listen; listen returns a cleanup function
  - **Depends on**: TASK-007

- [x] TASK-012: shell/src/bootstrap.js (router + MF lifecycle)
  - **Creates**: `shell/src/bootstrap.js` — History API router using data-link interception; currentUnmount pattern to clean up previous MF; mounts Topbar at startup unconditionally; routes: "/" → mfDashboard/Dashboard, "/cart" → mfCart/CartApp; each route lazy-imports the exposed remote module and calls mount(element)
  - **Acceptance**: File has router logic, currentUnmount variable, topbar auto-mount, and both route handlers; no hard-coded full page reloads
  - **Depends on**: TASK-010, TASK-011

---

## Phase 4: MF Dashboard (React 18)

- [x] TASK-013: mf-dashboard/package.json
  - **Creates**: `mf-dashboard/package.json` — name: mf-dashboard, private, scripts: start (webpack serve --port 4200), build (webpack --mode production), dependencies: react 18.2.0, react-dom 18.2.0, @babel/core 7.24.4, @babel/preset-env 7.24.4, @babel/preset-react 7.24.1, babel-loader 9.1.3, webpack 5.91.0, webpack-cli 5.1.4, webpack-dev-server 5.0.4, html-webpack-plugin 5.6.0
  - **Acceptance**: `npm install` inside mf-dashboard/ resolves without error
  - **Depends on**: TASK-001

- [x] TASK-014: mf-dashboard/webpack.config.js
  - **Creates**: `mf-dashboard/webpack.config.js` — ModuleFederationPlugin as remote; name: mfDashboard; filename: remoteEntry.js; exposes: ./Dashboard → ./src/Dashboard.jsx; shared: react + react-dom (singleton:true, requiredVersion ^18.2.0); babel-loader for .jsx/.js files
  - **Acceptance**: Config exposes key is "./Dashboard"; shared react/react-dom are singletons; babel-loader configured for JSX; runs on port 4200
  - **Depends on**: TASK-013

- [x] TASK-015: mf-dashboard/src/index.html
  - **Creates**: `mf-dashboard/src/index.html` — minimal HTML with #dashboard-root div; HtmlWebpackPlugin template
  - **Acceptance**: File has #dashboard-root mount point
  - **Depends on**: TASK-013

- [x] TASK-016: mf-dashboard/src/index.js (async bootstrap entry)
  - **Creates**: `mf-dashboard/src/index.js` — `import('./bootstrap')`
  - **Acceptance**: Single dynamic import line only
  - **Depends on**: TASK-015

- [x] TASK-017: mf-dashboard/src/events.js
  - **Creates**: `mf-dashboard/src/events.js` — EVENTS constants + dispatch() + listen() helpers (same shape as shell/src/events.js)
  - **Acceptance**: Exports EVENTS, dispatch, listen; listen returns cleanup fn
  - **Depends on**: TASK-013

- [x] TASK-018: mf-dashboard/src/Dashboard.jsx (dual export)
  - **Creates**: `mf-dashboard/src/Dashboard.jsx` — default export: React 18 component (Pokemon list, dispatches pokemon:selected on click); named export: mount(element) function that calls ReactDOM.createRoot(element).render(<Dashboard />) and returns root.unmount.bind(root)
  - **Acceptance**: File has both `export default Dashboard` and `export function mount(element)`; mount() returns an unmount function; uses createRoot (React 18 API); dispatches pokemon:selected on item click
  - **Depends on**: TASK-017

- [x] TASK-019: mf-dashboard/src/bootstrap.jsx (standalone dev entry)
  - **Creates**: `mf-dashboard/src/bootstrap.jsx` — standalone dev bootstrap: finds #dashboard-root, calls ReactDOM.createRoot().render(<Dashboard />)
  - **Acceptance**: App renders standalone when served on port 4200 without shell
  - **Depends on**: TASK-018, TASK-016

---

## Phase 5: MF Cart (React 18)

- [x] TASK-025: mf-cart/package.json
  - **Creates**: `mf-cart/package.json` — name: mf-cart, private, scripts: start (webpack serve --port 3001), build (webpack --mode production), dependencies: react 18.2.0, react-dom 18.2.0, @babel/core 7.24.4, @babel/preset-env 7.24.4, @babel/preset-react 7.24.1, babel-loader 9.1.3, webpack 5.91.0, webpack-cli 5.1.4, webpack-dev-server 5.0.4, html-webpack-plugin 5.6.0
  - **Acceptance**: `npm install` inside mf-cart/ resolves without error
  - **Depends on**: TASK-001

- [x] TASK-026: mf-cart/webpack.config.js
  - **Creates**: `mf-cart/webpack.config.js` — ModuleFederationPlugin as remote; name: mfCart; filename: remoteEntry.js; exposes: ./CartApp → ./src/CartApp.jsx; shared: react + react-dom (singleton:true, requiredVersion from package.json); babel-loader for .jsx/.js files
  - **Acceptance**: Config exposes key is "./CartApp"; shared react/react-dom are singletons; babel-loader configured for JSX
  - **Depends on**: TASK-025

- [x] TASK-027: mf-cart/src/index.html
  - **Creates**: `mf-cart/src/index.html` — minimal HTML with #cart-root div; HtmlWebpackPlugin template
  - **Acceptance**: File has #cart-root mount point
  - **Depends on**: TASK-025

- [x] TASK-028: mf-cart/src/index.js (async bootstrap entry)
  - **Creates**: `mf-cart/src/index.js` — `import('./bootstrap')`
  - **Acceptance**: Single dynamic import line only
  - **Depends on**: TASK-027

- [x] TASK-029: mf-cart/src/events.js
  - **Creates**: `mf-cart/src/events.js` — EVENTS constants + dispatch() + listen() helpers (same shape as shell/src/events.js)
  - **Acceptance**: Exports EVENTS, dispatch, listen; listen returns cleanup fn
  - **Depends on**: TASK-025

- [x] TASK-030: mf-cart/src/CartApp.jsx (dual export)
  - **Creates**: `mf-cart/src/CartApp.jsx` — default export: React 18 component (cart UI, listens to pokemon:selected, dispatches cart:updated and cart:cleared); named export: mount(element) function that calls ReactDOM.createRoot(element).render(<CartApp />) and returns root.unmount.bind(root)
  - **Acceptance**: File has both `export default CartApp` and `export function mount(element)`; mount() returns an unmount function; uses createRoot (React 18 API, NOT ReactDOM.render)
  - **Depends on**: TASK-029

- [x] TASK-031: mf-cart/src/bootstrap.jsx (standalone dev entry)
  - **Creates**: `mf-cart/src/bootstrap.jsx` — standalone dev bootstrap: finds #cart-root, calls ReactDOM.createRoot().render(<CartApp />)
  - **Acceptance**: App renders standalone when served on port 3001 without shell
  - **Depends on**: TASK-030, TASK-028

---

## Phase 6: MF Topbar (Vanilla JS)

- [x] TASK-032: mf-topbar/package.json
  - **Creates**: `mf-topbar/package.json` — name: mf-topbar, private, scripts: start (webpack serve --port 3002), build (webpack --mode production), dependencies: webpack 5.91.0, webpack-cli 5.1.4, webpack-dev-server 5.0.4, html-webpack-plugin 5.6.0
  - **Acceptance**: `npm install` inside mf-topbar/ resolves without error
  - **Depends on**: TASK-001

- [x] TASK-033: mf-topbar/webpack.config.js
  - **Creates**: `mf-topbar/webpack.config.js` — ModuleFederationPlugin as remote; name: mfTopbar; filename: remoteEntry.js; exposes: ./TopbarElement → ./src/TopbarElement.js; shared: {} (no singletons needed for vanilla JS)
  - **Acceptance**: Config exposes key is "./TopbarElement"; no shared singletons; runs on port 3002
  - **Depends on**: TASK-032

- [x] TASK-034: mf-topbar/src/index.html
  - **Creates**: `mf-topbar/src/index.html` — minimal HTML with #topbar-root; HtmlWebpackPlugin template
  - **Acceptance**: File has #topbar-root mount point
  - **Depends on**: TASK-032

- [x] TASK-035: mf-topbar/src/index.js (async bootstrap entry)
  - **Creates**: `mf-topbar/src/index.js` — `import('./bootstrap')`
  - **Acceptance**: Single dynamic import line
  - **Depends on**: TASK-034

- [x] TASK-036: mf-topbar/src/TopbarElement.js (mount/unmount contract)
  - **Creates**: `mf-topbar/src/TopbarElement.js` — export function mount(element): creates nav/header DOM nodes programmatically; listens to cart:updated event to update cart count badge; returns cleanup function that removes DOM and removes event listener
  - **Acceptance**: Exports mount(element); returns cleanup function; listens to cart:updated; no framework dependencies
  - **Depends on**: TASK-035

- [x] TASK-037: mf-topbar/src/bootstrap.js (standalone dev entry)
  - **Creates**: `mf-topbar/src/bootstrap.js` — finds #topbar-root, calls mount(element)
  - **Acceptance**: Topbar renders standalone on port 3002 without shell
  - **Depends on**: TASK-036, TASK-035

---

## Phase 7: Integration

- [ ] TASK-038: Verify full integration — all 4 apps start and shell loads all remoteEntry.js
  - **Action**: Run `npm run start:all` from root; open http://localhost:3000; navigate to "/" and "/cart"
  - **Acceptance**:
    1. Shell loads at port 3000 with topbar visible
    2. "/" route mounts React Dashboard; no console errors about singleton conflicts
    3. "/cart" route unmounts dashboard (calls destroy), mounts CartApp; React 18 root renders
    4. Clicking a Pokemon card fires pokemon:selected; cart badge updates (cart:updated received by topbar)
    5. Browser devtools Network tab shows remoteEntry.js loaded from ports 4200, 3001, 3002
    6. react, react-dom each appear only ONCE in webpack's shared scope (singleton verified)
  - **Depends on**: TASK-012, TASK-019, TASK-031, TASK-037
