import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import TermsPage from './TermsPage.tsx';
import {AuthProvider} from './auth/AuthContext.tsx';
import {DisclaimerGate} from './Disclaimer.tsx';
import {SocialProvider} from './social/SocialContext.tsx';
import {ThemeProvider} from './theme.tsx';
import './index.css';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider>
        <AuthProvider>
          <SocialProvider>
            <DisclaimerGate>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/terms" element={<TermsPage />} />
              </Routes>
            </DisclaimerGate>
          </SocialProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
