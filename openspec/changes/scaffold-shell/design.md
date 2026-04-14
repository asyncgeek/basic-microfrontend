# Technical Design: scaffold-shell

## 1. Directory Tree

```
microfrontends/
├── package.json                          # root — npm workspaces + concurrently
├── .gitignore
├── .nvmrc                                # pins Node version
├── README.md
├── docs/
│   ├── CONCEPTS.md                       # 8 foundational MF concepts
│   └── EVENTS.md                         # Custom Events contract
├── shell/
│   ├── package.json
│   ├── webpack.config.js                 # MF host config
│   └── src/
│       ├── index.html                    # mount points + nav
│       ├── index.js                      # async bootstrap (imports ./bootstrap)
│       ├── bootstrap.js                  # router + MF mount/unmount logic
│       └── events.js                     # event name constants + helper
├── mf-dashboard/
│   ├── package.json
│   ├── webpack.config.js                 # MF remote config
│   └── src/
│       ├── index.html
│       ├── index.js                      # dynamic import('./bootstrap')
│       ├── bootstrap.jsx                 # ReactDOM.render entry
│       ├── Dashboard.jsx                 # exposed component — dual export (default + mount)
│       └── events.js                     # event helper
├── mf-cart/
│   ├── package.json
│   ├── webpack.config.js                 # MF remote config
│   └── src/
│       ├── index.js                      # dynamic import('./bootstrap')
│       ├── bootstrap.jsx                 # ReactDOM.render entry
│       ├── CartApp.jsx                   # exposed component
│       └── events.js                     # event listener setup
├── mf-topbar/
│   ├── package.json
│   ├── webpack.config.js                 # MF remote config
│   └── src/
│       ├── index.js                      # dynamic import('./bootstrap')
│       ├── bootstrap.js                  # calls mount on local #topbar-root
│       └── TopbarElement.js              # exposed module — mount/unmount interface
└── openspec/                             # SDD artifacts (not application code)
    └── changes/
        └── scaffold-shell/
            ├── proposal.md
            ├── spec.md
            └── design.md
```

Every file listed above MUST be created. No additional files are needed for the scaffold.

---

## 2. Version Pinning

| Dependency | Version | Reason |
|---|---|---|
| **Node.js** | `>=18.19.0` (LTS, pin in `.nvmrc` as `18`) | Webpack 5 requires Node 18+. LTS stability. |
| **react** | `18.2.0` | Used by shell, mf-dashboard, mf-cart. |
| **react-dom** | `18.2.0` | Must match react version exactly. |
| **webpack** | `5.91.0` | All 4 apps. Native Module Federation support. |
| **webpack-cli** | `5.1.4` | Compatible with webpack 5.91. |
| **webpack-dev-server** | `5.0.4` | Compatible with webpack 5.91. |
| **html-webpack-plugin** | `5.6.0` | Generates index.html with injected bundles. |
| **babel-loader** | `9.1.3` | Webpack ↔ Babel bridge. |
| **@babel/core** | `7.24.4` | Babel compilation core. |
| **@babel/preset-env** | `7.24.4` | ES2022+ → compatible JS. |
| **@babel/preset-react** | `7.24.1` | JSX transformation. mf-dashboard, mf-cart. |
| **concurrently** | `8.2.2` | Root-level parallel script runner. |

### .nvmrc

```
18
```

### Critical compatibility constraint

All React MFs (`shell`, `mf-dashboard`, `mf-cart`) MUST pin `react` and `react-dom` to the **same version**. A mismatch causes duplicate React instances in runtime — hooks stop working silently.

---

## 3. Webpack Config Shapes

### 3.1 shell/webpack.config.js — Host

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    publicPath: "http://localhost:3000/",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    port: 3000,
    historyApiFallback: true, // critical for SPA routing
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        mfDashboard: "mfDashboard@http://localhost:4200/remoteEntry.js",
        mfCart: "mfCart@http://localhost:3001/remoteEntry.js",
        mfTopbar: "mfTopbar@http://localhost:3002/remoteEntry.js",
      },
      shared: {
        react:       { singleton: true, strictVersion: false },
        "react-dom": { singleton: true, strictVersion: false },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
```

**Key decisions:**
- `historyApiFallback: true` — required so the dev server returns `index.html` for all routes (History API routing).
- `publicPath` must be absolute URL — Module Federation requires this to resolve chunks correctly.
- Shell declares ALL shared singletons even though it may not use React directly. This is how the shell becomes the singleton arbiter: it provides the "negotiation table" where remotes agree on a single version.
- CORS headers on dev server — required because remotes are on different ports (cross-origin).

### 3.2 mf-cart/webpack.config.js — React Remote

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    publicPath: "http://localhost:3001/",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    port: 3001,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "mfCart",
      filename: "remoteEntry.js",
      exposes: {
        "./CartApp": "./src/CartApp.jsx",
      },
      shared: {
        react: { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
```

**Note:** `filename: "remoteEntry.js"` is what generates the manifest file that the shell fetches. The host does NOT set `filename` — only remotes do.

Wait — mf-cart does not have `public/index.html` in the directory tree. Correction: mf-cart uses an inline HTML template or we add a minimal `public/index.html`. Since the directory tree is authoritative, we use NO `public/` folder. Instead, HtmlWebpackPlugin generates from a template string:

```js
    new HtmlWebpackPlugin({
      // No template — generates a default HTML5 page.
      // For standalone mode, the bootstrap.jsx mounts to #root.
      // We inject a <div id="root"></div> manually:
    }),
```

**Better approach:** Remove HtmlWebpackPlugin from mf-cart entirely for the scaffold. The remote only needs to serve `remoteEntry.js`. For standalone dev, we can add a minimal inline template. Updated:

```js
    new HtmlWebpackPlugin({
      template: false, // auto-generated
    }),
```

Actually, let's keep it simple and consistent. Each MF that can run standalone needs an HTML file. **Amended directory tree addition** for mf-cart and mf-topbar:

```
mf-cart/
└── src/
    └── index.html          # minimal: <div id="root"></div>

mf-topbar/
└── src/
    └── index.html          # minimal: <div id="topbar-root"></div>
```

The HtmlWebpackPlugin then uses `template: "./src/index.html"` in both.

### 3.3 mf-topbar/webpack.config.js — Vanilla JS Remote

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    publicPath: "http://localhost:3002/",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    port: 3002,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "mfTopbar",
      filename: "remoteEntry.js",
      exposes: {
        "./TopbarElement": "./src/TopbarElement.js",
      },
      shared: {},
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
```

**Key decision:** mf-topbar has an EMPTY `shared` block. It uses no framework, so there's nothing to share. This is intentional — it proves that a MF can be zero-dependency.

### 3.4 mf-dashboard/webpack.config.js — React Remote

Same shape as `mf-cart`, different port and exposed module:

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    publicPath: "http://localhost:4200/",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    port: 4200,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "mfDashboard",
      filename: "remoteEntry.js",
      exposes: {
        "./Dashboard": "./src/Dashboard.jsx",
      },
      shared: {
        react:       { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
```

---

## 4. Bootstrap Pattern (React — mf-cart)

### The Problem

Module Federation requires that shared modules are initialized BEFORE any consuming code runs. If `index.js` directly imports React and calls `ReactDOM.render`, the shared scope hasn't been negotiated yet → crash.

### The Solution: Async Bootstrap

**`mf-cart/src/index.js`**
```js
// This file MUST be the webpack entry point.
// It MUST NOT import React or any shared dependency directly.
// The dynamic import() triggers Module Federation's async shared scope initialization.
import("./bootstrap");
```

That's it. One line. The magic is that `import()` is async, giving webpack time to resolve shared modules from the host's scope before `bootstrap.jsx` executes.

**`mf-cart/src/bootstrap.jsx`**
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import CartApp from "./CartApp";

const rootElement = document.getElementById("root");

// createRoot for React 18 concurrent mode
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<CartApp />);
}
```

**`mf-cart/src/CartApp.jsx`**
```jsx
import React from "react";

const CartApp = () => {
  return (
    <div>
      <h2>Cart MF placeholder</h2>
      <p>React microfrontend loaded successfully.</p>
    </div>
  );
};

export default CartApp;
```

### Why `createRoot` (React 18) instead of `ReactDOM.render`?

`ReactDOM.render` is deprecated in React 18. Using `createRoot` avoids the deprecation warning in the console. Since we pinned React 18.2.0, we use the modern API.

### Standalone vs. Remote Mode

When loaded standalone (`localhost:3001`), `bootstrap.jsx` finds `#root` in its own `index.html` and mounts there. When loaded as a remote from the shell, the shell calls `CartApp` directly (see Section 7) — `bootstrap.jsx` only runs in standalone mode because the shell imports `./CartApp`, not `./bootstrap`.

---

## 5. Shell Router Design

The router lives in `shell/src/bootstrap.js`. It's ~20 lines of real logic.

### shell/src/index.js (async bootstrap — same pattern as React MF)

```js
import("./bootstrap");
```

The shell ALSO needs the async bootstrap pattern because it consumes shared modules (it negotiates the shared scope for all remotes).

### shell/src/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pokemon Store — Microfrontends Shell</title>
</head>
<body>
  <nav>
    <a href="/" data-link>Dashboard</a>
    <a href="/cart" data-link>Cart</a>
  </nav>
  <div id="topbar-root"></div>
  <div id="app-root"></div>
</body>
</html>
```

**Note:** `data-link` attributes mark SPA navigation links. The router intercepts clicks on these.

### shell/src/bootstrap.js — The Router

```js
// Mount topbar — always visible, route-independent
import("mfTopbar/TopbarElement").then(({ mount }) => {
  mount(document.getElementById("topbar-root"));
});

// Route table: path → loader function
const routes = {
  "/": () => import("mfDashboard/DashboardModule"),
  "/cart": () => import("mfCart/CartApp"),
};

const appRoot = document.getElementById("app-root");
let currentUnmount = null;

async function navigate(path) {
  // Unmount previous MF
  if (currentUnmount) {
    currentUnmount();
    currentUnmount = null;
  }
  appRoot.innerHTML = "";

  const loader = routes[path] || routes["/"];
  const module = await loader();

  // Each MF exports a mount(element) function that returns an unmount function
  if (module.mount) {
    currentUnmount = module.mount(appRoot);
  }
}

// Intercept SPA link clicks
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    e.preventDefault();
    const path = new URL(link.href).pathname;
    history.pushState(null, "", path);
    navigate(path);
  }
});

// Handle browser back/forward
window.addEventListener("popstate", () => {
  navigate(location.pathname);
});

// Initial route
navigate(location.pathname);
```

**Key design decisions:**

1. **`data-link` interception** — only links explicitly marked as SPA links are intercepted. External links work normally.
2. **`currentUnmount` pattern** — each MF's `mount()` returns a cleanup function. This prevents memory leaks and stale event listeners.
3. **`appRoot.innerHTML = ""`** — brute-force DOM cleanup before mounting the next MF. Simple and effective for a scaffold.
4. **Default route fallback** — unknown paths fall back to `/` (dashboard). No 404 page needed for the scaffold.
5. **Topbar is always mounted** — it's outside the router's `appRoot`, mounted once at startup.

---

## 6. Custom Events Contract

All events follow the pattern: `{domain}:{action}` in kebab-case.

### Event Definitions

#### `pokemon:selected`

| Field | Value |
|---|---|
| **Name** | `pokemon:selected` |
| **Fired by** | `mf-dashboard` (React) |
| **Listened by** | `mf-cart` (React), `mf-topbar` (Vanilla JS) |
| **When** | User clicks on a Pokemon card in the dashboard |
| **Payload** | See below |

```typescript
interface PokemonSelectedPayload {
  id: number;        // Pokemon ID from PokeAPI
  name: string;      // Pokemon name (lowercase)
  sprite: string;    // URL to sprite image
}

// Dispatch example:
window.dispatchEvent(
  new CustomEvent("pokemon:selected", {
    detail: { id: 25, name: "pikachu", sprite: "https://..." },
  })
);
```

#### `cart:updated`

| Field | Value |
|---|---|
| **Name** | `cart:updated` |
| **Fired by** | `mf-cart` (React) |
| **Listened by** | `mf-topbar` (Vanilla JS) |
| **When** | An item is added to or removed from the cart |
| **Payload** | See below |

```typescript
interface CartItem {
  id: number;        // Pokemon ID
  name: string;      // Pokemon name
  qty: number;       // Quantity in cart (always >= 1)
}

interface CartUpdatedPayload {
  items: CartItem[];  // Full cart contents (not a delta)
  totalCount: number; // Sum of all qty values
}

// Dispatch example:
window.dispatchEvent(
  new CustomEvent("cart:updated", {
    detail: {
      items: [{ id: 25, name: "pikachu", qty: 2 }],
      totalCount: 2,
    },
  })
);
```

#### `cart:cleared`

| Field | Value |
|---|---|
| **Name** | `cart:cleared` |
| **Fired by** | `mf-cart` (React) |
| **Listened by** | `mf-topbar` (Vanilla JS) |
| **When** | User clears the entire cart |
| **Payload** | None (empty detail) |

```typescript
// Dispatch example:
window.dispatchEvent(new CustomEvent("cart:cleared"));
```

### Event Helper (shell/src/events.js)

```js
// Centralized event name constants — import from here, never hardcode strings
export const EVENTS = {
  POKEMON_SELECTED: "pokemon:selected",
  CART_UPDATED: "cart:updated",
  CART_CLEARED: "cart:cleared",
};

export function dispatch(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function listen(eventName, handler) {
  window.addEventListener(eventName, (e) => handler(e.detail));
  // Return cleanup function
  return () => window.removeEventListener(eventName, handler);
}
```

**Design decision:** The `events.js` helper lives in the shell but the event NAMES are just strings — any MF can dispatch/listen using `window.dispatchEvent` and `window.addEventListener` directly. The helper is a convenience, not a requirement. MFs that don't import from shell (to stay independent) just use the raw string names.

For the scaffold, MFs will NOT wire up actual event listeners — only the constants and helper are created. Event wiring is feature work.

---

## 7. Mount/Unmount Interface

Every MF must export a `mount(element)` function that returns an `unmount()` function. This is the contract the shell router depends on.

### 7.1 React MF (mf-dashboard)

Same dual-export pattern as mf-cart:

**`mf-dashboard/src/Dashboard.jsx`** — the exposed module

```jsx
import React from "react";
import ReactDOM from "react-dom/client";

const Dashboard = () => (
  <div>
    <h2>Dashboard MF placeholder</h2>
    <p>React microfrontend loaded successfully.</p>
  </div>
);

let root = null;

export function mount(element) {
  root = ReactDOM.createRoot(element);
  root.render(<Dashboard />);
  return () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };
}

export default Dashboard;
```

### 7.2 React MF (mf-cart)

**`mf-cart/src/CartApp.jsx`** — the exposed module

```jsx
import React from "react";
import ReactDOM from "react-dom/client";

const CartApp = () => (
  <div>
    <h2>Cart MF placeholder</h2>
    <p>React microfrontend loaded successfully.</p>
  </div>
);

// Mount/unmount interface for the shell
let root = null;

export function mount(element) {
  root = ReactDOM.createRoot(element);
  root.render(<CartApp />);
  return () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };
}

// Default export for standalone mode (bootstrap.jsx uses this)
export default CartApp;
```

**Key detail:** `CartApp.jsx` exports BOTH a default component (for standalone use in `bootstrap.jsx`) AND a named `mount` function (for the shell). This dual-export pattern is essential for MFs that must work both standalone and as remotes.

### 7.3 Vanilla JS MF (mf-topbar)

**`mf-topbar/src/TopbarElement.js`**

```js
export function mount(element) {
  const container = document.createElement("div");
  container.className = "topbar";
  container.innerHTML = `
    <header>
      <span>Pokemon Store</span>
      <span id="cart-count">Cart: 0</span>
    </header>
  `;
  element.appendChild(container);

  // Return unmount function
  return () => {
    element.innerHTML = "";
  };
}
```

**Simplest possible implementation.** No framework, no build complexity. This is the proof that Module Federation is framework-agnostic.

---

## 8. Singleton Shared Config Strategy

### The Negotiation Model

Module Federation's `shared` config creates a **negotiation** at runtime. When the shell loads, it creates `window.__webpack_share_scopes__.default`. Each remote registers its version of shared modules into this scope. The rules:

- `singleton: true` — only ONE version can win. If multiple versions are registered, webpack picks the highest satisfying version.
- `strictVersion: false` — if the winning version doesn't satisfy a remote's `requiredVersion`, webpack logs a WARNING but still uses the singleton. With `strictVersion: true`, it would THROW an error.
- `requiredVersion` — optional hint. If set, webpack uses it for negotiation. If not set, webpack reads from `package.json`.

### Why `strictVersion: false` Everywhere?

During development, version mismatches between the shell and remotes are common (different `package.json` files, different install times). `strictVersion: false` keeps the app running with a warning instead of crashing. In production, you'd flip this to `true` after stabilizing versions.

### Per-App Shared Blocks

#### shell/webpack.config.js
```js
shared: {
  react:       { singleton: true, strictVersion: false },
  "react-dom": { singleton: true, strictVersion: false },
}
```
The shell declares ALL shared singletons. It acts as the **central negotiation authority**. Even though the shell may not use React directly, listing it here garantiza que el shared scope se inicialice antes de que cualquier remote lo consuma.

**Important:** The shell SHOULD install `react` and `react-dom` as dependencies even if doesn't use them — required for proper singleton negotiation initialization. This is a common gotcha.

#### mf-dashboard/webpack.config.js
```js
shared: {
  react:       { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
  "react-dom": { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
}
```
Same as mf-cart. Both React MFs must declare their shared config identically.

#### mf-cart/webpack.config.js
```js
shared: {
  react: { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
  "react-dom": { singleton: true, strictVersion: false, requiredVersion: "^18.2.0" },
}
```
Only shares React-related modules. `requiredVersion` is set as documentation — it tells other participants what this remote expects.

#### mf-topbar/webpack.config.js
```js
shared: {}
```
Empty. Vanilla JS, no shared dependencies. This is valid and intentional.

### Verification Strategy

To verify singletons are working at runtime, open the browser console on `localhost:3000` and run:

```js
// Check React singleton
console.log(window.__webpack_share_scopes__.default.react);
// Should show ONE entry, not multiple

// Check react-dom singleton
console.log(window.__webpack_share_scopes__.default["react-dom"]);
// Should show ONE entry
```

If you see multiple entries with `loaded: true`, the singleton config is broken.

---

## Amended Final Directory Tree

Incorporating all corrections from the design process:

```
microfrontends/
├── package.json
├── .gitignore
├── .nvmrc
├── README.md
├── docs/
│   ├── CONCEPTS.md
│   └── EVENTS.md
├── shell/
│   ├── package.json
│   ├── webpack.config.js
│   └── src/
│       ├── index.html
│       ├── index.js
│       ├── bootstrap.js
│       └── events.js
├── mf-dashboard/
│   ├── package.json
│   ├── webpack.config.js
│   └── src/
│       ├── index.html
│       ├── index.js
│       ├── bootstrap.jsx
│       ├── Dashboard.jsx
│       └── events.js
├── mf-cart/
│   ├── package.json
│   ├── webpack.config.js
│   └── src/
│       ├── index.html
│       ├── index.js
│       ├── bootstrap.jsx
│       ├── CartApp.jsx
│       └── events.js
├── mf-topbar/
│   ├── package.json
│   ├── webpack.config.js
│   └── src/
│       ├── index.html
│       ├── index.js
│       ├── bootstrap.js
│       └── TopbarElement.js
└── openspec/
    └── changes/
        └── scaffold-shell/
            ├── proposal.md
            ├── spec.md
            └── design.md
```

**Total files to create: 38** (excluding openspec artifacts which already exist).
