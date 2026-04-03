import database from './database'
import { Dialog } from '@capacitor/dialog'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

// 初始化数据库
async function initApp() {
  await database.initDatabase()
  await database.addDemoData()
}

// 节目管理
const episodes = {
  getAll: () => database.queryAll('SELECT * FROM episodes ORDER BY createdAt DESC'),
  getById: (id) => database.queryOne('SELECT * FROM episodes WHERE id = ?', [id]),
  add: async (episode) => {
    database.runSql(`
      INSERT INTO episodes (id, title, difficulty, category, audioPath, transcript, translation, lrc, questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      episode.id,
      episode.title,
      episode.difficulty,
      episode.category,
      episode.audioPath,
      episode.transcript,
      episode.translation,
      episode.lrc,
      JSON.stringify(episode.questions || [])
    ])
    // 手动保存
    await database.saveDatabase()
    return { success: true }
  },
  delete: async (id) => {
    database.runSql('DELETE FROM user_progress WHERE episodeId = ?', [id])
    database.runSql('DELETE FROM favorites WHERE episodeId = ?', [id])
    database.runSql('DELETE FROM wrong_answers WHERE episodeId = ?', [id])
    database.runSql('DELETE FROM episodes WHERE id = ?', [id])
    await database.saveDatabase()
    return { success: true }
  },
  updateQuestions: (id, questions) => {
    database.runSql('UPDATE episodes SET questions = ? WHERE id = ?', [questions, id])
    return { success: true }
  },
  updateCollection: (id, collectionId) => {
    database.runSql('UPDATE episodes SET collectionId = ? WHERE id = ?', [collectionId, id])
    return { success: true }
  }
}

// 合集管理
const collections = {
  getAll: () => database.queryAll('SELECT * FROM collections ORDER BY createdAt DESC'),
  add: (data) => {
    const id = 'col_' + Date.now()
    database.runSql('INSERT INTO collections (id, name, description) VALUES (?, ?, ?)', [id, data.name, data.description || ''])
    return { success: true, id }
  },
  delete: (id) => {
    database.runSql('UPDATE episodes SET collectionId = NULL WHERE collectionId = ?', [id])
    database.runSql('DELETE FROM collections WHERE id = ?', [id])
    return { success: true }
  },
  update: (data) => {
    const { id, name, description } = data
    database.runSql('UPDATE collections SET name = ?, description = ? WHERE id = ?', [name, description || '', id])
    return { success: true }
  }
}

// 用户进度
const progress = {
  get: (episodeId) => database.queryOne('SELECT * FROM user_progress WHERE episodeId = ?', [episodeId]),
  save: (data) => {
    const { episodeId, status, audioPosition, wrongAnswers } = data
    const existing = database.queryOne('SELECT id FROM user_progress WHERE episodeId = ?', [episodeId])

    if (existing) {
      database.runSql(`
        UPDATE user_progress
        SET status = ?, audioPosition = ?, wrongAnswers = ?, completedAt = ?
        WHERE episodeId = ?
      `, [status, audioPosition, JSON.stringify(wrongAnswers), status === 'completed' ? Date.now() : null, episodeId])
    } else {
      database.runSql(`
        INSERT INTO user_progress (episodeId, status, audioPosition, wrongAnswers, completedAt)
        VALUES (?, ?, ?, ?, ?)
      `, [episodeId, status, audioPosition, JSON.stringify(wrongAnswers), status === 'completed' ? Date.now() : null])
    }
    return { success: true }
  }
}

// 错题本
const wrongAnswers = {
  add: (data) => {
    database.runSql(`
      INSERT INTO wrong_answers (questionId, episodeId, question, options, correctAnswer, userAnswer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.questionId,
      data.episodeId,
      data.question,
      data.options,
      data.correctAnswer,
      data.userAnswer,
      data.explanation
    ])
    return { success: true }
  },
  getAll: () => database.queryAll('SELECT * FROM wrong_answers ORDER BY wrongAt DESC'),
  delete: (id) => {
    database.runSql('DELETE FROM wrong_answers WHERE id = ?', [id])
    return { success: true }
  },
  updateReviewCount: (id) => {
    database.runSql('UPDATE wrong_answers SET reviewCount = reviewCount + 1 WHERE id = ?', [id])
    return { success: true }
  },
  updateReview: (data) => {
    const { id, quality } = data
    const item = database.queryOne('SELECT * FROM wrong_answers WHERE id = ?', [id])
    if (!item) return { success: false, error: '找不到错题' }

    let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = item

    // SM-2 算法
    if (quality >= 3) {
      if (reviewCount === 0) interval = 1
      else if (reviewCount === 1) interval = 6
      else interval = Math.round(interval * easeFactor)
      reviewCount++
    } else {
      interval = 1
      reviewCount = 0
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if (easeFactor < 1.3) easeFactor = 1.3

    const nextReviewTime = Date.now() + interval * 24 * 60 * 60 * 1000
    const isMastered = quality >= 4 && reviewCount >= 3 ? 1 : 0

    database.runSql(`
      UPDATE wrong_answers
      SET reviewCount = ?, easeFactor = ?, interval = ?, nextReviewTime = ?, isMastered = ?
      WHERE id = ?
    `, [reviewCount, easeFactor, interval, nextReviewTime, isMastered, id])

    return { success: true, nextReviewTime, isMastered }
  },
  getDue: () => {
    const now = Date.now()
    return database.queryAll(`
      SELECT * FROM wrong_answers
      WHERE (nextReviewTime IS NULL OR nextReviewTime <= ?)
      AND isMastered = 0
      ORDER BY nextReviewTime ASC
    `, [now])
  }
}

// 收藏
const favorites = {
  add: (episodeId) => {
    try {
      database.runSql('INSERT OR IGNORE INTO favorites (episodeId) VALUES (?)', [episodeId])
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  },
  remove: (episodeId) => {
    database.runSql('DELETE FROM favorites WHERE episodeId = ?', [episodeId])
    return { success: true }
  },
  getAll: () => database.queryAll(`
    SELECT e.* FROM episodes e
    INNER JOIN favorites f ON e.id = f.episodeId
    ORDER BY f.addedAt DESC
  `)
}

// 生词本
const vocabulary = {
  add: (data) => {
    database.runSql('INSERT INTO vocabularies (word, meaning, episodeId) VALUES (?, ?, ?)', [data.word, data.meaning, data.episodeId])
    return { success: true }
  },
  getAll: () => database.queryAll('SELECT * FROM vocabularies ORDER BY createdAt DESC'),
  delete: (id) => {
    database.runSql('DELETE FROM vocabularies WHERE id = ?', [id])
    return { success: true }
  },
  updateReview: (data) => {
    const { id, quality } = data
    const item = database.queryOne('SELECT * FROM vocabularies WHERE id = ?', [id])
    if (!item) return { success: false, error: '找不到词汇' }

    let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = item

    if (quality >= 3) {
      if (reviewCount === 0) interval = 1
      else if (reviewCount === 1) interval = 6
      else interval = Math.round(interval * easeFactor)
      reviewCount++
    } else {
      interval = 1
      reviewCount = 0
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if (easeFactor < 1.3) easeFactor = 1.3

    const nextReviewTime = Date.now() + interval * 24 * 60 * 60 * 1000
    const isMastered = quality >= 4 && reviewCount >= 3 ? 1 : 0

    database.runSql(`
      UPDATE vocabularies
      SET reviewCount = ?, easeFactor = ?, interval = ?, nextReviewTime = ?, isMastered = ?
      WHERE id = ?
    `, [reviewCount, easeFactor, interval, nextReviewTime, isMastered, id])

    return { success: true, nextReviewTime, isMastered }
  },
  getDue: () => {
    const now = Date.now()
    return database.queryAll(`
      SELECT * FROM vocabularies
      WHERE (nextReviewTime IS NULL OR nextReviewTime <= ?)
      AND isMastered = 0
      ORDER BY nextReviewTime ASC
    `, [now])
  }
}

// 文件对话框（Capacitor 兼容）
const dialog = {
  async openFile(options) {
    // Capacitor 环境使用系统文件选择器
    if (window.Capacitor) {
      // Capacitor 没有原生文件选择器，使用 input 代替
      return {
        canceled: false,
        filePath: null,
        needsCustomPicker: true
      }
    }
    // Electron 环境 - 调用原有 API
    return window.api?.dialog?.openFile(options) || { canceled: true }
  },
  async openDirectory() {
    if (window.Capacitor) {
      return null // Capacitor 不支持目录选择
    }
    return window.api?.dialog?.openDirectory() || null
  },
  async prompt(options) {
    if (window.Capacitor) {
      const inputValue = await Dialog.prompt({
        title: options.title || '输入',
        message: options.message || '',
        okButtonTitle: '确定',
        cancelButtonTitle: '取消'
      })
      return { confirmed: !inputValue.cancelled, value: inputValue.value }
    }
    return window.api?.dialog?.prompt(options) || { confirmed: false }
  },
  async confirm(options) {
    if (window.Capacitor) {
      const result = await Dialog.confirm({
        title: options.title || '确认',
        message: options.message || '',
        okButtonTitle: '确定',
        cancelButtonTitle: '取消'
      })
      return result.value
    }
    return window.api?.dialog?.confirm(options) || false
  }
}

// 文件操作
const file = {
  async readAsBase64(filePath) {
    if (window.Capacitor) {
      try {
        const result = await Filesystem.readFile({
          path: filePath,
          encoding: 'base64'
        })
        return result.data
      } catch (e) {
        console.error('Read file error:', e)
        return null
      }
    }
    return window.api?.readFileAsBase64(filePath) || null
  },
  async readText(filePath) {
    if (window.Capacitor) {
      try {
        const result = await Filesystem.readFile({
          path: filePath,
          encoding: 'utf8'
        })
        return result.data
      } catch (e) {
        console.error('Read text error:', e)
        return null
      }
    }
    return window.api?.readFileText(filePath) || null
  },
  async writeFile(path, data, encoding = 'utf8') {
    if (window.Capacitor) {
      await Filesystem.writeFile({
        path,
        data,
        encoding
      })
      return { success: true }
    }
    return { success: false }
  }
}

// 文件夹扫描
const folder = {
  async scan(folderPath) {
    if (window.Capacitor) {
      // Capacitor 环境 - 简化实现
      return []
    }
    return window.api?.scanFolder(folderPath) || []
  }
}

// 数据库管理
const databaseApi = {
  async backup() {
    if (window.Capacitor) {
      await database.saveDatabase()
      return { success: true }
    }
    return window.api?.database?.backup() || { success: false }
  },
  async restore() {
    if (window.Capacitor) {
      return { success: false, error: 'Capacitor 不支持恢复数据库' }
    }
    return window.api?.database?.restore() || { success: false }
  },
  async clear() {
    database.runSql('DELETE FROM episodes')
    database.runSql('DELETE FROM user_progress')
    database.runSql('DELETE FROM wrong_answers')
    database.runSql('DELETE FROM favorites')
    database.runSql('DELETE FROM vocabularies')
    return { success: true }
  }
}

// 学习统计
const stats = {
  get: () => {
    try {
      const episodeCount = database.queryOne('SELECT COUNT(*) as count FROM episodes')?.count || 0
      const completedCount = database.queryOne("SELECT COUNT(*) as count FROM user_progress WHERE status = 'completed'")?.count || 0
      const wrongCount = database.queryOne('SELECT COUNT(*) as count FROM wrong_answers')?.count || 0
      const vocabCount = database.queryOne('SELECT COUNT(*) as count FROM vocabularies')?.count || 0
      const favoriteCount = database.queryOne('SELECT COUNT(*) as count FROM favorites')?.count || 0

      const recentProgress = database.queryAll('SELECT * FROM user_progress ORDER BY completedAt DESC LIMIT 10')
      let streakDays = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const p of recentProgress) {
        if (p.completedAt) {
          const completedDate = new Date(p.completedAt)
          completedDate.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24))
          if (diffDays <= streakDays + 1) {
            streakDays = diffDays
          } else {
            break
          }
        }
      }

      return {
        success: true,
        stats: { episodeCount, completedCount, wrongCount, vocabCount, favoriteCount, streakDays }
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}

// 设置存储
const settings = {
  async get(key) {
    if (window.Capacitor) {
      const result = await Preferences.get({ key })
      return result.value
    }
    const setting = database.queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return setting?.value
  },
  async set(key, value) {
    if (window.Capacitor) {
      await Preferences.set({ key, value })
      return
    }
    database.runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
  }
}

// 导出 API
const api = {
  initApp,
  episodes,
  collections,
  progress,
  wrongAnswers,
  favorites,
  vocabulary,
  dialog,
  file,
  folder,
  database: databaseApi,
  stats,
  settings
}

export default api