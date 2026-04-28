import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "./styles.css";
import { AmbulanceMobileApp } from './app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <AmbulanceMobileApp />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
