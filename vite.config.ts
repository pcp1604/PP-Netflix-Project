import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to access cwd() which might be missing from the Process type definition in this environment
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This allows the app to access process.env.API_KEY in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});