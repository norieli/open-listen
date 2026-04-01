import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import log from 'electron-log'
import initSqlJs from 'sql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 注册协议处理本地文件
function registerProtocol() {
  protocol.handle('local-file', (request) => {
    const filePath = request.url.replace('local-file://', '')
    const decodedPath = decodeURIComponent(filePath)
    return net.fetch('file://' + decodedPath)
  })
}

// 配置日志
log.transports.file.level = 'info'
log.info('Application starting...')

// 全局变量
let mainWindow = null
let db = null
let dbPath = null

// 保存数据库到文件
function saveDatabase() {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}

// 初始化数据库
async function initDatabase() {
  dbPath = join(app.getPath('userData'), 'english-pod.db')
  log.info('Database path:', dbPath)

  const SQL = await initSqlJs()

  // 加载已有数据库或创建新的
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT DEFAULT 'intermediate',
      category TEXT DEFAULT 'general',
      audioPath TEXT,
      transcript TEXT,
      translation TEXT,
      lrc TEXT,
      questions TEXT,
      collectionId TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  // 合集表
  db.run(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episodeId TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      audioPosition REAL DEFAULT 0,
      completedAt INTEGER,
      wrongAnswers TEXT DEFAULT '[]',
      FOREIGN KEY (episodeId) REFERENCES episodes(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS wrong_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questionId TEXT NOT NULL,
      episodeId TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correctAnswer TEXT NOT NULL,
      userAnswer TEXT NOT NULL,
      explanation TEXT,
      wrongAt INTEGER DEFAULT (strftime('%s', 'now')),
      reviewCount INTEGER DEFAULT 0,
      isMastered INTEGER DEFAULT 0,
      nextReviewTime INTEGER,
      easeFactor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 1
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episodeId TEXT NOT NULL UNIQUE,
      addedAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (episodeId) REFERENCES episodes(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS vocabularies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      meaning TEXT,
      episodeId TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      reviewCount INTEGER DEFAULT 0,
      isMastered INTEGER DEFAULT 0,
      nextReviewTime INTEGER,
      easeFactor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 1
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  saveDatabase()
  log.info('Database initialized successfully')
}

// 数据库迁移 - 添加新字段
function migrateDatabase() {
  try {
    // 为 episodes 添加合集字段
    db.run('ALTER TABLE episodes ADD COLUMN collectionId TEXT')
  } catch (e) {}

  try {
    // 创建 collections 表
    db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)
  } catch (e) {}

  try {
    // 为 wrong_answers 添加间隔重复字段
    db.run('ALTER TABLE wrong_answers ADD COLUMN isMastered INTEGER DEFAULT 0')
  } catch (e) {
    // 字段可能已存在，忽略错误
  }
  try {
    db.run('ALTER TABLE wrong_answers ADD COLUMN nextReviewTime INTEGER')
  } catch (e) {}
  try {
    db.run('ALTER TABLE wrong_answers ADD COLUMN easeFactor REAL DEFAULT 2.5')
  } catch (e) {}
  try {
    db.run('ALTER TABLE wrong_answers ADD COLUMN interval INTEGER DEFAULT 1')
  } catch (e) {}

  try {
    // 为 vocabularies 添加间隔重复字段
    db.run('ALTER TABLE vocabularies ADD COLUMN reviewCount INTEGER DEFAULT 0')
  } catch (e) {}
  try {
    db.run('ALTER TABLE vocabularies ADD COLUMN isMastered INTEGER DEFAULT 0')
  } catch (e) {}
  try {
    db.run('ALTER TABLE vocabularies ADD COLUMN nextReviewTime INTEGER')
  } catch (e) {}
  try {
    db.run('ALTER TABLE vocabularies ADD COLUMN easeFactor REAL DEFAULT 2.5')
  } catch (e) {}
  try {
    db.run('ALTER TABLE vocabularies ADD COLUMN interval INTEGER DEFAULT 1')
  } catch (e) {}

  saveDatabase()
  log.info('Database migration completed')
}

// 添加示例数据
function addDemoData() {
  const episodes = queryAll('SELECT id FROM episodes')
  if (episodes.length > 0) return

  log.info('Adding demo episodes...')

  // 获取public目录路径
  const publicPath = join(app.getAppPath(), 'public')

  // 示例音频列表
  const demoEpisodes = [
    {
      id: 'demo001',
      title: 'If You Want to Grow Apples, Choose the Tastiest',
      difficulty: 'intermediate',
      category: '生活',
      audioFile: 'if-you-want-to-grow-apples-choose-the-tastiest.mp3',
      lrcFile: 'if-you-want-to-grow-apples-choose-the-tastiest.lrc',
      translation: '如果你考虑种植苹果，现在是测试不同品种并与当地种植者交流的好时机。这个建议来自园艺作家李·赖克。他的著作包括《剪枝书》和《无草园艺》。'
    },
    {
      id: 'demo002',
      title: 'Google Launches New Pixel Phones, Tablet, Home Hub',
      difficulty: 'intermediate',
      category: '科技',
      audioFile: 'google-launches-new-pixel-phones-slate-tablet-and-home-hub.mp3',
      lrcFile: 'google-launches-new-pixel-phones-slate-tablet-and-home-hub.lrc',
      translation: '谷歌发布了最新版本的Pixel智能手机，以及新的平板电脑和智能家居控制器。这些新产品是在周二纽约的一次活动中宣布的。'
    },
    {
      id: 'demo003',
      title: 'What Is Art Deco and Why Is It Popular Again?',
      difficulty: 'intermediate',
      category: '文化',
      audioFile: 'what-is-art-deco-and-why-is-it-popular-again.mp3',
      lrcFile: 'what-is-art-deco-and-why-is-it-popular-again.lrc',
      translation: '装饰艺术是一种国际艺术风格，在20世纪20年代和30年代非常流行。如今，人们对这种风格及其特性的兴趣正在增长。'
    }
  ]

  for (const demo of demoEpisodes) {
    // 读取LRC文件
    let lrcContent = ''
    const lrcPath = join(publicPath, 'audio', demo.lrcFile)
    if (existsSync(lrcPath)) {
      lrcContent = readFileSync(lrcPath, 'utf-8')
    }

    // 使用 file:// 协议
    const audioFilePath = join(publicPath, 'audio', demo.audioFile)
    const audioPath = `file:///${audioFilePath.replace(/\\/g, '/')}`

    runSql(`
      INSERT INTO episodes (id, title, difficulty, category, audioPath, transcript, translation, lrc, questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      demo.id,
      demo.title,
      demo.difficulty,
      demo.category,
      audioPath,
      lrcContent,
      demo.translation,
      lrcContent,
      '[]'
    ])
  }

  log.info('Demo episodes added successfully')
}

// 辅助函数：将sql.js结果转为对象数组
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const results = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  return results
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

function runSql(sql, params = []) {
  db.run(sql, params)
  saveDatabase()
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    title: 'English Pod AI'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    log.info('Main window shown')
  })

  // 加载页面
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC处理器 - 节目相关
ipcMain.handle('episodes:getAll', () => {
  return queryAll('SELECT * FROM episodes ORDER BY createdAt DESC')
})

ipcMain.handle('episodes:getById', (_, id) => {
  return queryOne('SELECT * FROM episodes WHERE id = ?', [id])
})

ipcMain.handle('episodes:add', (_, episode) => {
  runSql(`
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
  return { success: true }
})

ipcMain.handle('episodes:delete', (_, id) => {
  runSql('DELETE FROM episodes WHERE id = ?', [id])
  return { success: true }
})

// 更新节目题目
ipcMain.handle('episodes:updateQuestions', (_, data) => {
  const { id, questions } = data
  runSql('UPDATE episodes SET questions = ? WHERE id = ?', [questions, id])
  return { success: true }
})

// 更新节目的合集
ipcMain.handle('episodes:updateCollection', (_, data) => {
  const { id, collectionId } = data
  runSql('UPDATE episodes SET collectionId = ? WHERE id = ?', [collectionId, id])
  return { success: true }
})

// 合集管理
ipcMain.handle('collections:getAll', () => {
  return queryAll('SELECT * FROM collections ORDER BY createdAt DESC')
})

ipcMain.handle('collections:add', (_, data) => {
  const id = 'col_' + Date.now()
  runSql('INSERT INTO collections (id, name, description) VALUES (?, ?, ?)', [id, data.name, data.description || ''])
  return { success: true, id }
})

ipcMain.handle('collections:delete', (_, id) => {
  // 删除合集时，将该合集下的节目设为无合集
  runSql('UPDATE episodes SET collectionId = NULL WHERE collectionId = ?', [id])
  runSql('DELETE FROM collections WHERE id = ?', [id])
  return { success: true }
})

ipcMain.handle('collections:update', (_, data) => {
  const { id, name, description } = data
  runSql('UPDATE collections SET name = ?, description = ? WHERE id = ?', [name, description || '', id])
  return { success: true }
})

// IPC处理器 - 用户进度
ipcMain.handle('progress:get', (_, episodeId) => {
  return queryOne('SELECT * FROM user_progress WHERE episodeId = ?', [episodeId])
})

ipcMain.handle('progress:save', (_, data) => {
  const { episodeId, status, audioPosition, wrongAnswers } = data
  const existing = queryOne('SELECT id FROM user_progress WHERE episodeId = ?', [episodeId])

  if (existing) {
    runSql(`
      UPDATE user_progress
      SET status = ?, audioPosition = ?, wrongAnswers = ?, completedAt = ?
      WHERE episodeId = ?
    `, [status, audioPosition, JSON.stringify(wrongAnswers), status === 'completed' ? Date.now() : null, episodeId])
  } else {
    runSql(`
      INSERT INTO user_progress (episodeId, status, audioPosition, wrongAnswers, completedAt)
      VALUES (?, ?, ?, ?, ?)
    `, [episodeId, status, audioPosition, JSON.stringify(wrongAnswers), status === 'completed' ? Date.now() : null])
  }
  return { success: true }
})

// IPC处理器 - 错题本
ipcMain.handle('wrongAnswers:add', (_, data) => {
  runSql(`
    INSERT INTO wrong_answers (questionId, episodeId, question, options, correctAnswer, userAnswer, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    data.questionId,
    data.episodeId,
    data.question,
    data.options, // 前端已经转为字符串
    data.correctAnswer,
    data.userAnswer,
    data.explanation
  ])
  return { success: true }
})

ipcMain.handle('wrongAnswers:getAll', () => {
  return queryAll('SELECT * FROM wrong_answers ORDER BY wrongAt DESC')
})

ipcMain.handle('wrongAnswers:delete', (_, id) => {
  runSql('DELETE FROM wrong_answers WHERE id = ?', [id])
  return { success: true }
})

ipcMain.handle('wrongAnswers:updateReviewCount', (_, id) => {
  runSql('UPDATE wrong_answers SET reviewCount = reviewCount + 1 WHERE id = ?', [id])
  return { success: true }
})

// 更新错题复习状态 (SM-2 算法)
ipcMain.handle('wrongAnswers:updateReview', (_, data) => {
  const { id, quality } = data // quality: 0-5, 0=完全忘记, 5=完全记住
  const item = queryOne('SELECT * FROM wrong_answers WHERE id = ?', [id])
  if (!item) return { success: false, error: '找不到错题' }

  let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = item

  // SM-2 算法
  if (quality >= 3) {
    if (reviewCount === 0) {
      interval = 1
    } else if (reviewCount === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    reviewCount++
  } else {
    interval = 1
    reviewCount = 0
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  const nextReviewTime = Date.now() + interval * 24 * 60 * 60 * 1000
  const isMastered = quality >= 4 && reviewCount >= 3 ? 1 : 0

  runSql(`
    UPDATE wrong_answers
    SET reviewCount = ?, easeFactor = ?, interval = ?, nextReviewTime = ?, isMastered = ?
    WHERE id = ?
  `, [reviewCount, easeFactor, interval, nextReviewTime, isMastered, id])

  return { success: true, nextReviewTime, isMastered }
})

// 获取待复习的错题
ipcMain.handle('wrongAnswers:getDue', () => {
  const now = Date.now()
  return queryAll(`
    SELECT * FROM wrong_answers
    WHERE (nextReviewTime IS NULL OR nextReviewTime <= ?)
    AND isMastered = 0
    ORDER BY nextReviewTime ASC
  `, [now])
})

// IPC处理器 - 收藏
ipcMain.handle('favorites:add', (_, episodeId) => {
  try {
    runSql('INSERT OR IGNORE INTO favorites (episodeId) VALUES (?)', [episodeId])
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('favorites:remove', (_, episodeId) => {
  runSql('DELETE FROM favorites WHERE episodeId = ?', [episodeId])
  return { success: true }
})

ipcMain.handle('favorites:getAll', () => {
  return queryAll(`
    SELECT e.* FROM episodes e
    INNER JOIN favorites f ON e.id = f.episodeId
    ORDER BY f.addedAt DESC
  `)
})

// IPC处理器 - 生词本
ipcMain.handle('vocabulary:add', (_, data) => {
  runSql('INSERT INTO vocabularies (word, meaning, episodeId) VALUES (?, ?, ?)', [data.word, data.meaning, data.episodeId])
  return { success: true }
})

ipcMain.handle('vocabulary:getAll', () => {
  return queryAll('SELECT * FROM vocabularies ORDER BY createdAt DESC')
})

ipcMain.handle('vocabulary:delete', (_, id) => {
  runSql('DELETE FROM vocabularies WHERE id = ?', [id])
  return { success: true }
})

// 更新词汇复习状态 (SM-2 算法)
ipcMain.handle('vocabulary:updateReview', (_, data) => {
  const { id, quality } = data
  const item = queryOne('SELECT * FROM vocabularies WHERE id = ?', [id])
  if (!item) return { success: false, error: '找不到词汇' }

  let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = item

  // SM-2 算法
  if (quality >= 3) {
    if (reviewCount === 0) {
      interval = 1
    } else if (reviewCount === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    reviewCount++
  } else {
    interval = 1
    reviewCount = 0
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  const nextReviewTime = Date.now() + interval * 24 * 60 * 60 * 1000
  const isMastered = quality >= 4 && reviewCount >= 3 ? 1 : 0

  runSql(`
    UPDATE vocabularies
    SET reviewCount = ?, easeFactor = ?, interval = ?, nextReviewTime = ?, isMastered = ?
    WHERE id = ?
  `, [reviewCount, easeFactor, interval, nextReviewTime, isMastered, id])

  return { success: true, nextReviewTime, isMastered }
})

// 获取待复习的词汇
ipcMain.handle('vocabulary:getDue', () => {
  const now = Date.now()
  return queryAll(`
    SELECT * FROM vocabularies
    WHERE (nextReviewTime IS NULL OR nextReviewTime <= ?)
    AND isMastered = 0
    ORDER BY nextReviewTime ASC
  `, [now])
})

// IPC处理器 - 文件选择
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] },
      { name: 'Text', extensions: ['txt', 'lrc'] }
    ]
  })
  return result
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// 扫描文件夹中的音频文件
ipcMain.handle('folder:scan', async (_, folderPath) => {
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
  const files = []

  try {
    const entries = readdirSync(folderPath)
    for (const name of entries) {
      const fullPath = join(folderPath, name)
      const stat = statSync(fullPath)
      if (stat.isFile()) {
        const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
        if (audioExtensions.includes(ext)) {
          files.push({ name, path: fullPath })
        }
      }
    }
  } catch (e) {
    log.error('scanFolder error:', e)
  }

  return files
})

// 读取文本文件
ipcMain.handle('file:readText', async (_, filePath) => {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (e) {
    log.error('readFileText error:', e)
    return null
  }
})

// 提示对话框
ipcMain.handle('dialog:prompt', async (_, options) => {
  const { title, message, defaultValue } = options
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['取消', '确定'],
    title: title || '输入',
    message: message,
    detail: defaultValue
  })
  // 这里不能真正获取用户输入，改用简单的确认框
  return { confirmed: result.response === 1 }
})

// 确认对话框
ipcMain.handle('dialog:confirm', async (_, options) => {
  const { title, message } = options
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['取消', '确定'],
    title: title || '确认',
    message: message
  })
  return result.response === 1
})

// 读取文件为Base64
ipcMain.handle('file:readAsBase64', async (_, filePath) => {
  try {
    const buffer = readFileSync(filePath)
    return buffer.toString('base64')
  } catch (e) {
    log.error('Failed to read file:', e)
    return null
  }
})

// 数据库备份
ipcMain.handle('database:backup', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '备份数据库',
      defaultPath: `openlisten-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }]
    })

    if (!result.canceled && result.filePath) {
      if (db) {
        const data = db.export()
        const buffer = Buffer.from(data)
        writeFileSync(result.filePath, buffer)
        return { success: true, path: result.filePath }
      }
    }
    return { success: false }
  } catch (e) {
    log.error('Backup failed:', e)
    return { success: false, error: e.message }
  }
})

// 数据库恢复
ipcMain.handle('database:restore', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '恢复数据库',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const fileBuffer = readFileSync(filePath)

      // 加载恢复的数据库
      const SQL = await initSqlJs()
      const newDb = new SQL.Database(fileBuffer)

      // 替换当前数据库
      if (db) {
        db.close()
      }
      db = newDb
      saveDatabase()

      return { success: true }
    }
    return { success: false }
  } catch (e) {
    log.error('Restore failed:', e)
    return { success: false, error: e.message }
  }
})

// 清空数据库
ipcMain.handle('database:clear', async () => {
  try {
    // 删除所有数据表
    db.run('DELETE FROM episodes')
    db.run('DELETE FROM user_progress')
    db.run('DELETE FROM wrong_answers')
    db.run('DELETE FROM favorites')
    db.run('DELETE FROM vocabularies')
    saveDatabase()
    return { success: true }
  } catch (e) {
    log.error('Clear failed:', e)
    return { success: false, error: e.message }
  }
})

// 获取学习统计
ipcMain.handle('stats:get', async () => {
  try {
    const episodeCount = queryOne('SELECT COUNT(*) as count FROM episodes')?.count || 0
    const completedCount = queryOne("SELECT COUNT(*) as count FROM user_progress WHERE status = 'completed'")?.count || 0
    const wrongCount = queryOne('SELECT COUNT(*) as count FROM wrong_answers')?.count || 0
    const vocabCount = queryOne('SELECT COUNT(*) as count FROM vocabularies')?.count || 0
    const favoriteCount = queryOne('SELECT COUNT(*) as count FROM favorites')?.count || 0

    // 获取最近学习记录来计算连续天数
    const recentProgress = queryAll('SELECT * FROM user_progress ORDER BY completedAt DESC LIMIT 10')
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
      stats: {
        episodeCount,
        completedCount,
        wrongCount,
        vocabCount,
        favoriteCount,
        streakDays
      }
    }
  } catch (e) {
    log.error('Get stats failed:', e)
    return { success: false, error: e.message }
  }
})

// 测试 AI 连接
ipcMain.handle('ai:testConnection', async (_, options) => {
  try {
    const { provider, apiKey, customUrl, customModel } = options

    const apiUrls = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/chat/completions'
    }

    let url = customUrl || apiUrls[provider] || apiUrls.deepseek
    const modelName = customModel ||
      (provider === 'deepseek' ? 'deepseek-chat' :
       provider === 'openai' ? 'gpt-3.5-turbo' :
       provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'deepseek-chat')

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    // Anthropic 需要特殊处理
    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Say "hello"' }],
        max_tokens: 10
      })
    })

    if (response.ok) {
      return { success: true, message: '连接成功！AI 配置正确。' }
    } else {
      const error = await response.json()
      return { success: false, message: error.error?.message || `错误: ${response.status}` }
    }
  } catch (e) {
    log.error('AI test connection error:', e)
    return { success: false, message: `连接失败: ${e.message}` }
  }
})

// AI 对话 API
ipcMain.handle('ai:chat', async (_, options) => {
  try {
    const { provider, apiKey, model, messages, customUrl, customModel } = options

    const apiUrls = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/chat/completions'
    }

    let url = customUrl || apiUrls[provider] || apiUrls.deepseek
    const modelName = customModel || model || 'deepseek-chat'

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    // Anthropic 需要特殊处理
    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'API 请求失败' }
    }

    const data = await response.json()

    // Anthropic 响应格式不同
    if (provider === 'anthropic') {
      return {
        success: true,
        content: data.content?.[0]?.text || ''
      }
    }

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || ''
    }
  } catch (e) {
    log.error('AI chat error:', e)
    return { success: false, error: e.message }
  }
})

// AI 生成题目
ipcMain.handle('ai:generateQuestions', async (_, options) => {
  try {
    const { provider, apiKey, model, customUrl, customModel, transcript, translation, title } = options

    const prompt = `你是一个英语学习助手。请根据以下音频内容的原文和翻译，设计3-5道理解选择题。

音频标题：${title}

原文歌词/字幕：
${transcript}

中文翻译：
${translation}

请生成选择题，格式如下（JSON数组）：
[
  {
    "id": "q1",
    "question": "问题内容（英文）",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "correctAnswer": "A. 选项1",
    "explanation": "解析说明（英文）"
  }
]

请注意：correctAnswer 必须与 options 数组中的某个选项完全一致（包括前缀字母）。
请只返回JSON数组，不要其他内容。`

    const apiUrls = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/chat/completions'
    }

    let url = customUrl || apiUrls[provider] || apiUrls.deepseek
    const modelName = customModel || model || 'deepseek-chat'

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'API 请求失败' }
    }

    const data = await response.json()

    let content
    if (provider === 'anthropic') {
      content = data.content?.[0]?.text
    } else {
      content = data.choices?.[0]?.message?.content
    }

    // 解析 JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0])
      return { success: true, questions }
    }

    return { success: false, error: '无法解析生成的题目' }
  } catch (e) {
    log.error('AI generate questions error:', e)
    return { success: false, error: e.message }
  }
})

// AI 单词查询
ipcMain.handle('ai:lookupWord', async (_, options) => {
  try {
    const { provider, apiKey, model, customUrl, customModel, word } = options

    const prompt = `请解释以下英语单词，给出：
1. 音标
2. 词性
3. 中文释义
4. 2个例句（英文）

单词：${word}

请用中文回复。`

    const apiUrls = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/chat/completions'
    }

    let url = customUrl || apiUrls[provider] || apiUrls.deepseek
    const modelName = customModel || model || 'deepseek-chat'

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'API 请求失败' }
    }

    const data = await response.json()

    let content
    if (provider === 'anthropic') {
      content = data.content?.[0]?.text
    } else {
      content = data.choices?.[0]?.message?.content
    }

    return { success: true, result: content }
  } catch (e) {
    log.error('AI lookup word error:', e)
    return { success: false, error: e.message }
  }
})

// 启动应用
app.whenReady().then(async () => {
  log.info('App ready')
  registerProtocol()
  await initDatabase()
  migrateDatabase()
  addDemoData()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (db) {
    saveDatabase()
    db.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 错误处理
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
})