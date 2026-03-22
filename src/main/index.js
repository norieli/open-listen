import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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
      reviewCount INTEGER DEFAULT 0
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
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
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
    JSON.stringify(data.options),
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
  return result
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

// 启动应用
app.whenReady().then(async () => {
  log.info('App ready')
  registerProtocol()
  await initDatabase()
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