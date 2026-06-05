import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
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
                <Route path="/terms" element={<Navigate to="/?legal=open" replace />} />
                <Route path="/settings" element={<Navigate to="/?open=settings" replace />} />
                <Route path="/social" element={<Navigate to="/?open=social" replace />} />
                <Route path="/*" element={<App />} />
              </Routes>
            </DisclaimerGate>
          </SocialProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
