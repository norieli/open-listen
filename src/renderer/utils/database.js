import initSqlJs from 'sql.js/dist/sql-asm.js'
import { Filesystem, Directory } from '@capacitor/filesystem'

const DB_NAME = 'english-pod.db'

let db = null
let SQL = null

// 删除旧数据库文件（确保从干净状态开始）
async function deleteOldDatabase() {
  if (!window.Capacitor) return
  try {
    await Filesystem.deleteFile({
      path: DB_NAME,
      directory: Directory.Data
    })
    console.log('Deleted old database')
  } catch (e) {
    // 文件不存在，忽略
  }
}

// 获取数据库文件路径
async function getDbPath() {
  // Capacitor 环境
  if (window.Capacitor) {
    const filesDir = await Filesystem.getUri({
      directory: Directory.Data,
      path: DB_NAME
    })
    return filesDir.uri
  }
  // Electron 环境 - 使用 localStorage 存储（临时方案）
  return null
}

// 读取数据库文件
async function loadDatabase() {
  if (!SQL) {
    SQL = await initSqlJs()
  }

  try {
    // Capacitor 环境
    if (window.Capacitor) {
      try {
        const result = await Filesystem.readFile({
          path: DB_NAME,
          directory: Directory.Data
        })

        // 检查返回数据格式
        let data
        if (result.data) {
          // 如果是 base64 字符串
          if (typeof result.data === 'string') {
            data = Uint8Array.from(atob(result.data), c => c.charCodeAt(0))
          } else if (result.data instanceof Uint8Array) {
            data = result.data
          } else {
            // 可能是数组
            data = new Uint8Array(result.data)
          }
        } else {
          throw new Error('No data in result')
        }

        // 验证数据是否是有效的数据库
        if (data.length < 100) {
          console.warn('Database file too small, creating new one')
          await deleteOldDatabase()
          return new SQL.Database()
        }

        const newDb = new SQL.Database(data)
        // 验证数据库是否有效
        try {
          newDb.exec('SELECT 1')
          return newDb
        } catch (e) {
          console.warn('Invalid database, recreating:', e.message)
          await deleteOldDatabase()
          return new SQL.Database()
        }
      } catch (e) {
        console.log('Creating new database:', e.message)
        return new SQL.Database()
      }
    }
    // Electron 环境 - 使用 localStorage 兼容
    const stored = localStorage.getItem('sql_db')
    if (stored) {
      const data = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      return new SQL.Database(data)
    }
    return new SQL.Database()
  } catch (e) {
    console.error('Load database error:', e)
    return new SQL.Database()
  }
}

// 保存数据库到文件
async function saveDatabase() {
  if (!db) return

  const data = db.export()
  // data 已经是 Uint8Array，不需要 Buffer

  if (window.Capacitor) {
    try {
      // 将 Uint8Array 转换为 base64
      const binary = String.fromCharCode.apply(null, data)
      await Filesystem.writeFile({
        path: DB_NAME,
        directory: Directory.Data,
        data: btoa(binary),
        encoding: 'binary'
      })
    } catch (e) {
      console.error('Save to Filesystem failed:', e)
    }
  } else {
    // Electron 环境 - 使用 localStorage 兼容（仅保存关键数据）
    try {
      // 只保存不超过 2MB 的数据
      if (data.length > 2 * 1024 * 1024) {
        console.warn('Database too large for localStorage, skipping save')
        return
      }
      const binary = String.fromCharCode.apply(null, data)
      localStorage.setItem('sql_db', btoa(binary))
    } catch (e) {
      console.error('Save to localStorage failed:', e)
    }
  }
}

// 初始化数据库
async function initDatabase() {
  if (db) return db

  db = await loadDatabase()

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

  // 数据库迁移 - 添加新字段
  try { db.run('ALTER TABLE episodes ADD COLUMN collectionId TEXT') } catch (e) {}
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)
  } catch (e) {}
  try { db.run('ALTER TABLE wrong_answers ADD COLUMN isMastered INTEGER DEFAULT 0') } catch (e) {}
  try { db.run('ALTER TABLE wrong_answers ADD COLUMN nextReviewTime INTEGER') } catch (e) {}
  try { db.run('ALTER TABLE wrong_answers ADD COLUMN easeFactor REAL DEFAULT 2.5') } catch (e) {}
  try { db.run('ALTER TABLE wrong_answers ADD COLUMN interval INTEGER DEFAULT 1') } catch (e) {}
  try { db.run('ALTER TABLE vocabularies ADD COLUMN reviewCount INTEGER DEFAULT 0') } catch (e) {}
  try { db.run('ALTER TABLE vocabularies ADD COLUMN isMastered INTEGER DEFAULT 0') } catch (e) {}
  try { db.run('ALTER TABLE vocabularies ADD COLUMN nextReviewTime INTEGER') } catch (e) {}
  try { db.run('ALTER TABLE vocabularies ADD COLUMN easeFactor REAL DEFAULT 2.5') } catch (e) {}
  try { db.run('ALTER TABLE vocabularies ADD COLUMN interval INTEGER DEFAULT 1') } catch (e) {}

  await saveDatabase()
  console.log('Database initialized successfully')

  return db
}

// 查询所有记录
function queryAll(sql, params = []) {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// 查询单条记录
function queryOne(sql, params = []) {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

// 执行 SQL（不自动保存，减少 I/O）
function runSql(sql, params = []) {
  if (!db) return
  db.run(sql, params)
}

// 添加示例数据
async function addDemoData() {
  await initDatabase()
  const episodes = queryAll('SELECT id FROM episodes')
  if (episodes.length > 0) return

  console.log('Adding demo episodes...')

  const demoEpisodes = [
    {
      id: 'demo001',
      title: 'If You Want to Grow Apples, Choose the Tastiest',
      difficulty: 'intermediate',
      category: '生活',
      audioPath: '',
      transcript: '',
      translation: '如果你考虑种植苹果，现在是测试不同品种并与当地种植者交流的好时机。这个建议来自园艺作家李·赖克。他的著作包括《剪枝书》和《无草园艺》。',
      lrc: ''
    },
    {
      id: 'demo002',
      title: 'Google Launches New Pixel Phones, Tablet, Home Hub',
      difficulty: 'intermediate',
      category: '科技',
      audioPath: '',
      transcript: '',
      translation: '谷歌发布了最新版本的Pixel智能手机，以及新的平板电脑和智能家居控制器。这些新产品是在周二纽约的一次活动中宣布的。',
      lrc: ''
    },
    {
      id: 'demo003',
      title: 'What Is Art Deco and Why Is It Popular Again?',
      difficulty: 'intermediate',
      category: '文化',
      audioPath: '',
      transcript: '',
      translation: '装饰艺术是一种国际艺术风格，在20世纪20年代和30年代非常流行。如今，人们对这种风格及其特性的兴趣正在增长。',
      lrc: ''
    }
  ]

  for (const demo of demoEpisodes) {
    runSql(`
      INSERT INTO episodes (id, title, difficulty, category, audioPath, transcript, translation, lrc, questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      demo.id,
      demo.title,
      demo.difficulty,
      demo.category,
      demo.audioPath,
      demo.transcript,
      demo.translation,
      demo.lrc,
      '[]'
    ])
  }

  console.log('Demo episodes added successfully')
}

export default {
  initDatabase,
  addDemoData,
  queryAll,
  queryOne,
  runSql,
  saveDatabase
}