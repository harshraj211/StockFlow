import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

class FrontendErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="startup-error">
          <strong>StockFlow could not start</strong>
          <p>Refresh the page to restore the workspace.</p>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FrontendErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FrontendErrorBoundary>
  </React.StrictMode>
);
