<template>
  <div id="app" :class="{ 'is-mobile': isMobile }">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isMobile = ref(false)

onMounted(() => {
  // 检测设备类型
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f7fa;
}

#app.is-mobile {
  font-size: 14px;
}
</style>