import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MediaProvider } from '@foto-owl/media-react';
import { App } from './App.js';
import './app.css';

/**
 * Entry point — wraps the entire app in <MediaProvider>.
 *
 * API key handling:
 * - The key is passed to <MediaProvider> which forwards it to createClient().
 * - It is never stored in component state, localStorage, or passed as a prop
 *   to any component below App.
 *
 * Assignment constraint: Pexels is called directly from the browser.
 * A production app would proxy this through a server-side API route.
 */
const apiKey = import.meta.env['VITE_PEXELS_API_KEY'] as string | undefined;


if (!apiKey) {
  throw new Error(
    'VITE_PEXELS_API_KEY is not set. Create a .env file in apps/demo/ with:\n' +
    'VITE_PEXELS_API_KEY=your_pexels_api_key_here'
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <MediaProvider apiKey={apiKey}>
      <App />
    </MediaProvider>
  </StrictMode>
);
