import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

// 主色を紺に寄せた Aura（提案資料と同じトーン）
const Navy = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#6f86d6',
      500: '#243f9b', 600: '#1f3687', 700: '#1a2e73', 800: '#152663', 900: '#0f1c4a', 950: '#0a1233',
    },
  },
});

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  ssr: false, // 管理画面と QR 画面はブラウザ専用（位置情報・印刷・地図を使う）
  modules: ['@primevue/nuxt-module', '@nuxtjs/tailwindcss'],
  css: ['primeicons/primeicons.css', 'leaflet/dist/leaflet.css', '~/assets/css/main.css'],
  primevue: {
    options: { theme: { preset: Navy, options: { darkModeSelector: false } } },
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://angkor-byte.github.io/qr-manual-mvp/app', // QR ラベルに印字する URL の先頭（NUXT_PUBLIC_SITE_URL）
    },
  },
  app: {
    head: {
      title: '重機QR 安全マニュアル管理',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      htmlAttrs: { lang: 'ja' },
    },
  },
});
