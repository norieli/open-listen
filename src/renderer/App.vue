<template>
  <div id="app" :class="{ 'is-mobile': isMobile }">
    <!-- 移动端顶部标题栏 -->
    <header class="mobile-header" v-if="isMobile">
      <span class="mobile-header-title">Open Listen AI</span>
      <router-link to="/settings" style="color: white;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </router-link>
    </header>

    <router-view />

    <PlayerBar ref="playerBar" />

    <!-- 移动端底部导航栏 -->
    <nav class="mobile-nav" v-if="isMobile">
      <div class="mobile-nav-content">
        <router-link to="/" class="mobile-nav-item" :class="{ active: $route.path === '/' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>首页</span>
        </router-link>
        <router-link to="/manage" class="mobile-nav-item" :class="{ active: $route.path === '/manage' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>课程</span>
        </router-link>
        <router-link to="/wrong-answers" class="mobile-nav-item" :class="{ active: $route.path === '/wrong-answers' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>错题</span>
        </router-link>
        <router-link to="/vocabulary" class="mobile-nav-item" :class="{ active: $route.path === '/vocabulary' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>生词</span>
        </router-link>
        <router-link to="/settings" class="mobile-nav-item" :class="{ active: $route.path === '/settings' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>设置</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PlayerBar from './components/PlayerBar.vue'

const isMobile = ref(false)
const playerBar = ref(null)

// 提供播放器访问
const getPlayerBar = () => playerBar.value

onMounted(() => {
  // 检测设备类型
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 暴露播放器到全局（必须在组件挂载后）
  window.playerBar = {
    setPlaylist: (episodes, index) => playerBar.value?.setPlaylist(episodes, index),
    getPlaylist: () => playerBar.value?.getPlaylist(),
    getCurrentIndex: () => playerBar.value?.getCurrentIndex(),
    getCurrentTime: () => playerBar.value?.getCurrentTime(),
    getDuration: () => playerBar.value?.getDuration(),
    getIsPlaying: () => playerBar.value?.getIsPlaying(),
    getPlaybackRate: () => playerBar.value?.getPlaybackRate(),
    seekTo: (time) => playerBar.value?.seekTo(time),
    togglePlay: () => playerBar.value?.togglePlay(),
    setSpeed: (speed) => playerBar.value?.setSpeed(speed)
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 70px;
  overflow-x: hidden;
}

body.theme-dark #app {
  background: #121212;
}

#app.is-mobile {
  font-size: 14px;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  max-height: 80vh;
  overflow-y: auto;
}

/* ==================== 暗黑主题 ==================== */
body.theme-dark {
  background: #121212;
  color: #e0e0e0;
}

/* 全局文字颜色 */
body.theme-dark * {
  box-sizing: border-box;
}

body.theme-dark .page {
  background: #121212;
  color: #e0e0e0;
}

/* 导航栏 */
body.theme-dark .navbar {
  background: #1e1e1e;
  color: #e0e0e0;
  border-bottom: 1px solid #333;
}

body.theme-dark .navbar-title {
  color: #e0e0e0;
}

body.theme-dark .navbar-brand {
  color: #e0e0e0;
}

/* 卡片 */
body.theme-dark .card {
  background: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #333;
}

body.theme-dark .card-title {
  color: #e0e0e0;
}

/* 表单 */
body.theme-dark .form-input,
body.theme-dark select.form-input {
  background: #2d2d2d;
  color: #e0e0e0;
  border-color: #444;
}

body.theme-dark .form-input:focus {
  border-color: #667eea;
}

body.theme-dark .form-label {
  color: #aaa;
}

/* 标签页 */
body.theme-dark .tabs {
  border-bottom: 1px solid #333;
}

body.theme-dark .tab {
  background: #1e1e1e;
  color: #888;
  border: 1px solid #333;
  border-bottom: none;
}

body.theme-dark .tab.active {
  background: #667eea;
  color: #fff;
}

/* 按钮 */
body.theme-dark .btn {
  background: #2d2d2d;
  color: #e0e0e0;
  border-color: #444;
}

body.theme-dark .btn:hover {
  background: #3d3d3d;
}

body.theme-dark .btn-primary {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

body.theme-dark .btn-primary:hover {
  background: #5a6fd6;
}

body.theme-dark .btn-secondary {
  background: #3d3d3d;
  border-color: #555;
}

body.theme-dark .btn-danger {
  background: #dc3545;
  border-color: #dc3545;
  color: #fff;
}

/* 字幕/原文 */
body.theme-dark .transcript {
  background: #1e1e1e;
  border: 1px solid #333;
}

body.theme-dark .transcript p {
  color: #bbb;
  border-bottom: 1px solid #333;
}

body.theme-dark .transcript p.current {
  background: #2d2d2d;
  color: #fff;
}

/* 当前播放提示 */
body.theme-dark .transcript > div[style*="background: #e8f5e9"] {
  background: #1a3d1a !important;
  color: #a5d6a7;
}

body.theme-dark .transcript > div[style*="background: #e3f2fd"] {
  background: #1a2d4a !important;
  color: #90caf9;
}

/* 解析 */
body.theme-dark .explanation {
  background: #2d2d2d;
  border-color: #444;
  color: #e0e0e0;
}

body.theme-dark .option:hover {
  background: #3d3d3d;
}

body.theme-dark .option.selected {
  border-color: #667eea;
  background: #3d3d5c;
}

body.theme-dark .option.correct {
  border-color: #10b981;
  background: #1a3d2e;
}

body.theme-dark .option.wrong {
  border-color: #ef4444;
  background: #3d1e1e;
}

/* 解析 */
body.theme-dark .explanation {
  background: #2d2d2d;
  color: #ccc;
  border: 1px solid #444;
}

/* 空状态 */
body.theme-dark .empty-state {
  color: #666;
}

body.theme-dark .empty-state-icon {
  color: #444;
}

/* 筛选按钮 */
body.theme-dark .filters .btn {
  background: #2d2d2d;
  color: #aaa;
  border-color: #444;
}

body.theme-dark .filters .btn.active {
  background: #667eea;
  color: #fff;
}

/* 音频播放器 */
body.theme-dark .audio-player {
  background: #1e1e1e;
  border: 1px solid #333;
}

body.theme-dark .progress-bar {
  background: #333;
}

body.theme-dark .progress {
  background: #667eea;
}

body.theme-dark .time-display {
  color: #aaa;
}

/* 速度控制 */
body.theme-dark .speed-btn {
  background: #2d2d2d;
  color: #aaa;
  border-color: #444;
}

body.theme-dark .speed-btn.active {
  background: #667eea;
  color: #fff;
}

/* 循环控制 */
body.theme-dark .loop-btn {
  background: #2d2d2d;
  color: #aaa;
  border-color: #444;
}

body.theme-dark .loop-btn.active {
  background: #667eea;
  color: #fff;
}

/* 问答卡片 */
body.theme-dark .question-card {
  background: #1e1e1e;
  border: 1px solid #333;
}

body.theme-dark .question-text {
  color: #e0e0e0;
}

/* 复习提醒 */
body.theme-dark .card[style*="background: #fff3e0"] {
  background: #3d2e1e !important;
  border-color: #8b6914 !important;
  color: #e0e0e0;
}

/* 课程列表 */
body.theme-dark .episode-list {
  background: #121212;
}

body.theme-dark .episode-item {
  background: #1e1e1e;
  border: 1px solid #333;
  color: #e0e0e0;
}

body.theme-dark .episode-item:hover {
  background: #2d2d2d;
  border-color: #667eea;
}

body.theme-dark .episode-info h3 {
  color: #e0e0e0;
}

body.theme-dark .episode-meta {
  color: #888;
}

/* 主容器 */
body.theme-dark main.container {
  background: #121212;
  min-height: calc(100vh - 60px);
}

/* 徽章 */
body.theme-dark .badge {
  color: #fff;
}

body.theme-dark .badge-beginner {
  background: #4caf50;
}

body.theme-dark .badge-intermediate {
  background: #ff9800;
}

body.theme-dark .badge-advanced {
  background: #f44336;
}

/* 筛选区域 */
body.theme-dark .filters {
  background: #121212;
}

body.theme-dark .difficulty-filters {
  background: #121212;
}

/* 搜索框 */
body.theme-dark input[type="text"].form-input {
  background: #2d2d2d;
  color: #e0e0e0;
  border-color: #444;
}

/* 导入按钮区域 */
body.theme-dark .import-section {
  background: #1e1e1e;
  border-color: #333;
}

/* 生词本 */
body.theme-dark .vocab-word {
  color: #90caf9 !important;
}

/* 滚动条 */
body.theme-dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

body.theme-dark ::-webkit-scrollbar-track {
  background: #1e1e1e;
}

body.theme-dark ::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

body.theme-dark ::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>