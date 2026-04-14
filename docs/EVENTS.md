# Custom Events Contract

All MFs communicate via native Browser Custom Events dispatched on `window`.

## Event List

| Event | Emitted By | Listened By | Payload |
|-------|------------|-------------|---------|
| `pokemon:selected` | mf-dashboard | mf-cart, mf-topbar | `{id, name, image, price}` |
| `cart:updated` | mf-cart | mf-topbar | `{items[], totalCount, totalPrice}` |
| `cart:cleared` | mf-cart | mf-topbar | — |

---

## `pokemon:selected`

Fired when user clicks "Agregar" button on a Pokemon card in the dashboard.

### When
User clicks "Agregar" button → dispatches `pokemon:selected`

### Payload

```typescript
interface PokemonSelectedPayload {
  id: number;      // Pokemon ID (also used as price)
  name: string;    // Pokemon name
  image: string;   // URL to sprite image
  price: number;   // Same as id (Pokemon #3 = $3)
}
```

### Example

```js
// In mf-dashboard (React)
dispatch("pokemon:selected", {
  id: 25,
  name: "pikachu",
  image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  price: 25  // price = id
});
```

### Who Listens
- **mf-cart**: Receives the selected Pokemon to add to cart (global store)
- **mf-topbar**: Could show a notification/toast (future enhancement)

---

## `cart:updated`

Fired when cart contents change (item added, quantity changed, item removed).

### When
- User adds a Pokemon from dashboard
- User changes quantity in cart
- User removes an item from cart

### Payload

```typescript
interface CartItem {
  id: number;      // Pokemon ID
  name: string;    // Pokemon name
  image: string;    // Sprite URL
  price: number;    // Price per unit (= id)
  qty: number;      // Quantity (always >= 1)
}

interface CartUpdatedPayload {
  items: CartItem[];      // Full cart contents
  totalCount: number;     // Sum of all qty values
  totalPrice: number;     // Sum of (price * qty)
}
```

### Example

```js
// In mf-cart (React)
dispatch("cart:updated", {
  items: [
    { id: 25, name: "pikachu", image: "...", price: 25, qty: 2 },
    { id: 6, name: "charizard", image: "...", price: 6, qty: 1 }
  ],
  totalCount: 3,
  totalPrice: 56  // 25*2 + 6*1
});
```

### Who Listens
- **mf-topbar**: Updates the cart badge count in the header

---

## `cart:cleared`

Fired when user empties the entire cart.

### When
User clicks "Vaciar carrito" button.

### Payload
None — empty detail object `{}`.

### Example

```js
// In mf-cart (React)
dispatch("cart:cleared");
```

### Who Listens
- **mf-topbar**: Resets cart badge to 0

---

## Event Constants

```js
// In shell/src/events.js
export const EVENTS = {
  POKEMON_SELECTED: 'pokemon:selected',
  CART_UPDATED: 'cart:updated',
  CART_CLEARED: 'cart:cleared'
};
```

## Helper Utilities

### Dispatch Helper

```js
export function dispatch(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
```

### Listen Helper

```js
// IMPORTANT: store the wrapper reference — removeEventListener requires
// the exact same function reference passed to addEventListener.
export function listen(eventName, handler) {
  const wrapper = (e) => handler(e.detail);
  window.addEventListener(eventName, wrapper);
  return () => window.removeEventListener(eventName, wrapper); // removes wrapper, not handler
}
```

> **Gotcha**: Si usás `(e) => handler(e.detail)` como wrapper anónimo pero intentás remover `handler`, el `removeEventListener` no hace nada — son referencias distintas. Siempre guardá el wrapper en una variable antes de pasarlo.

---

## Global Cart Store + Persistencia

El carrito usa un store global (`cartStore`) en `mf-cart/src/CartApp.jsx` con dos responsabilidades:

1. **Estado en memoria**: acepta suscriptores (React components) y notifica cambios
2. **Persistencia en localStorage**: guarda y carga items bajo la clave `mf_cart_items`

Esto resuelve dos problemas:
- El evento `pokemon:selected` se captura aunque no estés en `/cart` (módulo cargado eagerly por el shell)
- El carrito sobrevive a un refresh de página (localStorage)

```js
const STORAGE_KEY = "mf_cart_items";

const cartStore = {
  items: loadFromStorage(), // ← inicializa desde localStorage al cargar el módulo

  addItem(pokemon) { /* modifica items, llama notify() */ },
  removeItem(id)   { /* modifica items, llama notify() */ },
  clear()          { /* items = [], llama notify()     */ },

  notify() {
    saveToStorage(this.items); // ← persiste en cada cambio
    const state = { items: [...this.items], totalCount, totalPrice };
    this.listeners.forEach(cb => cb(state));
    dispatch("cart:updated", state);
  }
};
```

### Inicialización del badge (topbar) tras refresh

Cuando el shell carga y el módulo cart se inicializa (eager), si hay items en localStorage se dispara un `cart:updated` con `setTimeout(0)` para que el topbar reciba el estado inicial antes de que el usuario interactúe:

```js
if (cartStore.items.length > 0) {
  setTimeout(() => {
    dispatch("cart:updated", {
      items: [...cartStore.items],
      totalCount: cartStore.getTotalCount(),
      totalPrice: cartStore.getTotalPrice(),
    });
  }, 0);
}
```

---

## Carga Eager del Módulo Cart (shell)

El módulo `mfCart/CartApp` se importa eagerly desde `shell/src/bootstrap.js` al arrancar, ANTES de cualquier navegación:

```js
// shell/src/bootstrap.js
async function bootstrap() {
  setupNavigation();
  await mountTopbar();
  // Carga el módulo cart para registrar sus listeners globales desde el inicio.
  // Sin esto, pokemon:selected se pierde si el usuario nunca visitó /cart.
  import("mfCart/CartApp").catch(err => console.error("Failed to preload cart:", err));
  navigate(location.pathname);
}
```

**Por qué es necesario**: Module Federation carga los módulos de forma lazy (solo cuando se navega a la ruta). Si el listener de `pokemon:selected` está a nivel de módulo en `CartApp.jsx`, no se registra hasta que el módulo se carga. Sin la carga eager, los clicks en "Agregar" se pierden hasta que el usuario visita `/cart` al menos una vez.

---

## Payload Summary

| Event | Required Fields |
|-------|----------------|
| `pokemon:selected` | `id`, `name`, `image`, `price` |
| `cart:updated` | `items[]`, `totalCount`, `totalPrice` |
| `cart:cleared` | — (none) |

## Testing Events

```js
// Listen in browser console
window.addEventListener('pokemon:selected', e => console.log('Selected:', e.detail));
window.addEventListener('cart:updated', e => console.log('Cart:', e.detail));
window.addEventListener('cart:cleared', () => console.log('Cart cleared!'));

// Dispatch manually
dispatch("pokemon:selected", { id: 25, name: "pikachu", image: "...", price: 25 });
```
