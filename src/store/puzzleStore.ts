import { create } from 'zustand'
import type { Puzzle, GameRecord, GeneratorConfig } from '@/types/puzzle'
import { mockPuzzles, mockRecords } from '@/data/puzzleTemplates'
import { generatePuzzle } from '@/utils/puzzleGenerator'

interface PuzzleState {
  currentPuzzle: Puzzle | null
  puzzles: Puzzle[]
  records: GameRecord[]
  config: GeneratorConfig
  gameStartTime: number | null
  currentHintLevel: number
  isGameActive: boolean

  setConfig: (config: Partial<GeneratorConfig>) => void
  generateNewPuzzle: () => void
  setCurrentPuzzle: (puzzle: Puzzle) => void
  startGame: () => void
  endGame: () => void
  useHint: (level: number) => void
  addRecord: (record: GameRecord) => void
  getRecordsByPuzzle: (puzzleId: string) => GameRecord[]
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
  config: initialConfig,
  gameStartTime: null,
  currentHintLevel: 0,
  isGameActive: false,

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config }
    }))
  },

  generateNewPuzzle: () => {
    const { config, puzzles } = get()
    const newPuzzle = generatePuzzle(config, puzzles)
    set({ currentPuzzle: newPuzzle })
  },

  setCurrentPuzzle: (puzzle) => {
    set({ currentPuzzle: puzzle })
  },

  startGame: () => {
    set({
      gameStartTime: Date.now(),
      currentHintLevel: 0,
      isGameActive: true
    })
  },

  endGame: () => {
    set({
      gameStartTime: null,
      currentHintLevel: 0,
      isGameActive: false
    })
  },

  useHint: (level) => {
    set({ currentHintLevel: level })
  },

  addRecord: (record) => {
    set((state) => ({
      records: [record, ...state.records]
    }))
  },

  getRecordsByPuzzle: (puzzleId) => {
    return get().records.filter((r) => r.puzzleId === puzzleId)
  }
}))
