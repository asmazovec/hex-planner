import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './ui/theme.css';
import { registerSW } from 'virtual:pwa-register';
import { readShareLink } from './domain/shareLink';
import { useGame } from './state/gameStore';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/common/ErrorBoundary';
import { applyBlur } from './ui/common/blur';

applyBlur();
// While a game is open the address tells about it (see App); until then what is read is not kept there.
const link = window.location.search;
if (readShareLink(link)) window.history.replaceState(null, '', window.location.pathname);
void useGame.getState().openShareLink(link);

// Without an update handler the new version simply waits for the next opening.
if (import.meta.env.PROD) registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
