import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Something went wrong.",
    };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            margin: "24px",
            padding: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(218, 203, 181, 0.88)",
            background: "rgba(255, 255, 255, 0.92)",
            color: "#1f1a17",
          }}
          role="alert"
        >
          <strong style={{ display: "block", marginBottom: "8px" }}>
            This section ran into an error.
          </strong>
          <span style={{ display: "block", marginBottom: "14px", color: "#675d55" }}>
            {this.state.message}
          </span>
          <button type="button" className="ghost-button compact" onClick={this.handleRetry} style={{ marginRight: "8px" }}>
            Try again
          </button>
          <button type="button" className="ghost-button compact" onClick={this.handleReload}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
