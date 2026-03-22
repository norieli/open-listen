<template>
  <div class="page">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand">Open listen AI</div>
        <div class="navbar-menu">
          <router-link to="/">课程</router-link>
          <router-link to="/wrong-answers">错题本</router-link>
          <router-link to="/vocabulary">生词本</router-link>
          <router-link to="/favorites">收藏</router-link>
          <router-link to="/settings">设置</router-link>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="container" style="padding-top: 30px;">
      <!-- 导入按钮 -->
      <div class="card">
        <div class="flex" style="justify-content: space-between; align-items: center;">
          <h2>我的课程</h2>
          <button class="btn btn-primary" @click="importEpisode">+ 导入课程</button>
        </div>
      </div>

      <!-- 难度筛选 -->
      <div class="filters" style="margin: 20px 0;">
        <button 
          v-for="difficulty in difficulties" 
          :key="difficulty.value"
          class="btn"
          :class="currentDifficulty === difficulty.value ? 'btn-primary' : 'btn-secondary'"
          @click="currentDifficulty = difficulty.value"
        >
          {{ difficulty.label }}
        </button>
      </div>

      <!-- 课程列表 -->
      <div class="episode-list" v-if="filteredEpisodes.length > 0">
        <div 
          v-for="episode in filteredEpisodes" 
          :key="episode.id"
          class="episode-item"
          @click="goToLearn(episode.id)"
        >
          <div class="episode-info">
            <h3>{{ episode.title }}</h3>
            <div class="episode-meta">
              <span :class="'badge badge-' + episode.difficulty">
                {{ getDifficultyLabel(episode.difficulty) }}
              </span>
              <span>{{ episode.category }}</span>
              <span v-if="getProgress(episode.id)">
                {{ getProgress(episode.id) }}
              </span>
            </div>
          </div>
          <div class="episode-actions">
            <button class="btn btn-secondary" @click.stop="toggleFavorite(episode.id)">
              {{ isFavorite(episode.id) ? '❤️' : '🤍' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-state-icon">📚</div>
        <h3>还没有课程</h3>
        <p>点击上方"导入课程"添加你的English Pod内容</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 数据
const episodes = ref([])
const favorites = ref([])
const progressMap = ref({})
const currentDifficulty = ref('all')

const difficulties = [
  { value: 'all', label: '全部' },
  { value: 'elementary', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'upper', label: '中高级' },
  { value: 'advanced', label: '高级' }
]

// 筛选
const filteredEpisodes = computed(() => {
  if (currentDifficulty.value === 'all') {
    return episodes.value
  }
  return episodes.value.filter(e => e.difficulty === currentDifficulty.value)
})

// 方法
const getDifficultyLabel = (difficulty) => {
  const map = {
    elementary: '初级',
    intermediate: '中级', 
    upper: '中高级',
    advanced: '高级'
  }
  return map[difficulty] || difficulty
}

const getProgress = (episodeId) => {
  const progress = progressMap.value[episodeId]
  if (!progress) return ''
  if (progress.status === 'completed') return '✅ 已完成'
  if (progress.status === 'reading') return '📖 阅读中'
  if (progress.status === 'listening') return '🎧 听力中'
  return ''
}

const isFavorite = (episodeId) => {
  return favorites.value.some(f => f.id === episodeId)
}

const goToLearn = (id) => {
  router.push(`/learn/${id}`)
}

const toggleFavorite = async (episodeId) => {
  if (isFavorite(episodeId)) {
    await window.api.favorites.remove(episodeId)
  } else {
    await window.api.favorites.add(episodeId)
  }
  await loadFavorites()
}

// 导入课程
const importEpisode = async () => {
  const result = await window.api.dialog.openFile({
    filters: [
      { name: '音频', extensions: ['mp3', 'wav', 'm4a'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    // TODO: 打开导入向导
    alert('导入功能开发中...\n\n请手动在数据库中添加节目，或等待后续版本支持自动导入。')
  }
}

// 加载数据
const loadEpisodes = async () => {
  episodes.value = await window.api.episodes.getAll()
}

const loadFavorites = async () => {
  const list = await window.api.favorites.getAll()
  favorites.value = list
}

const loadProgress = async () => {
  for (const episode of episodes.value) {
    const progress = await window.api.progress.get(episode.id)
    if (progress) {
      progressMap.value[episode.id] = progress
    }
  }
}

onMounted(async () => {
  await loadEpisodes()
  await loadFavorites()
  await loadProgress()
})
</script>