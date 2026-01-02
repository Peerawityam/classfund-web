import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },

      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'ClassFund ระบบเงินห้อง',
            short_name: 'ClassFund',
            description: 'ระบบเช็คชื่อและเก็บเงินห้องเรียน',
            theme_color: '#10b981', // สีเขียว Emerald
            background_color: '#ffffff',
            display: 'standalone', // ให้เต็มจอเหมือนแอปจริง
            start_url: '/',
            icons: [
              {
                src: 'pwa-192x192.png', // อย่าลืมหารูปมาใส่นะครับ
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png', // อย่าลืมหารูปมาใส่นะครับ
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});