export interface PropItem {
  id: string
  name: string
  category: string
  icon?: string
  description?: string
}

export interface RoomSetup {
  id: string
  name: string
  description: string
  props: string[]
}

export interface HintLevel {
  level: number
  name: string
  time: number
  description: string
}

export interface PuzzleHint {
  level: 1 | 2 | 3
  content: string
  triggerTime: number
}

export interface PuzzleScript {
  opening: string
  main: string
  climax: string
  ending: string
}

export interface HostSteps {
  prep: string[]
  during: string[]
  cleanup: string[]
}

export interface ExecutionChecklist {
  setup: Array<{ id: string; item: string; done: boolean }>
  control: Array<{ id: string; item: string; done: boolean }>
  reset: Array<{ id: string; item: string; done: boolean }>
  safety: Array<{ id: string; item: string; done: boolean }>
}

export interface PlayerCard {
  id: string
  title: string
  content: string
  hint?: string
}

export interface AdjustmentTrace {
  type: 'misunderstanding' | 'horror_weak' | 'rating_low' | 'horror_strong'
  original?: string
  adjusted: string
  reason: string
}

export interface Puzzle {
  id: string
  title: string
  theme: string
  difficulty: number
  horrorLevel?: number
  estimatedTime: number
  props: string[]
  playerCount: { min: number; max: number }
  script: PuzzleScript
  hostSteps: HostSteps
  playerCards: PlayerCard[]
  hints: PuzzleHint[]
  answer: string
  adjustments?: AdjustmentTrace[]
  executionChecklist?: ExecutionChecklist
  createdAt: number
  basedOnHistory?: boolean
}

export interface ChecklistPhaseStats {
  total: number
  completed: number
  completionRate: number
}

export interface ChecklistStatus {
  puzzleId: string
  capturedAt: number
  phases: {
    setup: ChecklistPhaseStats
    control: ChecklistPhaseStats
    reset: ChecklistPhaseStats
    safety: ChecklistPhaseStats
  }
  totalItems: number
  completedItems: number
  overallRate: number
  missedResetItems: string[]
  missedSafetyItems: string[]
}

export interface GameRecord {
  id: string
  puzzleId: string
  puzzleTitle: string
  startTime: number
  endTime?: number
  duration?: number
  playerCount: number
  hintsUsed: number[]
  mostMisunderstood: string
  horrorReactions: string[]
  rating: number
  notes: string
  createdAt: number
  elapsedSeconds?: number
  checklistStatus?: ChecklistStatus
}

export interface GeneratorConfig {
  roomSetup: string
  selectedProps: string[]
  playerCount: number
  difficulty: number
  horrorLevel: number
  theme: string
}

export type TabBarPage = 'generator' | 'prompter' | 'records' | 'mine'

export interface LearningData {
  misunderstoodPhrases: Array<{ phrase: string; count: number; lastAt: number }>
  weakHorrorPhrases: Array<{ phrase: string; count: number; lastAt: number }>
  strongHorrorTriggers: Array<{ reaction: string; count: number; lastAt: number }>
  lowRatedPuzzleIds: string[]
}

export interface PendingReviewData {
  puzzleId?: string
  puzzleTitle?: string
  duration?: number
  playerCount?: number
  hintsUsed?: number[]
  elapsedSeconds?: number
  fromHistory?: boolean
}
