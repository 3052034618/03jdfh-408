import type { Puzzle, GeneratorConfig, PuzzleHint, PlayerCard, HostSteps, PuzzleScript } from '@/types/puzzle'
import { propList, themes, roomSetups } from '@/data/props'

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateId(): string {
  return `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function filterAvailableProps(selectedProps: string[], allProps: typeof propList) {
  return allProps.filter((p) => selectedProps.includes(p.id))
}

function generateScript(config: GeneratorConfig, availableProps: string[]): PuzzleScript {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')

  let opening = '【沙沙声】欢迎收听阴间电台...我是你们的主播...'
  let main = '【电流声】真相就藏在这个房间里...仔细寻找每一个线索...'
  let climax = '【尖锐杂音】不！不要继续了！...【突然安静】...太迟了...'
  let ending = '【微弱的声音】谢谢你们...帮我找到了真相...【渐弱的沙沙声】'

  if (hasRadio) {
    opening += '调频至正确的频率...就能听到答案...'
  }

  if (hasClock) {
    main += '墙上的时钟停在了那一刻...那一刻就是答案...'
  }

  if (hasTalisman) {
    main += '符纸上的符文...指向真相的方向...'
  }

  if (hasMirror) {
    climax += '镜子里...有东西在看着你...'
  }

  if (config.horrorLevel >= 3) {
    climax += '【脚步声逼近】咚...咚...咚...越来越近了...'
  }

  return { opening, main, climax, ending }
}

function generateHints(config: GeneratorConfig, availableProps: string[]): PuzzleHint[] {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasTalisman = availableProps.includes('talisman')
  const hasLockbox = availableProps.includes('lockbox')

  let hint1 = '【轻微杂音】...仔...细...看...【沙沙声】'
  let hint2 = '【重复关键词】注意细节...注意细节...'
  let hint3 = '【清晰声音】答案就在眼前，不要错过'

  if (hasClock) {
    hint1 = '【轻微杂音】...时...钟...【沙沙声】'
    hint2 = '【重复关键词】午夜零点...午夜零点...'
    hint3 = '【清晰声音】看看墙上的时钟，指针停在哪里？'
  }

  if (hasRadio) {
    hint1 = '【轻微杂音】...频...率...【电流声】'
    hint2 = '【重复关键词】调频...调频到正确的频率...'
    hint3 = '【清晰声音】把收音机调到104.5MHz'
  }

  if (hasTalisman) {
    hint1 = '【纸页沙沙声】...符...文...'
    hint2 = '【重复关键词】符纸...符纸上有线索...'
    hint3 = '【清晰声音】仔细读符纸上的字，答案就在其中'
  }

  if (hasLockbox) {
    hint1 = '【金属碰撞声】...盒...子...'
    hint2 = '【重复关键词】密码...找到密码...'
    hint3 = '【清晰声音】把找到的数字组合起来，就是密码'
  }

  return [
    { level: 1, content: hint1, triggerTime: 3 },
    { level: 2, content: hint2, triggerTime: 6 },
    { level: 3, content: hint3, triggerTime: 10 }
  ]
}

function generatePlayerCards(config: GeneratorConfig, availableProps: string[]): PlayerCard[] {
  const cards: PlayerCard[] = []
  const hasTalisman = availableProps.includes('talisman')
  const hasNewspaper = availableProps.includes('newspaper')
  const hasDiary = availableProps.includes('diary')
  const hasPhoto = availableProps.includes('photo')

  if (hasTalisman) {
    cards.push({
      id: 'card-talisman',
      title: '符纸',
      content: '上面用朱砂写着：「调频至午夜时分，指针指向真相」\n四角画着奇怪的符文，微微泛着红光...',
      hint: '注意"午夜时分"和"指针"这两个词'
    })
  }

  if (hasNewspaper) {
    cards.push({
      id: 'card-newspaper',
      title: '旧报纸',
      content: '「本报讯」著名电台主播林某于10月4日深夜在直播间失踪\n警方调查无果，案件成谜...',
      hint: '日期和频率有什么关系？'
    })
  }

  if (hasDiary) {
    cards.push({
      id: 'card-diary',
      title: '日记本',
      content: '「第七天」\n我开始听到一些声音...从收音机里传出来...\n它说它知道真相...关于十年前的那个夜晚...',
      hint: '"第七天"可能不只是日期'
    })
  }

  if (hasPhoto) {
    cards.push({
      id: 'card-photo',
      title: '老照片',
      content: '一张泛黄的黑白合影，五个人站在电台门口\n背面写着：1987.10.04 开播纪念\n其中一个人的脸被划掉了...',
      hint: '照片上的日期很重要'
    })
  }

  if (cards.length === 0) {
    cards.push({
      id: 'card-default',
      title: '纸条',
      content: '「想知道真相吗？\n找到正确的钥匙，打开正确的门\n但要小心，有些真相...最好永远被埋葬」',
      hint: '仔细观察房间里的每一件物品'
    })
  }

  return cards
}

function generateHostSteps(config: GeneratorConfig, availableProps: string[]): HostSteps {
  const prep: string[] = []
  const during: string[] = []
  const cleanup: string[] = []

  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasLockbox = availableProps.includes('lockbox')
  const hasCandle = availableProps.includes('candle')

  if (hasRadio) {
    prep.push('确认收音机可以正常调节频率')
    prep.push('预设几个干扰频率增加难度')
    during.push('在玩家搜索时播放背景杂音')
    cleanup.push('关闭收音机电源')
  }

  if (hasClock) {
    prep.push('将时钟调到指定时间位置')
    during.push('观察玩家是否注意到时钟')
    cleanup.push('恢复时钟正常走时')
  }

  if (hasLockbox) {
    prep.push('设置好密码并放入线索')
    prep.push('确认锁盒可以正常打开')
    cleanup.push('重新锁好锁盒并打乱密码')
  }

  if (hasCandle) {
    prep.push('摆放好蜡烛并检查安全')
    during.push('适时制造蜡烛摇曳效果')
    cleanup.push('确认蜡烛完全熄灭')
  }

  prep.push('检查所有道具是否到位')
  during.push('根据提示等级逐步给予线索')
  during.push('观察玩家反应，调整恐怖程度')
  cleanup.push('恢复所有道具到初始位置')
  cleanup.push('整理房间准备下一场')

  return { prep, during, cleanup }
}

function generateTitle(config: GeneratorConfig): string {
  const prefixes = ['午夜', '诡异', '失踪的', '诅咒的', '死亡']
  const suffixes = ['频率', '日记', '房间', '电台', '仪式']

  const themeNames: Record<string, string> = {
    'missing-person': '失踪者',
    'cursed-item': '诅咒之物',
    revenge: '复仇',
    ritual: '仪式',
    'time-loop': '时间循环'
  }

  const prefix = getRandomItem(prefixes)
  const suffix = getRandomItem(suffixes)

  return `${prefix}${suffix}`
}

function generateAnswer(config: GeneratorConfig, availableProps: string[]): string {
  const hasRadio = availableProps.includes('radio')
  const hasLockbox = availableProps.includes('lockbox')
  const hasClock = availableProps.includes('wall-clock')

  if (hasRadio && hasClock) {
    return '将收音机调至104.5MHz（时钟指向10点45分）'
  }

  if (hasLockbox) {
    return '输入密码1045打开锁盒'
  }

  if (hasClock) {
    return '将时钟指针调到10:45'
  }

  return '找到隐藏的线索并解开谜题'
}

export function generatePuzzle(config: GeneratorConfig, existingPuzzles: Puzzle[]): Puzzle {
  console.log('[PuzzleGenerator] 生成谜题，配置:', config)

  const availableProps = config.selectedProps.length > 0 ? config.selectedProps : roomSetups.find(r => r.id === config.roomSetup)?.props || []

  const script = generateScript(config, availableProps)
  const hints = generateHints(config, availableProps)
  const playerCards = generatePlayerCards(config, availableProps)
  const hostSteps = generateHostSteps(config, availableProps)
  const title = generateTitle(config)
  const answer = generateAnswer(config, availableProps)

  const themeInfo = themes.find(t => t.id === config.theme)

  const puzzle: Puzzle = {
    id: generateId(),
    title,
    theme: themeInfo?.name || '神秘',
    difficulty: config.difficulty,
    estimatedTime: 20 + config.difficulty * 10,
    props: availableProps,
    playerCount: {
      min: Math.max(1, config.playerCount - 2),
      max: config.playerCount + 2
    },
    script,
    hostSteps,
    playerCards,
    hints,
    answer,
    createdAt: Date.now()
  }

  console.log('[PuzzleGenerator] 谜题生成完成:', puzzle.title)
  return puzzle
}
