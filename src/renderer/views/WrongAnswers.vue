<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">错题本</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <div class="card">
        <div class="card-title">我的错题 ({{ wrongAnswers.length }})</div>
      </div>

      <div v-if="wrongAnswers.length > 0">
        <div v-for="(item, index) in wrongAnswers" :key="item.id" class="card">
          <div style="margin-bottom: 10px; color: #666; font-size: 13px;">
            错误时间：{{ formatDate(item.wrongAt) }}
          </div>
          <div class="question-text" style="font-size: 15px; margin-bottom: 15px;">
            {{ item.question }}
          </div>
          <div class="options">
            <div 
              v-for="(option, idx) in JSON.parse(item.options)" 
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
          <div class="flex gap-10 mt-10">
            <button class="btn btn-secondary" @click="deleteWrong(item.id)">
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-state-icon">📝</div>
        <h3>还没有错题</h3>
        <p>答错的题目会显示在这里</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const wrongAnswers = ref([])

const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString()
}

const loadWrongAnswers = async () => {
  wrongAnswers.value = await window.api.wrongAnswers.getAll()
}

const deleteWrong = async (id) => {
  await window.api.wrongAnswers.delete(id)
  await loadWrongAnswers()
}

onMounted(() => {
  loadWrongAnswers()
})
</script>