import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
class ScreenBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('WealthLab screen error:', error.message);
  }
  render() {
    return this.state.failed ? (
      <div className="loading-state">
        <h2>This screen needs a fresh start.</h2>
        <p>Your saved records remain in storage. Reload to reopen your workspace.</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Reload WealthLab
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenBoundary>
      <App />
    </ScreenBoundary>
  </React.StrictMode>,
);
