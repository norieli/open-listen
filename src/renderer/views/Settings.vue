<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">设置</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <div class="card">
        <h3 class="card-title">播放设置</h3>
        <div class="form-group">
          <label class="form-label">默认播放速度</label>
          <select class="form-input" v-model="settings.defaultSpeed">
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">数据管理</h3>
        <div class="flex gap-10">
          <button class="btn btn-secondary" @click="exportData">导出数据</button>
          <button class="btn btn-secondary" @click="importData">导入数据</button>
          <button class="btn btn-danger" @click="clearData">清空数据</button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">关于</h3>
        <p style="color: #666;">
          English Pod AI v1.0.0<br>
          基于 Electron + Vue3 构建
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const settings = reactive({
  defaultSpeed: '1'
})

const exportData = () => {
  alert('导出功能开发中...')
}

const importData = () => {
  alert('导入功能开发中...')
}

const clearData = () => {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    alert('清空功能开发中...')
  }
}
</script>