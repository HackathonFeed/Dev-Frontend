import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

document.documentElement.style.colorScheme = 'light';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

const tree = (
  <AuthProvider>
    <App />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider> : tree,
);
