import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, source, lineno, colno, error) {
  const errDiv = document.createElement('div');
  errDiv.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:red;color:white;z-index:9999;padding:2rem;font-size:1.5rem;overflow:auto;";
  errDiv.innerHTML = `<h1>Global Error</h1><p>${msg}</p><pre>${error ? error.stack : ''}</pre>`;
  document.body.appendChild(errDiv);
};
window.onunhandledrejection = function(event) {
  const errDiv = document.createElement('div');
  errDiv.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:orange;color:black;z-index:9999;padding:2rem;font-size:1.5rem;overflow:auto;";
  errDiv.innerHTML = `<h1>Unhandled Promise Rejection</h1><p>${event.reason}</p><pre>${event.reason && event.reason.stack ? event.reason.stack : ''}</pre>`;
  document.body.appendChild(errDiv);
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#111', color: '#ff5555', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Click for error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
