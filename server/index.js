import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import recordRoutes from './routes/records.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/records', recordRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🍃 情绪日历后端服务运行在 http://localhost:${PORT}`)
})
