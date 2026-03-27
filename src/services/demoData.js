/**
 * Demo 数据生成器
 * 首次打开应用（无数据时）自动生成 365 天合理的模拟情绪数据（完整一年，支撑年度报告）
 *
 * v2：硬编码两段连续低落场景，确保关怀卡片必定触发
 *   - 场景 A：连续 5 天 very_negative → 触发 Level 3 重度关怀
 *   - 场景 B：连续 3 天 negative → 触发 Level 2 中度关怀
 */

import { format, subDays, isWeekend } from 'date-fns'
import { MOOD_TYPES } from '../utils/moodUtils'

// 模拟文本库（按情绪等级分类）
const TEXTS = {
  very_positive: [
    '今天项目终于完成了，成就感爆棚！',
    '收到了意外的好消息，太开心了！',
    '和好朋友一起度过了完美的一天',
    '拿到了心仪的 offer，激动到不行',
    '今天的天气超好，心情美美的',
    '旅行第一天，一切都太美好了',
    '完成了一直想做的事情，完美！',
    '今天被夸奖了，开心到飞起',
  ],
  positive: [
    '今天天气不错，心情挺好的',
    '工作顺利，效率很高',
    '吃到了好吃的，满足~',
    '和朋友聊了天，感觉温暖',
    '完成了今天的计划，有点小骄傲',
    '看了一部好电影，推荐给大家',
    '今天运动了一下，感觉很轻松',
    '收到了小礼物，很惊喜',
    '学到了新东西，有进步',
    '早睡早起，状态很好',
  ],
  neutral: [
    '今天一切正常，没什么特别的',
    '平淡的一天，就这样过吧',
    '按时完成了工作，还行',
    '今天很安静，没什么想法',
    '普通的一天，记录一下',
    '一切如常，日子照旧',
    '今天没啥特别的事',
    '平平淡淡，也挺好的',
  ],
  negative: [
    '今天有点累，工作压力大',
    '心情不太好，有些烦躁',
    '被批评了，有点难过',
    '今天的计划没完成，有点沮丧',
    '睡眠不足，好困好累',
    '和同事有些不愉快',
    '有点焦虑，担心考试',
    '今天效率很低，烦',
    '想家了，有点孤单',
    '遇到了一些小麻烦',
  ],
  very_negative: [
    '今天真的很糟糕，什么都不顺',
    '压力太大了，快崩溃了',
    '发生了很不好的事情，心情跌到谷底',
    '失眠了一整夜，难受极了',
    '感觉特别孤独，好难过',
  ],
}

// 情绪等级对应的权重分布（用于模拟真实场景）
const MOOD_WEIGHTS = {
  weekday: { 1: 0.05, 2: 0.15, 3: 0.35, 4: 0.30, 5: 0.15 },
  weekend: { 1: 0.02, 2: 0.08, 3: 0.25, 4: 0.40, 5: 0.25 },
}

/**
 * 按权重随机选择一个 key
 */
function weightedRandom(weights) {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let rand = Math.random() * total
  for (const [key, weight] of entries) {
    rand -= weight
    if (rand <= 0) return parseInt(key, 10)
  }
  return parseInt(entries[entries.length - 1][0], 10)
}

/**
 * 从数组中随机选择一个元素
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 生成一条 demo 记录
 */
function generateDemoRecord(date, prevMood) {
  const dateObj = new Date(date + 'T00:00:00')
  const weekend = isWeekend(dateObj)
  const weights = weekend ? MOOD_WEIGHTS.weekend : MOOD_WEIGHTS.weekday

  // 如果前一天情绪极端，有概率延续（情绪连续性）
  let intensity
  if (prevMood && Math.random() < 0.3) {
    // 30% 概率延续前一天情绪 ± 1
    const prevIntensity = MOOD_TYPES[prevMood]?.intensity || 3
    const shift = Math.random() < 0.5 ? -1 : 1
    intensity = Math.max(1, Math.min(5, prevIntensity + shift))
  } else {
    intensity = weightedRandom(weights)
  }

  const moodKey = {
    1: 'very_negative',
    2: 'negative',
    3: 'neutral',
    4: 'positive',
    5: 'very_positive',
  }[intensity]

  const text = randomChoice(TEXTS[moodKey])
  const moodInfo = MOOD_TYPES[moodKey]

  return {
    date,
    text,
    mood: moodKey,
    intensity,
    moodLabel: moodInfo.label,
    keywords: [],
    analysis: '示例数据',
    confidence: 0.85,
    method: 'demo',
    suggestion: '',
    createdAt: new Date(date + 'T' + String(Math.floor(Math.random() * 12 + 8)).padStart(2, '0') + ':00:00').toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── 硬编码关怀场景 ──
// 场景 A：连续 5 天 very_negative（触发 Level 3 重度关怀 + 心理热线高亮）
// 场景 B：连续 3 天 negative（触发 Level 2 中度关怀 + 心理热线）
const CARE_SCENARIOS = [
  {
    // 场景 A：大约在数据的 1/4 处
    texts: [
      { mood: 'very_negative', text: '连续加班一周，身体和精神都到了极限' },
      { mood: 'very_negative', text: '失眠第三天了，脑子里全是烦心事' },
      { mood: 'very_negative', text: '感觉自己什么都做不好，好累' },
      { mood: 'very_negative', text: '今天又崩溃了一次，不知道什么时候是个头' },
      { mood: 'very_negative', text: '压力太大了，真的快撑不住了' },
    ],
  },
  {
    // 场景 B：大约在数据的 3/5 处
    texts: [
      { mood: 'negative', text: '和最好的朋友吵架了，心情很差' },
      { mood: 'negative', text: '还是没缓过来，觉得很孤独' },
      { mood: 'negative', text: '试着让自己开心起来，但做不到' },
    ],
  },
]

/**
 * 生成 demo 数据（默认 365 天，支撑完整年度报告）
 * @param {number} days - 生成天数，默认 365
 * @returns {Array} 模拟记录数组
 */
export function generateDemoData(days = 365) {
  const records = []
  const today = new Date()

  // 计算关怀场景在时间线中的位置
  const scenarioOffsets = [
    Math.floor(days * 0.25), // 场景 A：~90 天前
    Math.floor(days * 0.6),  // 场景 B：~220 天前
  ]

  // 预计算所有硬编码日期 → record 映射
  const scenarioMap = {}
  CARE_SCENARIOS.forEach((scenario, si) => {
    scenario.texts.forEach((item, idx) => {
      const dayOffset = scenarioOffsets[si] - idx
      if (dayOffset >= 0 && dayOffset < days) {
        const date = format(subDays(today, dayOffset), 'yyyy-MM-dd')
        const moodInfo = MOOD_TYPES[item.mood]
        scenarioMap[date] = {
          date,
          text: item.text,
          mood: item.mood,
          intensity: moodInfo?.intensity || (item.mood === 'very_negative' ? 1 : 2),
          moodLabel: moodInfo?.label,
          keywords: [],
          analysis: '示例数据（关怀场景）',
          confidence: 0.9,
          method: 'demo',
          suggestion: item.mood === 'very_negative'
            ? '你已经连续多天情绪很低落了，建议和信任的人聊聊，或拨打心理热线寻求帮助。'
            : '注意到你这几天不太开心，试着做些让自己放松的事情吧。',
          createdAt: new Date(date + 'T10:00:00').toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    })
  })

  for (let i = days - 1; i >= 0; i--) {
    // 90% 概率每天都有记录（模拟偶尔漏记）
    if (Math.random() > 0.9 && i > 2) continue

    const date = format(subDays(today, i), 'yyyy-MM-dd')

    // 硬编码关怀场景 → 直接使用预设数据（不跳过、不随机）
    if (scenarioMap[date]) {
      records.push({ ...scenarioMap[date], id: `demo-${date}` })
      continue
    }

    const prevMood = records.length > 0 ? records[records.length - 1].mood : null
    const record = generateDemoRecord(date, prevMood)
    record.id = `demo-${date}`
    records.push(record)
  }

  return records
}

/**
 * 检查是否需要导入 demo 数据（仅在无数据时自动导入）
 * @param {Array} existingRecords - 现有记录
 * @returns {boolean}
 */
export function shouldAutoImportDemo(existingRecords) {
  return !existingRecords || existingRecords.length === 0
}

/**
 * 导入 demo 数据到存储
 * @param {Function} saveFn - 保存函数（来自 storage 模块）
 * @returns {number} 导入的记录数
 */
export function importDemoData(saveFn) {
  const demoRecords = generateDemoData(365)
  let count = 0
  for (const record of demoRecords) {
    saveFn(record)
    count++
  }
  return count
}
