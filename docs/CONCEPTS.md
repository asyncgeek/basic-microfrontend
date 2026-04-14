# Microfrontends — Conceptos Fundamentales

> Este documento explica **por qué** existe cada pieza del proyecto antes de que toques código.
> Leelo entero. Una vez. Vale la pena.

---

## 1. ¿Qué es un Microfrontend?

### El problema

Una app frontend crece. El equipo también. Y de repente:
- Un cambio en el header rompe el checkout
- Para deployar el carrito hay que deployar toda la app
- Un equipo quiere migrar a React 19, el otro no puede porque comparten código
- Los builds tardan 8 minutos porque compilan TODO junto

Esto es un **monolito frontend**. El mismo problema de siempre, del lado del cliente.

### La solución

Dividís la interfaz en **aplicaciones independientes** — cada una con su propio repositorio, su propio deploy, su propio stack si hace falta:

```
┌──────────────────────────────────────────────────────┐
│                    Shell (:3000)                     │
│            Orquesta. No tiene lógica de negocio.     │
└──────────┬──────────────┬──────────────┬─────────────┘
           │              │              │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼───────┐
    │  Dashboard  │ │    Cart    │ │   Topbar   │
    │   (:4200)   │ │   (:3001)  │ │   (:3002)  │
    │    React    │ │   React    │ │ Vanilla JS │
    └─────────────┘ └────────────┘ └────────────┘
```

Cada caja es una app completa. Tiene su `package.json`, corre en su puerto, se puede deployar sola. El Shell las junta en tiempo de ejecución.

### Este proyecto

| App | Puerto | Framework | Responsabilidad |
|-----|--------|-----------|----------------|
| Shell | 3000 | React + Webpack 5 | Orquestación, routing, montar/desmontar MFs |
| mf-dashboard | 4200 | React | Listado de Pokémon, filtros, botón "Agregar" |
| mf-cart | 3001 | React | Carrito de compras, total, estado persistido |
| mf-topbar | 3002 | Vanilla JS | Navegación, badge del carrito |

---

## 2. Module Federation — El corazón del sistema

### ¿Qué problema resuelve?

Si cada MF es una app separada, ¿cómo el Shell carga código de los otros?

Opciones malas:
- `<iframe>`: aislamiento total, pero comunicación horrible y UI inconsistente
- `<script src="...">`: funciona, pero sin gestión de dependencias compartidas → React se carga 3 veces
- npm packages: hay que republicar y redeploy de todo para cada cambio

**Module Federation** de Webpack 5 es la solución: permite que una app **exponga módulos** y que otra los **consuma en tiempo de ejecución**, sin recompilar nada.

### Los tres conceptos del plugin

```
┌─────────────────────────────────────────────────────┐
│  ModuleFederationPlugin                             │
│                                                     │
│  name      → "¿Cómo me llamo yo?"                  │
│  exposes   → "¿Qué ofrezco al mundo?"               │
│  remotes   → "¿A quién le pido código?"             │
│  shared    → "¿Qué dependencias compartimos?"       │
└─────────────────────────────────────────────────────┘
```

**`name`** — El identificador único de esta app en el sistema de federación. El Shell lo usa para construir la URL de importación.

**`exposes`** — Los módulos que este MF pone a disposición. Es el "contrato público":
```js
exposes: {
  "./Dashboard": "./src/Dashboard.jsx"
  // clave pública  → archivo real
}
```

**`remotes`** — Los MFs de los que querés consumir módulos. Le decís a Webpack "cuando alguien importe `mfCart/CartApp`, buscalo acá":
```js
remotes: {
  mfCart: "mfCart@http://localhost:3001/remoteEntry.js"
  // alias   nombre  URL del manifiesto
}
```

**`shared`** — Las dependencias que NO querés duplicar. Más sobre esto en la sección 3.

### Cómo se ve en este proyecto

```js
// shell/webpack.config.js — es el HOST, no expone nada, solo consume
new ModuleFederationPlugin({
  name: "shell",
  remotes: {
    mfDashboard: "mfDashboard@http://localhost:4200/remoteEntry.js",
    mfCart:      "mfCart@http://localhost:3001/remoteEntry.js",
    mfTopbar:    "mfTopbar@http://localhost:3002/remoteEntry.js",
  },
  shared: {
    react:      { singleton: true, strictVersion: false },
    "react-dom": { singleton: true, strictVersion: false },
  },
})

// mf-cart/webpack.config.js — es un REMOTE, expone CartApp
new ModuleFederationPlugin({
  name: "mfCart",
  filename: "remoteEntry.js",   // ← el manifiesto que el Shell va a buscar
  exposes: {
    "./CartApp": "./src/CartApp.jsx",
  },
  shared: {
    react:      { singleton: true, strictVersion: false },
    "react-dom": { singleton: true, strictVersion: false },
  },
})
```

### ¿Qué es `remoteEntry.js`?

Es un archivo generado automáticamente por Webpack. Es el **manifiesto del MF**:
- Lista qué módulos expone
- Lista qué versiones de dependencias compartidas tiene disponibles
- Le dice al Host "tengo React 18.2.0 y ofrezco CartApp"

Cuando el Shell hace `import("mfCart/CartApp")`, primero descarga `remoteEntry.js` de `localhost:3001`, lo lee, negocia las versiones compartidas, y luego descarga solo el código de CartApp.

```
Shell                           mf-cart (:3001)
  │                                   │
  │── GET /remoteEntry.js ───────────>│
  │<── { exposes: CartApp, react: 18.2.0 } ─│
  │                                   │
  │── GET /CartApp.chunk.js ─────────>│
  │<── (código del componente) ───────│
  │                                   │
  │  monta CartApp en el DOM          │
```

---

## 3. Dependencias Compartidas — El tema más importante

### El problema sin `shared`

Si no configurás nada, cada MF trae su propia copia de React:

```
Shell          → bundle incluye React 18.2.0 (45kb)
mf-dashboard   → bundle incluye React 18.2.0 (45kb) ← duplicado
mf-cart        → bundle incluye React 18.2.0 (45kb) ← duplicado
```

El navegador descarga React 3 veces. Pero hay algo peor: **dos copias de React en el mismo runtime rompe el sistema de hooks**. React usa referencias de objeto internas para `useState`, `useEffect`, etc. Si hay dos instancias, los hooks de un MF no son reconocidos por el otro.

### La solución: `singleton: true`

```js
shared: {
  react: { singleton: true, strictVersion: false },
  "react-dom": { singleton: true, strictVersion: false },
}
```

Con esto, Webpack negocia en runtime: "¿quién tiene React? — yo tengo 18.2.0 — yo también — bien, usamos UNA sola instancia". Solo se descarga una vez, todos la comparten.

### `singleton: true` vs `strictVersion`

| Opción | Significado | Cuándo usarla |
|--------|-------------|---------------|
| `singleton: true` | Solo puede existir UNA instancia | Siempre para React, ReactDOM |
| `strictVersion: false` | Si hay mismatch de versión, avisa pero NO rompe | Durante desarrollo |
| `strictVersion: true` | Si hay mismatch, lanza error | En producción, cuando querés control total |

### ¿Quién tiene que instalar qué?

Esta es la pregunta más común. Regla simple:

**Cada app instala las dependencias que USA en su propio `package.json`.**

```
shell/package.json
  → react, react-dom  (el shell usa React para el router)

mf-dashboard/package.json
  → react, react-dom  (usa React para renderizar)

mf-cart/package.json
  → react, react-dom  (usa React para renderizar)

mf-topbar/package.json
  → (nada de React — es Vanilla JS)
```

Module Federation no elimina la instalación — elimina la **duplicación en runtime**. En desarrollo cada app tiene sus `node_modules`. En producción, Webpack negocia cuál versión se usa y la descarga una sola vez.

### ¿Qué pasa si las versiones no coinciden?

Con `strictVersion: false` (modo desarrollo): Webpack elige la versión más alta compatible y muestra un warning en consola. La app sigue funcionando.

Con `strictVersion: true` (modo producción): Webpack lanza un error si las versiones no son compatibles según semver. Fuerza a los equipos a mantener versiones alineadas.

### Cómo verificar que funciona (en el browser)

```js
// Abrí el DevTools en localhost:3000 y ejecutá:
console.log(window.__webpack_share_scopes__.default.react)

// Debería verse UNA entrada con loaded: true
// Si ves múltiples entradas → singleton roto
```

---

## 4. El Patrón Async Bootstrap — Por qué `index.js` tiene una sola línea

### El problema

Module Federation necesita inicializar el "shared scope" (la tabla de negociación de dependencias) **antes** de que cualquier módulo compartido se ejecute. Si `index.js` importa React directamente arriba:

```js
// ❌ MAL — React se consume antes de que MF negocie la versión
import React from "react";
import ReactDOM from "react-dom/client";
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

Webpack no tuvo tiempo de preguntar "¿hay alguien que ya tenga React? ¿usamos esa?". Resultado: cada MF carga su propia copia → singleton roto.

### La solución: entrada async

```js
// src/index.js — todo lo que tiene que estar acá
import("./bootstrap");
```

```jsx
// src/bootstrap.jsx — acá sí podés importar todo
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

El `import()` dinámico es **asíncrono**. Webpack aprovecha ese await para negociar el shared scope primero. Cuando `bootstrap.jsx` se ejecuta, ya sabe qué versión de React usar.

**Todas las apps de este proyecto usan este patrón**: Shell, mf-dashboard, mf-cart, mf-topbar.

---

## 5. El Contrato Mount/Unmount

### El problema

El Shell carga MFs de distintos frameworks. No puede asumir que todos usan `ReactDOM.render`. Necesita una interfaz común.

### La solución

Cada MF exporta una función `mount(element)` que:
1. Recibe un nodo del DOM
2. Renderiza el MF dentro de ese nodo
3. **Devuelve una función de limpieza** (unmount)

```js
// mf-cart/src/CartApp.jsx
export function mount(element) {
  const root = ReactDOM.createRoot(element);
  root.render(<CartApp />);
  return () => root.unmount(); // ← cleanup
}

// mf-topbar/src/TopbarElement.js (Vanilla JS)
export function mount(element) {
  element.innerHTML = `<nav>...</nav>`;
  return () => { element.innerHTML = ""; }; // ← cleanup
}
```

El Shell no sabe ni le importa si adentro hay React o Vanilla JS:

```js
// shell/src/bootstrap.js
const module = await import("mfCart/CartApp");
const unmount = module.mount(document.getElementById("app-root"));

// más tarde, al cambiar de ruta:
unmount(); // limpia sin saber qué había adentro
```

---

## 6. Routing en el Shell

El Shell maneja 2 rutas con ~20 líneas de Vanilla JS. No necesita React Router ni nada externo.

```js
const routes = {
  "/":     () => import("mfDashboard/Dashboard"),
  "/cart": () => import("mfCart/CartApp"),
};

async function navigate(path) {
  if (currentUnmount) currentUnmount(); // desmonta el MF anterior
  appRoot.innerHTML = "";

  const module = await (routes[path] || routes["/"])();
  currentUnmount = module.mount(appRoot);
}

// Intercepta clicks en links con data-link
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    e.preventDefault();
    history.pushState(null, "", new URL(link.href).pathname);
    navigate(location.pathname);
  }
});

window.addEventListener("popstate", () => navigate(location.pathname));
navigate(location.pathname); // ruta inicial
```

El topbar se monta una sola vez al arrancar, fuera del router, porque siempre está visible.

---

## 7. Comunicación entre MFs — Custom Events

### El problema

El botón "Agregar" está en mf-dashboard. El carrito está en mf-cart. Son procesos distintos. No hay props, no hay contexto compartido.

### La solución

Custom Events de browser sobre `window`. Es el pub/sub más simple que existe y funciona entre cualquier framework:

```js
// mf-dashboard: dispara el evento
window.dispatchEvent(
  new CustomEvent("pokemon:selected", {
    detail: { id: 25, name: "Pikachu", price: 25 }
  })
);

// mf-cart: escucha el evento (aunque no esté montado)
window.addEventListener("pokemon:selected", (e) => {
  cartStore.addItem(e.detail);
});
```

**Ventaja**: Cero acoplamiento. mf-dashboard no importa nada de mf-cart. Si mañana el carrito cambia de React a Vue, el evento sigue siendo el mismo string `"pokemon:selected"`.

### Gotcha crítico en el listener cleanup

```js
// ❌ MAL — el removeEventListener no funciona
function listen(eventName, handler) {
  window.addEventListener(eventName, (e) => handler(e.detail)); // wrapper anónimo
  return () => window.removeEventListener(eventName, handler);  // ← elimina handler, no el wrapper
}

// ✅ BIEN — guardá la referencia al wrapper
function listen(eventName, handler) {
  const wrapper = (e) => handler(e.detail);
  window.addEventListener(eventName, wrapper);
  return () => window.removeEventListener(eventName, wrapper); // ← elimina el wrapper
}
```

`removeEventListener` necesita la **misma referencia de función** que se pasó a `addEventListener`. Un wrapper anónimo nuevo no es la misma referencia.

### Gotcha de carga lazy

El listener de `pokemon:selected` en mf-cart está a nivel de módulo. Pero Module Federation carga los módulos **lazy** (solo cuando navegás a esa ruta). Si mf-cart nunca se cargó, el listener no existe.

**Fix**: el Shell importa mf-cart eagerly al arrancar:

```js
// shell/src/bootstrap.js
async function bootstrap() {
  await mountTopbar();
  import("mfCart/CartApp"); // fire-and-forget — solo para registrar los listeners
  navigate(location.pathname);
}
```

---

## 8. Estado Global y Persistencia

### Estado cross-route con un store module-level

React `useState` muere cuando el componente se desmonta. Si el usuario va de `/cart` a `/` y vuelve, el carrito se vaciaría.

La solución es un **singleton a nivel de módulo** — un objeto que vive en la memoria del módulo, fuera de cualquier componente:

```js
// mf-cart/src/CartApp.jsx — fuera de cualquier función/componente
const cartStore = {
  items: [],        // ← no es estado de React, es un objeto JS plano
  listeners: new Set(),

  addItem(pokemon) { /* modifica items */ this.notify(); },
  subscribe(cb)    { this.listeners.add(cb); return () => this.listeners.delete(cb); },
  notify()         { this.listeners.forEach(cb => cb()); },
};
```

El componente React **se suscribe** al store con `useEffect`:

```jsx
function CartApp() {
  const [items, setItems] = useState(cartStore.items);

  useEffect(() => {
    return cartStore.subscribe(() => setItems([...cartStore.items]));
  }, []);
}
```

Cuando el componente se desmonta, el store sigue en memoria. Cuando vuelve a montar, lee el estado actual del store.

### Persistencia con localStorage

Para sobrevivir a un refresh de página, el store guarda en localStorage:

```js
const STORAGE_KEY = "mf_cart_items";

const cartStore = {
  items: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"), // carga al iniciar

  notify() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); // guarda en cada cambio
    this.listeners.forEach(cb => cb());
    dispatch("cart:updated", { items: this.items, totalCount: ... });
  }
};
```

**Flujo completo tras un refresh**:
1. Shell carga → importa mfCart/CartApp (eager)
2. `cartStore.items = JSON.parse(localStorage.getItem("mf_cart_items"))` → items restaurados
3. El store dispara `cart:updated` con `setTimeout(0)` → topbar recibe el estado inicial
4. Usuario navega a `/cart` → CartApp monta → lee `cartStore.items` → muestra los items persistidos

---

## 9. Puertos y Comandos

| App | Puerto | Arrancar solo | Arrancar todo |
|-----|--------|---------------|---------------|
| Shell | 3000 | `npm run start --workspace=shell` | |
| mf-dashboard | 4200 | `npm run start --workspace=mf-dashboard` | |
| mf-cart | 3001 | `npm run start --workspace=mf-cart` | `npm run start:all` |
| mf-topbar | 3002 | `npm run start --workspace=mf-topbar` | |

Cada MF puede correr **de forma aislada** en su puerto. El Shell necesita que los 3 MFs estén corriendo para funcionar completo.

---

## 10. Stack Tecnológico

| Pieza | Tecnología | Por qué |
|-------|------------|---------|
| Bundler | Webpack 5 | Soporte nativo de Module Federation |
| Shell | React 19 | Framework del host (podría ser Vanilla JS igual) |
| mf-dashboard | React 19 | Componentes con estado para filtros |
| mf-cart | React 19 | Estado complejo del carrito |
| mf-topbar | Vanilla JS | Demostración: Module Federation es agnóstico al framework |
| Comunicación | Custom Events | Nativo del browser, cero dependencias |
| Persistencia | localStorage | Simple, sin backend, sobrevive al refresh |

---

## 11. Gotchas y Lecciones Aprendidas

### 1. npm workspaces + versiones conflictivas
Si `npm install` falla con errores de peer dependencies, usá `--legacy-peer-deps`. Los workspaces a veces tienen conflictos entre versiones de paquetes que se resuelven así.

### 2. `publicPath` debe ser URL absoluta
```js
// webpack.config.js
output: {
  publicPath: "http://localhost:3001/", // ← siempre URL absoluta
}
```
Sin esto, los chunks del MF se buscan en la URL del Shell (localhost:3000) en vez del MF (localhost:3001). Todo falla silenciosamente.

### 3. CORS en el dev server
```js
devServer: {
  headers: { "Access-Control-Allow-Origin": "*" }
}
```
El Shell carga archivos desde otros puertos → cross-origin. Sin estos headers, el browser bloquea las requests.

### 4. `historyApiFallback: true` solo en el Shell
El Shell maneja routing client-side (History API). Si el usuario refresca en `/cart`, el browser pide `GET /cart` al servidor. `historyApiFallback: true` le dice al dev server que sirva `index.html` para cualquier ruta desconocida.

### 5. El `name` del plugin DEBE coincidir con el prefijo en `remotes`
```js
// mf-cart/webpack.config.js
name: "mfCart"  // ← debe coincidir con...

// shell/webpack.config.js
remotes: {
  mfCart: "mfCart@..."  // ← ...este prefijo
}

// y con las importaciones en código:
import("mfCart/CartApp")  // ← mismo prefijo
```
Si no coinciden, Module Federation no encuentra el módulo y falla silenciosamente.

---

## 12. Pre-carga Eager vs Carga Lazy — ¿Cuándo importar al arranque?

Module Federation carga los módulos **lazy por defecto**: un MF solo se descarga y ejecuta cuando el código lo importa por primera vez. Eso normalmente está perfecto — no querés cargar lo que no se necesita.

Pero hay un caso donde la carga lazy te rompe la app.

### El problema

`mf-cart/src/CartApp.jsx` registra su listener a nivel de módulo:

```js
// mf-cart/src/CartApp.jsx — ejecuta al cargar el módulo, no al montar el componente
listen("pokemon:selected", (pokemon) => {
  cartStore.addItem(pokemon);
});
```

Si el usuario arranca en `/`, hace click en "Agregar", y **nunca navegó a `/cart`** — ese módulo no fue cargado. El listener no existe. El evento `pokemon:selected` se dispara y nadie lo escucha. El carrito queda vacío.

### La solución

El Shell importa mf-cart al arrancar, como fire-and-forget:

```js
// shell/src/bootstrap.js
async function bootstrap() {
  setupNavigation();
  await mountTopbar();
  import("mfCart/CartApp"); // ← sin await, sin .then() — solo para inicializar el módulo
  navigate(location.pathname);
}
```

No se monta nada, no se renderiza nada. Solo se carga el módulo para que sus efectos de nivel superior se ejecuten.

### La regla

| MF | ¿Se pre-carga eager? | Razón |
|----|----------------------|-------|
| `mfCart` | Sí | Tiene `listen("pokemon:selected")` a nivel de módulo — necesita estar activo desde el arranque |
| `mfDashboard` | No | No tiene efectos secundarios globales — se carga cuando el usuario navega a `/` |
| `mfTopbar` | Sí (via `mountTopbar`) | Se renderiza en todas las rutas, se monta una vez al inicio |

La pre-carga no es sobre UI — es sobre **efectos secundarios que necesitan estar vivos desde el primer momento**.
