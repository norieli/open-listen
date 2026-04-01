<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">生词本 ({{ vocabularies.length }})</div>
        <div style="width: 60px;">
          <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" @click="startReview" :disabled="vocabularies.length === 0">
            复习
          </button>
        </div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <!-- 待复习提醒 -->
      <div v-if="dueCount > 0" class="card" style="padding: 15px; margin-bottom: 20px; background: #fff3e0; border: 1px solid #ffb74d;">
        <div class="flex" style="justify-content: space-between; align-items: center;">
          <div>
            <strong>📅 待复习</strong>
            <p style="margin: 5px 0 0; color: #666; font-size: 13px;">
              您有 {{ dueCount }} 个生词需要复习
            </p>
          </div>
          <button class="btn btn-primary" @click="startReview">
            开始复习
          </button>
        </div>
      </div>

      <!-- 筛选 -->
      <div class="filters" style="margin-bottom: 20px;">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="btn"
          :class="currentFilter === filter.value ? 'btn-primary' : 'btn-secondary'"
          @click="currentFilter = filter.value"
        >
          {{ filter.label }}
        </button>
        <button class="btn btn-secondary" style="margin-left: auto;" @click="exportVocab">
          导出
        </button>
      </div>

      <!-- 复习模式 -->
      <div v-if="reviewMode" class="card">
        <div style="text-align: center;">
          <div style="margin-bottom: 15px; color: #666;">
            {{ reviewIndex + 1 }} / {{ reviewList.length }}
          </div>
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 30px;">
            {{ reviewList[reviewIndex]?.word }}
          </div>
          <div v-if="showMeaning" style="font-size: 16px; color: #667eea; margin-bottom: 30px; text-align: left; padding: 15px; background: #f5f5f5; border-radius: 8px; max-width: 500px; margin-left: auto; margin-right: auto;">
            <div style="white-space: pre-wrap;">{{ reviewList[reviewIndex]?.meaning }}</div>

            <!-- 评分按钮 -->
            <div class="flex gap-10" style="justify-content: center; margin-top: 20px; flex-wrap: wrap;">
              <button class="btn" style="background: #ff5252; color: white; padding: 8px 15px;" @click="rateWord(1)">
                😢 忘了
              </button>
              <button class="btn" style="background: #ff9800; color: white; padding: 8px 15px;" @click="rateWord(2)">
                😕 记不清
              </button>
              <button class="btn" style="background: #ffc107; color: #333; padding: 8px 15px;" @click="rateWord(3)">
                😐 一般
              </button>
              <button class="btn" style="background: #8bc34a; color: white; padding: 8px 15px;" @click="rateWord(4)">
                😊 记得
              </button>
              <button class="btn" style="background: #4caf50; color: white; padding: 8px 15px;" @click="rateWord(5)">
                🤩 记住
              </button>
            </div>
          </div>
          <div v-else class="flex gap-10" style="justify-content: center;">
            <button class="btn btn-primary" @click="showMeaning = true">
              显示释义
            </button>
          </div>
          <button class="btn btn-secondary" style="margin-top: 20px;" @click="reviewMode = false; loadDueCount();">
            退出复习
          </button>
        </div>
      </div>

      <!-- 单词列表 -->
      <div v-else-if="filteredVocabularies.length > 0">
        <div v-for="item in filteredVocabularies" :key="item.id" class="card" style="margin-bottom: 15px;">
          <div style="font-size: 20px; font-weight: 600; color: #667eea;">{{ item.word }}</div>
          <div style="margin-top: 10px; color: #333; line-height: 1.8; white-space: pre-wrap;">{{ formatMeaning(item.meaning) }}</div>
          <div v-if="item.nextReviewTime" style="font-size: 12px; color: #999; margin-top: 10px;">
            下次复习：{{ formatNextReview(item.nextReviewTime) }}
            <span v-if="item.isMastered" style="color: #4caf50; margin-left: 10px;">✓ 已掌握</span>
          </div>
          <div style="margin-top: 10px; text-align: right;">
            <button class="btn btn-secondary" style="padding: 5px 10px;" @click="deleteVocab(item.id)">
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-state-icon">📚</div>
        <h3>还没有生词</h3>
        <p>在学习页面点击单词可以添加生词</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const vocabularies = ref([])
const currentFilter = ref('all')
const reviewMode = ref(false)
const reviewIndex = ref(0)
const showMeaning = ref(false)
const reviewList = ref([])
const dueCount = ref(0)

const filters = [
  { value: 'all', label: '全部' },
  { value: 'unmastered', label: '未掌握' }
]

const filteredVocabularies = computed(() => {
  if (currentFilter.value === 'all') {
    return vocabularies.value
  }
  return vocabularies.value.filter(v => !v.isMastered)
})

const formatNextReview = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = date - now
  if (diff < 0) return '已到期'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days}天后`
}

// 格式化释义内容
const formatMeaning = (meaning) => {
  if (!meaning) return ''
  // 简单格式化：将常见标记替换为更友好的显示
  return meaning
    .replace(/^\d+\.\s*/gm, '') // 移除数字编号
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗标记
    .trim()
}

const loadVocabularies = async () => {
  vocabularies.value = await window.api.vocabulary.getAll()
}

const loadDueCount = async () => {
  try {
    const due = await window.api.vocabulary.getDue()
    dueCount.value = due.length
  } catch (e) {
    dueCount.value = 0
  }
}

const deleteVocab = async (id) => {
  if (confirm('确定删除这个生词？')) {
    await window.api.vocabulary.delete(id)
    await loadVocabularies()
    await loadDueCount()
  }
}

const startReview = async () => {
  try {
    const due = await window.api.vocabulary.getDue()
    if (due.length > 0) {
      reviewList.value = due
    } else {
      reviewList.value = [...filteredVocabularies.value]
    }

    if (reviewList.value.length === 0) {
      alert('没有生词')
      return
    }

    reviewIndex.value = 0
    showMeaning.value = false
    reviewMode.value = true
  } catch (e) {
    reviewList.value = [...filteredVocabularies.value]
    reviewIndex.value = 0
    showMeaning.value = false
    reviewMode.value = true
  }
}

const rateWord = async (quality) => {
  const current = reviewList.value[reviewIndex.value]
  if (current) {
    try {
      await window.api.vocabulary.updateReview({
        id: current.id,
        quality
      })
    } catch (e) {
      console.error('更新复习状态失败:', e)
    }
  }

  // 下一词
  if (reviewIndex.value < reviewList.value.length - 1) {
    reviewIndex.value++
    showMeaning.value = false
  } else {
    alert('复习完成！')
    reviewMode.value = false
    loadVocabularies()
    loadDueCount()
  }
}

const exportVocab = () => {
  if (vocabularies.value.length === 0) {
    alert('没有生词可导出')
    return
  }

  let content = '单词\t释义\n'
  for (const v of vocabularies.value) {
    content += `${v.word}\t${v.meaning || ''}\n`
  }

  // 创建下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `生词本-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await loadVocabularies()
  await loadDueCount()
})
</script>