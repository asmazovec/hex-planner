import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './ui/theme.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/common/ErrorBoundary';
import { applyBlur } from './ui/common/blur';

applyBlur();

// Without an update handler the new version simply waits for the next opening.
if (import.meta.env.PROD) registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
