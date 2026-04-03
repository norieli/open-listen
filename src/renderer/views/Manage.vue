<template>
  <div class="page">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">课程管理</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="container" style="padding-top: 30px;">
      <!-- 操作栏 -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="flex" style="justify-content: space-between; align-items: center;">
          <h2>课程列表</h2>
          <div class="flex gap-10">
            <button class="btn btn-secondary" @click="selectAll">全选</button>
            <button class="btn btn-secondary" @click="showBulkMoveDialog" :disabled="selectedEpisodes.length === 0">
              移动选中 ({{ selectedEpisodes.length }})
            </button>
            <button class="btn btn-danger" @click="deleteSelected" :disabled="selectedEpisodes.length === 0">
              删除选中 ({{ selectedEpisodes.length }})
            </button>
          </div>
        </div>
      </div>

      <!-- 筛选 -->
      <div class="filters" style="display: flex; margin: 20px 0; gap: 10px; flex-wrap: wrap;">
        <button
          class="btn"
          :class="currentCollection === '' ? 'btn-primary' : 'btn-secondary'"
          @click="currentCollection = ''"
        >
          全部 ({{ episodeCount }})
        </button>
        <button
          class="btn"
          :class="currentCollection === null ? 'btn-primary' : 'btn-secondary'"
          @click="currentCollection = null"
        >
          未分类
        </button>
        <button
          v-for="col in collections"
          :key="col.id"
          class="btn"
          :class="currentCollection === col.id ? 'btn-primary' : 'btn-secondary'"
          @click="currentCollection = col.id"
        >
          {{ col.name }}
        </button>
      </div>

      <!-- 课程列表 -->
      <div class="episode-list" v-if="filteredEpisodes.length > 0">
        <div
          v-for="episode in filteredEpisodes"
          :key="episode.id"
          class="episode-item"
          :class="{ selected: selectedEpisodes.includes(episode.id) }"
          @click="toggleSelect(episode.id)"
        >
          <span class="episode-checkbox">
            {{ selectedEpisodes.includes(episode.id) ? '☑️' : '⬜' }}
          </span>
          <div class="episode-info">
            <h3>{{ episode.title }}</h3>
            <div class="episode-meta">
              <span :class="'badge badge-' + episode.difficulty">
                {{ getDifficultyLabel(episode.difficulty) }}
              </span>
              <span>{{ episode.category }}</span>
              <span v-if="episode.collectionId" style="color: #667eea; margin-left: 5px;">
                📁 {{ getCollectionName(episode.collectionId) }}
              </span>
            </div>
          </div>
          <div class="episode-actions">
            <button class="btn-icon" @click.stop="showMoveDialog(episode.id)" title="移动到合集">
              📁
            </button>
            <button class="btn-icon" style="color: #ef4444;" @click.stop="deleteOne(episode)" title="删除">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-state-icon">📚</div>
        <h3>没有课程</h3>
        <p>去课程页面导入课程</p>
        <button class="btn btn-primary" @click="$router.push('/')">返回课程</button>
      </div>
    </main>

    <!-- 移动到合集模态框 -->
    <div v-if="showMoveModal" class="modal-overlay" @click.self="showMoveModal = false">
      <div class="modal-content card" style="max-width: 400px; width: 90%;">
        <h3 class="card-title">移动到合集</h3>
        <div class="form-group">
          <label class="form-label">选择目标合集</label>
          <select class="form-input" v-model="targetCollectionId">
            <option :value="null">移除合集 (未分类)</option>
            <option v-for="col in collections" :key="col.id" :value="col.id">{{ col.name }}</option>
          </select>
        </div>
        <div class="flex gap-10" style="justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-secondary" @click="showMoveModal = false">取消</button>
          <button class="btn btn-primary" @click="selectedEpisodes.length > 0 ? confirmBulkMove() : confirmMove()">移动</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const episodes = ref([])
const collections = ref([])
const currentCollection = ref('')
const selectedEpisodes = ref([])

// 模态框
const showMoveModal = ref(false)
const targetCollectionId = ref(null)
const movingEpisodeId = ref(null)

// 数量统计
const episodeCount = computed(() => episodes.value.length)

// 筛选
const filteredEpisodes = computed(() => {
  let result = episodes.value

  if (currentCollection.value === null) {
    result = result.filter(e => !e.collectionId)
  } else if (currentCollection.value !== '') {
    result = result.filter(e => e.collectionId === currentCollection.value)
  }

  return result
})

const getDifficultyLabel = (difficulty) => {
  const map = {
    elementary: '初级',
    intermediate: '中级',
    upper: '中高级',
    advanced: '高级'
  }
  return map[difficulty] || difficulty
}

const getCollectionName = (collectionId) => {
  const col = collections.value.find(c => c.id === collectionId)
  return col?.name || '未知合集'
}

// 选择操作
const toggleSelect = (id) => {
  const index = selectedEpisodes.value.indexOf(id)
  if (index >= 0) {
    selectedEpisodes.value.splice(index, 1)
  } else {
    selectedEpisodes.value.push(id)
  }
}

const selectAll = () => {
  if (selectedEpisodes.value.length === filteredEpisodes.value.length) {
    selectedEpisodes.value = []
  } else {
    selectedEpisodes.value = filteredEpisodes.value.map(e => e.id)
  }
}

// 删除单个
const deleteOne = async (episode) => {
  const confirmed = confirm(`确定要删除 "${episode.title}" 吗？\n\n同时删除数据库记录和音频文件。`)
  if (!confirmed) return

  try {
    await window.api.episodes.delete(episode.id, true) // true = delete file
    await loadEpisodes()
    alert('删除成功')
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

// 批量删除
const deleteSelected = async () => {
  const confirmed = confirm(`确定要删除选中的 ${selectedEpisodes.value.length} 个课程吗？\n\n同时删除数据库记录和音频文件。`)
  if (!confirmed) return

  try {
    for (const id of selectedEpisodes.value) {
      await window.api.episodes.delete(id, true)
    }
    selectedEpisodes.value = []
    await loadEpisodes()
    alert('删除成功')
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

// 移动到合集
const showMoveDialog = (episodeId) => {
  movingEpisodeId.value = episodeId
  const episode = episodes.value.find(e => e.id === episodeId)
  targetCollectionId.value = episode?.collectionId || null
  showMoveModal.value = true
}

const confirmMove = async () => {
  if (!movingEpisodeId.value) return

  try {
    await window.api.episodes.updateCollection(movingEpisodeId.value, targetCollectionId.value)
    await loadEpisodes()
    showMoveModal.value = false
  } catch (e) {
    alert('移动失败：' + e.message)
  }
}

// 批量移动到合集
const showBulkMoveDialog = () => {
  targetCollectionId.value = null
  showMoveModal.value = true
}

const confirmBulkMove = async () => {
  try {
    for (const id of selectedEpisodes.value) {
      await window.api.episodes.updateCollection(id, targetCollectionId.value)
    }
    selectedEpisodes.value = []
    await loadEpisodes()
    showMoveModal.value = false
  } catch (e) {
    alert('移动失败：' + e.message)
  }
}

// 加载数据
const loadEpisodes = async () => {
  episodes.value = await window.api.episodes.getAll()
}

const loadCollections = async () => {
  collections.value = await window.api.collections.getAll()
}

onMounted(async () => {
  await loadEpisodes()
  await loadCollections()
})
</script>

<style scoped>
.episode-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
}

.episode-item.selected {
  background: #e3f2fd;
  border-color: #667eea;
}

body.theme-dark .episode-item.selected {
  background: #1a2d4a;
}

.episode-checkbox {
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.episode-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.episode-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>