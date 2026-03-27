import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from './auth.js'

const router = Router()

// 所有记录接口都需要登录
router.use(authMiddleware)

// 获取记录列表
router.get('/', (req, res) => {
  try {
    const { days = 365, from, to } = req.query
    let records

    if (from && to) {
      records = db.prepare(
        'SELECT * FROM records WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC'
      ).all(req.userId, from, to)
    } else {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(days))
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      records = db.prepare(
        'SELECT * FROM records WHERE user_id = ? AND date >= ? ORDER BY date DESC'
      ).all(req.userId, cutoffStr)
    }

    // 解析 keywords JSON 字符串
    records = records.map(r => ({
      ...r,
      keywords: JSON.parse(r.keywords || '[]')
    }))

    res.json(records)
  } catch (err) {
    res.status(500).json({ error: '获取记录失败' })
  }
})

// 获取单条记录
router.get('/:date', (req, res) => {
  try {
    const record = db.prepare(
      'SELECT * FROM records WHERE user_id = ? AND date = ?'
    ).get(req.userId, req.params.date)

    if (!record) {
      return res.status(404).json({ error: '记录不存在' })
    }

    record.keywords = JSON.parse(record.keywords || '[]')
    res.json(record)
  } catch (err) {
    res.status(500).json({ error: '获取记录失败' })
  }
})

// 创建或更新记录
router.put('/:date', (req, res) => {
  try {
    const { text, mood, intensity, moodLabel, suggestion, keywords, analysis, confidence, method } = req.body
    if (!text || !mood) {
      return res.status(400).json({ error: 'text 和 mood 不能为空' })
    }

    const existing = db.prepare(
      'SELECT id FROM records WHERE user_id = ? AND date = ?'
    ).get(req.userId, req.params.date)

    const keywordsJson = JSON.stringify(keywords || [])

    if (existing) {
      db.prepare(`
        UPDATE records SET text = ?, mood = ?, intensity = ?, mood_label = ?,
        suggestion = ?, keywords = ?, analysis = ?, confidence = ?, method = ?,
        updated_at = datetime('now')
        WHERE user_id = ? AND date = ?
      `).run(text, mood, intensity || 3, moodLabel || '', suggestion || '',
        keywordsJson, analysis || '', confidence || 0.5, method || 'keyword',
        req.userId, req.params.date)
    } else {
      db.prepare(`
        INSERT INTO records (user_id, date, text, mood, intensity, mood_label, suggestion, keywords, analysis, confidence, method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.userId, req.params.date, text, mood, intensity || 3,
        moodLabel || '', suggestion || '', keywordsJson, analysis || '',
        confidence || 0.5, method || 'keyword')
    }

    const record = db.prepare(
      'SELECT * FROM records WHERE user_id = ? AND date = ?'
    ).get(req.userId, req.params.date)
    record.keywords = JSON.parse(record.keywords || '[]')
    res.json(record)
  } catch (err) {
    res.status(500).json({ error: '保存记录失败' })
  }
})

// 删除记录
router.delete('/:date', (req, res) => {
  try {
    db.prepare('DELETE FROM records WHERE user_id = ? AND date = ?').run(req.userId, req.params.date)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '删除记录失败' })
  }
})

// 批量导入
router.post('/import', (req, res) => {
  try {
    const { records } = req.body
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records 必须是数组' })
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO records (user_id, date, text, mood, intensity, mood_label, suggestion, keywords, analysis, confidence, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let imported = 0
    const transaction = db.transaction((items) => {
      for (const r of items) {
        if (!r.date || !r.text || !r.mood) continue
        const result = stmt.run(
          req.userId, r.date, r.text, r.mood, r.intensity || 3,
          r.moodLabel || r.mood_label || '', r.suggestion || '',
          JSON.stringify(r.keywords || []), r.analysis || '',
          r.confidence || 0.5, r.method || 'keyword'
        )
        if (result.changes > 0) imported++
      }
    })

    transaction(records)
    res.json({ imported, total: records.length })
  } catch (err) {
    res.status(500).json({ error: '导入失败' })
  }
})

// 统计数据
router.get('/stats/summary', (req, res) => {
  try {
    const { days = 30 } = req.query
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(days))
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const totalRecords = db.prepare(
      'SELECT COUNT(*) as count FROM records WHERE user_id = ? AND date >= ?'
    ).get(req.userId, cutoffStr).count

    const moodCounts = db.prepare(
      'SELECT mood, COUNT(*) as count FROM records WHERE user_id = ? AND date >= ? GROUP BY mood'
    ).all(req.userId, cutoffStr)

    const avgIntensity = db.prepare(
      'SELECT AVG(intensity) as avg FROM records WHERE user_id = ? AND date >= ?'
    ).get(req.userId, cutoffStr).avg || 0

    // 连续低落天数
    const recentRecords = db.prepare(
      'SELECT mood FROM records WHERE user_id = ? ORDER BY date DESC LIMIT 30'
    ).all(req.userId)

    let consecutiveLow = 0
    for (const r of recentRecords) {
      if (r.mood === 'very_negative' || r.mood === 'negative') {
        consecutiveLow++
      } else {
        break
      }
    }

    res.json({
      totalRecords,
      moodCounts: Object.fromEntries(moodCounts.map(r => [r.mood, r.count])),
      avgIntensity: parseFloat(avgIntensity).toFixed(1),
      consecutiveLow
    })
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' })
  }
})

export default router
