<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">生词本</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <div class="card">
        <div class="card-title">我的生词 ({{ vocabularies.length }})</div>
      </div>

      <div v-if="vocabularies.length > 0">
        <div v-for="item in vocabularies" :key="item.id" class="card flex" style="justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 18px; font-weight: 600;">{{ item.word }}</div>
            <div style="color: #666;">{{ item.meaning }}</div>
          </div>
          <button class="btn btn-danger" @click="deleteVocab(item.id)">删除</button>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-state-icon">📚</div>
        <h3>还没有生词</h3>
        <p>点击单词可以添加生词</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const vocabularies = ref([])

const loadVocabularies = async () => {
  vocabularies.value = await window.api.vocabulary.getAll()
}

const deleteVocab = async (id) => {
  await window.api.vocabulary.delete(id)
  await loadVocabularies()
}

onMounted(() => {
  loadVocabularies()
})
</script>