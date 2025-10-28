import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Set up CSP meta tag
const cspMeta = document.createElement('meta');
cspMeta.httpEquiv = 'Content-Security-Policy';
cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https:; worker-src 'self' blob:;";
document.head.appendChild(cspMeta);

// Set up viewport meta tag
const viewportMeta = document.createElement('meta');
viewportMeta.name = 'viewport';
viewportMeta.content = 'width=device-width, initial-scale=1.0';
document.head.appendChild(viewportMeta);

// Set up theme color
const themeMeta = document.createElement('meta');
themeMeta.name = 'theme-color';
themeMeta.content = '#1f2937';
document.head.appendChild(themeMeta);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);