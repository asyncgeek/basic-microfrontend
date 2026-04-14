import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { dispatch, listen } from "./events";

let root = null;
let container = null;

const STORAGE_KEY = "mf_cart_items";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const cartStore = {
  items: loadFromStorage(),
  listeners: new Set(),

  addItem(pokemon) {
    const existing = this.items.find((i) => i.id === pokemon.id);
    if (existing) {
      this.items = this.items.map((i) =>
        i.id === pokemon.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      this.items = [...this.items, { ...pokemon, qty: 1 }];
    }
    this.notify();
  },

  removeItem(id) {
    this.items = this.items
      .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
      .filter((i) => i.qty > 0);
    this.notify();
  },

  clear() {
    this.items = [];
    this.notify();
  },

  getTotalCount() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  getTotalPrice() {
    console.log(this.items)
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  notify() {
    saveToStorage(this.items);
    const state = {
      items: [...this.items],
      totalCount: this.getTotalCount(),
      totalPrice: this.getTotalPrice(),
    };
    this.listeners.forEach((cb) => cb(state));
    dispatch("cart:updated", state);
  },
};

function CartApp() {
  const [state, setState] = useState({
    items: cartStore.items,
    totalCount: cartStore.getTotalCount(),
    totalPrice: cartStore.getTotalPrice()
  });

  useEffect(() => {
    setState({
      items: cartStore.items,
      totalCount: cartStore.getTotalCount(),
      totalPrice: cartStore.getTotalPrice()
    });
    const unsubscribe = cartStore.subscribe(setState);
    return unsubscribe;
  }, []);

  const removeItem = (id) => cartStore.removeItem(id);
  const clearCart = () => cartStore.clear();

  return (
    <div style={{ padding: "20px" }}>
      <header style={{ background: "#ff9800", color: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <h1>Carrito de Compras</h1>
        <p>{state.totalCount} Pokémon en el carrito</p>
      </header>

      {state.items.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666" }}>Tu carrito está vacío</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {state.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  background: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <img src={item.image} alt={item.name} style={{ width: "50px", height: "50px" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ textTransform: "capitalize" }}>{item.name}</strong>
                  <p style={{ margin: 0, color: "#666" }}>${item.price} c/u</p>
                </div>
                <span style={{ fontWeight: "bold" }}>x{item.qty}</span>
                <span style={{ fontWeight: "bold", color: "#4caf50" }}>${item.price * item.qty}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    padding: "4px 8px",
                    background: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  -
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Total: ${state.totalPrice}</span>
            <button
              onClick={clearCart}
              style={{
                padding: "8px 16px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CartApp;

// Register listener at module scope so the cart store receives events
// regardless of whether CartApp is currently rendered.
// This runs once when the module is first loaded (eagerly from shell).
listen("pokemon:selected", (pokemon) => {
  cartStore.addItem(pokemon);
});

// On module load, if localStorage had items, broadcast the initial state
// so the topbar badge initializes correctly without waiting for interaction.
if (cartStore.items.length > 0) {
  setTimeout(() => {
    dispatch("cart:updated", {
      items: [...cartStore.items],
      totalCount: cartStore.getTotalCount(),
      totalPrice: cartStore.getTotalPrice(),
    });
  }, 0);
}

export function mount(element) {
  container = element;
  root = createRoot(element);
  root.render(<CartApp />);

  return () => {
    root?.unmount();
    root = null;
    container = null;
  };
}
