import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // autoUpdate 대신 prompt 사용
      includeAssets: ['favicon.ico', 'pwa_logo.png', 'logo.svg'],
      manifest: {
        name: '올바른 전자기기 사용 관리 시스템',
        short_name: 'DeviceCheck',
        description: '올바른 전자기기 사용 관리 시스템',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa_logo.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  base: '/',
  server: {
    port: 3080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-firebase': ['firebase'],
          // Dashboard chunks (코드 스플리팅)
          'dashboard-admin': ['./src/pages/AdminDashboard'],
          'dashboard-homeroom': ['./src/pages/HomeroomTeacherDashboard'],
          'dashboard-subject': ['./src/pages/SubjectTeacherDashboard'],
          'dashboard-student': ['./src/pages/StudentDashboard'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
