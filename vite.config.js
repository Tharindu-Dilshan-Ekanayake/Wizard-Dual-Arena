import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    // Optimize chunk size for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'physics': ['@react-three/rapier'],
          'socket': ['socket.io-client'],
        },
      },
    },
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
    },
    // Generate source maps for debugging (can be disabled in production)
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Set chunk size warning threshold
    chunkSizeWarningLimit: 500,
  },
  // CPU-only optimization
  define: {
    'process.env.REACT_APP_CPU_ONLY': true,
  },
});
