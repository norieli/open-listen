<template>
  <div class="page">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand">Open listen AI</div>
        <div class="navbar-menu">
          <router-link to="/manage">管理</router-link>
          <router-link to="/wrong-answers">错题本</router-link>
          <router-link to="/vocabulary">生词本</router-link>
          <router-link to="/favorites">收藏</router-link>
          <router-link to="/settings">设置</router-link>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="container" style="padding-top: 20px;">
      <!-- 学习统计 - 2行3列 -->
      <div class="stats-cards" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #667eea;">{{ stats.completedCount }}</div>
          <div style="font-size: 10px; color: #666;">已完成</div>
        </div>
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #10b981;">{{ stats.episodeCount }}</div>
          <div style="font-size: 10px; color: #666;">课程</div>
        </div>
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #ef4444;">{{ stats.wrongCount }}</div>
          <div style="font-size: 10px; color: #666;">错题</div>
        </div>
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">{{ stats.vocabCount }}</div>
          <div style="font-size: 10px; color: #666;">生词</div>
        </div>
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #8b5cf6;">{{ stats.streakDays }}🔥</div>
          <div style="font-size: 10px; color: #666;">连续</div>
        </div>
        <div class="card stat-card" style="text-align: center; padding: 10px 5px;">
          <div style="font-size: 18px; font-weight: bold; color: #ec4899;">{{ stats.favoriteCount || 0 }}</div>
          <div style="font-size: 10px; color: #666;">收藏</div>
        </div>
      </div>

      <!-- 导入按钮 -->
      <div class="card">
        <div class="flex" style="justify-content: space-between; align-items: center;">
          <h2>我的课程</h2>
          <div class="flex gap-10">
            <button class="btn btn-secondary" @click="createCollection">+ 新建合集</button>
            <button class="btn btn-primary" @click="importEpisode">+ 导入课程</button>
          </div>
        </div>
      </div>

      <!-- 合集筛选 -->
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
        <button class="btn btn-secondary" @click="showManageCollections = true" title="管理合集" style="margin-left: 10px;">
          ⚙️
        </button>
      </div>

      <!-- 课程列表 -->
      <div class="episode-list" v-if="filteredEpisodes.length > 0">
        <div
          v-for="episode in filteredEpisodes"
          :key="episode.id"
          class="episode-item"
          @dblclick="goToLearn(episode.id)"
        >
          <div class="episode-info" @click="goToLearn(episode.id)">
            <h3>{{ episode.title }}</h3>
            <div class="episode-meta">
              <span :class="'badge badge-' + episode.difficulty">
                {{ getDifficultyLabel(episode.difficulty) }}
              </span>
              <span>{{ episode.category }}</span>
              <span v-if="getProgress(episode.id)">
                {{ getProgress(episode.id) }}
              </span>
              <span v-if="episode.collectionId" style="color: #667eea; margin-left: 5px;">
                📁 {{ getCollectionName(episode.collectionId) }}
              </span>
            </div>
          </div>
          <div class="episode-actions">
            <button class="btn-icon" @click.stop="goToLearn(episode.id)" title="学习">
              📖
            </button>
            <button class="btn-icon" @click.stop="playEpisode(episode)" title="播放">
              ▶️
            </button>
            <button class="btn-icon" @click.stop="toggleFavorite(episode.id)">
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

    <!-- 创建合集模态框 -->
    <div v-if="showCreateCollectionModal" class="modal-overlay" @click.self="showCreateCollectionModal = false">
      <div class="modal-content card" style="max-width: 400px; width: 90%;">
        <h3 class="card-title">新建合集</h3>
        <div class="form-group">
          <label class="form-label">合集名称</label>
          <input type="text" class="form-input" v-model="newCollectionName" placeholder="输入合集名称" @keyup.enter="confirmCreateCollection">
        </div>
        <div class="flex gap-10" style="justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-secondary" @click="showCreateCollectionModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmCreateCollection">创建</button>
        </div>
      </div>
    </div>

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
          <button class="btn btn-primary" @click="confirmMoveToCollection">移动</button>
        </div>
      </div>
    </div>

    <!-- 管理合集模态框 -->
    <div v-if="showManageCollections" class="modal-overlay" @click.self="showManageCollections = false">
      <div class="modal-content card" style="max-width: 400px; width: 90%;">
        <h3 class="card-title">管理合集</h3>
        <div v-if="collections.length === 0" style="text-align: center; padding: 20px; color: #666;">
          暂无合集
        </div>
        <div v-else style="max-height: 300px; overflow-y: auto;">
          <div v-for="col in collections" :key="col.id" class="flex" style="justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            <span>{{ col.name }}</span>
            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" @click="confirmDeleteCollection(col.id)">
              删除
            </button>
          </div>
        </div>
        <div class="flex gap-10" style="justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-primary" @click="showManageCollections = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 导入模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-content card" style="max-width: 450px; width: 90%;">
        <h3 class="card-title">导入课程</h3>

        <div class="form-group">
          <label class="form-label">文件夹路径</label>
          <div style="word-break: break-all; color: #666; font-size: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            {{ importData.folderPath || '未选择' }}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">选择合集</label>
          <select class="form-input" v-model="importData.collectionId">
            <option :value="null">未分类</option>
            <option v-for="col in collections" :key="col.id" :value="col.id">{{ col.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">课程标题</label>
          <input type="text" class="form-input" v-model="importData.title" placeholder="输入课程标题">
        </div>

        <div class="form-group">
          <label class="form-label">难度</label>
          <select class="form-input" v-model="importData.difficulty">
            <option value="elementary">初级</option>
            <option value="intermediate">中级</option>
            <option value="upper">中高级</option>
            <option value="advanced">高级</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">分类</label>
          <input type="text" class="form-input" v-model="importData.category" placeholder="输入分类">
        </div>

        <div class="flex gap-10" style="justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmImport">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 数据
const episodes = ref([])
const favorites = ref([])
const progressMap = ref({})
const currentDifficulty = ref('all')

// 合集
const collections = ref([])
const currentCollection = ref('') // '' = 全部, null = 未分类

// 模态框状态
const showCreateCollectionModal = ref(false)
const newCollectionName = ref('')
const showMoveModal = ref(false)
const targetCollectionId = ref(null)
const movingEpisodeId = ref(null)
const showManageCollections = ref(false)

// 导入状态
const showImportModal = ref(false)
const importData = ref({
  folderPath: '',
  folderName: '',
  title: '',
  difficulty: 'intermediate',
  category: 'English Pod',
  collectionId: null
})

// 显示当前筛选下的数量
const episodeCount = computed(() => {
  if (currentCollection.value === '') {
    return episodes.value.length
  } else if (currentCollection.value === null) {
    return episodes.value.filter(e => !e.collectionId).length
  }
  return episodes.value.filter(e => e.collectionId === currentCollection.value).length
})

// 学习统计
const stats = ref({
  episodeCount: 0,
  completedCount: 0,
  wrongCount: 0,
  vocabCount: 0,
  streakDays: 0
})

const difficulties = [
  { value: 'all', label: '全部' },
  { value: 'elementary', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'upper', label: '中高级' },
  { value: 'advanced', label: '高级' }
]

// 筛选
const filteredEpisodes = computed(() => {
  let result = episodes.value

  // 按难度筛选
  if (currentDifficulty.value !== 'all') {
    result = result.filter(e => e.difficulty === currentDifficulty.value)
  }

  // 按合集筛选
  if (currentCollection.value === null) {
    // 未分类
    result = result.filter(e => !e.collectionId)
  } else if (currentCollection.value !== '') {
    // 指定合集
    result = result.filter(e => e.collectionId === currentCollection.value)
  }

  return result
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

const getCollectionName = (collectionId) => {
  const col = collections.value.find(c => c.id === collectionId)
  return col?.name || '未知合集'
}

const isFavorite = (episodeId) => {
  return favorites.value.some(f => f.id === episodeId)
}

const goToLearn = (id) => {
  router.push(`/learn/${id}`)
}

// 播放音频
const playEpisode = (episode) => {
  const index = filteredEpisodes.value.findIndex(e => e.id === episode.id)
  window.playerBar?.setPlaylist(filteredEpisodes.value, index >= 0 ? index : 0)
}

const toggleFavorite = async (episodeId) => {
  if (isFavorite(episodeId)) {
    await window.api.favorites.remove(episodeId)
  } else {
    await window.api.favorites.add(episodeId)
  }
  await loadFavorites()
}

// 读取文件内容（用于 Capacitor 环境）
const readFileContent = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result || '')
    reader.onerror = () => resolve('')
    reader.readAsText(file)
  })
}

// 删除课程
const deleteEpisode = async (episode) => {
  const confirmed = confirm(`确定要删除 "${episode.title}" 吗？\n\n此操作仅从数据库移除记录，不会删除原始音频文件。`)
  if (!confirmed) return

  try {
    await window.api.episodes.delete(episode.id)
    await loadEpisodes()
    await loadStats()
    alert('删除成功')
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

// 导入课程 - 打开文件夹选择
const importEpisode = async () => {
  let folderPath

  // Capacitor 环境使用 input 选择文件夹
  if (window.Capacitor) {
    // 创建一个隐藏的 input 元素选择文件夹
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true
    // 限制最多选择 100 个文件，避免 OOM
    input.dataset.maxFiles = '100'

    return new Promise((resolve) => {
      input.onchange = async (e) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return

        // 只处理前 100 个文件，避免 OOM
        const maxFiles = 100
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']

        // 先筛选音频文件
        const audioFiles = []
        for (let i = 0; i < Math.min(fileList.length, maxFiles); i++) {
          const file = fileList[i]
          const ext = '.' + file.name.split('.').pop().toLowerCase()
          if (audioExtensions.includes(ext)) {
            audioFiles.push({
              name: file.name,
              path: file.webkitRelativePath || file.name,
              file: file // 保存 File 对象引用
            })
          }
        }

        if (audioFiles.length === 0) {
          alert('没有找到音频文件')
          return
        }

        // 获取第一个文件的父文件夹名称
        const firstFile = fileList[0]
        const fileName = firstFile.webkitRelativePath || firstFile.name
        const folderName = fileName.split('/')[0] || '新课程'

        importData.value = {
          folderPath: '',
          folderName,
          title: folderName,
          difficulty: 'intermediate',
          category: 'English Pod',
          collectionId: null,
          audioFiles: audioFiles // 只保存音频文件
        }

        showImportModal.value = true
      }
      input.click()
    })
  }

  // Electron 环境使用原生对话框
  folderPath = await window.api.dialog.openDirectory()
  if (!folderPath || typeof folderPath !== 'string') return

  // 获取文件夹名称作为默认标题
  const folderName = folderPath.split(/[\\/]/).pop()

  // 初始化导入数据
  importData.value = {
    folderPath,
    folderName,
    title: folderName,
    difficulty: 'intermediate',
    category: 'English Pod',
    collectionId: null
  }

  showImportModal.value = true
}

// 确认导入
const confirmImport = async () => {
  if (!importData.value.title) {
    alert('请输入课程标题')
    return
  }

  showImportModal.value = false

  try {
    let files = []

    // Capacitor 环境：使用 Web File API
    if (window.Capacitor && importData.value.audioFiles) {
      files = importData.value.audioFiles

      if (files.length === 0) {
        alert('没有找到音频文件')
        return
      }

      let importedCount = 0

      for (const fileObj of files) {
        const fileName = fileObj.name.replace(/\.[^/.]+$/, '')
        const episodeTitle = files.length > 1 ? `${importData.value.title} - ${fileName}` : importData.value.title

        // 创建 Object URL 用于音频播放（临时）
        // 注意：Object URL 在页面关闭后会失效，需要后续使用 Filesystem 插件持久化
        const audioUrl = URL.createObjectURL(fileObj.file)

        await window.api.episodes.add({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          title: episodeTitle,
          difficulty: importData.value.difficulty,
          category: importData.value.category || 'English Pod',
          audioPath: audioUrl,
          lrc: '',
          translation: '',
          transcript: '',
          questions: '[]',
          collectionId: importData.value.collectionId
        })

        importedCount++
      }

      alert(`成功导入 ${importedCount} 个课程`)
      loadEpisodes()
      return
    }

    // Electron 环境：使用原生文件 API
    files = await window.api.scanFolder(importData.value.folderPath)

    if (files.length === 0) {
      alert('文件夹中没有找到音频文件')
      return
    }

    let importedCount = 0

    for (const file of files) {
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      const episodeTitle = files.length > 1 ? `${importData.value.title} - ${fileName}` : importData.value.title

      const lrcFile = files.find(f => f.name === file.name.replace(/\.[^/.]+$/, '.lrc'))
      const lrcContent = lrcFile ? await window.api.readFileText(lrcFile.path) : null

      const transFile = files.find(f => f.name === file.name.replace(/\.[^/.]+$/, '.txt'))
      const translation = transFile ? await window.api.readFileText(transFile.path) : null

      await window.api.episodes.add({
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        title: episodeTitle,
        difficulty: importData.value.difficulty,
        category: importData.value.category || 'English Pod',
        audioPath: 'file:///' + file.path.replace(/\\/g, '/'),
        lrc: lrcContent,
        translation: translation,
        transcript: '',
        questions: '[]',
        collectionId: importData.value.collectionId
      })

      importedCount++
    }

    await loadEpisodes()
    alert(`导入成功！共导入 ${importedCount} 个课程。`)
  } catch (e) {
    alert('导入失败：' + e.message)
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
  await loadCollections()
  await loadFavorites()
  await loadProgress()
  await loadStats()
})

// 每次进入首页时刷新统计数据
onActivated(async () => {
  await loadStats()
  await loadCollections()
})

// 加载统计数据
const loadStats = async () => {
  try {
    const result = await window.api.stats.get()
    if (result.success) {
      stats.value = result.stats
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

// 合集管理
const loadCollections = async () => {
  try {
    collections.value = await window.api.collections.getAll()
  } catch (e) {
    console.error('Failed to load collections:', e)
  }
}

const createCollection = async () => {
  showCreateCollectionModal.value = true
  newCollectionName.value = ''
}

const confirmCreateCollection = async () => {
  const name = newCollectionName.value.trim()
  if (!name) {
    alert('请输入合集名称')
    return
  }

  try {
    await window.api.collections.add({ name, description: '' })
    await loadCollections()
    showCreateCollectionModal.value = false
    alert('合集创建成功')
  } catch (e) {
    alert('创建失败：' + e.message)
  }
}

const deleteCollection = async (id) => {
  const confirmed = await window.api.dialog.confirm({
    title: '删除合集',
    message: '确定删除此合集？合集内的课程将变为未分类。'
  })

  if (!confirmed) return

  try {
    await window.api.collections.delete(id)
    await loadCollections()
    if (currentCollection.value === id) {
      currentCollection.value = ''
    }
    await loadEpisodes()
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

// 确认删除合集（从管理界面）
const confirmDeleteCollection = async (id) => {
  if (!confirm('确定删除此合集？合集内的课程将变为未分类。')) return

  try {
    await window.api.collections.delete(id)
    await loadCollections()
    if (currentCollection.value === id) {
      currentCollection.value = ''
    }
    await loadEpisodes()
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

// 移动到合集
const showMoveDialog = (episodeId) => {
  movingEpisodeId.value = episodeId
  targetCollectionId.value = null
  // 设置当前所在合集
  const episode = episodes.value.find(e => e.id === episodeId)
  targetCollectionId.value = episode?.collectionId || null
  showMoveModal.value = true
}

const confirmMoveToCollection = async () => {
  if (!movingEpisodeId.value) return

  try {
    await window.api.episodes.updateCollection(movingEpisodeId.value, targetCollectionId.value)
    await loadEpisodes()
    showMoveModal.value = false
    alert('移动成功')
  } catch (e) {
    alert('移动失败：' + e.message)
  }
}
</script>