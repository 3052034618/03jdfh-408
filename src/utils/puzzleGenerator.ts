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
  if (config.horrorLevel < 1) return text

  let result = text

  const weakPhraseCount = learning.weakHorrorPhrases.length
  const hasWeakFeedback = weakPhraseCount > 0 || config.horrorLevel >= 2

  if (hasWeakFeedback) {
    const weakEnhancements: Array<{ from: RegExp; to: string; tag: string; original: string }> = [
      { from: /沙沙声/g, to: '带着电流爆裂的沙沙声...【静电噼啪】', tag: '沙沙声', original: '沙沙声' },
      { from: /电流声/g, to: '【电流滋滋】令人不安的电流声，像有指甲在刮耳膜...', tag: '电流声', original: '电流声' },
      { from: /声音/g, to: '【耳膜颤动】像是从喉咙深处挤出来的沙哑声音...', tag: '声音', original: '声音' },
      { from: /脚步声/g, to: '【咚...咚...咚...】沉重的脚步声，越来越近，地板在微微震颤', tag: '脚步声', original: '脚步声' },
      { from: /诡异/g, to: '让人后颈发凉、汗毛直立的诡异感', tag: '诡异', original: '诡异' },
      { from: /黑暗/g, to: '伸手不见五指的浓稠黑暗，像有东西在里面缓缓游动', tag: '黑暗', original: '黑暗' },
      { from: /安静/g, to: '【绝对死寂】不正常的安静，连呼吸都怕打扰到什么', tag: '安静', original: '安静' },
      { from: /敲门/g, to: '【嘭...嘭...嘭...】不紧不慢的敲门声，每次间隔都刚好7秒', tag: '敲门', original: '敲门' },
      { from: /灯光/g, to: '【灯光闪烁】忽明忽暗的灯光，每次熄灭都比上次更久', tag: '灯光', original: '灯光' },
      { from: /影子/g, to: '不属于这里的影子，它在动，在你看不见的角落', tag: '影子', original: '影子' }
    ]

    for (const enh of weakEnhancements) {
      if (enh.from.test(result)) {
        result = result.replace(enh.from, enh.to)
        const alreadyTraced = adjustments.some(a =>
          a.type === 'horror_weak' && a.original === enh.original
        )
        if (!alreadyTraced) {
          const weakCount = learning.weakHorrorPhrases.filter(w =>
            ['笑场', '无恐怖反应', '玩家觉得不吓人', '快速解谜'].some(tag => w.phrase.includes(tag))
          ).reduce((s, w) => s + w.count, 0)
          adjustments.push({
            type: 'horror_weak',
            original: enh.original,
            adjusted: enh.to,
            reason: weakCount > 0
              ? `检测到${weakCount}次弱反馈（笑场/不吓人/无反应），「${enh.tag}」改为高压迫感描写`
              : `恐怖等级${config.horrorLevel}级，「${enh.tag}」升级为压迫式表达`
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
        '尖叫': { snippet: ' 【尖锐女声划破空气——】啊——！！！不要碰它！！！', tag: '尖叫' },
        '抱头蹲防': { snippet: ' 「有东西...在我头顶...摸我头发...一根一根地...」', tag: '抱头蹲防' },
        '不敢回头': { snippet: ' 【呼吸声在耳边0距离】不要回头...它就贴在你肩膀后面...在笑...', tag: '不敢回头' },
        '抱住同伴': { snippet: ' 「拉住我！别松手！有什么冰冷的东西在拉我的脚踝！」', tag: '抱住同伴' },
        '要求降低恐怖度': { snippet: ' 【门缝渗进暗红色液体】滴答...滴答...在你脚边汇成了脚印...', tag: '要求降低恐怖度' },
        '被音效吓到': { snippet: ' 【音效突然MAX】砰！——！（门被狠狠关上，锁咔哒一声锁死）', tag: '被音效吓到' }
      }

      const mapped = triggerMap[t.reaction]
      if (mapped && !result.includes(mapped.snippet) && result.length < 260) {
        result = result + mapped.snippet
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
  const hasDoor = availableProps.includes('iron-door')
  const hasBook = availableProps.includes('bookshelf')
  const hasChandelier = availableProps.includes('chandelier')

  let opening = ''
  let main = ''
  let climax = ''
  let ending = ''

  if (hasRadio) {
    opening = '【沙沙声】滋滋滋...欢迎收听阴间电台...我是你们今晚的主播...记住...你们出不去了...'
    main = '【电流声】这个房间里藏着一个十年前的秘密...真相就埋在你们眼前的每一件物品里...仔细找...'
    climax = '【尖锐杂音】不！！！不要继续调了！！！【突然绝对死寂】...太迟了...它已经听到你们了...'
    ending = '【微弱的声音】谢谢你们...帮我把真相带出去...【沙沙声渐弱】滋滋滋...'
  } else {
    opening = '【沉重的门关上声】咔哒...你们已经被锁在里面了...这个房间...记住你们看到的一切...'
    main = '空气里弥漫着一股霉味...房间里的每一件物品都在诉说着过去...不要放过任何细节...'
    climax = '【灯光突然熄灭】啊...！...【什么东西重重摔在地上】...它来了...它就在你们中间...'
    ending = '【远处传来钥匙声】咔哒...门开了...但有些东西，你们已经带出来了...'
  }

  if (hasRadio) {
    opening += ' 调到正确的频率，它会告诉你们一切。'
  }
  if (hasClock) {
    opening += ' 记住，当时间停止的那一刻，答案才会出现。'
    main += ' 墙上的时钟停在了那一刻——那一刻就是一切的开始。'
  }
  if (hasTalisman) {
    main += ' 那张符纸不是装饰品，它写的东西，字字属实。'
  }
  if (hasMirror) {
    main += ' 别盯着镜子看太久，里面的东西，会盯着你。'
    climax += ' 镜子里...有东西在看着你...它在笑...嘴角咧到了耳根...'
  }
  if (hasBell) {
    climax += ' 【铃声7响】叮...叮...叮...每一声，都离你的耳朵更近一寸...'
  }
  if (hasDoor) {
    main += ' 那扇铁门，只有找到正确的密码才能打开。'
  }
  if (hasBook) {
    main += ' 书架上那本缺了页的书，缺的那几页就在房间里。'
  }
  if (hasChandelier) {
    climax += ' 【水晶吊灯摇晃】哗啦...有什么东西从上面滴下来，滴在了你脖子后面...'
  }

  if (config.horrorLevel >= 3) {
    climax += ' 【脚步声逼近】咚...咚...咚...越来越近了...地板在震颤...它走到你身后了...'
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
    const tip = ' 记住：房间里每一个带数字的线索之间，都有关联。按发生顺序排列它们。'
    main = main + tip
    adjustments.push({
      type: 'rating_low',
      adjusted: tip.trim(),
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
  const hasDoor = availableProps.includes('iron-door')
  const hasNewspaper = availableProps.includes('newspaper')
  const hasDiary = availableProps.includes('diary')
  const hasPhoto = availableProps.includes('photo')
  const hasLetter = availableProps.includes('letter')
  const hasBookshelf = availableProps.includes('bookshelf')

  let hint1 = '【轻微杂音】...仔...细...看...【沙沙声】'
  let hint2 = '【重复关键词】注意细节...注意每一件物品...'
  let hint3 = '【清晰声音】答案就在你眼前，不要错过那些不起眼的东西'

  const propPriority: Array<{ check: boolean; h1: string; h2: string; h3: string }> = []

  if (hasRadio) {
    propPriority.push({
      check: true,
      h1: '【轻微杂音】...频...率...【电流滋滋】',
      h2: '【重复关键词】收音机...收音机上的调频旋钮...',
      h3: '【清晰声音】把收音机的调频旋钮拧到和所有数字线索对应的那个频率上'
    })
  }
  if (hasClock) {
    propPriority.push({
      check: true,
      h1: '【轻微杂音】...时...钟...【齿轮咔哒】',
      h2: '【重复关键词】凌晨零点...指针停在哪...',
      h3: '【清晰声音】看看墙上的时钟，时针和分针分别指向的数字，那就是密码的前一半'
    })
  }
  if (hasLockbox) {
    propPriority.push({
      check: true,
      h1: '【金属碰撞声】...盒...子...',
      h2: '【重复关键词】四位数字...四位数字...',
      h3: '【清晰声音】把房间里找到的四个数字按时间先后顺序排列，就是锁盒的密码'
    })
  }
  if (hasDoor) {
    propPriority.push({
      check: true,
      h1: '【铁门摩擦声】...门...锁...',
      h2: '【重复关键词】密码锁...门上的密码锁...',
      h3: '【清晰声音】铁门上的四位密码锁，就是你们找到的那四个数'
    })
  }
  if (hasTalisman) {
    propPriority.push({
      check: true,
      h1: '【纸页沙沙声】...符...文...',
      h2: '【重复关键词】符纸上的红色字...红色的字...',
      h3: '【清晰声音】把符纸上的红色字逐个读出来，每个词对应一件房间里的东西'
    })
  }
  if (hasMirror) {
    propPriority.push({
      check: true,
      h1: '【玻璃轻响】...镜...子...',
      h2: '【重复关键词】镜子里的倒影...倒影里有什么...',
      h3: '【清晰声音】把你手里的线索举到镜子前，倒着读就是答案'
    })
  }
  if (hasBookshelf) {
    propPriority.push({
      check: true,
      h1: '【书本哗啦】...书...架...',
      h2: '【重复关键词】那本缺了页的书...缺的页码...',
      h3: '【清晰声音】书架上按顺序排列的书脊数字，就是你们要找的'
    })
  }
  if (hasNewspaper || hasDiary || hasPhoto || hasLetter) {
    propPriority.push({
      check: true,
      h1: '【纸张翻动】...文...字...',
      h2: '【重复关键词】日期...数字...所有写着数字的地方...',
      h3: '【清晰声音】把所有纸上的日期、年份、页码都抄下来，它们是答案'
    })
  }

  if (propPriority.length > 0) {
    const chosen = propPriority[0]
    hint1 = chosen.h1
    hint2 = chosen.h2
    hint3 = chosen.h3
  }

  hint1 = replaceMisunderstoodPhrases(hint1, learning, adjustments)
  hint2 = replaceMisunderstoodPhrases(hint2, learning, adjustments)
  hint3 = replaceMisunderstoodPhrases(hint3, learning, adjustments)

  hint1 = enhanceHorrorPhrases(hint1, config, learning, adjustments)
  hint2 = enhanceHorrorPhrases(hint2, config, learning, adjustments)
  hint3 = enhanceHorrorPhrases(hint3, config, learning, adjustments)

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
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasLockbox = availableProps.includes('lockbox')
  const hasDoor = availableProps.includes('iron-door')
  const hasTalisman = availableProps.includes('talisman')
  const hasNewspaper = availableProps.includes('newspaper')
  const hasDiary = availableProps.includes('diary')
  const hasPhoto = availableProps.includes('photo')
  const hasLetter = availableProps.includes('letter')
  const hasMicrophone = availableProps.includes('microphone')
  const hasHeadphone = availableProps.includes('headphone')
  const hasConsole = availableProps.includes('audio-console')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasChandelier = availableProps.includes('chandelier')
  const hasBell = availableProps.includes('hand-bell')

  if (hasTalisman) {
    let content = '一张泛黄的符纸，四角已经微微卷起，上面用朱砂画着奇怪的红色符文，最下面写着：「按时间的顺序，才能打开那扇门」'
    let hint = '注意「时间」和「门」这两个关键词，分别对应房间里的哪两件物品'
    if (hasClock && hasRadio) {
      content = '一张泛黄的符纸，上面用朱砂写着：「当时间停下，调整频率至相同时刻，真相自会浮现」\n四角画着红色符文，边缘似乎泛着不正常的红光...'
      hint = '「时间停下」=时钟，「频率」=收音机，把时钟显示的时间直接调到收音机上'
    } else if (hasClock && hasLockbox) {
      content = '一张泛黄的符纸，上面用朱砂写着：「时间停下的那一刻，就是锁盒开启的钥匙」\n四角的红色符文，仿佛在微微跳动...'
      hint = '时钟的指针停在几点几分？那四个数字就是锁盒的密码'
    } else if (hasClock && hasDoor) {
      content = '一张泛黄的符纸，上面用朱砂写着：「以时间为钥，方能开启那扇铁门」\n四角符文泛着暗红色的光...'
      hint = '时钟的时针+分针数字，就是铁门密码锁的答案'
    } else if (hasClock) {
      content = '一张泛黄的符纸，上面用朱砂写着：「答案，藏在时间停下的那一瞬间」\n四角画着奇怪的红色符文...'
      hint = '直接去看墙上的时钟，它停在几点几分，那就是答案'
    } else if (hasRadio) {
      content = '一张泛黄的符纸，上面用朱砂写着：「调频至那个不该存在的频道，你会听到一切」\n符文边缘隐隐有灼烧痕迹...'
      hint = '收音机上有一个频道是和其他线索对应的，慢慢调'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-talisman', title: '符纸', content, hint })
  }

  if (hasNewspaper) {
    let content = '「本报讯」本报记者讯：十年前的那个深夜，本市知名主播林某某于直播途中失踪\n警方搜查直播间无果，案件至今悬而未决，家属悬赏寻找任何线索...'
    let hint = '把报纸上的日期、年份、案件编号所有数字都记下来'
    if (hasRadio && hasClock) {
      content = '「本报讯」10月4日凌晨零点45分，本市K.I.L.L电台知名主播林某在直播途中突然失踪\n最后广播信号停留在调频104.5，警方称直播间内一切完好，唯独人消失了...'
      hint = '日期10月4日，时间0点45分，最后频率104.5，这三组数字是同一组'
    } else if (hasPhoto) {
      content = '「本报讯」本报10月4日讯：十年前失踪的电台主播林某，最后一次公开露面是在开播纪念合影中\n警方呼吁市民提供线索，悬赏10万元...'
      hint = '日期10月4日，这四个数字和照片背面的日期是一致的'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-newspaper', title: '旧报纸', content, hint })
  }

  if (hasDiary) {
    let content = '「第七天」\n我开始听到一些奇怪的声音...从房间的各个角落传出来...\n它说它知道关于十年前那个秘密...'
    let hint = '"第七天"是一个数字线索，把它和其他数字放在一起比较'
    if (hasClock) {
      content = '「第七天 · 凌晨」\n我开始听到齿轮转动的声音...从那面墙后面...\n墙上的钟今天又停了，和去年的那一天，停在同一个时刻——10:45\n它在提醒我，那件事还没有结束...'
      hint = '日记里明确写了时钟停在10:45，直接去对时钟'
    } else if (hasBell) {
      content = '「第七天」\n今晚又听到了那七下铃声...和去年那个晚上一模一样...\n我数了三遍，每一次，都是七下...不多不少...'
      hint = '铃声响了七下，这个数字"7"是关键'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-diary', title: '日记本', content, hint })
  }

  if (hasPhoto) {
    let content = '一张泛黄的黑白合影，几个人站在房间门口\n背面写着：「XX 年 X 月 X 日 · 纪念」\n其中一个人的脸被人用指甲狠狠划掉了，划痕深得快划破纸背...'
    let hint = '照片背面的所有数字，全部记下来'
    if (hasNewspaper || hasRadio) {
      content = '一张泛黄的黑白合影，五个人站在门口，背景的招牌上依稀能看到"电台"两个字\n背面用铅笔写着：「1987.10.04 开播纪念」\n左起第二个人的脸被狠狠划掉了，剩下的四个人，表情都很诡异，像在对着镜头后面的什么东西笑...'
      hint = '10月04日 → 1 0 4 5，这四个数字贯穿了所有线索'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-photo', title: '老照片', content, hint })
  }

  if (hasLetter) {
    let content = '「我亲爱的继任者：\n当你读到这封信时，我应该已经不在了。\n记住那几个关键的数字——它们是唯一的钥匙。\n愿你比我幸运。」'
    let hint = '信里提到的"那几个关键的数字"，分散在其他每张卡里，找出来拼在一起'
    if (hasLockbox) {
      content = '「我亲爱的继任者：\n当你读到这封信时，我应该已经不在了。\n记住——1、0、4、5，这是唯一能打开那只盒子的钥匙。\n打开之后，立刻烧掉里面的东西，千万不要读。\n愿你比我幸运。」'
      hint = '信里直接给了四个数字 1 0 4 5，直接去开密码锁盒'
    } else if (hasDoor) {
      content = '「我亲爱的继任者：\n当你读到这封信时，我应该已经不在了。\n记住——1、0、4、5，按顺序输进门上的密码锁。\n门开了之后，什么都别回头看，直接跑。」'
      hint = '1 0 4 5 直接输进铁门的密码锁'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-letter', title: '手写信件', content, hint })
  }

  if (hasMicrophone) {
    let content = '一支蒙着厚厚灰尘的老式麦克风，支架上有很深的划痕\n网罩里好像塞着什么东西，掏出来是一张被揉皱的小纸条...'
    let hint = '把麦克风网罩里的纸条掏出来看'
    if (hasRadio) {
      content = '一支蒙着灰的老式动圈麦克风，支架金属上深深刻着一行字：「调频 1 0 4 . 5 · K.I.L.L 电台」\n麦克风的网罩缝隙里，好像塞着一张纸条...'
      hint = '支架上直接刻了调频 104.5，去调收音机对应频率'
    } else if (hasHeadphone) {
      content = '一支蒙着灰的老式麦克风，支架上刻着：「和那副耳机一起用」\n网罩里塞着一张被揉皱的纸条，写着四个数字...'
      hint = '戴上耳机，再看纸条上的四个数字'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-mic', title: '复古麦克风', content, hint })
  }

  if (hasHeadphone) {
    let content = '一副笨重的头戴式监听耳机，耳罩上的皮革已经开裂\n把它戴上——耳机里有极其微弱的声音，断断续续...'
    let hint = '把耳机戴上，仔细听里面播放的是什么声音或数字'
    if (hasRadio) {
      content = '一副笨重的头戴式监听耳机，线圈还连着收音机的背面\n戴上之后——里面是十年前的那次广播，主播正在念：「一...零...四...五...救...救...我...」'
      hint = '耳机里清晰念出了四个数字：1 0 4 5，直接用'
    } else if (hasConsole) {
      content = '一副监听耳机，插头插在播音控制台的监听口\n戴上之后里面有循环播放的四个敲击声——一长、零短、四长、五短...'
      hint = '敲击声的长短是摩斯码，对应四个数字 1 0 4 5'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-headphone', title: '监听耳机', content, hint })
  }

  if (hasConsole) {
    let content = '一台布满按钮和推子的播音控制台，电源指示灯还在微弱地闪着\n屏幕上停在一个输入界面，要求输入四位数字...'
    let hint = '把四位数字输进控制台，它会播放下一段内容'
    if (hasRadio) {
      content = '播音控制台的推子全部被封在透明罩里，只有最下面一排四个按钮可以按，分别标着数字\n屏幕上循环显示：「请输入目标频率，按回车确认」'
      hint = '按正确顺序输入频率对应的四位数字，控制台会解锁收音机'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-console', title: '播音控制台', content, hint })
  }

  if (hasBookshelf) {
    let content = '一整面墙的旧书架，大部分书脊都已经褪色\n只有一本书抽出来的距离比别的都多一点，书脊上写着：「午夜必读书目 第七卷」'
    let hint = '把那本抽出来一截的书抽出来——书里夹着纸条，书脊数字也是线索'
    if (hasLockbox) {
      content = '书架上按年份摆了几十本旧日记，每本的书脊上都有两位数字编号\n唯独编号第10、第04、第45这三本的摆放顺序和年份不一致——它们被人故意调换了位置...'
      hint = '调换过位置的三本书的编号：10、04、45 → 四个数字 1 0 4 5'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-bookshelf', title: '旧书架', content, hint })
  }

  if (hasChandelier) {
    let content = '头顶悬挂着一盏沉重的水晶吊灯，每一颗水晶都蒙着灰\n但有七颗水晶特别干净——像是被人反复摸过，而且它们在吊灯上组成了一个数字的形状...'
    let hint = '抬头数吊灯上特别干净的那几颗水晶的位置，它们组成一个四位数'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-chandelier', title: '水晶吊灯', content, hint })
  }

  if (cards.length === 0) {
    cards.push({
      id: 'card-default-1',
      title: '墙角的纸条',
      content: '「那个秘密，就藏在最显眼的地方\n人们总是忽视眼前的东西\n灯灭的时候，你会看见」',
      hint: '灯灭的时候，仔细看房间最中间的位置'
    })
    cards.push({
      id: 'card-default-2',
      title: '门缝下塞进来的纸',
      content: '「不要相信这里的任何一面镜子\n不要数到第七下\n不要让门关上第三次」',
      hint: '这里面有三个数字线索，注意"第七""第三"'
    })
    if (hasDoor) {
      cards.push({
        id: 'card-default-door',
        title: '贴在门后的胶带纸',
        content: '「出去的方法：\n第一次关灯后等10秒\n第二次关灯后等4秒\n第三次关灯后门就开了」',
        hint: '10 + 4 → 四个数字 1 0 4 5 是密码'
      })
    }
  }

  cards.forEach((card, idx) => {
    card.content = enhanceHorrorPhrases(card.content, { ...config, horrorLevel: Math.max(1, config.horrorLevel - 1) }, learning, adjustments)
    if (card.hint) {
      card.hint = enhanceHorrorPhrases(card.hint, { ...config, horrorLevel: Math.max(1, config.horrorLevel - 1) }, learning, adjustments)
    }
  })

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
  const hasBell = availableProps.includes('bell') || availableProps.includes('hand-bell')
  const hasDoor = availableProps.includes('iron-door')
  const hasMicrophone = availableProps.includes('microphone')
  const hasHeadphone = availableProps.includes('headphone')
  const hasConsole = availableProps.includes('audio-console')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasChandelier = availableProps.includes('chandelier')

  prep.push('检查所有已勾选道具是否到位，核对清单')
  if (hasRadio) {
    prep.push('确认收音机可以正常调节频率，电源通电，扬声器无杂音')
    prep.push('预设几个干扰频率增加难度（但保证正确频率可以清晰收到）')
    prep.push('正确频率的音频内容提前录制或准备好备用')
  }
  if (hasClock) {
    prep.push('将时钟指针调到与谜题答案对应的时间位置')
    prep.push('取下时钟电池或确认时钟已经完全停止走动')
  }
  if (hasLockbox) {
    prep.push('设置好锁盒的四位密码，确认开关顺畅')
    prep.push('放入下一关的线索纸条或关键物品进入锁盒')
    prep.push('打乱密码盘到随机状态，确保不是初始状态')
  }
  if (hasDoor) {
    prep.push('设置好铁门密码锁的四位密码')
    prep.push('测试密码锁开锁闭锁功能正常')
    prep.push('确认门内无其他安全隐患，应急通道畅通')
  }
  if (hasCandle) {
    prep.push('摆放好蜡烛在防火安全的位置，远离窗帘、纸张等易燃物')
    prep.push('提前准备打火机或长火柴放在随手可及的位置')
  }
  if (hasBlacklight) {
    prep.push('装好紫外线灯电池，反复开关确认能正常点亮')
    prep.push('在预设的关键位置用隐形墨水写下对应提示内容')
    prep.push('用黑光灯照一遍确认内容可见、位置合理')
  }
  if (hasBell) {
    prep.push('将手摇铃铛放在门外或主持人能轻松够到的暗角位置')
    prep.push('提前试摇确认铃铛的响度合适（能听到但不刺耳）')
  }
  if (hasTalisman) {
    prep.push('将符纸放在玩家视线可及但需要走近才能看清的位置')
    prep.push('确认符纸上文字清晰，没有被遮挡')
  }
  if (hasMirror) {
    prep.push('检查镜子位置确保玩家能正面接近，没有尖锐边缘')
    prep.push('如果是道具镜，确认稳固不会倾倒')
  }
  if (hasMicrophone) {
    prep.push('将麦克风放在桌面上或支架上，网罩内的纸条提前塞入')
    prep.push('确认支架上的刻字清晰可见（或贴纸贴好）')
  }
  if (hasHeadphone) {
    prep.push('耳机插头插在对应设备上（收音机/播音控制台/预录设备）')
    prep.push('测试耳机内容能正常播放，音量调节到略大于环境音')
  }
  if (hasConsole) {
    prep.push('播音控制台通电，指示灯处于闪烁待机状态')
    prep.push('确认输入键盘可按、屏幕显示正确提示文字')
  }
  if (hasBookshelf) {
    prep.push('关键的那几本书（被抽出的、调换位置的）摆放到对应位置')
    prep.push('其他书摆齐，确保关键书的异常之处足够明显但不突兀')
  }
  if (hasChandelier) {
    prep.push('水晶吊灯上标记位置的水晶擦干净（或贴反光贴纸）')
    prep.push('确认吊灯稳固无坠落风险，灯光亮度合适')
  }
  prep.push('房间灯光调至预设亮度，确认整体氛围符合恐怖等级要求')
  prep.push('主持人的对讲机、耳机、提词器调试完毕，通讯畅通')
  prep.push('应急出口标识清晰，灭火器、急救包位置确认')

  during.push('开场白结束后保持安静，主持人在后台观察玩家反应和动线')
  if (hasClock) during.push('留意玩家是否主动留意到时钟已经停止、指针位置异常')
  if (hasRadio) during.push('在玩家开始翻找时，偶尔从背景放出音量由低到高的杂音，引导去收音机')
  if (hasLockbox) during.push('玩家拿到锁盒后可通过提示引导："重量很轻，里面是纸"')
  if (hasDoor) during.push('玩家第一次接触铁门时，可给一次"咔哒"声反馈')
  if (hasMirror) during.push('玩家盯着镜子超过5秒时，后台可给一次轻微灯光闪烁')
  if (hasTalisman) during.push('玩家拿起符纸时，背景可加一次轻微的纸页翻动音效')
  if (hasBookshelf) during.push('玩家靠近书架时，可加一次书本掉落的轻响')
  during.push('严格按照3分钟/6分钟/10分钟的节点给出对应等级的提示')
  if (hasCandle) during.push('玩家靠近关键区域时，主持人后台轻轻吹动蜡烛让火光摇曳')
  if (hasBell) during.push('给出二级提示的同时，门外摇动1次铃铛营造压迫感')
  during.push('全程留意玩家的恐怖耐受度（脸色/呼吸/尖叫/要求暂停），必要时临时降低恐怖等级，打开灯光')
  during.push('玩家解开核心谜题的瞬间，及时给出正向反馈（音效/台词/灯光变化）')
  during.push('游戏全程确保至少一名工作人员能看到玩家全景，防止意外发生')

  cleanup.push('玩家全部离场后，首先打开全部房间灯光，通风')
  cleanup.push('检查每位玩家随身物品，确认没有带任何道具离场')
  if (hasRadio) cleanup.push('关闭收音机电源，拔下电源插头，调回日常频段')
  if (hasClock) cleanup.push('装回时钟电池，恢复正常走时，对准当前时间')
  if (hasLockbox) cleanup.push('打开锁盒取出内部线索，重新锁好并彻底打乱密码盘')
  if (hasDoor) cleanup.push('铁门恢复开锁状态，密码打乱，挂"已清洁"标识')
  if (hasCandle) cleanup.push('逐一确认所有蜡烛完全熄灭，烛芯无余烬，摸一下确认不烫')
  if (hasBlacklight) cleanup.push('取出紫外线灯电池，关闭开关，放回充电座')
  if (hasConsole) cleanup.push('播音控制台断电，推子归零，屏幕关闭')
  if (hasMicrophone) cleanup.push('检查麦克风网罩内部纸条是否还在，不在的话补一张新的')
  if (hasHeadphone) cleanup.push('耳机线理顺绕好，放回原位')
  if (hasBookshelf) cleanup.push('所有书回归原位，关键书重新摆放成异常状态')
  if (hasChandelier) cleanup.push('水晶吊灯的标记水晶重新确认位置')
  if (hasMirror) cleanup.push('镜子表面擦干净指纹和痕迹')
  if (hasTalisman) cleanup.push('符纸如有破损更换新的，放回固定位置')
  cleanup.push('所有道具回归初始位置，和标准初始状态照片逐一核对')
  cleanup.push('整理房间，通风散味，喷洒空气清新剂')
  cleanup.push('填写本场道具损耗检查表，破损物品登记')

  return { prep, during, cleanup }
}

function generateTitle(config: GeneratorConfig, availableProps: string[]): string {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasMirror = availableProps.includes('mirror')
  const hasDoor = availableProps.includes('iron-door')

  const radioPrefixes = ['午夜', '诡异', '失踪的', '诅咒的', '死亡', '第七个', '调频104.5的']
  const noRadioPrefixes = ['上锁的', '第七个', '消失的', '死亡', '诅咒的', '诡异', '最后一扇']
  const suffixes: Record<string, string[]> = {
    radio: ['频率', '电台', '广播', '最后一期节目'],
    clock: ['凌晨', '停摆的时钟', '那一刻'],
    mirror: ['镜中人', '倒影', '第七重'],
    door: ['铁门', '房间', '门后的秘密'],
    default: ['日记', '房间', '仪式', '真相', '秘密']
  }

  const prefix = getRandomItem(hasRadio ? radioPrefixes : noRadioPrefixes)
  let suffixPool = suffixes.default
  if (hasRadio) suffixPool = [...suffixPool, ...suffixes.radio]
  if (hasClock) suffixPool = [...suffixPool, ...suffixes.clock]
  if (hasMirror) suffixPool = [...suffixPool, ...suffixes.mirror]
  if (hasDoor) suffixPool = [...suffixPool, ...suffixes.door]

  const suffix = getRandomItem(suffixPool)
  return `${prefix}${suffix}`
}

function generateAnswer(
  config: GeneratorConfig,
  availableProps: string[]
): string {
  const hasRadio = availableProps.includes('radio')
  const hasLockbox = availableProps.includes('lockbox')
  const hasClock = availableProps.includes('wall-clock')
  const hasDoor = availableProps.includes('iron-door')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasLetter = availableProps.includes('letter')

  const steps: string[] = []
  let coreNumber = ''

  const numberSources: Array<{ check: boolean; label: string; number: string }> = [
    { check: hasLetter, label: '手写信件', number: '1、0、4、5' },
    { check: hasClock, label: '时钟', number: '10点45分 → 1 0 4 5' },
    { check: hasRadio, label: '收音机', number: '调频 104.5MHz → 1 0 4 5' },
    { check: hasBookshelf, label: '书架异常书', number: '第10册、第04册、第45册 → 1 0 4 5' }
  ]
  const validNumbers = numberSources.filter(n => n.check)
  if (validNumbers.length > 0) {
    coreNumber = '四个核心数字 1、0、4、5'
    validNumbers.forEach((s, i) => {
      steps.push(`第${i + 1}步：从【${s.label}】读出线索——${s.number}`)
    })
  } else if (hasTalisman && hasMirror) {
    coreNumber = '符纸 + 镜子 组合出的数字'
    steps.push('第1步：读出符纸上的红色符文')
    steps.push('第2步：站在镜子前倒着读符文内容')
  } else {
    coreNumber = '房间里所有带数字的线索按顺序组合'
    steps.push('第1步：逐一收集房间内所有含数字的物品（日期、年份、页码等）')
    steps.push('第2步：按时间发生的先后顺序排列这些数字')
  }

  const actions: Array<{ check: boolean; label: string }> = [
    { check: hasLockbox, label: `将 ${coreNumber} 输入密码锁盒，打开取出下一件线索` },
    { check: hasDoor, label: `将 ${coreNumber} 输入铁门密码锁，打开大门` },
    { check: hasRadio, label: `将收音机调频旋钮拧至 ${coreNumber.replace(/、/g, '').slice(0, 1)}.${coreNumber.replace(/、/g, '').slice(1)} 对应频率，收听最终广播` }
  ]
  const validActions = actions.filter(a => a.check)
  if (validActions.length > 0) {
    validActions.forEach((a, i) => {
      steps.push(`第${validNumbers.length + i + 1}步：${a.label}`)
    })
  } else {
    steps.push(`最后：将 ${coreNumber} 报给主持人，即可完成本关`)
  }

  if (hasMirror) {
    steps.push('彩蛋：完成后回头看一眼镜子——你会看到不该看到的东西')
  }
  if (hasTalisman) {
    steps.push('重要：谜题解开后，符纸必须立刻焚烧，不可带走')
  }

  return steps.join('\n\n')
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
  const title = generateTitle(config, availableProps)
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
