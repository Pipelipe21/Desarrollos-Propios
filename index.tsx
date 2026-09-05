import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// If the app has been open since before a new version was deployed, a
// lazy-loaded chunk (e.g. the barcode scanner, opened for the first time
// hours into a shift) can reference a hashed file that no longer exists on
// the server. Vite dispatches this event when that happens — reload once to
// pick up the new version instead of leaving the feature stuck broken.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
