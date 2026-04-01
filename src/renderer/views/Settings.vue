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
      <!-- 主题设置 -->
      <div class="card">
        <h3 class="card-title">外观</h3>
        <div class="form-group">
          <label class="form-label">主题</label>
          <select class="form-input" v-model="settings.theme" @change="changeTheme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>

      <!-- 播放设置 -->
      <div class="card">
        <h3 class="card-title">播放设置</h3>
        <div class="form-group">
          <label class="form-label">默认播放速度</label>
          <select class="form-input" v-model="settings.defaultSpeed">
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x (常速)</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">自动播放下一句</label>
          <select class="form-input" v-model="settings.autoPlay">
            <option :value="true">开启</option>
            <option :value="false">关闭</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">显示译文</label>
          <select class="form-input" v-model="settings.showTranslation">
            <option :value="true">默认显示</option>
            <option :value="false">默认隐藏</option>
          </select>
        </div>
      </div>

      <!-- AI 配置 -->
      <div class="card">
        <h3 class="card-title">🤖 AI 设置</h3>
        <p style="color: #666; margin-bottom: 15px; font-size: 13px;">
          配置 AI 用于生成题目和辅助学习。支持 DeepSeek、OpenAI、Claude 等支持 OpenAI 兼容 API 的模型。
        </p>
        <div class="form-group">
          <label class="form-label">API 类型</label>
          <select class="form-input" v-model="settings.aiProvider">
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="custom">自定义 (兼容 OpenAI)</option>
          </select>
        </div>
        <div class="form-group" v-if="settings.aiProvider === 'custom'">
          <label class="form-label">API 地址</label>
          <input
            type="text"
            class="form-input"
            v-model="settings.customApiUrl"
            placeholder="https://api.example.com/v1/chat/completions"
          />
        </div>
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input
            type="password"
            class="form-input"
            v-model="settings.aiApiKey"
            placeholder="输入 API Key"
          />
        </div>
        <div class="form-group">
          <label class="form-label">模型</label>
          <select class="form-input" v-model="settings.aiModel">
            <option value="">请先选择 API 类型</option>
            <optgroup v-if="settings.aiProvider === 'deepseek'" label="DeepSeek">
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-coder">deepseek-coder</option>
            </optgroup>
            <optgroup v-if="settings.aiProvider === 'openai'" label="OpenAI">
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </optgroup>
            <optgroup v-if="settings.aiProvider === 'anthropic'" label="Anthropic Claude">
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </optgroup>
            <optgroup v-if="settings.aiProvider === 'custom'" label="自定义模型">
              <option value="custom">自定义 (输入模型名)</option>
            </optgroup>
          </select>
        </div>
        <div class="form-group" v-if="settings.aiProvider === 'custom'">
          <label class="form-label">自定义模型名</label>
          <input
            type="text"
            class="form-input"
            v-model="settings.customModelName"
            placeholder="输入模型名称"
          />
        </div>
        <div class="flex gap-10">
          <button class="btn btn-secondary" @click="testAiConnection" :disabled="testing">
            {{ testing ? '测试中...' : '🔗 测试连接' }}
          </button>
          <button class="btn btn-primary" @click="saveAiSettings">
            保存 AI 配置
          </button>
        </div>
        <div v-if="testResult" :style="{ color: testResult.success ? 'green' : 'red', marginTop: '10px' }">
          {{ testResult.message }}
        </div>
      </div>

      <!-- 数据管理 -->
      <div class="card">
        <h3 class="card-title">数据管理</h3>
        <p style="color: #666; margin-bottom: 15px;">
          备份：将数据库导出为文件<br>
          恢复：从备份文件导入数据<br>
          清空：删除所有学习数据（不可恢复）
        </p>
        <div class="flex gap-10">
          <button class="btn btn-secondary" @click="exportData">📤 导出数据</button>
          <button class="btn btn-secondary" @click="importData">📥 导入数据</button>
          <button class="btn btn-danger" @click="clearData">🗑️ 清空数据</button>
        </div>
      </div>

      <!-- 关于 -->
      <div class="card">
        <h3 class="card-title">关于</h3>
        <p style="color: #666;">
          Open Listen AI v1.0.0<br>
          基于 Electron + Vue3 构建<br>
          一款开源免费的本地语言听读学习工具
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'

const testing = ref(false)
const testResult = ref(null)

const settings = reactive({
  theme: 'light',
  defaultSpeed: '1',
  autoPlay: true,
  showTranslation: true,
  aiProvider: 'deepseek',
  aiApiKey: '',
  aiModel: 'deepseek-chat',
  customApiUrl: '',
  customModelName: ''
})

// 加载设置
const loadSettings = async () => {
  try {
    // 从 localStorage 加载
    const saved = localStorage.getItem('app-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(settings, parsed)
    }
    // 应用主题
    applyTheme(settings.theme)
  } catch (e) {
    console.error('加载设置失败:', e)
  }
}

// 保存设置
const saveSettings = () => {
  localStorage.setItem('app-settings', JSON.stringify(settings))
}

// 主题相关
const changeTheme = () => {
  applyTheme(settings.theme)
  saveSettings()
}

const applyTheme = (theme) => {
  document.body.classList.remove('theme-light', 'theme-dark')
  document.body.classList.add(`theme-${theme}`)
}

// 测试 AI 连接
const testAiConnection = async () => {
  if (!settings.aiApiKey) {
    testResult.value = { success: false, message: '请输入 API Key' }
    return
  }

  testing.value = true
  testResult.value = null

  try {
    // 通过主进程发起请求，避免 CORS 问题
    const result = await window.api.ai.testConnection({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      customUrl: settings.customApiUrl,
      customModel: settings.customModelName
    })

    testResult.value = result
    if (result.success) {
      saveAiSettings()
    }
  } catch (e) {
    testResult.value = { success: false, message: `连接失败: ${e.message}` }
  } finally {
    testing.value = false
  }
}

// 保存 AI 设置
const saveAiSettings = () => {
  saveSettings()
  alert('AI 配置已保存')
}

// 数据操作
const exportData = async () => {
  const result = await window.api.database.backup()
  if (result.success) {
    alert(`数据已备份到：\n${result.path}`)
  } else if (result.error) {
    alert('备份失败：' + result.error)
  }
}

const importData = async () => {
  if (confirm('导入数据将覆盖当前所有数据，是否继续？')) {
    const result = await window.api.database.restore()
    if (result.success) {
      alert('数据已恢复，请重启应用')
      window.location.reload()
    } else if (result.error) {
      alert('恢复失败：' + result.error)
    }
  }
}

const clearData = async () => {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    if (confirm('再次确认：删除所有学习数据？')) {
      const result = await window.api.database.clear()
      if (result.success) {
        alert('数据已清空，请重启应用')
        window.location.reload()
      } else if (result.error) {
        alert('清空失败：' + result.error)
      }
    }
  }
}

// 监听设置变化自动保存
watch(() => [settings.defaultSpeed, settings.autoPlay, settings.showTranslation], () => {
  saveSettings()
})

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.theme-light {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
}

.theme-dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --border-color: #444444;
}
</style>