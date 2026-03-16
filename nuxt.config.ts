export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  css: [
    '~/assets/css/variables.css',
    '~/assets/css/base.css',
  ],

  app: {
    head: {
      title: 'Clawless',
      meta: [
        { name: 'description', content: 'Clawless — OpenClaw without the server. No install. No API keys. Just a URL.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Mono:wght@400;700&display=swap',
        },
      ],
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
  },

  nitro: {
    preset: 'cloudflare_pages',
  },
})
