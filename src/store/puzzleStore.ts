import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type { Puzzle, GameRecord, GeneratorConfig, LearningData, PendingReviewData, AdjustmentTrace, ExecutionChecklist, ChecklistStatus } from '@/types/puzzle'
import { mockPuzzles, mockRecords } from '@/data/puzzleTemplates'
import { generatePuzzle } from '@/utils/puzzleGenerator'

const STORAGE_KEYS = {
  PUZZLES: 'underground_radio_puzzles',
  RECORDS: 'underground_radio_records',
  LEARNING: 'underground_radio_learning',
  CONFIG: 'underground_radio_config',
  CURRENT_PUZZLE: 'underground_radio_current_puzzle',
  PENDING_REVIEW: 'underground_radio_pending_review',
  CHECKLIST_STATES: 'underground_radio_checklist_states'
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
  checklistStates: Record<string, ExecutionChecklist>

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
  setChecklistItem: (puzzleId: string, phase: keyof ExecutionChecklist, itemId: string, done: boolean) => void
  getChecklistForPuzzle: (puzzleId: string) => ExecutionChecklist | null
  captureChecklistStatus: (puzzleId: string) => ChecklistStatus | null
  resetChecklistForPuzzle: (puzzleId: string) => void
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
  checklistStates: {},

  initFromStorage: () => {
    const storedPuzzles = safeGetStorage<Puzzle[]>(STORAGE_KEYS.PUZZLES, [])
    const storedRecords = safeGetStorage<GameRecord[]>(STORAGE_KEYS.RECORDS, [])
    const storedLearning = safeGetStorage<LearningData>(STORAGE_KEYS.LEARNING, initialLearning)
    const storedConfig = safeGetStorage<GeneratorConfig>(STORAGE_KEYS.CONFIG, initialConfig)
    const storedCurrent = safeGetStorage<Puzzle | null>(STORAGE_KEYS.CURRENT_PUZZLE, null)
    const storedPending = safeGetStorage<PendingReviewData | null>(STORAGE_KEYS.PENDING_REVIEW, null)
    const storedChecklist = safeGetStorage<Record<string, ExecutionChecklist>>(STORAGE_KEYS.CHECKLIST_STATES, {})

    const allPuzzles = [...mockPuzzles, ...storedPuzzles.filter(p => !mockPuzzles.find(m => m.id === p.id))]
    const allRecords = [...mockRecords, ...storedRecords.filter(r => !mockRecords.find(m => m.id === r.id))]

    set({
      puzzles: allPuzzles,
      records: allRecords,
      learning: storedLearning,
      config: storedConfig,
      currentPuzzle: storedCurrent,
      pendingReview: storedPending,
      checklistStates: storedChecklist
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

    if (puzzle.executionChecklist) {
      const newChecklistStates = { ...get().checklistStates, [puzzle.id]: puzzle.executionChecklist }
      set({ checklistStates: newChecklistStates })
      safeSetStorage(STORAGE_KEYS.CHECKLIST_STATES, newChecklistStates)
    }

    console.log('[Generate] 谜题生成:', puzzle.title, '调整项:', adjustments?.length || 0)
    return { puzzle, adjustments: adjustments || [] }
  },

  setCurrentPuzzle: (puzzle) => {
    set({ currentPuzzle: puzzle })
    safeSetStorage(STORAGE_KEYS.CURRENT_PUZZLE, puzzle)

    if (puzzle.executionChecklist && !get().checklistStates[puzzle.id]) {
      const newChecklistStates = { ...get().checklistStates, [puzzle.id]: puzzle.executionChecklist }
      set({ checklistStates: newChecklistStates })
      safeSetStorage(STORAGE_KEYS.CHECKLIST_STATES, newChecklistStates)
    }
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
    const newLearning: LearningData = {
      misunderstoodPhrases: learning.misunderstoodPhrases.map(x => ({ ...x })),
      weakHorrorPhrases: learning.weakHorrorPhrases.map(x => ({ ...x })),
      strongHorrorTriggers: learning.strongHorrorTriggers.map(x => ({ ...x })),
      lowRatedPuzzleIds: [...learning.lowRatedPuzzleIds]
    }

    const WEAK_FEEDBACK_TAGS = [
      '笑场', '快速解谜', '无恐怖反应', '玩家觉得不吓人',
      '主动催进度', '闲聊摆烂', '恐怖场景笑场', '吐槽机关低级'
    ]
    const STRONG_TRIGGER_TAGS = [
      '尖叫', '抱头蹲防', '不敢回头', '抱住同伴',
      '要求降低恐怖度', '被音效吓到', '后退躲远', '抓住道具不放'
    ]

    const addWeakEntry = (phrase: string) => {
      const existing = newLearning.weakHorrorPhrases.find(p => p.phrase === phrase)
      if (existing) {
        existing.count += 1
        existing.lastAt = record.createdAt
      } else {
        newLearning.weakHorrorPhrases.push({ phrase, count: 1, lastAt: record.createdAt })
      }
    }

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

    const selectedWeak = record.horrorReactions.filter(r => WEAK_FEEDBACK_TAGS.includes(r))
    const selectedStrong = record.horrorReactions.filter(r => STRONG_TRIGGER_TAGS.includes(r))

    selectedStrong.forEach(reaction => {
      const existing = newLearning.strongHorrorTriggers.find(t => t.reaction === reaction)
      if (existing) {
        existing.count += 1
        existing.lastAt = record.createdAt
      } else {
        newLearning.strongHorrorTriggers.push({ reaction, count: 1, lastAt: record.createdAt })
      }
    })

    selectedWeak.forEach(reaction => {
      addWeakEntry(reaction)
    })

    if (record.rating <= 2) {
      if (!newLearning.lowRatedPuzzleIds.includes(record.puzzleId)) {
        newLearning.lowRatedPuzzleIds.push(record.puzzleId)
      }
      addWeakEntry(`评分过低(${record.rating}分)`)
    }

    if (selectedWeak.length > 0 || record.rating <= 2 || record.horrorReactions.length === 0) {
      if (record.mostMisunderstood && record.mostMisunderstood.trim() && record.mostMisunderstood !== '无') {
        addWeakEntry(record.mostMisunderstood)
      }
      if (record.rating <= 3 && selectedWeak.length === 0) {
        addWeakEntry(`整体氛围偏弱(评分${record.rating})`)
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
  },

  setChecklistItem: (puzzleId, phase, itemId, done) => {
    const current = get().checklistStates
    const list = current[puzzleId]
    if (!list) return

    const newPhaseArr = list[phase].map(item =>
      item.id === itemId ? { ...item, done } : item
    )
    const newList: ExecutionChecklist = {
      ...list,
      [phase]: newPhaseArr
    }
    const newChecklistStates = { ...current, [puzzleId]: newList }
    set({ checklistStates: newChecklistStates })
    safeSetStorage(STORAGE_KEYS.CHECKLIST_STATES, newChecklistStates)
  },

  getChecklistForPuzzle: (puzzleId) => {
    return get().checklistStates[puzzleId] || null
  },

  captureChecklistStatus: (puzzleId): ChecklistStatus | null => {
    const list = get().checklistStates[puzzleId]
    if (!list) return null

    const phaseStats = (phaseList: ExecutionChecklist['setup']) => {
      const total = phaseList.length
      const completed = phaseList.filter(i => i.done).length
      return { total, completed, completionRate: total === 0 ? 1 : Math.round(completed * 100 / total) / 100 }
    }

    const phases = {
      setup: phaseStats(list.setup),
      control: phaseStats(list.control),
      reset: phaseStats(list.reset),
      safety: phaseStats(list.safety)
    }
    const totalItems = phases.setup.total + phases.control.total + phases.reset.total + phases.safety.total
    const completedItems = phases.setup.completed + phases.control.completed + phases.reset.completed + phases.safety.completed

    const missedResetItems = list.reset.filter(i => !i.done).map(i => i.item)
    const missedSafetyItems = list.safety.filter(i => !i.done).map(i => i.item)

    return {
      puzzleId,
      capturedAt: Date.now(),
      phases,
      totalItems,
      completedItems,
      overallRate: totalItems === 0 ? 1 : Math.round(completedItems * 100 / totalItems) / 100,
      missedResetItems,
      missedSafetyItems
    }
  },

  resetChecklistForPuzzle: (puzzleId) => {
    const puzzle = get().puzzles.find(p => p.id === puzzleId)
    const current = get().checklistStates
    if (puzzle?.executionChecklist) {
      const newChecklistStates = { ...current, [puzzleId]: puzzle.executionChecklist }
      set({ checklistStates: newChecklistStates })
      safeSetStorage(STORAGE_KEYS.CHECKLIST_STATES, newChecklistStates)
    } else if (current[puzzleId]) {
      const resetPhase = (arr: ExecutionChecklist['setup']) => arr.map(i => ({ ...i, done: false }))
      const resetList: ExecutionChecklist = {
        setup: resetPhase(current[puzzleId].setup),
        control: resetPhase(current[puzzleId].control),
        reset: resetPhase(current[puzzleId].reset),
        safety: resetPhase(current[puzzleId].safety)
      }
      const newChecklistStates = { ...current, [puzzleId]: resetList }
      set({ checklistStates: newChecklistStates })
      safeSetStorage(STORAGE_KEYS.CHECKLIST_STATES, newChecklistStates)
    }
  }
}))
