<template>
  <div v-if="currentEpisode">
    <!-- 折叠状态：侧边悬浮小按钮 -->
    <div v-if="!isExpanded" class="player-mini" @click="isExpanded = true">
      <div class="mini-cover">🎵</div>
      <div class="mini-play-btn">
        <svg v-if="isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>

    <!-- 展开状态：底部全宽播放器 -->
    <div v-else class="player-bar">
      <!-- 头部：关闭按钮 + 标题 + 列表按钮 -->
      <div class="player-header">
        <button class="close-btn" @click="isExpanded = false" title="收起">✕</button>
        <div class="player-title-text">{{ currentEpisode.title }}</div>
        <button class="playlist-btn" @click="showPlaylist = !showPlaylist" title="播放列表">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10h12v2H4zM4 6h12v2H4zM4 14h8v2H4zM14 14v6l5-3z"/></svg>
        </button>
      </div>

      <!-- 第一行：播放控制 (3列) -->
      <div class="player-row1">
        <button class="control-btn" @click="playPrevious" title="上一首">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="control-btn play-btn" @click="togglePlay" title="播放/暂停">
          <svg v-if="isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="control-btn" @click="playNext" title="下一首">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
      </div>

      <!-- 第二行：进度条 + 速度 + 循环 -->
      <div class="player-row2">
        <div class="player-progress" @click="seekProgress">
          <div class="progress-bar">
            <div class="progress" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>
        </div>
        <div class="speed-loop-btns">
          <button class="speed-btn" :class="{ active: playbackRate === speed }" v-for="speed in speeds" :key="speed" @click="setSpeed(speed)">{{ speed }}x</button>
          <button class="loop-btn" :class="{ active: isLooping }" @click="toggleLoop" title="单句循环">🔂</button>
        </div>
      </div>

      <!-- 播放列表 -->
      <div v-if="showPlaylist" class="playlist-overlay" @click.self="showPlaylist = false">
        <div class="playlist-panel">
          <div class="playlist-header">
            <span>播放列表 ({{ playlist.length }})</span>
          </div>
          <div class="playlist-items">
            <div class="playlist-item" v-for="(ep, index) in playlist" :key="index" :class="{ active: index === currentIndex }" @click="playEpisode(index)">
              <span class="playlist-num">{{ index + 1 }}</span>
              <div class="playlist-info">
                <div class="playlist-title">{{ ep.title }}</div>
                <div class="playlist-category">{{ ep.category || '' }}</div>
              </div>
              <span v-if="index === currentIndex" class="playing-icon">▶</span>
            </div>
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
const showTimerMenu = ref(false)
const playbackRate = ref(1)
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

// 循环播放状态
const isLooping = ref(false)
const loopStart = ref(null)
const loopEnd = ref(null)

// 播放控件展开/折叠状态
const isExpanded = ref(false)
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 定时关闭
const sleepTimerSeconds = ref(0)
const sleepTimerOptions = [5, 10, 15, 30, 45, 60]
let sleepTimerInterval = null

const sleepTimerRemaining = computed(() => {
  if (sleepTimerSeconds.value <= 0) return ''
  const mins = Math.floor(sleepTimerSeconds.value / 60)
  const secs = sleepTimerSeconds.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const setSleepTimer = (minutes) => {
  sleepTimerSeconds.value = minutes * 60
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval)
  }
  if (minutes > 0) {
    sleepTimerInterval = setInterval(() => {
      sleepTimerSeconds.value--
      if (sleepTimerSeconds.value <= 0) {
        clearInterval(sleepTimerInterval)
        // 停止播放
        if (audio) {
          audio.pause()
        }
        isPlaying.value = false
        sleepTimerSeconds.value = 0
      }
    }, 1000) // 每秒检查一次
  }
}

const cancelSleepTimer = () => {
  sleepTimerSeconds.value = 0
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval)
    sleepTimerInterval = null
  }
}

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
  // 停止当前播放的音频（防止多个同时播放）
  if (audio) {
    if (window.Capacitor && audio._html5Audio) {
      audio._html5Audio.pause()
      audio._html5Audio.src = ''
    } else if (audio.stop) {
      audio.stop()
    }
    if (audio.unload) {
      audio.unload()
    }
    audio = null
  }

  const ep = playlist.value[index]
  if (!ep || !ep.audioPath) return

  let audioUrl = ep.audioPath
  console.log('Audio URL:', audioUrl)

  // Electron 文件协议
  if (audioUrl.startsWith('file://')) {
    const filePath = audioUrl.replace('file:///', '').replace(/\//g, '\\')
    const base64 = await window.api.readFileAsBase64(filePath)
    if (base64) {
      audioUrl = `data:audio/mp3;base64,${base64}`
    }
  }

  // Capacitor blob URL - 直接使用
  if (audioUrl.startsWith('blob:')) {
    console.log('Using blob URL directly')
  }

  // data URL - 直接使用
  if (audioUrl.startsWith('data:')) {
    console.log('Using data URL')
  }

  if (!audioUrl) return

  // 从 URL 中提取文件扩展名
  let ext = ''
  if (audioUrl.startsWith('data:')) {
    // data URL 使用 mp3 作为默认
    ext = 'mp3'
  } else {
    ext = audioUrl.split('.').pop().split('?')[0].toLowerCase()
  }
  const format = ext || 'mp3'

  // 清理之前的音频
  if (audio) {
    audio.unload()
  }

  console.log('Loading audio:', audioUrl, 'format:', format)

  // Capacitor/Android 使用原生 Audio 元素
  if (window.Capacitor) {
    const audioElement = new Audio()
    audioElement.src = audioUrl
    audioElement.preload = 'auto'

    audioElement.onloadedmetadata = () => {
      console.log('Audio loaded, duration:', audioElement.duration)
      duration.value = audioElement.duration
      audioElement.play().catch(e => console.error('Play error:', e))
      isPlaying.value = true
    }

    audioElement.onerror = (e) => {
      console.error('Audio load error:', e, audioElement.error)
    }

    audioElement.onended = () => {
      playNext()
    }

    audioElement.onplay = () => {
      isPlaying.value = true
      startTimeUpdate()
    }

    audioElement.onpause = () => {
      isPlaying.value = false
      stopTimeUpdate()
    }

    // 保存原生 audio 元素引用
    audio = { _html5Audio: audioElement }
    return
  }

  // Electron 环境使用 Howler
  audio = new Howl({
    src: [audioUrl],
    format: [format],
    html5: true,
    xhr: {
      withCredentials: false
    },
    rate: playbackRate.value,
    onload: () => {
      console.log('Audio loaded, duration:', audio.duration())
      duration.value = audio.duration()
      audio.rate(playbackRate.value)
      audio.play()
      isPlaying.value = true
    },
    onloaderror: (id, error) => {
      console.error('Audio load error:', error)
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
      if (window.Capacitor && audio._html5Audio) {
        currentTime.value = audio._html5Audio.currentTime || 0
      } else {
        currentTime.value = audio.seek() || 0
      }
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
  console.log('togglePlay called, audio:', !!audio, 'isPlaying:', isPlaying.value)

  // 如果没有音频但有播放列表，加载并播放
  if (!audio && playlist.value.length > 0) {
    loadAndPlay(currentIndex.value)
    return
  }

  if (!audio) {
    console.log('No audio loaded')
    return
  }

  // Capacitor 使用原生 Audio
  if (window.Capacitor && audio._html5Audio) {
    const html5Audio = audio._html5Audio
    console.log('Capacitor audio element:', html5Audio)
    if (html5Audio.paused) {
      html5Audio.play().catch(e => console.error('Play error:', e))
    } else {
      html5Audio.pause()
    }
    return
  }

  // Electron 使用 Howler
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
  if (!audio) return

  if (window.Capacitor && audio._html5Audio) {
    audio._html5Audio.currentTime = time
    currentTime.value = time
    return
  }

  audio.seek(time)
  currentTime.value = time
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
/* 移动端悬浮小按钮 */
.player-mini {
  position: fixed;
  bottom: 85px;
  right: 15px;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 1001;
  cursor: pointer;
}

.mini-cover {
  font-size: 20px;
}

.mini-play-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
}

/* 移动端播放器 - 2行3列布局 */
@media (max-width: 768px) {
  .player-bar {
    position: fixed !important;
    bottom: 75px !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
    background: #fff !important;
    padding: 8px 12px !important;
    z-index: 1002 !important;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15) !important;
    border-radius: 16px 16px 0 0 !important;
    max-height: 45vh !important;
    overflow-y: auto !important;
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }

  .close-btn {
    background: #f5f5f5;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: #e0e0e0;
  }

  .player-title-text {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .playlist-btn {
    background: none;
    border: none;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    padding: 5px;
    flex-shrink: 0;
  }

  /* 第一行：3列播放控制 */
  .player-row1 {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin-bottom: 8px;
  }

  .player-row1 .control-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  .player-row1 .play-btn {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    color: #fff;
  }

  /* 第二行：进度条 + 速度/循环 */
  .player-row2 {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .player-progress {
    display: flex;
    align-items: center;
    gap: 8px;
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
    font-size: 11px;
    color: #666;
    min-width: 70px;
    text-align: right;
  }

  .speed-loop-btns {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .speed-btn {
    padding: 3px 6px;
    border: 1px solid #e0e0e0;
    background: #fff;
    border-radius: 10px;
    font-size: 10px;
    cursor: pointer;
  }

  .speed-btn.active {
    background: #667eea;
    color: #fff;
    border-color: #667eea;
  }

  .loop-btn {
    padding: 3px 8px;
    border: 1px solid #e0e0e0;
    background: #fff;
    border-radius: 10px;
    font-size: 12px;
    cursor: pointer;
    margin-left: 4px;
  }

  .loop-btn.active {
    background: #667eea;
    color: #fff;
  }
}

.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100vw;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  padding: 8px 20px;
  z-index: 999 !important;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  min-height: 70px;
}

body.theme-dark .player-bar {
  background: #1e1e1e;
  border-top-color: #333;
}

/* 头部：关闭按钮 + 标题 + 列表按钮 */
.player-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

body.theme-dark .player-header {
  border-bottom-color: #333;
}

.close-btn {
  background: #f5f5f5;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.theme-dark .close-btn {
  background: #333;
  color: #aaa;
}

.close-btn:hover {
  background: #e0e0e0;
}

body.theme-dark .close-btn:hover {
  background: #444;
}

.player-title-text {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

body.theme-dark .player-title-text {
  color: #e0e0e0;
}

.playlist-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 5px;
  flex-shrink: 0;
}

body.theme-dark .playlist-btn {
  color: #aaa;
}

/* 第一行：3列播放控制 */
.player-row1 {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 8px;
}

.player-row1 .control-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

body.theme-dark .player-row1 .control-btn {
  color: #e0e0e0;
}

.player-row1 .play-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  color: #fff;
}

/* 第二行：进度条 + 速度/循环 */
.player-row2 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-row2 .player-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-row2 .progress-bar {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  cursor: pointer;
}

body.theme-dark .player-row2 .progress-bar {
  background: #333;
}

.player-row2 .progress {
  height: 100%;
  background: #667eea;
  border-radius: 2px;
}

.player-row2 .time-display {
  font-size: 11px;
  color: #666;
  min-width: 70px;
  text-align: right;
}

body.theme-dark .player-row2 .time-display {
  color: #aaa;
}

.speed-loop-btns {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.speed-btn {
  padding: 3px 6px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 10px;
  font-size: 10px;
  cursor: pointer;
}

body.theme-dark .speed-btn {
  background: #333;
  border-color: #444;
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
  border-color: #667eea;
}

.loop-btn {
  padding: 3px 8px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 4px;
}

body.theme-dark .loop-btn {
  background: #333;
  border-color: #444;
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
  border-color: #667eea;
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