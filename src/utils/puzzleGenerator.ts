import type { Puzzle, GeneratorConfig, PuzzleHint, PlayerCard, HostSteps, PuzzleScript, AdjustmentTrace, LearningData } from '@/types/puzzle'
import { propList, themes, roomSetups } from '@/data/props'

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateId(): string {
  return `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function filterValidProps(selectedProps: string[]): string[] {
  const validIds = new Set(propList.map(p => p.id))
  return selectedProps.filter(id => validIds.has(id))
}

function containsAny(text: string, phrases: string[]): string | null {
  for (const p of phrases) {
    if (text.includes(p)) return p
  }
  return null
}

interface PhraseReplacement {
  original: string
  replaced: string
  type: 'misunderstanding' | 'horror_weak'
}

function replaceMisunderstoodPhrases(
  text: string,
  learning: LearningData,
  adjustments: AdjustmentTrace[]
): string {
  if (!learning.misunderstoodPhrases.length) return text

  const replacements: PhraseReplacement[] = [
    { original: '指针', replaced: '时钟的指针', type: 'misunderstanding' },
    { original: '频率', replaced: '收音机的频率旋钮', type: 'misunderstanding' },
    { original: '符文', replaced: '符纸上的红色符文', type: 'misunderstanding' },
    { original: '密码', replaced: '四位数字密码', type: 'misunderstanding' },
    { original: '午夜', replaced: '凌晨零点整', type: 'misunderstanding' },
    { original: '真相', replaced: '藏起来的那个答案', type: 'misunderstanding' },
    { original: '答案', replaced: '正确的结果', type: 'misunderstanding' },
    { original: '线索', replaced: '能帮你的提示', type: 'misunderstanding' },
    { original: '仪式', replaced: '需要按顺序进行的步骤', type: 'misunderstanding' },
    { original: '诅咒', replaced: '那个不吉利的东西', type: 'misunderstanding' }
  ]

  let result = text
  const topMisunderstood = learning.misunderstoodPhrases
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(m => m.phrase)

  for (const rep of replacements) {
    if (result.includes(rep.original)) {
      const matchedMisunderstood = containsAny(rep.original, topMisunderstood)
      if (matchedMisunderstood || learning.misunderstoodPhrases.some(m => result.includes(m.phrase) && m.count >= 1)) {
        result = result.replace(new RegExp(rep.original, 'g'), rep.replaced)
        const alreadyTraced = adjustments.some(a =>
          a.type === 'misunderstanding' && a.original === rep.original
        )
        if (!alreadyTraced) {
          adjustments.push({
            type: 'misunderstanding',
            original: rep.original,
            adjusted: rep.replaced,
            reason: `表达「${rep.original}」在历史复盘中被频繁误解（已出现${learning.misunderstoodPhrases.find(m => m.phrase === matchedMisunderstood || result.includes(m.phrase))?.count || 1}次）`
          })
        }
      }
    }
  }

  return result
}

function enhanceHorrorPhrases(
  text: string,
  config: GeneratorConfig,
  learning: LearningData,
  adjustments: AdjustmentTrace[]
): string {
  if (config.horrorLevel < 2) return text

  let result = text

  if (learning.weakHorrorPhrases.length > 0 && config.horrorLevel >= 2) {
    const weakEnhancements: Array<{ from: RegExp; to: string; tag: string }> = [
      { from: /沙沙声/g, to: '带着电流爆裂的沙沙声...【静电噼啪】', tag: '沙沙声' },
      { from: /电流声/g, to: '【电流滋滋】令人不安的电流声...', tag: '电流声' },
      { from: /声音/g, to: '【耳膜颤动】像是从喉咙深处挤出来的声音...', tag: '声音' },
      { from: /脚步声/g, to: '【咚...咚...咚...】沉重的脚步声，越来越近，地板在震颤', tag: '脚步声' },
      { from: /诡异/g, to: '让人后颈发凉、汗毛直立的诡异感', tag: '诡异' },
      { from: /黑暗/g, to: '伸手不见五指的浓稠黑暗，像有东西在里面游动', tag: '黑暗' },
      { from: /安静/g, to: '【绝对死寂】不正常的安静，连呼吸都怕打扰什么', tag: '安静' },
      { from: /敲门/g, to: '【嘭...嘭...嘭...】不紧不慢的敲门声，每次间隔都刚好7秒', tag: '敲门' }
    ]

    for (const enh of weakEnhancements) {
      if (enh.from.test(result)) {
        result = result.replace(enh.from, enh.to)
        const alreadyTraced = adjustments.some(a =>
          a.type === 'horror_weak' && a.reason.includes(enh.tag)
        )
        if (!alreadyTraced && learning.weakHorrorPhrases.length > 0) {
          adjustments.push({
            type: 'horror_weak',
            adjusted: enh.to,
            reason: `恐怖氛围不足（历史${learning.weakHorrorPhrases.length}次记录显示压迫感弱），${enh.tag}增强为压迫式表达`
          })
        }
      }
    }
  }

  if (learning.strongHorrorTriggers.length > 0 && config.horrorLevel >= 2) {
    const triggers = learning.strongHorrorTriggers
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    triggers.forEach(t => {
      const triggerMap: Record<string, { snippet: string; tag: string }> = {
        '尖叫': { snippet: '【尖锐女声划破空气——】啊——！！！', tag: '尖叫' },
        '抱头蹲防': { snippet: '「有东西...在我头顶...摸我头发...」', tag: '抱头蹲防' },
        '不敢回头': { snippet: '【呼吸声在耳边】不要回头...它就在你肩膀后面...', tag: '不敢回头' },
        '抱住同伴': { snippet: '「拉住我！别松手！有什么东西在拉我的脚踝！」', tag: '抱住同伴' },
        '要求降低恐怖度': { snippet: '【门缝渗进暗红色液体】滴答...滴答...', tag: '要求降低恐怖度' },
        '被音效吓到': { snippet: '【音效突然MAX】砰！——！（门被狠狠关上）', tag: '被音效吓到' }
      }

      const mapped = triggerMap[t.reaction]
      if (mapped && !result.includes(mapped.snippet) && result.length < 200) {
        result = result + ' ' + mapped.snippet
        adjustments.push({
          type: 'horror_strong',
          adjusted: mapped.snippet,
          reason: `历史数据显示「${t.reaction}」是高效恐怖触发点（出现${t.count}次），追加高压迫感音效描述`
        })
      }
    })
  }

  return result
}

function generateScript(
  config: GeneratorConfig,
  availableProps: string[],
  learning: LearningData,
  adjustments: AdjustmentTrace[]
): PuzzleScript {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')
  const hasBell = availableProps.includes('bell')

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
    main += '符纸上的红色符文...指向真相的方向...'
  }

  if (hasMirror) {
    climax += '镜子里...有东西在看着你...它在笑...'
  }

  if (hasBell) {
    climax += '【铃声7响】叮...叮...叮...每一声都离你更近...'
  }

  if (config.horrorLevel >= 3) {
    climax += '【脚步声逼近】咚...咚...咚...越来越近了...地板在震颤...'
  }

  opening = replaceMisunderstoodPhrases(opening, learning, adjustments)
  main = replaceMisunderstoodPhrases(main, learning, adjustments)
  climax = replaceMisunderstoodPhrases(climax, learning, adjustments)
  ending = replaceMisunderstoodPhrases(ending, learning, adjustments)

  opening = enhanceHorrorPhrases(opening, config, learning, adjustments)
  main = enhanceHorrorPhrases(main, config, learning, adjustments)
  climax = enhanceHorrorPhrases(climax, config, learning, adjustments)
  ending = enhanceHorrorPhrases(ending, config, learning, adjustments)

  if (learning.lowRatedPuzzleIds.length > 0 && config.difficulty >= 2) {
    main = main + ' 记住：所有线索之间，都有数字关联。'
    adjustments.push({
      type: 'rating_low',
      adjusted: '所有线索之间，都有数字关联',
      reason: `参考${learning.lowRatedPuzzleIds.length}个低分谜题的反馈，增加关联性提示降低卡关率`
    })
  }

  return { opening, main, climax, ending }
}

function generateHints(
  config: GeneratorConfig,
  availableProps: string[],
  learning: LearningData,
  adjustments: AdjustmentTrace[]
): PuzzleHint[] {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasTalisman = availableProps.includes('talisman')
  const hasLockbox = availableProps.includes('lockbox')
  const hasMirror = availableProps.includes('mirror')

  let hint1 = '【轻微杂音】...仔...细...看...【沙沙声】'
  let hint2 = '【重复关键词】注意细节...注意细节...'
  let hint3 = '【清晰声音】答案就在眼前，不要错过'

  if (hasClock) {
    hint1 = '【轻微杂音】...时...钟...【沙沙声】'
    hint2 = '【重复关键词】凌晨零点...凌晨零点...'
    hint3 = '【清晰声音】看看墙上的时钟，指针停在哪里？对，就是那四个数字'
  }

  if (hasRadio) {
    hint1 = '【轻微杂音】...频...率...【电流声】'
    hint2 = '【重复关键词】调频...收音机上的调频旋钮...'
    hint3 = '【清晰声音】把收音机的频率旋钮调到104.5，那个频道有答案'
  }

  if (hasTalisman) {
    hint1 = '【纸页沙沙声】...符...文...'
    hint2 = '【重复关键词】符纸上的红色符文...符纸上的红色符文...'
    hint3 = '【清晰声音】仔细读符纸上的每一个字，红色的部分指向答案'
  }

  if (hasLockbox) {
    hint1 = '【金属碰撞声】...盒...子...'
    hint2 = '【重复关键词】四位数字密码...四位数字密码...'
    hint3 = '【清晰声音】把找到的四个数字按从小到大排列，就是密码锁的密码'
  }

  if (hasMirror) {
    hint1 = '【玻璃轻响】...镜...子...'
    hint2 = '【重复关键词】镜子里的倒影...镜子里的倒影...'
    hint3 = '【清晰声音】站在镜子前，把你手里的东西举起来对照'
  }

  hint1 = replaceMisunderstoodPhrases(hint1, learning, adjustments)
  hint2 = replaceMisunderstoodPhrases(hint2, learning, adjustments)
  hint3 = replaceMisunderstoodPhrases(hint3, learning, adjustments)

  return [
    { level: 1, content: hint1, triggerTime: 3 },
    { level: 2, content: hint2, triggerTime: 6 },
    { level: 3, content: hint3, triggerTime: 10 }
  ]
}

function generatePlayerCards(
  config: GeneratorConfig,
  availableProps: string[],
  learning: LearningData,
  adjustments: AdjustmentTrace[]
): PlayerCard[] {
  const cards: PlayerCard[] = []
  const hasTalisman = availableProps.includes('talisman')
  const hasNewspaper = availableProps.includes('newspaper')
  const hasDiary = availableProps.includes('diary')
  const hasPhoto = availableProps.includes('photo')
  const hasLetter = availableProps.includes('letter')
  const hasMicrophone = availableProps.includes('microphone')

  if (hasTalisman) {
    let content = '上面用朱砂写着：「将收音机调频至凌晨零点整，时钟的指针指向真相」\n四角画着奇怪的红色符文，微微泛着红光...'
    let hint = '注意「凌晨零点整」和「指针」这两个词，它们和时钟有关系'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-talisman', title: '符纸', content, hint })
  }

  if (hasNewspaper) {
    let content = '「本报讯」著名电台主播林某于10月4日深夜在直播间失踪\n警方调查无果，案件至今成谜...最后广播频道为调频104.5'
    let hint = '报纸上的日期10月4日，和频率104.5，它们有什么关系？'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-newspaper', title: '旧报纸', content, hint })
  }

  if (hasDiary) {
    let content = '「第七天」\n我开始听到一些声音...从收音机里传出来...\n它说它知道关于十年前那个凌晨的真相...'
    let hint = '"第七天"不只是日期，想想数字七和时钟的关系'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-diary', title: '日记本', content, hint })
  }

  if (hasPhoto) {
    let content = '一张泛黄的黑白合影，五个人站在电台门口\n背面写着：1987.10.04 开播纪念\n其中一个人的脸被狠狠划掉了...剩下四人表情诡异'
    let hint = '照片背面的日期很重要，10月4日这四个数字'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-photo', title: '老照片', content, hint })
  }

  if (hasLetter) {
    let content = '「我亲爱的继任者：\n当你读到这封信时，我应该已经不在了。\n记住那四个数字——1、0、4、5，那是唯一的钥匙。」'
    let hint = '信里的四个数字，就是密码'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-letter', title: '手写信件', content, hint })
  }

  if (hasMicrophone) {
    let content = '一支蒙着灰的老式麦克风，支架上刻着：「调频104.5 · K.I.L.L 电台」\n麦克风的网罩里好像塞着什么纸条...'
    let hint = '支架上刻的调频数字，直接去调收音机'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-mic', title: '复古麦克风', content, hint })
  }

  if (cards.length === 0) {
    cards.push({
      id: 'card-default',
      title: '纸条',
      content: '「想知道那个凌晨发生了什么吗？\n找到正确的钥匙，打开正确的门\n但要小心，有些真相，最好永远被埋葬」',
      hint: '仔细观察房间里的每一件物品，它们都有数字'
    })
  }

  return cards
}

function generateHostSteps(
  config: GeneratorConfig,
  availableProps: string[]
): HostSteps {
  const prep: string[] = []
  const during: string[] = []
  const cleanup: string[] = []

  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasLockbox = availableProps.includes('lockbox')
  const hasCandle = availableProps.includes('candle')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasBell = availableProps.includes('bell')

  prep.push('检查所有道具是否到位，核对清单')
  if (hasRadio) {
    prep.push('确认收音机可以正常调节频率，电源通电')
    prep.push('预设几个干扰频率增加难度（如103.7、105.1）')
  }
  if (hasClock) {
    prep.push('将时钟指针调到10点45分的位置')
    prep.push('确认时钟已经停止走动')
  }
  if (hasLockbox) {
    prep.push('设置好四位密码1045')
    prep.push('放入下一关的线索纸条')
    prep.push('打乱密码盘到随机状态')
  }
  if (hasCandle) {
    prep.push('摆放好蜡烛在安全的位置，远离易燃物')
    prep.push('提前准备打火机或长火柴')
  }
  if (hasBlacklight) {
    prep.push('装好紫外线灯电池，确认能亮')
    prep.push('在关键位置用隐形墨水写下提示')
  }
  if (hasBell) {
    prep.push('将手摇铃铛放在门外或暗角')
    prep.push('准备好主持人出场的时机')
  }
  prep.push('房间灯光调至最低，确认氛围')
  prep.push('主持人的对讲机/耳机调试完毕')

  during.push('开场白结束后保持安静，观察玩家反应')
  if (hasClock) during.push('观察玩家是否主动留意时钟的异常')
  if (hasRadio) during.push('在玩家翻找时偶尔放出背景杂音，音量由低到高')
  during.push('根据时间节点，3/6/10分钟分别给出对应等级的提示')
  if (hasCandle) during.push('玩家靠近关键区域时，轻轻吹动摇曳烛光')
  if (hasBell) during.push('给出二级提示后，门外摇动1次铃铛营造氛围')
  during.push('随时留意玩家的恐怖耐受度，必要时降低恐怖等级')
  during.push('玩家解开密码后及时给出正向反馈音效/台词')

  cleanup.push('玩家离场后开灯，检查所有物品完好')
  if (hasRadio) cleanup.push('关闭收音机电源，拔下插头')
  if (hasClock) cleanup.push('恢复时钟正常走时')
  if (hasLockbox) cleanup.push('取出纸条，重新锁好并打乱密码')
  if (hasCandle) cleanup.push('确认所有蜡烛完全熄灭，无余烬')
  if (hasBlacklight) cleanup.push('取出电池，关闭开关')
  cleanup.push('所有道具回归原位，拍照记录初始状态')
  cleanup.push('整理房间，通风散味')

  return { prep, during, cleanup }
}

function generateTitle(config: GeneratorConfig): string {
  const prefixes = ['午夜', '诡异', '失踪的', '诅咒的', '死亡', '第七个', '第104.5号']
  const suffixes = ['频率', '日记', '房间', '电台', '仪式', '凌晨', '广播']

  const prefix = getRandomItem(prefixes)
  const suffix = getRandomItem(suffixes)

  return `${prefix}${suffix}`
}

function generateAnswer(
  config: GeneratorConfig,
  availableProps: string[]
): string {
  const hasRadio = availableProps.includes('radio')
  const hasLockbox = availableProps.includes('lockbox')
  const hasClock = availableProps.includes('wall-clock')

  const parts: string[] = []
  if (hasClock) parts.push('墙上的时钟指针停在10点45分')
  if (hasRadio) parts.push('将收音机的调频旋钮调到104.5MHz')
  if (hasLockbox) parts.push('输入四位数字密码1045打开密码锁盒')

  if (parts.length === 0) {
    return '找到房间内所有带数字的线索，按顺序组合即为答案'
  }
  return parts.join(' → ')
}

export function generatePuzzle(
  config: GeneratorConfig,
  _existingPuzzles: Puzzle[],
  learning: LearningData = { misunderstoodPhrases: [], weakHorrorPhrases: [], strongHorrorTriggers: [], lowRatedPuzzleIds: [] }
): { puzzle: Puzzle; adjustments: AdjustmentTrace[] } {
  console.log('[PuzzleGenerator] 生成谜题，配置:', config, '学习数据条目:',
    learning.misunderstoodPhrases.length + learning.weakHorrorPhrases.length + learning.strongHorrorTriggers.length)

  const validProps = filterValidProps(config.selectedProps)
  const availableProps = validProps.length > 0
    ? validProps
    : filterValidProps(roomSetups.find(r => r.id === config.roomSetup)?.props || [])

  const adjustments: AdjustmentTrace[] = []

  const script = generateScript(config, availableProps, learning, adjustments)
  const hints = generateHints(config, availableProps, learning, adjustments)
  const playerCards = generatePlayerCards(config, availableProps, learning, adjustments)
  const hostSteps = generateHostSteps(config, availableProps)
  const title = generateTitle(config)
  const answer = generateAnswer(config, availableProps)

  const themeInfo = themes.find(t => t.id === config.theme)

  const puzzle: Puzzle = {
    id: generateId(),
    title,
    theme: themeInfo?.name || '神秘',
    difficulty: config.difficulty,
    horrorLevel: config.horrorLevel,
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
    adjustments: adjustments.length > 0 ? adjustments : undefined,
    basedOnHistory: adjustments.length > 0,
    createdAt: Date.now()
  }

  console.log('[PuzzleGenerator] 谜题生成完成:', puzzle.title, '使用道具数:', availableProps.length, '调整数:', adjustments.length)
  return { puzzle, adjustments }
}
