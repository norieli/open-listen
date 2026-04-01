<template>
  <div id="app" :class="{ 'is-mobile': isMobile }">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isMobile = ref(false)

onMounted(() => {
  // 检测设备类型
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f7fa;
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