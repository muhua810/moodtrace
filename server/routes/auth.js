import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'mood-calendar-secret-change-in-production'

// 注册
router.post('/register', (req, res) => {
  try {
    const { email, password, nickname } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' })
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)'
    ).run(email, passwordHash, nickname || '')

    const token = jwt.sign({ userId: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: result.lastInsertRowid, email, nickname: nickname || '' } })
  } catch (err) {
    res.status(500).json({ error: '注册失败' })
  }
})

// 登录
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } })
  } catch (err) {
    res.status(500).json({ error: '登录失败' })
  }
})

// 认证中间件
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' })
  }
}

export default router
