export function mount(element) {
  let cartCount = 0;

  const container = document.createElement("div");
  container.className = "topbar";
  container.innerHTML = `
    <nav class="topbar-nav">
      <a href="/" data-link class="nav-brand">Pokemon Store</a>
      <div class="nav-links">
        <a href="/" data-link>Dashboard</a>
        <a href="/cart" data-link class="cart-link">
          Cart <span id="cart-count" class="badge">0</span>
        </a>
      </div>
    </nav>
  `;
  element.appendChild(container);

  const badge = container.querySelector("#cart-count");

  function updateBadge(count) {
    cartCount = count;
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }

  function onCartUpdated(e) {
    updateBadge(e.detail.totalCount);
  }

  function onCartCleared() {
    updateBadge(0);
  }

  window.addEventListener("cart:updated", onCartUpdated);
  window.addEventListener("cart:cleared", onCartCleared);

  return () => {
    window.removeEventListener("cart:updated", onCartUpdated);
    window.removeEventListener("cart:cleared", onCartCleared);
    element.innerHTML = "";
  };
}
