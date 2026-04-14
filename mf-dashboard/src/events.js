export function dispatch(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
