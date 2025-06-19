import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './app/popup/page';
import './app/globals.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  }
});

// Also try to render immediately in case DOM is already ready
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already ready
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  }
} 