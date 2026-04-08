import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import "./app/index.css";
import { ConfirmProvider } from "./lib/confirm";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </React.StrictMode>,
);
