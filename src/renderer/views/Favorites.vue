<template>
  <div class="page">
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">我的收藏</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <main class="container" style="padding: 20px;">
      <div v-if="favorites.length > 0">
        <div 
          v-for="episode in favorites" 
          :key="episode.id"
          class="episode-item"
          @click="$router.push('/learn/' + episode.id)"
        >
          <div class="episode-info">
            <h3>{{ episode.title }}</h3>
            <div class="episode-meta">
              <span :class="'badge badge-' + episode.difficulty">
                {{ episode.difficulty }}
              </span>
              <span>{{ episode.category }}</span>
            </div>
          </div>
          <button class="btn btn-secondary" @click.stop="removeFavorite(episode.id)">
            ❌
          </button>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-state-icon">❤️</div>
        <h3>还没有收藏</h3>
        <p>点击节目旁边的爱心图标收藏</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const favorites = ref([])

const loadFavorites = async () => {
  favorites.value = await window.api.favorites.getAll()
}

const removeFavorite = async (id) => {
  await window.api.favorites.remove(id)
  await loadFavorites()
}

onMounted(() => {
  loadFavorites()
})
</script>