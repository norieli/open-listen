<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">错题本 ({{ wrongAnswers.length }})</div>
        <div style="width: 60px;">
          <button v-if="wrongAnswers.length > 0" class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" @click="deleteAll">
            清空
          </button>
        </div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <!-- 复习模式 -->
      <div v-if="reviewMode" class="card">
        <div style="text-align: center;">
          <div style="margin-bottom: 15px; color: #666;">
            {{ reviewIndex + 1 }} / {{ reviewList.length }}
          </div>
          <div class="question-text" style="font-size: 18px; margin-bottom: 20px;">
            {{ reviewList[reviewIndex]?.question }}
          </div>

          <div class="options" style="max-width: 500px; margin: 0 auto 20px;">
            <div
              v-for="(option, idx) in parseOptions(reviewList[reviewIndex]?.options)"
              :key="idx"
              class="option"
              :class="{
                selected: selectedAnswer === option,
                correct: showAnswer && option === reviewList[reviewIndex]?.correctAnswer,
                wrong: showAnswer && selectedAnswer === option && option !== reviewList[reviewIndex]?.correctAnswer
              }"
              @click="selectAnswer(option)"
            >
              {{ option }}
            </div>
          </div>

          <div v-if="showAnswer" class="explanation" style="text-align: left; max-width: 500px; margin: 0 auto 20px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <strong>解析：</strong>{{ reviewList[reviewIndex]?.explanation }}
          </div>

          <div class="flex gap-10" style="justify-content: center; flex-wrap: wrap;">
            <template v-if="!showAnswer">
              <button class="btn btn-primary" :disabled="!selectedAnswer" @click="submitReviewAnswer">
                提交
              </button>
            </template>
            <template v-else>
              <div class="flex gap-10" style="justify-content: center; width: 100%; margin-bottom: 15px;">
                <button class="btn" style="background: #ff5252; color: white;" @click="rateAnswer(1)">
                  😢 忘了
                </button>
                <button class="btn" style="background: #ff9800; color: white;" @click="rateAnswer(2)">
                  😕 记不清
                </button>
                <button class="btn" style="background: #ffc107; color: #333;" @click="rateAnswer(3)">
                  😐 一般
                </button>
                <button class="btn" style="background: #8bc34a; color: white;" @click="rateAnswer(4)">
                  😊 记得
                </button>
                <button class="btn" style="background: #4caf50; color: white;" @click="rateAnswer(5)">
                  🤩 记住
                </button>
              </div>
            </template>
            <button class="btn btn-secondary" @click="exitReviewMode">
              退出复习
            </button>
          </div>
        </div>
      </div>

      <!-- 正常模式 -->
      <template v-else>
        <!-- 复习提醒 -->
        <div v-if="dueCount > 0" class="card" style="padding: 15px; margin-bottom: 20px; background: #fff3e0; border: 1px solid #ffb74d;">
          <div class="flex" style="justify-content: space-between; align-items: center;">
            <div>
              <strong>📅 待复习</strong>
              <p style="margin: 5px 0 0; color: #666; font-size: 13px;">
                您有 {{ dueCount }} 道错题需要复习
              </p>
            </div>
            <button class="btn btn-primary" @click="startReview">
              开始复习
            </button>
          </div>
        </div>

        <!-- 筛选 -->
        <div class="card" style="padding: 15px;">
          <div class="flex gap-10" style="align-items: center; flex-wrap: wrap;">
            <span style="color: #666;">筛选：</span>
            <select class="form-input" style="width: auto; min-width: 200px;" v-model="selectedEpisode">
              <option value="">全部节目</option>
              <option v-for="ep in episodes" :key="ep.id" :value="ep.id">
                {{ ep.title }}
              </option>
            </select>
          </div>
        </div>

      <!-- 错题列表 -->
      <div v-if="filteredWrongAnswers.length > 0">
        <div v-for="(item, index) in filteredWrongAnswers" :key="item.id" class="card">
          <div class="flex" style="justify-content: space-between; margin-bottom: 10px;">
            <div style="color: #666; font-size: 13px;">
              {{ getEpisodeTitle(item.episodeId) }} · {{ formatDate(item.wrongAt) }}
            </div>
            <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 12px;" @click="deleteWrong(item.id)">
              删除
            </button>
          </div>
          <div class="question-text" style="font-size: 15px; margin-bottom: 15px;">
            {{ index + 1 }}. {{ item.question }}
          </div>
          <div class="options">
            <div
              v-for="(option, idx) in parseOptions(item.options)"
              :key="idx"
              class="option"
              :class="{
                correct: option === item.correctAnswer,
                wrong: option === item.userAnswer
              }"
            >
              {{ option }}
            </div>
          </div>
          <div class="explanation" style="margin-top: 15px;">
            <strong>解析：</strong>{{ item.explanation }}
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-state-icon">📝</div>
        <h3>还没有错题</h3>
        <p>答错的题目会显示在这里</p>
      </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const wrongAnswers = ref([])
const episodes = ref([])
const selectedEpisode = ref('')

// 复习相关
const reviewMode = ref(false)
const reviewList = ref([])
const reviewIndex = ref(0)
const selectedAnswer = ref('')
const showAnswer = ref(false)
const dueCount = ref(0)

const filteredWrongAnswers = computed(() => {
  if (!selectedEpisode.value) {
    return wrongAnswers.value
  }
  return wrongAnswers.value.filter(w => w.episodeId === selectedEpisode.value)
})

const parseOptions = (optionsStr) => {
  try {
    return JSON.parse(optionsStr)
  } catch (e) {
    return []
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString()
}

const getEpisodeTitle = (episodeId) => {
  const ep = episodes.value.find(e => e.id === episodeId)
  return ep?.title || '未知节目'
}

const loadWrongAnswers = async () => {
  wrongAnswers.value = await window.api.wrongAnswers.getAll()
}

const loadEpisodes = async () => {
  episodes.value = await window.api.episodes.getAll()
}

// 加载待复习数量
const loadDueCount = async () => {
  try {
    const due = await window.api.wrongAnswers.getDue()
    dueCount.value = due.length
  } catch (e) {
    dueCount.value = 0
  }
}

// 开始复习
const startReview = async () => {
  try {
    const due = await window.api.wrongAnswers.getDue()
    if (due.length === 0) {
      // 如果没有待复习的，使用所有错题
      reviewList.value = [...wrongAnswers.value]
    } else {
      reviewList.value = due
    }

    if (reviewList.value.length === 0) {
      alert('没有错题')
      return
    }

    reviewIndex.value = 0
    selectedAnswer.value = ''
    showAnswer.value = false
    reviewMode.value = true
  } catch (e) {
    console.error('加载复习数据失败:', e)
    reviewList.value = [...wrongAnswers.value]
    reviewIndex.value = 0
    selectedAnswer.value = ''
    showAnswer.value = false
    reviewMode.value = true
  }
}

const exitReviewMode = () => {
  reviewMode.value = false
}

const selectAnswer = (option) => {
  if (showAnswer.value) return
  selectedAnswer.value = option
}

const submitReviewAnswer = () => {
  if (!selectedAnswer.value) return
  showAnswer.value = true
}

const rateAnswer = async (quality) => {
  const current = reviewList.value[reviewIndex.value]
  if (current) {
    try {
      await window.api.wrongAnswers.updateReview({
        id: current.id,
        quality
      })
    } catch (e) {
      console.error('更新复习状态失败:', e)
    }
  }

  // 下一题
  if (reviewIndex.value < reviewList.value.length - 1) {
    reviewIndex.value++
    selectedAnswer.value = ''
    showAnswer.value = false
  } else {
    alert('复习完成！')
    reviewMode.value = false
    loadDueCount()
  }
}

const deleteWrong = async (id) => {
  if (confirm('确定删除这道错题？')) {
    await window.api.wrongAnswers.delete(id)
    await loadWrongAnswers()
    await loadDueCount()
  }
}

const deleteAll = async () => {
  if (confirm('确定清空所有错题？')) {
    for (const item of wrongAnswers.value) {
      await window.api.wrongAnswers.delete(item.id)
    }
    await loadWrongAnswers()
    await loadDueCount()
  }
}

onMounted(async () => {
  await loadEpisodes()
  await loadWrongAnswers()
  await loadDueCount()
})
</script>