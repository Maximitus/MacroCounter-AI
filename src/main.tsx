import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Outlet, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import TermsPage from './TermsPage.tsx';
import {DisclaimerFooter, DisclaimerGate} from './Disclaimer.tsx';
import './index.css';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

function AppShell() {
  return (
    <>
      <Outlet />
      <DisclaimerFooter />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <DisclaimerGate>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<App />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>
        </Routes>
      </DisclaimerGate>
    </BrowserRouter>
  </StrictMode>,
);
