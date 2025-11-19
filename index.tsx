import React from 'react';
import './src/index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { initGeminiForDevelopment } from './src/lib/gemini-dev-init';
import ErrorBoundary from './src/components/ErrorBoundary';

// Initialize Gemini API for development (no-op in production)
initGeminiForDevelopment();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);