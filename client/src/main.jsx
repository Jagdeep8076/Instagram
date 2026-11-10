import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'remixicon/fonts/remixicon.css';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { SocketProvider } from './SocketContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);
