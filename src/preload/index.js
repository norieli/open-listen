import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('api', {
  // 节目管理
  episodes: {
    getAll: () => ipcRenderer.invoke('episodes:getAll'),
    getById: (id) => ipcRenderer.invoke('episodes:getById', id),
    add: (episode) => ipcRenderer.invoke('episodes:add', episode),
    delete: (id) => ipcRenderer.invoke('episodes:delete', id),
    updateQuestions: (id, questions) => ipcRenderer.invoke('episodes:updateQuestions', { id, questions })
  },

  // 用户进度
  progress: {
    get: (episodeId) => ipcRenderer.invoke('progress:get', episodeId),
    save: (data) => ipcRenderer.invoke('progress:save', data)
  },

  // 错题本
  wrongAnswers: {
    add: (data) => ipcRenderer.invoke('wrongAnswers:add', data),
    getAll: () => ipcRenderer.invoke('wrongAnswers:getAll'),
    delete: (id) => ipcRenderer.invoke('wrongAnswers:delete', id),
    updateReviewCount: (id) => ipcRenderer.invoke('wrongAnswers:updateReviewCount', id),
    updateReview: (data) => ipcRenderer.invoke('wrongAnswers:updateReview', data),
    getDue: () => ipcRenderer.invoke('wrongAnswers:getDue')
  },

  // 收藏
  favorites: {
    add: (episodeId) => ipcRenderer.invoke('favorites:add', episodeId),
    remove: (episodeId) => ipcRenderer.invoke('favorites:remove', episodeId),
    getAll: () => ipcRenderer.invoke('favorites:getAll')
  },

  // 生词本
  vocabulary: {
    add: (data) => ipcRenderer.invoke('vocabulary:add', data),
    getAll: () => ipcRenderer.invoke('vocabulary:getAll'),
    delete: (id) => ipcRenderer.invoke('vocabulary:delete', id),
    updateReview: (data) => ipcRenderer.invoke('vocabulary:updateReview', data),
    getDue: () => ipcRenderer.invoke('vocabulary:getDue')
  },

  // 文件对话框
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },

  // 读取文件为Base64
  readFileAsBase64: (filePath) => ipcRenderer.invoke('file:readAsBase64', filePath),

  // 数据库管理
  database: {
    backup: () => ipcRenderer.invoke('database:backup'),
    restore: () => ipcRenderer.invoke('database:restore'),
    clear: () => ipcRenderer.invoke('database:clear')
  },

  // 学习统计
  stats: {
    get: () => ipcRenderer.invoke('stats:get')
  },

  // AI 功能
  ai: {
    testConnection: (options) => ipcRenderer.invoke('ai:testConnection', options),
    chat: (options) => ipcRenderer.invoke('ai:chat', options),
    generateQuestions: (options) => ipcRenderer.invoke('ai:generateQuestions', options),
    lookupWord: (options) => ipcRenderer.invoke('ai:lookupWord', options)
  }
})