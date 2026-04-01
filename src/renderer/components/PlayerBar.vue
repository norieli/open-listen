<template>
  <div v-if="currentEpisode" class="player-bar">
    <!-- 播放信息 -->
    <div class="player-info" @click="openLearn">
      <div class="player-cover">🎵</div>
      <div class="player-title">
        <div class="title">{{ currentEpisode.title }}</div>
        <div class="subtitle">{{ currentEpisode.category }}</div>
      </div>
    </div>

    <!-- 播放控制 -->
    <div class="player-controls">
      <button class="control-btn" @click="playPrevious" title="上一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button class="control-btn play-btn" @click="togglePlay">
        <svg v-if="isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="control-btn" @click="playNext" title="下一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
      <button class="control-btn" @click="showPlaylist = !showPlaylist" title="播放列表">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
      </button>
    </div>

    <!-- 进度条 -->
    <div class="player-progress" @click="seekProgress">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="time-display">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>
    </div>

    <!-- 速度控制 -->
    <div class="speed-control">
      <button
        v-for="speed in speeds"
        :key="speed"
        class="speed-btn"
        :class="{ active: playbackRate === speed }"
        @click="setSpeed(speed)"
      >
        {{ speed }}x
      </button>
    </div>

    <!-- 循环控制 -->
    <div class="loop-control">
      <button
        class="loop-btn"
        :class="{ active: isLooping }"
        @click="toggleLoop"
        title="单句循环"
      >
        🔂
      </button>
      <button
        v-if="isLooping"
        class="loop-btn"
        @click="setLoopStart"
        :class="{ active: loopStart !== null }"
        title="设置循环起点"
      >
        A
      </button>
      <button
        v-if="isLooping && loopStart !== null"
        class="loop-btn"
        @click="setLoopEnd"
        :class="{ active: loopEnd !== null }"
        title="设置循环终点"
      >
        B
      </button>
      <button
        v-if="isLooping"
        class="loop-btn"
        @click="clearLoop"
        title="清除循环"
      >
        ✕
      </button>
    </div>

    <!-- 播放列表 -->
    <div v-if="showPlaylist" class="playlist-overlay" @click.self="showPlaylist = false">
      <div class="playlist-panel">
        <div class="playlist-header">
          <h3>播放列表</h3>
          <span style="color: #666;">{{ playlist.length }} 首</span>
          <button class="btn btn-secondary" style="margin-left: auto;" @click="showPlaylist = false">关闭</button>
        </div>
        <div class="playlist-items">
          <div
            v-for="(ep, index) in playlist"
            :key="ep.id"
            class="playlist-item"
            :class="{ active: ep.id === currentEpisode.id }"
            @click="playEpisode(index)"
          >
            <span class="playlist-num">{{ index + 1 }}</span>
            <div class="playlist-info">
              <div class="playlist-title">{{ ep.title }}</div>
              <div class="playlist-category">{{ ep.category }}</div>
            </div>
            <span v-if="ep.id === currentEpisode.id" class="playing-icon">🎵</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Howl } from 'howler'

// 播放状态
const playlist = ref([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const showPlaylist = ref(false)
const playbackRate = ref(1)
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

// 循环播放状态
const isLooping = ref(false)
const loopStart = ref(null)
const loopEnd = ref(null)

let audio = null

const currentEpisode = computed(() => {
  return playlist.value[currentIndex.value] || null
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 设置播放列表
const setPlaylist = (episodes, startIndex = 0) => {
  playlist.value = episodes
  currentIndex.value = startIndex
  if (episodes.length > 0) {
    loadAndPlay(startIndex)
  }
}

// 加载并播放
const loadAndPlay = async (index) => {
  if (audio) {
    audio.unload()
  }

  const ep = playlist.value[index]
  if (!ep || !ep.audioPath) return

  let audioUrl = ep.audioPath
  if (audioUrl.startsWith('file://')) {
    const filePath = audioUrl.replace('file:///', '').replace(/\//g, '\\')
    const base64 = await window.api.readFileAsBase64(filePath)
    if (base64) {
      audioUrl = `data:audio/mp3;base64,${base64}`
    }
  }

  if (!audioUrl) return

  audio = new Howl({
    src: [audioUrl],
    html5: true,
    rate: playbackRate.value,
    onload: () => {
      duration.value = audio.duration()
      audio.rate(playbackRate.value)
      audio.play()
      isPlaying.value = true
    },
    onend: () => {
      playNext()
    },
    onplay: () => {
      isPlaying.value = true
      startTimeUpdate()
    },
    onpause: () => {
      isPlaying.value = false
      stopTimeUpdate()
    },
    onstop: () => {
      isPlaying.value = false
      stopTimeUpdate()
    }
  })
}

let timeInterval = null
const startTimeUpdate = () => {
  stopTimeUpdate()
  timeInterval = setInterval(() => {
    if (audio) {
      currentTime.value = audio.seek() || 0
      checkLoop()
    }
  }, 250)
}
const stopTimeUpdate = () => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
}

// 打开学习页
const openLearn = () => {
  if (currentEpisode.value) {
    window.location.hash = `#/learn/${currentEpisode.value.id}`
  }
}

// 播放控制
const togglePlay = () => {
  if (!audio) return
  if (isPlaying.value) {
    audio.pause()
  } else {
    audio.play()
  }
}

const playEpisode = (index) => {
  currentIndex.value = index
  loadAndPlay(index)
}

const playNext = () => {
  if (currentIndex.value < playlist.value.length - 1) {
    currentIndex.value++
    loadAndPlay(currentIndex.value)
  } else {
    // 循环到第一首
    currentIndex.value = 0
    loadAndPlay(0)
  }
}

const playPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    loadAndPlay(currentIndex.value)
  } else {
    // 循环到最后一首
    currentIndex.value = playlist.value.length - 1
    loadAndPlay(currentIndex.value)
  }
}

const seekProgress = (e) => {
  if (!audio || !duration.value) return
  const rect = e.target.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const seekTime = percent * duration.value
  audio.seek(seekTime)
  currentTime.value = seekTime
}

// 设置播放速度
const setSpeed = (speed) => {
  playbackRate.value = speed
  if (audio) {
    audio.rate(speed)
  }
}

// 跳转到指定时间
const seekTo = (time) => {
  if (audio) {
    audio.seek(time)
    currentTime.value = time
  }
}

// 循环播放控制
const toggleLoop = () => {
  isLooping.value = !isLooping.value
  if (!isLooping.value) {
    loopStart.value = null
    loopEnd.value = null
  }
}

const setLoopStart = () => {
  loopStart.value = currentTime.value
  if (loopEnd.value === null) {
    loopEnd.value = currentTime.value + 10
  }
}

const setLoopEnd = () => {
  loopEnd.value = currentTime.value
}

const clearLoop = () => {
  loopStart.value = null
  loopEnd.value = null
  isLooping.value = false
}

// 检查并处理循环播放
const checkLoop = () => {
  if (isLooping.value && loopStart.value !== null && loopEnd.value !== null) {
    if (currentTime.value >= loopEnd.value) {
      audio.seek(loopStart.value)
      currentTime.value = loopStart.value
    }
  }
}

// 清理
onUnmounted(() => {
  if (audio) {
    audio.unload()
  }
  stopTimeUpdate()
})

// 暴露方法给外部
defineExpose({
  setPlaylist,
  getPlaylist: () => playlist.value,
  playEpisode,
  getCurrentIndex: () => currentIndex.value,
  getCurrentTime: () => currentTime.value,
  getDuration: () => duration.value,
  getIsPlaying: () => isPlaying.value,
  getPlaybackRate: () => playbackRate.value,
  seekTo,
  togglePlay,
  setSpeed
})
</script>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 100;
}

body.theme-dark .player-bar {
  background: #1e1e1e;
  border-top-color: #333;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
  cursor: pointer;
}

.player-cover {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.player-title .title {
  font-size: 14px;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.theme-dark .player-title .title {
  color: #e0e0e0;
}

.player-title .subtitle {
  font-size: 12px;
  color: #666;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.theme-dark .control-btn {
  color: #e0e0e0;
}

.control-btn.play-btn {
  color: #667eea;
}

.player-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  cursor: pointer;
}

.progress {
  height: 100%;
  background: #667eea;
  border-radius: 2px;
}

.time-display {
  font-size: 12px;
  color: #666;
  min-width: 80px;
}

/* 速度控制 */
.speed-control {
  display: flex;
  gap: 4px;
}

.speed-btn {
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  color: #666;
}

body.theme-dark .speed-btn {
  background: #333;
  color: #aaa;
}

.speed-btn:hover {
  background: #e0e0e0;
}

body.theme-dark .speed-btn:hover {
  background: #444;
}

.speed-btn.active {
  background: #667eea;
  color: #fff;
}

/* 循环控制 */
.loop-control {
  display: flex;
  gap: 4px;
  align-items: center;
}

.loop-btn {
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: #666;
}

body.theme-dark .loop-btn {
  background: #333;
  color: #aaa;
}

.loop-btn:hover {
  background: #e0e0e0;
}

body.theme-dark .loop-btn:hover {
  background: #444;
}

.loop-btn.active {
  background: #667eea;
  color: #fff;
}

/* 播放列表 */
.playlist-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 101;
}

.playlist-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  max-height: 70%;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

body.theme-dark .playlist-panel {
  background: #1e1e1e;
}

.playlist-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

body.theme-dark .playlist-header {
  border-bottom-color: #333;
}

.playlist-items {
  max-height: 400px;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}

body.theme-dark .playlist-item {
  border-bottom-color: #333;
}

.playlist-item:hover {
  background: #f5f5f5;
}

body.theme-dark .playlist-item:hover {
  background: #2d2d2d;
}

.playlist-item.active {
  background: #e3f2fd;
}

body.theme-dark .playlist-item.active {
  background: #1a2d4a;
}

.playlist-num {
  width: 30px;
  color: #999;
  font-size: 14px;
}

.playlist-info {
  flex: 1;
}

.playlist-title {
  font-size: 14px;
}

body.theme-dark .playlist-title {
  color: #e0e0e0;
}

.playlist-category {
  font-size: 12px;
  color: #666;
}

.playing-icon {
  margin-left: 10px;
}
</style>