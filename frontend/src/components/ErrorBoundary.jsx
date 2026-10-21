import { Component } from "react";

// Last line of defence: if a render throws, show a way out instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="notfound">
        <div className="eyebrow">Something broke</div>
        <h1>Sorry, this page crashed.</h1>
        <p>
          <button className="btn" onClick={() => window.location.assign("/")}>
            Reload the app
          </button>
        </p>
      </div>
    );
  }
}
