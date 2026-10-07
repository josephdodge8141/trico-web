import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const portFromEnvironment = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port environment value: ${value}`);
  }
  return port;
};

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const backendPort = portFromEnvironment(environment.E2E_BACKEND_PORT, 3000);
  const proxy = {
    '/api': {
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: false,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: portFromEnvironment(environment.E2E_FRONTEND_PORT, 4173),
      proxy,
    },
    preview: {
      port: portFromEnvironment(environment.E2E_FRONTEND_PORT, 4173),
      proxy,
    },
  };
});
