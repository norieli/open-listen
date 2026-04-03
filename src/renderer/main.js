import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import api from './utils/api'
import './assets/main.css'

const app = createApp(App)

// 初始化数据库并注入 API
api.initApp().then(() => {
  // 将 API 注入到全局
  app.config.globalProperties.$api = api
  window.api = api

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}).catch(err => {
  console.error('Failed to initialize app:', err)
  // 即使初始化失败也启动应用
  app.config.globalProperties.$api = api
  window.api = api

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
})