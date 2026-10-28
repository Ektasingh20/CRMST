import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import PasswordResetPage from "./src/PasswordResetPage.jsx";
import "./styles.css";

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {window.location.pathname.replace(/\/+$/, "") === "/password-reset" ? <PasswordResetPage /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
