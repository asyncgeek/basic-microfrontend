import React from "react";
import ReactDOM from "react-dom/client";
import CartApp from "./CartApp";

const rootElement = document.getElementById("cart-root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<CartApp />);
}
