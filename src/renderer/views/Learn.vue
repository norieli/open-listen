<template>
  <div class="page">
    <!-- 顶部导航 -->
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand" style="cursor: pointer" @click="$router.push('/')">
          ← 返回
        </div>
        <div class="navbar-title">{{ episode?.title || '加载中...' }}</div>
        <div style="width: 60px;"></div>
      </div>
    </nav>

    <!-- 学习页面主体 -->
    <main class="container" style="padding: 20px;" v-if="episode">
      <!-- 音频播放器 -->
      <div class="audio-player">
        <div class="audio-controls">
          <button class="play-btn" @click="togglePlay">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          
          <div class="progress-bar" @click="seekAudio">
            <div class="progress" :style="{ width: progressPercent + '%' }"></div>
          </div>
          
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>
          
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
        </div>
      </div>

      <!-- 标签页 -->
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'listen' }"
          @click="activeTab = 'listen'"
        >
          🎧 听
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'read' }"
          @click="activeTab = 'read'"
        >
          📖 读
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'practice' }"
          @click="activeTab = 'practice'"
        >
          ✍️ 练
        </div>
      </div>

      <!-- 听 - 听力模式 -->
      <div v-show="activeTab === 'listen'" class="tab-content">
        <div class="card">
          <h3 class="card-title">🎧 听力练习</h3>
          <p style="color: #666; margin-bottom: 20px;">
            点击播放按钮开始盲听，不要看原文哦~
          </p>
          <div class="text-center">
            <button class="btn btn-primary" style="font-size: 18px; padding: 15px 40px;" @click="startListening">
              {{ hasListened ? '🔊 重新听' : '🎧 开始听' }}
            </button>
          </div>
          <div v-if="hasListened" style="margin-top: 20px; text-align: center;">
            <button class="btn btn-success" @click="activeTab = 'read'">
              去读原文 →
            </button>
          </div>
        </div>
      </div>

      <!-- 读 - 原文 -->
      <div v-show="activeTab === 'read'" class="tab-content">
        <div class="transcript">
          <div v-if="currentLineIndex >= 0" style="margin-bottom: 20px; padding: 15px; background: #5d5d5d; border-radius: 8px; color: #fff;">
            <strong>当前播放：</strong>{{ transcriptLines[currentLineIndex]?.text }}
          </div>
          
          <p
            v-for="(line, index) in transcriptLines"
            :key="index"
            :class="{ current: currentLineIndex === index }"
            @click="playFromLine(index)"
            @dblclick="onWordClick(line.text)"
          >
            <span style="color: #999; margin-right: 10px;">{{ index + 1 }}</span>
            {{ line.text }}
          </p>
        </div>

        <!-- 译文 -->
        <div class="card mt-20" v-if="episode.translation">
          <h3 class="card-title">📝 译文</h3>
          <div v-html="formattedTranslation"></div>
        </div>
      </div>

      <!-- 练 - 做题 -->
      <div v-show="activeTab === 'practice'" class="tab-content">
        <!-- AI 生成题目 -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="flex" style="justify-content: space-between; align-items: center;">
            <div>
              <h3 class="card-title" style="margin-bottom: 5px;">📝 练习</h3>
              <p style="color: #666; font-size: 13px; margin: 0;">
                共 {{ questions.length }} 道题
              </p>
            </div>
            <button
              class="btn btn-primary"
              @click="generateQuestionsWithAI"
              :disabled="generatingQuestions"
            >
              {{ generatingQuestions ? '🤖 生成中...' : '🤖 AI 生成题目' }}
            </button>
          </div>
        </div>

        <div v-if="!quizStarted && questions.length === 0" class="card text-center">
          <h3>📝 开始测验</h3>
          <p style="margin: 20px 0;">共 {{ questions.length }} 道题</p>
          <button class="btn btn-primary" style="font-size: 18px; padding: 15px 40px;" @click="startQuiz">
            开始答题
          </button>
        </div>

        <div v-else>
          <!-- 答题完成 -->
          <div v-if="quizCompleted" class="card text-center">
            <h3>🎉 答题完成！</h3>
            <div style="font-size: 48px; margin: 30px 0;">
              {{ correctCount }} / {{ questions.length }}
            </div>
            <p style="margin-bottom: 30px;">
              正确率：{{ Math.round(correctCount / questions.length * 100) }}%
            </p>
            <div class="flex gap-10" style="justify-content: center;">
              <button class="btn btn-secondary" @click="reviewWrongAnswers">
                复习错题
              </button>
              <button class="btn btn-primary" @click="restartQuiz">
                再答一次
              </button>
              <button class="btn btn-primary" @click="$router.push('/')">
                返回首页
              </button>
            </div>
          </div>

          <!-- 答题中 -->
          <div v-else>
            <div class="question-card">
              <div class="question-text">
                <strong>第 {{ currentQuestionIndex + 1 }} 题：</strong>
                {{ currentQuestion?.question }}
              </div>
              
              <div class="options">
                <div 
                  v-for="(option, index) in currentQuestion?.options" 
                  :key="index"
                  class="option"
                  :class="{ 
                    selected: selectedAnswer === option,
                    correct: showResult && option === currentQuestion.correctAnswer,
                    wrong: showResult && selectedAnswer === option && option !== currentQuestion.correctAnswer
                  }"
                  @click="selectAnswer(option)"
                >
                  {{ option }}
                </div>
              </div>

              <!-- 解析 -->
              <div v-if="showResult" class="explanation">
                <strong>{{ selectedAnswer === currentQuestion.correctAnswer ? '✅ 回答正确！' : '❌ 回答错误' }}</strong>
                <p style="margin-top: 10px;">{{ currentQuestion.explanation }}</p>
              </div>

              <!-- 操作按钮 -->
              <div class="flex gap-10 mt-20" style="justify-content: center;">
                <button 
                  v-if="!showResult" 
                  class="btn btn-primary" 
                  :disabled="!selectedAnswer"
                  @click="submitAnswer"
                >
                  提交答案
                </button>
                <button 
                  v-if="showResult" 
                  class="btn btn-primary"
                  @click="nextQuestion"
                >
                  {{ currentQuestionIndex < questions.length - 1 ? '下一题' : '查看结果' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>

    <!-- 单词查询对话框 -->
    <div v-if="wordLookupDialog" class="modal-overlay" @click.self="wordLookupDialog = false">
      <div class="modal-content card" style="max-width: 500px; width: 90%;">
        <h3 class="card-title">查询单词: {{ lookupWord }}</h3>
        <div v-if="lookingUp" style="text-align: center; padding: 30px;">
          <div class="loading">🤔 查询中...</div>
        </div>
        <div v-else-if="lookupResult" style="padding: 15px 0;">
          <div style="white-space: pre-wrap; line-height: 1.8;">{{ lookupResult }}</div>
          <div class="flex gap-10" style="margin-top: 20px; justify-content: center;">
            <button class="btn btn-primary" @click="addToVocabulary">
              📚 加入生词本
            </button>
            <button class="btn btn-secondary" @click="wordLookupDialog = false">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Howl } from 'howler'

const route = useRoute()

// 状态
const episode = ref(null)
const questions = ref([])
const audio = ref(null)
const audioUrl = ref(null)

// 播放状态
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

// 循环播放状态
const isLooping = ref(false)
const loopStart = ref(null)
const loopEnd = ref(null)

// 断点续听
const savedPosition = ref(0)

// 标签页
const activeTab = ref('listen')
const hasListened = ref(false)

// 原文
const transcriptLines = ref([])
const currentLineIndex = ref(-1)

// 答题
const quizStarted = ref(false)
const currentQuestionIndex = ref(0)
const selectedAnswer = ref(null)
const showResult = ref(false)
const quizCompleted = ref(false)
const correctCount = ref(0)
const wrongAnswers = ref([])
const generatingQuestions = ref(false)

// 单词查询
const wordLookupDialog = ref(false)
const lookupWord = ref('')
const lookupResult = ref('')
const lookingUp = ref(false)

// 计算属性
const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value]
})

const formattedTranslation = computed(() => {
  if (!episode.value?.translation) return ''
  return episode.value.translation.split('\n').map(p => `<p>${p}</p>`).join('')
})

// 方法
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const togglePlay = () => {
  if (!audio.value) return
  if (isPlaying.value) {
    audio.value.pause()
    isPlaying.value = false
  } else {
    audio.value.play()
    isPlaying.value = true
  }
}

const seekAudio = (e) => {
  if (!audio.value || !duration.value) return
  const rect = e.target.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  audio.value.seek(percent * duration.value)
  currentTime.value = percent * duration.value
}

const setSpeed = (speed) => {
  playbackRate.value = speed
  if (audio.value) {
    audio.value.rate(speed)
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
    // 如果没有设置终点，默认循环当前句子的长度
    const currentLine = transcriptLines.value[currentLineIndex.value]
    if (currentLine) {
      // 找到下一句的时间作为终点
      const currentIndex = currentLineIndex.value
      if (currentIndex < transcriptLines.value.length - 1) {
        loopEnd.value = transcriptLines.value[currentIndex + 1].time
      } else {
        loopEnd.value = currentTime.value + 10 // 默认加10秒
      }
    }
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
      audio.value.seek(loopStart.value)
      currentTime.value = loopStart.value
    }
  }
}

const startListening = () => {
  hasListened.value = true
  togglePlay() // Use unified togglePlay
  updateStatus('listening')
}

const parseLRC = (lrcText) => {
  if (!lrcText) return []
  const lines = lrcText.split('\n')
  const result = []
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
  
  for (const line of lines) {
    const match = line.match(timeRegex)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3].padEnd(3, '0'))
      const time = minutes * 60 + seconds + milliseconds / 1000
      result.push({ time, text: match[4].trim() })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

const playFromLine = (index) => {
  currentLineIndex.value = index
  if (audio.value && transcriptLines.value[index]) {
    audio.value.seek(transcriptLines.value[index].time)
    currentTime.value = transcriptLines.value[index].time
    if (!isPlaying.value) {
      togglePlay()
    }
  }
}

// 答题相关
const startQuiz = () => {
  quizStarted.value = true
  quizCompleted.value = false
  currentQuestionIndex.value = 0
  correctCount.value = 0
  wrongAnswers.value = []
  selectedAnswer.value = null
  showResult.value = false
}

const selectAnswer = (option) => {
  if (showResult.value) return
  selectedAnswer.value = option
}

const submitAnswer = () => {
  if (!selectedAnswer.value || showResult.value) return

  showResult.value = true

  const isCorrect = selectedAnswer.value === currentQuestion.value.correctAnswer
  if (isCorrect) {
    correctCount.value++
  } else {
    wrongAnswers.value.push(currentQuestion.value)
    // 保存到错题本（options 需要转成字符串）
    try {
      window.api.wrongAnswers.add({
        questionId: currentQuestion.value.id,
        episodeId: episode.value.id,
        question: currentQuestion.value.question,
        options: JSON.stringify(currentQuestion.value.options),
        correctAnswer: currentQuestion.value.correctAnswer,
        userAnswer: selectedAnswer.value,
        explanation: currentQuestion.value.explanation
      })
    } catch (e) {
      console.error('保存错题失败:', e)
    }
  }
}

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
    selectedAnswer.value = null
    showResult.value = false
  } else {
    // 答题完成，显示结果页面
    quizCompleted.value = true
    updateStatus('completed')
  }
}

// 开始新的答题
const restartQuiz = () => {
  quizCompleted.value = false
  currentQuestionIndex.value = 0
  selectedAnswer.value = null
  showResult.value = false
  correctCount.value = 0
  wrongAnswers.value = []
}

const reviewWrongAnswers = () => {
  // TODO: 跳转到错题本
}

const updateStatus = async (status) => {
  await window.api.progress.save({
    episodeId: episode.value.id,
    status,
    audioPosition: currentTime.value,
    wrongAnswers: wrongAnswers.value.map(w => w.id)
  })
}

// 加载数据
const loadEpisode = async () => {
  const id = route.params.id
  episode.value = await window.api.episodes.getById(id)

  if (episode.value) {
    // 解析LRC歌词
    transcriptLines.value = parseLRC(episode.value.lrc)

    // 解析题目
    try {
      questions.value = JSON.parse(episode.value.questions || '[]')
      // 兼容处理：确保 correctAnswer 与 options 格式一致
      questions.value = questions.value.map(q => {
        if (q.options && q.correctAnswer) {
          // 如果 correctAnswer 只是单个字母如 "A"，找到对应选项
          if (q.correctAnswer.length <= 2) {
            const matched = q.options.find(opt => opt.startsWith(q.correctAnswer + '.'))
            if (matched) {
              q.correctAnswer = matched
            }
          }
        }
        return q
      })
    } catch (e) {
      questions.value = []
    }

    // 加载音频
    if (episode.value.audioPath) {
      const audioPath = episode.value.audioPath

      // 如果是file:// URL，读取为base64
      if (audioPath.startsWith('file://')) {
        const filePath = audioPath.replace('file:///', '').replace(/\//g, '\\')
        const base64 = await window.api.readFileAsBase64(filePath)
        if (base64) {
          audioUrl.value = `data:audio/mp3;base64,${base64}`
        }
      } else {
        audioUrl.value = audioPath
      }

      if (audioUrl.value) {
        audio.value = new Howl({
          src: [audioUrl.value],
          html5: true,
          onload: () => {
            duration.value = audio.value.duration()
            // 恢复播放位置
            if (savedPosition.value > 0) {
              audio.value.seek(savedPosition.value)
              currentTime.value = savedPosition.value
            }
          },
          onloaderror: (id, error) => {
            console.error('Audio load error:', error)
          },
          onplayerror: (id, error) => {
            console.error('Audio play error:', error)
          },
          onend: () => {
            isPlaying.value = false
          }
        })

        // 手动轮询播放时间 (更可靠)
        let timePoll = null
        watch(isPlaying, (playing) => {
          if (playing) {
            timePoll = setInterval(() => {
              if (audio.value) {
                const seekTime = audio.value.seek()
                if (typeof seekTime === 'number') {
                  currentTime.value = seekTime
                  // 检查循环播放
                  checkLoop()
                  // 更新当前行
                  if (transcriptLines.value.length > 0) {
                    for (let i = transcriptLines.value.length - 1; i >= 0; i--) {
                      if (currentTime.value >= transcriptLines.value[i].time) {
                        currentLineIndex.value = i
                        break
                      }
                    }
                  }
                }
              }
            }, 250)
          } else {
            if (timePoll) {
              clearInterval(timePoll)
              timePoll = null
            }
          }
        })
      }
    }

    // 加载进度
    const progress = await window.api.progress.get(id)
    if (progress) {
      if (progress.status === 'listening') {
        hasListened.value = true
        activeTab.value = 'read'
      } else if (progress.status === 'reading') {
        hasListened.value = true
        activeTab.value = 'read'
      } else if (progress.status === 'completed') {
        activeTab.value = 'practice'
      }
      // 恢复播放位置（音频加载后）
      if (progress.audioPosition) {
        savedPosition.value = progress.audioPosition
      }
    }
  }
}

// 获取 AI 设置
const getAISettings = () => {
  const saved = localStorage.getItem('app-settings')
  if (saved) {
    return JSON.parse(saved)
  }
  return {
    aiProvider: 'deepseek',
    aiApiKey: '',
    aiModel: 'deepseek-chat'
  }
}

// AI 生成题目
const generateQuestionsWithAI = async () => {
  const aiSettings = getAISettings()

  if (!aiSettings.aiApiKey) {
    alert('请先在设置页面配置 AI API Key')
    return
  }

  if (!episode.value.lrc && !episode.value.transcript) {
    alert('没有找到原文内容，无法生成题目')
    return
  }

  generatingQuestions.value = true

  try {
    const result = await window.api.ai.generateQuestions({
      provider: aiSettings.aiProvider,
      apiKey: aiSettings.aiApiKey,
      model: aiSettings.aiModel,
      customUrl: aiSettings.customApiUrl,
      customModel: aiSettings.customModelName,
      transcript: episode.value.lrc || episode.value.transcript,
      translation: episode.value.translation,
      title: episode.value.title
    })

    if (result.success && result.questions) {
      questions.value = result.questions
      // 兼容处理：确保 correctAnswer 与 options 格式一致
      questions.value = questions.value.map(q => {
        if (q.options && q.correctAnswer) {
          if (q.correctAnswer.length <= 2) {
            const matched = q.options.find(opt => opt.startsWith(q.correctAnswer + '.'))
            if (matched) {
              q.correctAnswer = matched
            }
          }
        }
        return q
      })
      // 保存到数据库
      await window.api.episodes.updateQuestions(episode.value.id, JSON.stringify(questions.value))
      alert(`成功生成 ${questions.value.length} 道题目！`)
    } else {
      alert('生成失败：' + (result.error || '未知错误'))
    }
  } catch (e) {
    alert('生成失败：' + e.message)
  } finally {
    generatingQuestions.value = false
  }
}

// 单词查询
const onWordClick = async (text) => {
  // 提取第一个单词
  const word = text.trim().split(/\s+/)[0].replace(/[^a-zA-Z-]/g, '')
  if (!word || word.length < 2) return

  const aiSettings = getAISettings()
  if (!aiSettings.aiApiKey) {
    alert('请先在设置页面配置 AI API Key')
    return
  }

  lookupWord.value = word
  lookupResult.value = ''
  wordLookupDialog.value = true
  lookingUp.value = true

  try {
    const result = await window.api.ai.lookupWord({
      provider: aiSettings.aiProvider,
      apiKey: aiSettings.aiApiKey,
      model: aiSettings.aiModel,
      customUrl: aiSettings.customApiUrl,
      customModel: aiSettings.customModelName,
      word
    })

    if (result.success) {
      lookupResult.value = result.result
    } else {
      lookupResult.value = '查询失败：' + result.error
    }
  } catch (e) {
    lookupResult.value = '查询失败：' + e.message
  } finally {
    lookingUp.value = false
  }
}

const addToVocabulary = async () => {
  if (!lookupWord.value) return

  await window.api.vocabulary.add({
    word: lookupWord.value,
    meaning: lookupResult.value,
    episodeId: episode.value?.id
  })

  alert('已添加到生词本')
  wordLookupDialog.value = false
}

onMounted(() => {
  loadEpisode()
})

onUnmounted(() => {
  // 保存播放进度
  if (episode.value && currentTime.value > 0) {
    window.api.progress.save({
      episodeId: episode.value.id,
      status: hasListened.value ? 'reading' : 'listening',
      audioPosition: currentTime.value,
      wrongAnswers: []
    })
  }
  if (audio.value) {
    audio.value.unload()
  }
})

// 监听离开页面保存进度
watch(activeTab, (newTab) => {
  if (newTab === 'read' && hasListened.value) {
    updateStatus('reading')
  }
})
</script>