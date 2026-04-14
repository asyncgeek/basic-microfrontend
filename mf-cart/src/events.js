export const EVENTS = {
  POKEMON_SELECTED: "pokemon:selected",
  CART_UPDATED: "cart:updated",
  CART_CLEARED: "cart:cleared",
};

export function dispatch(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function listen(eventName, handler) {
  const wrapper = (e) => handler(e.detail);
  window.addEventListener(eventName, wrapper);
  return () => window.removeEventListener(eventName, wrapper);
}
