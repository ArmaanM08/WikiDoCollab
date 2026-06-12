import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './pages/App.jsx';
import './styles.css';
import { MantineProvider } from '@mantine/core';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <MantineProvider withNormalizeCSS withGlobalStyles>
      <App />
    </MantineProvider>
  </BrowserRouter>
);
