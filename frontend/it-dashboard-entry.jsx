import React from "react";
import { getSavedUser } from "./backendApi.js";
import ReactDOM from "react-dom/client";
import App from "./src/It- dashboard/ITDashboard";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App user={getSavedUser() || undefined} />
  </React.StrictMode>,
);