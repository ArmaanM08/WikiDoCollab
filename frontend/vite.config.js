import { defineConfig } from 'vite';
import path from 'path';

// Force single React copy by aliasing to the workspace node_modules
export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  }
});
