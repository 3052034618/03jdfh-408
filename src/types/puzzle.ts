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

export interface PlayerCard {
  id: string
  title: string
  content: string
  hint?: string
}

export interface Puzzle {
  id: string
  title: string
  theme: string
  difficulty: number
  estimatedTime: number
  props: string[]
  playerCount: { min: number; max: number }
  script: PuzzleScript
  hostSteps: HostSteps
  playerCards: PlayerCard[]
  hints: PuzzleHint[]
  answer: string
  createdAt: number
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
