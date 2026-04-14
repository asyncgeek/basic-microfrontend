const routes = {
  "/": () => import("mfDashboard/Dashboard"),
  "/cart": () => import("mfCart/CartApp"),
};

const appRoot = document.getElementById("app-root");
let currentUnmount = null;

async function navigate(path) {
  if (currentUnmount) {
    const unmount = currentUnmount;
    currentUnmount = null;
    if (typeof unmount === "function") {
      unmount();
    }
  }
  appRoot.innerHTML = "";

  const loader = routes[path] || routes["/"];
  try {
    const module = await loader();
    if (module.mount) {
      currentUnmount = await module.mount(appRoot);
    } else if (module.default) {
      const Component = module.default;
      const { createRoot } = require("react-dom/client");
      const container = document.createElement("div");
      appRoot.appendChild(container);
      const root = createRoot(container);
      root.render(React.createElement(Component));
      currentUnmount = () => root.unmount();
    }
  } catch (err) {
    console.error("Failed to load module:", err);
  }
}

function setupNavigation() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
      e.preventDefault();
      const path = new URL(link.href).pathname;
      history.pushState(null, "", path);
      navigate(path);
    }
  });

  window.addEventListener("popstate", () => {
    navigate(location.pathname);
  });
}

async function mountTopbar() {
  try {
    const { mount } = await import("mfTopbar/TopbarElement");
    mount(document.getElementById("topbar-root"));
  } catch (err) {
    console.error("Failed to mount topbar:", err);
  }
}

async function bootstrap() {
  setupNavigation();
  await mountTopbar();
  // Eagerly load the cart module so its store and event listeners are
  // initialized from the start — even before the user navigates to /cart.
  import("mfCart/CartApp").catch((err) =>
    console.error("Failed to preload cart module:", err)
  );
  navigate(location.pathname);
}

bootstrap();
