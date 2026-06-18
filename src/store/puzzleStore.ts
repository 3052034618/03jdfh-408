import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type { Puzzle, GameRecord, GeneratorConfig, LearningData, PendingReviewData, AdjustmentTrace } from '@/types/puzzle'
import { mockPuzzles, mockRecords } from '@/data/puzzleTemplates'
import { generatePuzzle } from '@/utils/puzzleGenerator'

const STORAGE_KEYS = {
  PUZZLES: 'underground_radio_puzzles',
  RECORDS: 'underground_radio_records',
  LEARNING: 'underground_radio_learning',
  CONFIG: 'underground_radio_config',
  CURRENT_PUZZLE: 'underground_radio_current_puzzle',
  PENDING_REVIEW: 'underground_radio_pending_review'
}

const initialLearning: LearningData = {
  misunderstoodPhrases: [],
  weakHorrorPhrases: [],
  strongHorrorTriggers: [],
  lowRatedPuzzleIds: []
}

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const data = Taro.getStorageSync(key)
    if (data === '' || data === null || data === undefined) return fallback
    return JSON.parse(data) as T
  } catch (e) {
    console.error('[Storage] 读取失败:', key, e)
    return fallback
  }
}

function safeSetStorage<T>(key: string, data: T): void {
  try {
    Taro.setStorageSync(key, JSON.stringify(data))
  } catch (e) {
    console.error('[Storage] 写入失败:', key, e)
  }
}

interface PuzzleState {
  currentPuzzle: Puzzle | null
  puzzles: Puzzle[]
  records: GameRecord[]
  learning: LearningData
  config: GeneratorConfig
  pendingReview: PendingReviewData | null
  gameStartTime: number | null
  currentHintLevel: number
  isGameActive: number | null
  usedHints: number[]
  gameElapsedSeconds: number

  initFromStorage: () => void
  setConfig: (config: Partial<GeneratorConfig>) => void
  generateNewPuzzle: () => { puzzle: Puzzle; adjustments: AdjustmentTrace[] }
  setCurrentPuzzle: (puzzle: Puzzle) => void
  startGame: () => void
  endGame: (elapsedSeconds: number, usedHints: number[]) => PendingReviewData
  useHint: (level: number) => void
  addRecord: (record: GameRecord) => void
  getRecordsByPuzzle: (puzzleId: string) => GameRecord[]
  setPendingReview: (data: PendingReviewData | null) => void
  consumePendingReview: () => PendingReviewData | null
  addAdjustmentsToCurrentPuzzle: (adjustments: AdjustmentTrace[]) => void
  reuseHistoryPuzzle: (puzzleId: string) => void
  getLearningStats: () => LearningData
}

const initialConfig: GeneratorConfig = {
  roomSetup: 'old-room',
  selectedProps: [],
  playerCount: 4,
  difficulty: 2,
  horrorLevel: 2,
  theme: 'missing-person'
}

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  currentPuzzle: null,
  puzzles: mockPuzzles,
  records: mockRecords,
  learning: initialLearning,
  config: initialConfig,
  pendingReview: null,
  gameStartTime: null,
  currentHintLevel: 0,
  isGameActive: null,
  usedHints: [],
  gameElapsedSeconds: 0,

  initFromStorage: () => {
    const storedPuzzles = safeGetStorage<Puzzle[]>(STORAGE_KEYS.PUZZLES, [])
    const storedRecords = safeGetStorage<GameRecord[]>(STORAGE_KEYS.RECORDS, [])
    const storedLearning = safeGetStorage<LearningData>(STORAGE_KEYS.LEARNING, initialLearning)
    const storedConfig = safeGetStorage<GeneratorConfig>(STORAGE_KEYS.CONFIG, initialConfig)
    const storedCurrent = safeGetStorage<Puzzle | null>(STORAGE_KEYS.CURRENT_PUZZLE, null)
    const storedPending = safeGetStorage<PendingReviewData | null>(STORAGE_KEYS.PENDING_REVIEW, null)

    const allPuzzles = [...mockPuzzles, ...storedPuzzles.filter(p => !mockPuzzles.find(m => m.id === p.id))]
    const allRecords = [...mockRecords, ...storedRecords.filter(r => !mockRecords.find(m => m.id === r.id))]

    set({
      puzzles: allPuzzles,
      records: allRecords,
      learning: storedLearning,
      config: storedConfig,
      currentPuzzle: storedCurrent,
      pendingReview: storedPending
    })

    console.log('[Storage] 初始化完成，谜题:', allPuzzles.length, '记录:', allRecords.length)
  },

  setConfig: (config) => {
    const newConfig = { ...get().config, ...config }
    set({ config: newConfig })
    safeSetStorage(STORAGE_KEYS.CONFIG, newConfig)
  },

  generateNewPuzzle: () => {
    const { config, puzzles, learning } = get()
    const result = generatePuzzle(config, puzzles, learning)
    const { puzzle, adjustments } = result

    if (adjustments && adjustments.length > 0) {
      puzzle.adjustments = adjustments
      puzzle.basedOnHistory = true
    }

    set({
      currentPuzzle: puzzle,
      puzzles: [...get().puzzles, puzzle]
    })
    safeSetStorage(STORAGE_KEYS.CURRENT_PUZZLE, puzzle)
    safeSetStorage(STORAGE_KEYS.PUZZLES, get().puzzles)

    console.log('[Generate] 谜题生成:', puzzle.title, '调整项:', adjustments?.length || 0)
    return { puzzle, adjustments: adjustments || [] }
  },

  setCurrentPuzzle: (puzzle) => {
    set({ currentPuzzle: puzzle })
    safeSetStorage(STORAGE_KEYS.CURRENT_PUZZLE, puzzle)
  },

  startGame: () => {
    set({
      gameStartTime: Date.now(),
      currentHintLevel: 0,
      isGameActive: Date.now(),
      usedHints: [],
      gameElapsedSeconds: 0
    })
    console.log('[Game] 游戏开始')
  },

  endGame: (elapsedSeconds, usedHints) => {
    const { currentPuzzle, config } = get()
    const duration = Math.max(1, Math.round(elapsedSeconds / 60))

    const pending: PendingReviewData = {
      puzzleId: currentPuzzle?.id,
      puzzleTitle: currentPuzzle?.title,
      duration,
      playerCount: config.playerCount,
      hintsUsed: [...usedHints],
      elapsedSeconds
    }

    set({
      gameStartTime: null,
      currentHintLevel: 0,
      isGameActive: null,
      usedHints: [],
      gameElapsedSeconds: 0,
      pendingReview: pending
    })

    safeSetStorage(STORAGE_KEYS.PENDING_REVIEW, pending)
    console.log('[Game] 游戏结束，待复盘数据:', pending)
    return pending
  },

  useHint: (level) => {
    const newUsed = [...get().usedHints]
    if (!newUsed.includes(level)) newUsed.push(level)
    set({
      currentHintLevel: level,
      usedHints: newUsed
    })
  },

  addRecord: (record) => {
    const { records, learning } = get()
    const newRecords = [record, ...records]
    const newLearning = { ...learning }

    if (record.mostMisunderstood && record.mostMisunderstood !== '无' && record.mostMisunderstood.trim()) {
      const existing = newLearning.misunderstoodPhrases.find(m => m.phrase === record.mostMisunderstood)
      if (existing) {
        existing.count += 1
        existing.lastAt = record.createdAt
      } else {
        newLearning.misunderstoodPhrases.push({
          phrase: record.mostMisunderstood,
          count: 1,
          lastAt: record.createdAt
        })
      }
    }

    const strongReactions = ['尖叫', '抱头蹲防', '不敢回头', '抱住同伴', '要求降低恐怖度', '被音效吓到']
    record.horrorReactions.forEach(reaction => {
      if (strongReactions.includes(reaction)) {
        const existing = newLearning.strongHorrorTriggers.find(t => t.reaction === reaction)
        if (existing) {
          existing.count += 1
          existing.lastAt = record.createdAt
        } else {
          newLearning.strongHorrorTriggers.push({ reaction, count: 1, lastAt: record.createdAt })
        }
      }
    })

    if (record.rating <= 2) {
      if (!newLearning.lowRatedPuzzleIds.includes(record.puzzleId)) {
        newLearning.lowRatedPuzzleIds.push(record.puzzleId)
      }
    }

    if (record.rating <= 2 || record.horrorReactions.length === 0 ||
        record.horrorReactions.every(r => ['笑场', '快速解谜', '无'].includes(r))) {
      if (record.mostMisunderstood && record.mostMisunderstood.trim() && record.mostMisunderstood !== '无') {
        const existing = newLearning.weakHorrorPhrases.find(p => p.phrase === record.mostMisunderstood)
        if (existing) {
          existing.count += 1
          existing.lastAt = record.createdAt
        } else {
          newLearning.weakHorrorPhrases.push({
            phrase: record.mostMisunderstood,
            count: 1,
            lastAt: record.createdAt
          })
        }
      }
    }

    set({
      records: newRecords,
      learning: newLearning,
      pendingReview: null
    })

    safeSetStorage(STORAGE_KEYS.RECORDS, newRecords)
    safeSetStorage(STORAGE_KEYS.LEARNING, newLearning)
    safeSetStorage(STORAGE_KEYS.PENDING_REVIEW, null)

    console.log('[Record] 复盘已保存，学习数据已更新')
  },

  getRecordsByPuzzle: (puzzleId) => {
    return get().records.filter((r) => r.puzzleId === puzzleId)
  },

  setPendingReview: (data) => {
    set({ pendingReview: data })
    if (data) {
      safeSetStorage(STORAGE_KEYS.PENDING_REVIEW, data)
    } else {
      try { Taro.removeStorageSync(STORAGE_KEYS.PENDING_REVIEW) } catch (e) {}
    }
  },

  consumePendingReview: () => {
    const data = get().pendingReview
    set({ pendingReview: null })
    try { Taro.removeStorageSync(STORAGE_KEYS.PENDING_REVIEW) } catch (e) {}
    return data
  },

  addAdjustmentsToCurrentPuzzle: (adjustments) => {
    const { currentPuzzle } = get()
    if (!currentPuzzle) return
    const updated = {
      ...currentPuzzle,
      adjustments: [...(currentPuzzle.adjustments || []), ...adjustments],
      basedOnHistory: true
    }
    set({ currentPuzzle: updated })
    safeSetStorage(STORAGE_KEYS.CURRENT_PUZZLE, updated)
  },

  reuseHistoryPuzzle: (puzzleId) => {
    const puzzle = get().puzzles.find(p => p.id === puzzleId)
    if (puzzle) {
      const copy: Puzzle = {
        ...puzzle,
        id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        adjustments: [{
          type: 'horror_strong',
          adjusted: puzzle.title,
          reason: '复用历史好评谜题'
        }]
      }
      set({
        currentPuzzle: copy,
        puzzles: [...get().puzzles, copy]
      })
      safeSetStorage(STORAGE_KEYS.CURRENT_PUZZLE, copy)
      safeSetStorage(STORAGE_KEYS.PUZZLES, get().puzzles)
      console.log('[Reuse] 复用历史谜题:', puzzle.title)
    }
  },

  getLearningStats: () => {
    return get().learning
  }
}))
