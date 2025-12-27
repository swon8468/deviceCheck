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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 캐시 전략: NetworkFirst로 변경하여 항상 최신 버전 확인
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1시간 (더 짧게 설정)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.css$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1시간
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5분 (HTML은 더 짧게)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        skipWaiting: false, // 사용자 승인 후 업데이트
        clientsClaim: false,
        // Service Worker 업데이트 체크 주기 단축
        checkForUpdates: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
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
