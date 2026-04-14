import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import TermsPage from './TermsPage.tsx';
import {DisclaimerGate} from './Disclaimer.tsx';
import {ThemeProvider} from './theme.tsx';
import './index.css';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider>
        <DisclaimerGate>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </DisclaimerGate>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
