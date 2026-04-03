import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import api from './utils/api'
import './assets/main.css'

const app = createApp(App)

// 只有在非 Electron 环境下才初始化移动端 API
const isElectron = window.api && window.api.episodes && window.api.episodes.getAll

if (!isElectron) {
  // Capacitor 或其他移动端环境：初始化自己的 API
  api.initApp().then(() => {
    app.config.globalProperties.$api = api
    window.api = api

    app.use(createPinia())
    app.use(router)

    app.mount('#app')
  }).catch(err => {
    console.error('Failed to initialize app:', err)
    app.config.globalProperties.$api = api
    window.api = api

    app.use(createPinia())
    app.use(router)

    app.mount('#app')
  })
} else {
  // Electron 环境：直接使用 preload 定义的 window.api
  app.config.globalProperties.$api = window.api

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}