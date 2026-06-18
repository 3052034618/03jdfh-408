import type { Puzzle, GeneratorConfig, PuzzleHint, PlayerCard, HostSteps, PuzzleScript, AdjustmentTrace, LearningData, ExecutionChecklist } from '@/types/puzzle'
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

const ALL_WEAK_TAGS = [
  { key: '笑场', label: '恐怖场景笑场' },
  { key: '快速解谜', label: '难度不足解谜过快' },
  { key: '无恐怖反应', label: '完全无恐怖反应' },
  { key: '玩家觉得不吓人', label: '玩家明确说不吓人' },
  { key: '主动催进度', label: '玩家主动催进度' },
  { key: '闲聊摆烂', label: '玩家闲聊摆烂不投入' },
  { key: '恐怖场景笑场', label: '恐怖场景笑场' },
  { key: '吐槽机关低级', label: '吐槽机关太简单低级' }
]

function summarizeWeakFeedback(learning: LearningData): { tags: Array<{ label: string; count: number }>; total: number } {
  const counter: Record<string, number> = {}
  let total = 0
  ALL_WEAK_TAGS.forEach(t => {
    const entry = learning.weakHorrorPhrases.find(w => w.phrase.includes(t.key))
    if (entry) {
      counter[t.label] = (counter[t.label] || 0) + entry.count
      total += entry.count
    }
  })
  return {
    tags: Object.entries(counter).map(([label, count]) => ({ label, count })),
    total
  }
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
          const cnt = learning.misunderstoodPhrases.find(m => m.phrase === matchedMisunderstood || result.includes(m.phrase))?.count || 1
          adjustments.push({
            type: 'misunderstanding',
            original: rep.original,
            adjusted: rep.replaced,
            reason: `表达「${rep.original}」在历史复盘中被误解 ${cnt} 次（高频误解词），改写为更具象的「${rep.replaced}」降低歧义`
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
  const weakSummary = summarizeWeakFeedback(learning)
  const hasWeakFeedback = weakSummary.total > 0 || config.horrorLevel >= 2

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

    const reasonSuffix = weakSummary.total > 0
      ? `触发类型：${weakSummary.tags.map(t => `${t.label}×${t.count}`).join('、')}，共${weakSummary.total}次弱反馈`
      : `恐怖等级 ${config.horrorLevel} 级（中/重恐），统一升级为压迫式表达`

    for (const enh of weakEnhancements) {
      if (enh.from.test(result)) {
        result = result.replace(enh.from, enh.to)
        const alreadyTraced = adjustments.some(a =>
          a.type === 'horror_weak' && a.original === enh.original
        )
        if (!alreadyTraced) {
          adjustments.push({
            type: 'horror_weak',
            original: enh.original,
            adjusted: enh.to,
            reason: `将「${enh.tag}」升级为高压迫感描写 → ${reasonSuffix}`
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
  const hasHandBell = availableProps.includes('hand-bell')
  const hasBook = availableProps.includes('bookshelf')
  const hasChandelier = availableProps.includes('chandelier')
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasLockbox = availableProps.includes('lockbox')
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasFlashlight = availableProps.includes('flashlight')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasMask = availableProps.includes('mask')
  const hasCompass = availableProps.includes('compass')

  let opening = ''
  let main = ''
  let climax = ''
  let ending = ''

  if (hasRadio) {
    opening = '【沙沙声】滋滋滋...欢迎收听阴间电台...我是你们今晚的主播...记住...你们出不去了...'
    main = '【电流声】这个房间里藏着一个十年前的秘密...真相就埋在你们眼前的每一件物品里...仔细找...'
    climax = '【尖锐杂音】不！！！不要继续调了！！！【突然绝对死寂】...太迟了...它已经听到你们了...'
    ending = '【微弱的声音】谢谢你们...帮我把真相带出去...【沙沙声渐弱】滋滋滋...'
  } else if (hasDoorLock || hasIronDoor || hasPadlock) {
    opening = '【沉重的门关上声】咔哒...铁门在身后锁死了...你们必须在这里找到出口的密码...'
    main = '地下室的空气阴冷潮湿...墙上挂着好几种锁...每一把锁，都在向你们暗示一组数字...'
    climax = '【灯光突然熄灭】啊...！...【锁扣弹开的脆响】...有一把锁...自己开了...就在你们身后...'
    ending = '【最后一道锁解开的声音】砰...铁门开了...但走出去之前，不要回头看...'
  } else {
    opening = '【沉重的门关上声】咔哒...你们已经被锁在里面了...这个房间...记住你们看到的一切...'
    main = '空气里弥漫着一股霉味...房间里的每一件物品都在诉说着过去...不要放过任何细节...'
    climax = '【灯光突然熄灭】啊...！...【什么东西重重摔在地上】...它来了...它就在你们中间...'
    ending = '【远处传来钥匙声】咔哒...门开了...但有些东西，你们已经带出来了...'
  }

  if (hasRadio) opening += ' 调到正确的频率，它会告诉你们一切。'
  if (hasClock) { opening += ' 记住，当时间停止的那一刻，答案才会出现。'; main += ' 墙上的时钟停在了那一刻——那一刻就是一切的开始。' }
  if (hasTalisman) main += ' 那张符纸不是装饰品，它写的东西，字字属实。'
  if (hasMirror) { main += ' 别盯着镜子看太久，里面的东西，会盯着你。'; climax += ' 镜子里...有东西在看着你...它在笑...嘴角咧到了耳根...' }
  if (hasBell || hasHandBell) climax += ' 【铃声7响】叮...叮...叮...每一声，都离你的耳朵更近一寸...'
  if (hasDoorLock || hasIronDoor) main += ' 那扇铁门上的密码锁，只有找齐所有数字才能打开。'
  if (hasPadlock) main += ' 柜子上的那把铜挂锁，它的密码，刻在你们手里的某件东西上。'
  if (hasCombLock) main += ' 箱子上的转盘密码锁，需要左右旋转对应三组数字。'
  if (hasBook) main += ' 书架上那本缺了页的书，缺的那几页就在房间里。'
  if (hasChandelier) climax += ' 【水晶吊灯摇晃】哗啦...有什么东西从上面滴下来，滴在了你脖子后面...'
  if (hasCandle) { main += ' 桌上的蜡烛，火光在无风的房间里自己摇曳——它在指方向。'; climax += ' 【蜡烛同时熄灭】噗...所有的烛光在同一秒，灭了...' }
  if (hasLantern) main += ' 墙角那盏泛黄的纸灯笼，只有在特定的位置才会亮起来。'
  if (hasFlashlight) main += ' 那只时亮时暗的手电筒，只有在黑暗的角落里才能照出东西来。'
  if (hasBlacklight) main += ' 紫外线灯是你们的眼睛——看不见的东西，它会让它现形。'
  if (hasTape) main += ' 磁带录音机里有一盘未听完的磁带，它停在了数字的那一句。'
  if (hasPhono) main += ' 留声机上的唱片，它播放的那首歌，每一句都是一个日期。'
  if (hasMask) climax += ' 【纸张撕裂声】那张面具...它的嘴角...好像...上扬了一寸...'
  if (hasCompass) main += ' 那只指针乱转的罗盘，它指向的不是北方，而是房间里藏着数字的方向。'

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
    adjustments.push({ type: 'rating_low', adjusted: tip.trim(), reason: `参考${learning.lowRatedPuzzleIds.length}个低分谜题的反馈，增加关联性提示降低卡关率` })
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
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasNewspaper = availableProps.includes('newspaper')
  const hasDiary = availableProps.includes('diary')
  const hasPhoto = availableProps.includes('photo')
  const hasLetter = availableProps.includes('letter')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasFlashlight = availableProps.includes('flashlight')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasCompass = availableProps.includes('compass')
  const hasMask = availableProps.includes('mask')

  let hint1 = '【轻微杂音】...仔...细...看...【沙沙声】'
  let hint2 = '【重复关键词】注意细节...注意每一件物品...'
  let hint3 = '【清晰声音】答案就在你眼前，不要错过那些不起眼的东西'

  const propPriority: Array<{ check: boolean; h1: string; h2: string; h3: string }> = []

  if (hasDoorLock || hasIronDoor) {
    const h3 = (hasClock && hasRadio)
      ? '【清晰声音】值班表的四个时间=01/00/04/05→取首位1 0 4 5，输铁门密码锁'
      : (hasNewspaper)
        ? '【清晰声音】铁门贴的报纸剪报=10月4日0点45分→四个数字就是1045'
        : '【清晰声音】铁门油漆写的「时刻频率」→四个字笔画数=1/0/4/5，直接按顺序输'
    propPriority.push({ check: true,
      h1: '【铁门摩擦声】...密...码...锁...',
      h2: '【重复关键词】门上的四位密码...贴的那张纸...',
      h3
    })
  }
  if (hasPadlock) {
    const h3 = hasKey
      ? '【清晰声音】那把铜挂锁=三位数字，钥匙上红线三个结写着微型数字'
      : '【清晰声音】那把铜挂锁=三位数字，锁侧面三道刻痕→一浅=0/二深=4/三最深=5→045'
    propPriority.push({ check: true,
      h1: '【金属碰撞声】...铜...锁...',
      h2: '【重复关键词】挂锁的刻度...锁身侧面的刻痕...',
      h3
    })
  }
  if (hasCombLock) {
    const h3 = hasBookshelf || hasDiary || hasNewspaper
      ? '【清晰声音】转盘锁三圈=顺→逆→顺→分别转到10→04→45，旁边木牌写着页码'
      : '【清晰声音】转盘锁三圈=先顺时针3圈停10→再逆时针2圈停04→再顺时针直接停45'
    propPriority.push({ check: true,
      h1: '【转盘转动声】...转...盘...',
      h2: '【重复关键词】先顺后逆...三组刻度...',
      h3
    })
  }
  if (hasRadio) propPriority.push({ check: true,
    h1: '【轻微杂音】...频...率...【电流滋滋】',
    h2: '【重复关键词】调频旋钮...104.5...',
    h3: '【清晰声音】把收音机的调频旋钮直接调到104.5，会听到主播的最后一句话'
  })
  if (hasClock) propPriority.push({ check: true,
    h1: '【齿轮咔哒】...时...钟...',
    h2: '【重复关键词】时针分针...停在哪一刻...',
    h3: '【清晰声音】墙上时钟停在10:45→时=10/分=45→四个数字就是1045'
  })
  if (hasLockbox) propPriority.push({ check: true,
    h1: '【金属碰撞声】...盒...子...',
    h2: '【重复关键词】锁盒四位密码...四个数字...',
    h3: '【清晰声音】锁盒的四位密码=房间里找到的四个数字，按发现顺序输进去'
  })
  if (hasTalisman) {
    const h3 = (hasClock && hasRadio)
      ? '【清晰声音】符纸红字：「时间停下→频率相同」→时钟10:45=收音机104.5'
      : (hasClock)
        ? '【清晰声音】符纸红字：「答案藏在时间停下的瞬间」→时钟停的四个数字就是答案'
        : (hasRadio)
          ? '【清晰声音】符纸红字：「调频至不该存在的频道」→收音机直接调到104.5'
          : '【清晰声音】符纸的四个角分别贴着1、0、4、5四个小数字，按顺时针读'
    propPriority.push({ check: true,
      h1: '【纸页沙沙声】...符...文...',
      h2: '【重复关键词】朱砂红字...红字对应什么...',
      h3
    })
  }
  if (hasMirror) propPriority.push({ check: true,
    h1: '【玻璃轻响】...镜...子...',
    h2: '【重复关键词】镜面有字...倒着读...',
    h3: '【清晰声音】镜面上反写的四个数字→倒过来读就是1045'
  })
  if (hasBookshelf) propPriority.push({ check: true,
    h1: '【书本哗啦】...书...架...',
    h2: '【重复关键词】缺的书脊...缺的页码...',
    h3: '【清晰声音】书架上按顺序排的书脊号=第10本缺/第0本占位/第4本缺/第5本缺→1045'
  })
  if (hasCandle) {
    const h3 = hasPadlock
      ? '【清晰声音】烛台中心塞的纸条写着挂锁=045，三位直接开挂锁'
      : hasDoorLock || hasIronDoor
        ? '【清晰声音】桌上四根蜡烛高度=1寸/0寸/4寸/5寸→四位就是铁门密码'
        : hasBlacklight
          ? '【清晰声音】蜡烛烧1寸后关房间灯，紫外线照蜡烛身显蓝色四位数字'
          : '【清晰声音】把蜡烛拔出来，烛台底座反面刻着四个微型数字→1045'
    propPriority.push({ check: true,
      h1: '【蜡烛噼啪声】...蜡...烛...',
      h2: '【重复关键词】烛台底座...蜡油痕迹...',
      h3
    })
  }
  if (hasLantern) {
    const h3 = hasDoorLock || hasIronDoor
      ? '【清晰声音】点亮灯笼后透过纸看，竹骨架投影四个数字=1045→铁门密码'
      : hasCombLock
        ? '【清晰声音】三层灯笼的小孔标记→上层1→中层04→下层45→对应转盘锁三圈刻度'
        : '【清晰声音】点亮灯笼，竹骨架横竖条拼成四个数字形状→1045'
    propPriority.push({ check: true,
      h1: '【纸张晃动】...灯...笼...',
      h2: '【重复关键词】竹骨架...灯光投的影子...',
      h3
    })
  }
  if (hasFlashlight) {
    const h3 = hasBlacklight
      ? '【清晰声音】手电筒是紫外LED款，关房间灯后往墙上照，显蓝色荧光1045'
      : hasLockbox
        ? '【清晰声音】手电筒握把内金属牌写锁盒密码=1/0+灯泡型号4.5→1045'
        : '【清晰声音】手电筒打开往最黑的角落照，光投在墙上的影子是数字1045形状'
    propPriority.push({ check: true,
      h1: '【开关咔哒】...手...电...',
      h2: '【重复关键词】关掉房间灯...打开手电往墙上照...',
      h3
    })
  }
  if (hasBlacklight) {
    const h3 = hasNewspaper || hasDiary || hasPhoto || hasLetter
      ? '【清晰声音】紫外线照每一张纸：报纸1/日记0/照片4/信件5→1045'
      : hasPadlock || hasCombLock
        ? '【清晰声音】紫外线照锁的背面，隐形墨水直接写着密码/旋转顺序'
        : '【清晰声音】紫外线照四面墙，某一面墙会显出蓝色荧光的1045四个数字'
    propPriority.push({ check: true,
      h1: '【紫外线嗡鸣】...紫...外...线...',
      h2: '【重复关键词】紫外线...逐个照每一个表面...',
      h3
    })
  }
  if (hasTape) propPriority.push({ check: true,
    h1: '【磁带转动】...磁...带...',
    h2: '【重复关键词】倒带到最开头...A面第一句话...',
    h3: '【清晰声音】磁带倒回A面最开头按播放，主播念的前四个字就是「壹零肆伍」→1045'
  })
  if (hasPhono) propPriority.push({ check: true,
    h1: '【唱片嘶嘶】...唱...片...',
    h2: '【重复关键词】唱片标签的歌名...章节号...',
    h3: '【清晰声音】唱片歌名「第十首·第零章·第四章·第五节」→章节号=10/0/4/5→1045'
  })
  if (hasCompass) {
    const h3 = hasCombLock
      ? '【清晰声音】罗盘刻的方位N1/E04/S45→对应转盘锁三圈顺N→逆E→顺S的刻度'
      : '【清晰声音】罗盘盘面N/E/S/W旁刻的小字→N=1/E=0/S=4/W=5→按方位顺序读1045'
    propPriority.push({ check: true,
      h1: '【指针咔哒】...罗...盘...',
      h2: '【重复关键词】指针停的方位...盘面上刻的小字...',
      h3
    })
  }
  if (hasMask) propPriority.push({ check: true,
    h1: '【纸张摩擦】...面...具...',
    h2: '【重复关键词】面具背面...背面用指甲刻的字...',
    h3: '【清晰声音】面具背面（贴着墙那面）红色指甲油写的四个大字「壹〇肆伍」→1045'
  })
  if (hasNewspaper || hasDiary || hasPhoto || hasLetter) {
    const h3 = hasRadio || hasClock
      ? '【清晰声音】报纸10月4日/日记凌晨0点45分/照片背面日期/信里编号→三组数字都是1045'
      : '【清晰声音】所有纸上的数字：日期10月4日，年份末尾0，页码4，段落5→1045'
    propPriority.push({ check: true,
      h1: '【纸张翻动】...文...字...',
      h2: '【重复关键词】日期...年份...页码...',
      h3
    })
  }

  if (propPriority.length > 0) {
    const chosen = propPriority[0]
    hint1 = chosen.h1; hint2 = chosen.h2; hint3 = chosen.h3
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
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
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
  const hasBell = availableProps.includes('hand-bell') || availableProps.includes('bell')
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasFlashlight = availableProps.includes('flashlight')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasCompass = availableProps.includes('compass')
  const hasMask = availableProps.includes('mask')
  const hasKey = availableProps.includes('key')

  if (hasTalisman) {
    let content = '一张泛黄的符纸，四角已经微微卷起，上面用朱砂画着奇怪的红色符文\n最下面写着四个大字按顺序排列：「一 · 〇 · 四 · 五」，每个字的朱砂量不一样，像是被人反复描过...'
    let hint = '符纸最下面四个大字=壹〇肆伍=数字1045，直接按顺序读'
    if (hasClock && hasRadio) {
      content = '一张泛黄的符纸，上面用朱砂写着：「当时间停下，调整频率至相同时刻，真相自会浮现」\n四角画着红色符文，边缘似乎泛着不正常的红光...'
      hint = '「时间停下」=时钟，「频率」=收音机，把时钟显示的时间直接调到收音机上'
    } else if (hasClock && hasLockbox) {
      content = '一张泛黄的符纸，上面用朱砂写着：「时间停下的那一刻，就是锁盒开启的钥匙」\n四角的红色符文，仿佛在微微跳动...'
      hint = '时钟的指针停在几点几分？那四个数字就是锁盒的密码'
    } else if (hasClock && (hasDoorLock || hasIronDoor)) {
      content = '一张泛黄的符纸，上面用朱砂写着：「以时为钥，方能开启那扇铁门」\n四角符文泛着暗红色的光...'
      hint = '看时钟停的四个数字（时2位+分2位），就是铁门密码'
    } else if ((hasCandle || hasLantern) && (hasDoorLock || hasIronDoor)) {
      content = '一张泛黄的符纸，上面用朱砂写着：「以火为引，光之所向，方能开启那扇铁门」\n四角符文泛着暗红色的光...'
      hint = hasCandle
        ? '先点亮蜡烛（以火为引），看烛台高度或底座刻字，就是铁门密码'
        : '先点亮灯笼（以火为引），看灯笼骨架投影的数字，就是铁门密码'
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

  if (hasCandle) {
    let content = '一根半燃过的白蜡烛，放在一个老旧的铜制烛台上，蜡油已经顺着烛台流成了四个数字的形状\n把蜡烛拔起来——烛台底座反面用刻刀深深刻着四个微型数字：1 · 0 · 4 · 5，刻痕里填满了黑色的碳粉...'
    let hint = '拔蜡烛翻烛台看底座，刻的四个数字=1045，单道具直接解'
    if (hasPadlock) {
      content = '一根白蜡烛稳稳立在铜制烛台上，蜡油流下来的痕迹好像刻意被摆成了三个数字的形状\n把蜡烛拔出来——烛台中心空心，塞着一张卷起来的纸条，写着：「挂锁=045」'
      hint = '烛台纸条写的挂锁=045，三位直接输进挂锁开锁'
    } else if (hasDoorLock || hasIronDoor) {
      content = '四根蜡烛并排放在桌上，分别烧到了不同高度——第一根刚点（1寸），第二根平（0寸），第三根（4寸）第四根（5寸）都快烧尽了\n烛台底座正面刻着一行小字：「高度，就是密码，左到右」'
      hint = '四根蜡烛的高度（1、0、4、5）= 铁门四位密码，按从左到右的顺序输'
    } else if (hasBlacklight) {
      content = '一根蜡烛，蜡烛身上好像有颜色不一样的斑块，但正常光下看不清是什么\n旁边用铅笔写着：「烧到一寸，关灯照一照」'
      hint = '点蜡烛等它烧1寸，关房间所有灯开紫外线灯，蜡烛身上会显蓝色数字'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-candle', title: '蜡烛', content, hint })
  }

  if (hasLantern) {
    let content = '一盏泛黄的纸灯笼，竹骨架被蜡烛熏得发黑\n凑近了仔细看——竹骨架的横竖排列，在正前方组成四个数字的形状：第一列「1」、第二列「0」、第三列「4」、第四列「5」\n灯笼底部写着一行小字：「正面望，光明即是答案」'
    let hint = '点亮灯笼，从正前方透过纸看竹骨架，四个数字形状=1045'
    if (hasDoorLock || hasIronDoor) {
      content = '一盏大型的四方形纸灯笼挂在门口，竹骨架由四根竖条和若干横条组成\n点亮蜡烛后——光线从竹骨架缝隙里透出来，在地上投下四个清晰的数字：1 0 4 5\n灯笼底部写着：「向门而生，光明即是出口」'
      hint = '灯光投在地上的四个数字就是铁门密码：1045，直接按顺序输入'
    } else if (hasCombLock) {
      content = '一盏三层纸灯笼，每层骨架上都有一个圈，圈上有几个小孔，小孔用线做了标记\n最上层标记在第1格，第二层在第4格，第三层在第5格...'
      hint = '转盘锁：先顺转到10，再逆转到04，再顺转到45（灯笼三层对应三圈刻度）'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-lantern', title: '手提灯笼', content, hint })
  }

  if (hasFlashlight) {
    let content = '一把塑料外壳的老旧手电筒，开关有点松，时亮时暗\n灯头玻璃内侧用马克笔写着四个小字：「1045 = 答案」，但只有打开手电筒时背光才能照出来...'
    let hint = '手电筒按下开关→光从灯头透出，玻璃内侧的小字1045就是答案'
    if (hasBlacklight) {
      content = '一把表面生锈的手电筒，灯头外圈装的是紫外LED（不是普通白光）\n按开关咔哒一声——墙上立刻显出蓝色荧光的四位数：1045，旁边还画着一个箭头指向墙角...'
      hint = '手电筒=紫外线手电筒，照在墙上显形的1045就是核心密码'
    } else if (hasLockbox) {
      content = '一把手电筒，握把底部拧开后有一个小格子，里面塞着迷你的刻字金属牌，刻着：「锁盒密码：第1位=1，第2位=0，第3/4位=我的灯泡型号」\n灯泡上刻着：W-4.5V...'
      hint = '握把内金属牌+灯泡型号4.5 → 锁盒密码1045'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-flashlight', title: '手电筒', content, hint })
  }

  if (hasBlacklight) {
    let content = '一把细长的紫外线灯管手电筒，外壳上贴着黄色警告标识\n灯头旁边用马克笔写着：「别对着眼睛，对着墙」\n开关侧面刻着一行小字：「四面墙→有蓝色的那面→读数字」'
    let hint = '按下开关后，逐个照四面墙，其中一面墙会显出蓝色荧光的四个数字'
    if (hasNewspaper || hasDiary || hasPhoto || hasLetter) {
      content = '一把紫外线灯，旁边的便签纸上用铅笔写着：「记者有个习惯——重要内容不用墨水写」\n打开灯照向所有纸质物品——旧报纸空白处、日记本边缘、照片背面、信纸落款...\n每一处都显示了一个蓝色的数字...'
      hint = '紫外线照每一张纸：报纸1，日记0，照片4，信件5 → 1045'
    } else if (hasPadlock || hasCombLock) {
      content = '一把紫外线灯，底部写着：「锁匠喜欢在锁的反面留记号」\n对着挂锁/转盘锁的背面（不是正面那面）照——锁底用隐形墨水写着开锁顺序和数字...'
      hint = '紫外线照锁的反面，直接看到密码/旋转顺序'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-blacklight', title: '紫外线灯', content, hint })
  }

  if (hasPadlock) {
    let content = '一把沉甸甸的铜制老挂锁，锁身被摩挲得很亮，正面刻着一个骷髅图案\n数字转盘从0-9，卡在三位数字上\n锁的侧面用指甲划了很浅的三个刻痕：「一浅 · 二深 · 三最深」，刻痕旁边用铅笔写着微型注释：「浅=0/深=4/最深=5」'
    let hint = '三位数字密码=侧面刻痕深度→浅=0/深=4/最深=5→045，单道具直接解'
    if (hasCandle || hasClock) {
      content = '一把铜挂锁锁着的小柜子，柜门上写着：「等灯亮了，看时间开」\n挂锁是三位数的，锁身背面隐约刻着：「C-A-N」三个字母'
      hint = hasClock
        ? '挂锁三位数=时钟停的时10 + 分45 → 取后三位就是045'
        : '挂锁三位数=烛台纸条写的045，直接输'
    } else if (hasKey) {
      content = '一把锁死的铜挂锁，钥匙就放在桌上的碟子里，但钥匙上缠着红线打了三个结\n每个结上都有用黑色钢笔写的微型数字，凑近才能看清...'
      hint = '解开红线，三个结上的微型数字=挂锁的三位密码'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-padlock', title: '挂锁', content, hint })
  }

  if (hasCombLock) {
    let content = '一只古旧的木箱子，锁是金属转盘密码锁，转盘上有0-9的刻度\n转盘外圈有三个小箭头，分别标着：「顺→逆→顺」三个字，旁边写着：「转三圈，停下来→10/04/45」\n转盘侧面用刀刻了三个数字：「10 · 04 · 45」，按顺逆顺顺序对应三圈'
    let hint = '操作：先顺时针转3圈停在10→逆时针转2圈停在04→顺时针直接转到45，停住就开锁'
    if (hasBookshelf || hasDiary || hasNewspaper) {
      content = '箱子上的转盘密码锁，旁边用麻绳挂着一块小木牌，木牌两面都写着字\n正面：「书之第X卷，记于第X页，生于第X年」\n背面：「10年第04卷第45页」'
      hint = '转盘=三圈分别对应10 → 04 → 45，先顺10 → 再逆04 → 再顺45，开锁'
    } else if (hasCompass) {
      content = '转盘密码锁的转盘上刻着四个方位的小字：N、E、S、W\n旁边贴着便签：「罗盘指哪转哪，第一圈看北方」'
      hint = '按罗盘方位：N北方对应12→取10 / E东方对应3点→取04 / S南方对应6点→取45，三圈对应'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-combinationlock', title: '转盘密码锁', content, hint })
  }

  if (hasDoorLock || hasIronDoor) {
    let content = '一扇厚重的铁门上装着电子密码锁，键盘是0-9四个一排的数字键，锁上方有一个小小的红色指示灯一直闪\n门的右侧（输密码的高度）用油漆写着四个字：「时 · 刻 · 频 · 率」\n四个字旁边用铅笔写了微型数字：「时=1画→1，刻=0画→0，频=4画→4，率=5画→5」，明显是前店员偷偷留的验收标记'
    let hint = '铁门四位密码=「时刻频率」四个字旁边写的微型数字→1 0 4 5，单道具直接解'
    if (hasClock && (hasCandle || hasLantern)) {
      content = '一扇黑色大铁门，电子密码锁上方贴着一张泛黄的值班表：\n「01：00 夜班交接 — 点蜡烛\n00：00 夜间巡逻 — 提灯笼\n04：00 铁门巡检\n05：00 换班休息」\n值班表右下角用红笔圈了这四个时间：「按顺序输」'
      hint = '四个时间点= 01/00/04/05 → 取第一位就是1 0 4 5，铁门密码'
    } else if (hasRadio && hasClock) {
      content = '铁门密码锁上方贴了一张报纸剪报，只圈了一条新闻：\n「本报讯 10月4日，K.I.L.L电台主播林某最后一次广播结束于凌晨0点45分，频率停在104.5MHz」\n剪报背面写着：「先有日，后有时，再有频率」'
      hint = '三个数字都是1/0/4/5 → 铁门输1045'
    }
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-doorlock', title: '铁门密码锁', content, hint })
  }

  if (hasTape) {
    let content = '一台磁带录音机，磁带卡在里面，播放键按下去能听到沙沙声\n快进/快退按钮旁边贴了标签：「A面=开始前10分钟，B面=失踪前5分钟」\n磁带正面写着铅笔字：「倒到最开头的地方——那个数字，念了三遍」'
    let hint = '把磁带倒回A面最开头，第一句话就是主播念的四个数字'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-tape', title: '磁带录音机', content, hint })
  }

  if (hasPhono) {
    let content = '一台老式留声机，上面放着一张黑色78转唱片，唱片标签上写着歌名：《第十首·第零章·第四章·第五节》\n唱针旁边有一张纸条：「每一节的第一个字，都是数字」\n唱片慢慢转着...'
    let hint = '歌名里的章节号=10/0/4/5 → 取数字部分1 0 4 5'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-phonograph', title: '留声机', content, hint })
  }

  if (hasCompass) {
    let content = '一只旧罗盘放在桌子中央，指针疯了一样乱转，时不时咔哒一下卡在某个方位\n罗盘盘面的东南西北四个字，每个字旁边都用极小的字刻着一个数字：「N=1、E=0、S=4、W=5」\n罗盘背面写着：「等它累了停下来，按它最后停的四个方向顺序读」'
    let hint = '罗盘最后会依次停在N→E→S→W，对应刻的数字就是1045'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-compass', title: '指南针', content, hint })
  }

  if (hasMask) {
    let content = '一张诡异的人脸面具挂在墙上，面具的表情是笑着的，但嘴角的弧度很不自然\n面具的眼睛是空的，眼眶里塞着两张卷起来的小纸条\n面具背面（贴着墙的那面），用红色指甲油写着四个大字：「壹 〇 肆 伍」'
    let hint = '背面四个汉字是数字大写：壹=1 / 〇=0 / 肆=4 / 伍=5，就是核心密码'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-mask', title: '面具', content, hint })
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
    } else if (hasDoorLock || hasIronDoor) {
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
    if (hasLockbox || hasCombLock) {
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

  if (hasKey) {
    let content = '一把锈迹斑斑的老式铜钥匙，就放在进门最显眼的碟子上\n钥匙的齿纹很深，但奇怪的是——这把钥匙似乎没有对应任何能开的锁\n钥匙的挂圈上缠着细细的铜丝，铜丝绕了1圈、0圈、4圈、5圈...'
    let hint = '铜丝绕的圈数就是四个数字 1/0/4/5，钥匙本身只是一个假线索，用来让玩家浪费时间开柜子'
    content = replaceMisunderstoodPhrases(content, learning, adjustments)
    hint = replaceMisunderstoodPhrases(hint, learning, adjustments)
    cards.push({ id: 'card-key', title: '老式钥匙', content, hint })
  }

  if (cards.length === 0) {
    cards.push({ id: 'card-default-1', title: '墙角的纸条', content: '「那个秘密，就藏在最显眼的地方\n人们总是忽视眼前的东西\n灯灭的时候，你会看见」', hint: '灯灭的时候，仔细看房间最中间的位置' })
    cards.push({ id: 'card-default-2', title: '门缝下塞进来的纸', content: '「不要相信这里的任何一面镜子\n不要数到第七下\n不要让门关上第三次」', hint: '这里面有三个数字线索，注意"第七""第三"' })
  }

  cards.forEach((card) => {
    card.content = enhanceHorrorPhrases(card.content, { ...config, horrorLevel: Math.max(1, config.horrorLevel - 1) }, learning, adjustments)
    if (card.hint) card.hint = enhanceHorrorPhrases(card.hint, { ...config, horrorLevel: Math.max(1, config.horrorLevel - 1) }, learning, adjustments)
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
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasMicrophone = availableProps.includes('microphone')
  const hasHeadphone = availableProps.includes('headphone')
  const hasConsole = availableProps.includes('audio-console')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasChandelier = availableProps.includes('chandelier')
  const hasLantern = availableProps.includes('lantern')
  const hasFlashlight = availableProps.includes('flashlight')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasCompass = availableProps.includes('compass')
  const hasMask = availableProps.includes('mask')
  const hasKey = availableProps.includes('key')

  prep.push('检查所有已勾选道具是否到位，核对清单')
  if (hasRadio) { prep.push('确认收音机可调频率、电源通、扬声器无杂音'); prep.push('预设几个干扰频率增加难度，保证正确频率清晰收到'); prep.push('正确频率的音频内容提前录制备用') }
  if (hasClock) { prep.push('时钟指针调到 10:45 对应谜题答案'); prep.push('取下电池确认时钟完全停止走动') }
  if (hasLockbox) { prep.push('锁盒设置四位密码 1045，确认开关顺畅'); prep.push('放入下一关线索纸条'); prep.push('打乱密码盘到随机状态') }
  if (hasDoorLock || hasIronDoor) { prep.push('铁门电子密码锁设置四位密码 1045'); prep.push('反复测试开锁闭锁 3 次以上，确认无故障'); prep.push('关闭铁门上锁，确认应急通道畅通') }
  if (hasPadlock) { prep.push('挂锁设置三位密码 045（时钟1补前位）'); prep.push('锁在对应柜子/抽屉上，打乱密码') }
  if (hasCombLock) { prep.push('转盘锁三组刻度 10/04/45，方向顺→逆→顺'); prep.push('反复测试 3 次确保开锁流程正确，否则卡死') }
  if (hasCandle) { prep.push('蜡烛放防火安全的烛台，远离易燃物'); prep.push('烛台底座刻字或贴微型数字贴纸，玩家走近可见但不明显'); prep.push('主持人用打火机/长火柴放随手位置') }
  if (hasLantern) { prep.push('灯笼内部点蜡烛或装电子蜡烛，确认竹骨架投下 1045 数字清晰'); prep.push('挂在 1.5-1.8m 玩家平视略低位置，确保投影清晰') }
  if (hasFlashlight) { prep.push('手电池装好，时亮时暗的用接触不良旧电池模拟'); prep.push('紫外线款需确认紫外LED点亮（用白纸测试显蓝）') }
  if (hasBlacklight) { prep.push('紫外灯电池装好开关正常'); prep.push('预设位置（报纸空白/日记页边/锁背面）用隐形墨水写下 1/0/4/5 四个数字'); prep.push('黑光灯照一遍确认内容可见位置合理') }
  if (hasTape) { prep.push('磁带开头录好主播念 1、0、4、5 三遍，插回录音机'); prep.push('录音机播放/倒带正常，音量走近能听清') }
  if (hasPhono) { prep.push('唱片标题手写 "第10首/第0章/第4节/第5段" 明显但不突兀'); prep.push('留声机播放正常，唱针不要太脏') }
  if (hasBell) { prep.push('铃铛放门外或主持人暗角'); prep.push('试摇确认响度合适（能听到但不刺耳）') }
  if (hasTalisman) { prep.push('符纸放玩家视线可及但走近才看清的位置'); prep.push('确认符纸文字清晰无遮挡') }
  if (hasMirror) { prep.push('镜子位置确保正面能接近，无尖锐边缘'); prep.push('道具镜确认稳固不倾倒') }
  if (hasMicrophone) { prep.push('麦克风放桌面/支架，网罩内塞纸条'); prep.push('支架刻字或 104.5 贴纸清晰可见') }
  if (hasHeadphone) { prep.push('耳机插头插对应设备（收音机/控制台/预录）'); prep.push('测试耳机内容正常播放，音量略大于环境音') }
  if (hasConsole) { prep.push('播音控制台通电，指示灯闪烁待机'); prep.push('键盘可按、屏幕显示正确提示文字') }
  if (hasBookshelf) { prep.push('编号 10/04/45 三本关键书调换顺序摆放，其余摆齐'); prep.push('确保异常明显（至少突出5mm或颜色不同）') }
  if (hasChandelier) { prep.push('水晶吊灯标记位置水晶擦干净或贴反光贴纸组成 1045 形状'); prep.push('确认吊灯稳固无坠落风险，灯光合适') }
  if (hasCompass) { prep.push('罗盘内置磁铁贴 N/E/S/W 对应 1/0/4/5 方向'); prep.push('测试玩家拿起来先乱转，10秒后依次停四个方向') }
  if (hasMask) { prep.push('面具背面红色指甲油写"壹 〇 肆 伍"四汉字大写，正面眼眶塞纸条'); prep.push('正面朝玩家挂墙上，背面隐藏') }
  if (hasKey) { prep.push('钥匙挂圈铜丝绕 1/0/4/5 圈打结，放进门最显眼碟子里'); prep.push('确认钥匙无法开启任何真实锁（故意假线索迷惑）') }
  prep.push('房间灯光调至预设亮度，整体氛围符合恐怖等级')
  prep.push('主持人对讲机、耳机、提词器调试完毕，通讯畅通')
  prep.push('应急出口标识清晰，灭火器、急救包位置确认')

  during.push('开场白结束后保持安静，主持人后台观察玩家反应和动线')
  if (hasClock) during.push('留意玩家是否主动注意到时钟停止、指针异常')
  if (hasRadio) during.push('玩家开始翻找时，偶尔背景放音量由低到高的杂音，引导去收音机')
  if (hasLockbox) during.push('玩家拿到锁盒后可提示："重量很轻，里面是纸"')
  if (hasDoorLock || hasIronDoor) during.push('玩家第一次接触铁门时，给一次"咔哒"声反馈')
  if (hasPadlock) during.push('玩家拿起挂锁时，背景可加金属碰撞轻响')
  if (hasCombLock) during.push('玩家拨转盘超过5次仍未开时，可提示方向："顺逆顺，三圈"')
  if (hasMirror) during.push('玩家盯镜子超5秒时，后台可一次轻微灯光闪烁')
  if (hasTalisman) during.push('玩家拿起符纸时，背景加一次纸页翻动音效')
  if (hasBookshelf) during.push('玩家靠近书架时，可加一次书本掉落的轻响')
  during.push('严格按照 3 分钟 / 6 分钟 / 10 分钟节点给对应等级提示')
  if (hasCandle) during.push('玩家靠近关键区域时，主持人后台轻轻吹动蜡烛让火光摇曳')
  if (hasBell) during.push('给出二级提示的同时，门外摇动 1 次铃铛营造压迫感')
  if (hasLantern) during.push('玩家经过灯笼时，后台轻微晃动让它发出纸声')
  if (hasFlashlight || hasBlacklight) during.push('超过5分钟没关灯的，可提示："有时候，黑暗里的东西比光明里更清楚"')
  during.push('全程留意玩家恐怖耐受度（脸色/呼吸/尖叫/要求暂停），必要时临时降低恐怖等级、打开灯光')
  during.push('玩家解开核心谜题的瞬间，及时给正向反馈（音效/台词/灯光变化）')
  during.push('游戏全程确保至少一名工作人员能看到玩家全景，防止意外')

  cleanup.push('玩家全部离场后，首先打开全部房间灯光，通风')
  cleanup.push('检查每位玩家随身物品，确认没有带任何道具离场')
  if (hasRadio) cleanup.push('关收音机电源，拔插头，调回日常频段')
  if (hasClock) cleanup.push('装回时钟电池，恢复正常走时，对准当前时间')
  if (hasLockbox) cleanup.push('打开锁盒取出内部线索，重新锁好并彻底打乱密码盘')
  if (hasDoorLock || hasIronDoor) cleanup.push('铁门恢复开锁状态，密码打乱，挂"已清洁"标识')
  if (hasPadlock || hasCombLock) cleanup.push('挂锁/转盘锁打开复位，重新打乱密码')
  if (hasCandle) cleanup.push('逐一确认所有蜡烛完全熄灭，烛芯无余烬，摸一下确认不烫')
  if (hasLantern) cleanup.push('灯笼内部蜡烛/电子蜡熄灭，检查纸罩是否破损')
  if (hasFlashlight || hasBlacklight) cleanup.push('取出电池，关闭开关，放回充电座')
  if (hasTape || hasPhono) cleanup.push('磁带/唱片取出，放回原包装盒')
  if (hasConsole) cleanup.push('播音控制台断电，推子归零，屏幕关闭')
  if (hasMicrophone) cleanup.push('检查麦克风网罩内部纸条是否还在，不在的话补一张新的')
  if (hasHeadphone) cleanup.push('耳机线理顺绕好，放回原位')
  if (hasBookshelf) cleanup.push('所有书回归原位，关键书重新摆放成异常状态')
  if (hasChandelier) cleanup.push('水晶吊灯的标记水晶重新确认位置')
  if (hasMirror) cleanup.push('镜子表面擦干净指纹和痕迹')
  if (hasTalisman) cleanup.push('符纸如有破损更换新的，放回固定位置')
  if (hasCompass) cleanup.push('罗盘归位，内部磁铁检查是否还在原位')
  if (hasMask) cleanup.push('面具重新挂回墙上，背面朝墙隐藏')
  if (hasKey) cleanup.push('钥匙放回碟子，铜丝重新绕 1/0/4/5 圈')
  cleanup.push('所有道具回归初始位置，和标准初始状态照片逐一核对')
  cleanup.push('整理房间，通风散味，喷洒空气清新剂')
  cleanup.push('填写本场道具损耗检查表，破损物品登记')

  return { prep, during, cleanup }
}

function generateTitle(config: GeneratorConfig, availableProps: string[]): string {
  const hasRadio = availableProps.includes('radio')
  const hasClock = availableProps.includes('wall-clock')
  const hasMirror = availableProps.includes('mirror')
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasBasement = hasDoorLock || hasIronDoor || hasPadlock

  const radioPrefixes = ['午夜', '诡异', '失踪的', '诅咒的', '死亡', '第七个', '调频104.5的']
  const noRadioPrefixes = ['上锁的', '第七个', '消失的', '死亡', '诅咒的', '诡异', '最后一扇']
  const basementPrefixes = ['地下室的', '铁门后的', '三重锁的', '地下']
  const suffixes: Record<string, string[]> = {
    radio: ['频率', '电台', '广播', '最后一期节目'],
    clock: ['凌晨', '停摆的时钟', '那一刻'],
    mirror: ['镜中人', '倒影', '第七重'],
    door: ['铁门', '房间', '门后的秘密'],
    lock: ['密码锁', '挂锁', '三重锁', '1045号房'],
    light: ['摇曳烛光', '灯笼', '最后一盏'],
    default: ['日记', '房间', '仪式', '真相', '秘密']
  }

  let prefix = getRandomItem(noRadioPrefixes)
  if (hasRadio) prefix = getRandomItem(radioPrefixes)
  if (hasBasement) prefix = getRandomItem([...basementPrefixes, ...noRadioPrefixes])

  let suffixPool = [...suffixes.default]
  if (hasRadio) suffixPool = [...suffixPool, ...suffixes.radio]
  if (hasClock) suffixPool = [...suffixPool, ...suffixes.clock]
  if (hasMirror) suffixPool = [...suffixPool, ...suffixes.mirror]
  if (hasDoorLock || hasIronDoor) suffixPool = [...suffixPool, ...suffixes.door]
  if (hasPadlock || hasCombLock) suffixPool = [...suffixPool, ...suffixes.lock]
  if (hasCandle || hasLantern) suffixPool = [...suffixPool, ...suffixes.light]

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
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasTalisman = availableProps.includes('talisman')
  const hasMirror = availableProps.includes('mirror')
  const hasBookshelf = availableProps.includes('bookshelf')
  const hasLetter = availableProps.includes('letter')
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasFlashlight = availableProps.includes('flashlight')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasCompass = availableProps.includes('compass')
  const hasMask = availableProps.includes('mask')
  const hasKey = availableProps.includes('key')

  const steps: string[] = []
  let coreNumber = ''

  const numberSources: Array<{ check: boolean; label: string; number: string }> = [
    { check: hasLetter, label: '手写信件', number: '1、0、4、5' },
    { check: hasClock, label: '时钟', number: '10点45分 → 1 0 4 5' },
    { check: hasRadio, label: '收音机', number: '调频 104.5MHz → 1 0 4 5' },
    { check: hasBookshelf, label: '书架异常书', number: '第10册、第04册、第45册 → 1 0 4 5' },
    { check: hasCandle && hasLantern, label: '蜡烛高度+灯笼投影', number: '高度1/0/4/5 + 竹骨架投影验证 → 1 0 4 5' },
    { check: hasCandle && hasPadlock, label: '烛台刻字', number: '烛台底045 + 时钟前位1 → 1 0 4 5' },
    { check: hasLantern && (hasDoorLock || hasIronDoor), label: '灯笼投影', number: '竹骨架在地面投下 1 0 4 5 四个数字' },
    { check: hasFlashlight, label: '手电筒', number: '关灯后手电照墙显影 → 1 0 4 5' },
    { check: hasBlacklight, label: '紫外线灯', number: '隐形墨水显蓝 → 1 0 4 5' },
    { check: hasTape, label: '磁带录音机', number: '主播开头念 1-0-4-5 三遍' },
    { check: hasPhono, label: '留声机', number: '章节号 第10首/第0章/第4节/第5段 → 1 0 4 5' },
    { check: hasCompass, label: '罗盘', number: 'N-E-S-W 对应刻字 N1/E0/S4/W5 → 1 0 4 5' },
    { check: hasMask, label: '面具背面', number: '汉字大写 壹〇肆伍 → 1 0 4 5' },
    { check: hasKey, label: '铜钥匙（假线索但有数字）', number: '铜丝绕的圈数 1/0/4/5' }
  ]
  const validNumbers = numberSources.filter(n => n.check)
  if (validNumbers.length > 0) {
    coreNumber = '四个核心数字 1、0、4、5'
    validNumbers.forEach((s, i) => {
      steps.push(`第${i + 1}步（数字来源）：从【${s.label}】读出线索——${s.number}`)
    })
    if (validNumbers.length > 1) {
      steps.push(`说明：以上 ${validNumbers.length} 个道具来源全部指向同一组数字（1045），可交叉验证确认无误`)
    }
  } else if (hasTalisman && hasMirror) {
    coreNumber = '符纸 + 镜子 组合出的数字'
    steps.push('第1步：读出符纸上的红色符文')
    steps.push('第2步：站在镜子前倒着读符文内容')
  } else {
    coreNumber = '房间里所有带数字的线索按发生顺序组合'
    steps.push('第1步：逐一收集房间内所有含数字的物品（日期、年份、页码等）')
    steps.push('第2步：按时间发生的先后顺序排列这些数字')
  }

  const actions: Array<{ check: boolean; label: string }> = [
    { check: hasPadlock, label: `三位数字 0/4/5 + 前位 1 输入铜挂锁，打开对应柜子取下一步线索` },
    { check: hasCombLock, label: `转盘锁 先顺3圈到 10 → 再逆2圈到 04 → 再顺到 45，打开木箱` },
    { check: hasLockbox, label: `将 ${coreNumber} 输入密码锁盒，打开取出下一件线索` },
    { check: (hasDoorLock || hasIronDoor) && !hasPadlock && !hasCombLock, label: `将 ${coreNumber} 直接按顺序输入铁门电子密码锁，打开大门通关` },
    { check: (hasDoorLock || hasIronDoor) && (hasPadlock || hasCombLock), label: `打开柜子/木箱拿到最终钥匙卡 → 将 ${coreNumber} 输入铁门电子密码锁通关` },
    { check: hasRadio && !(hasDoorLock || hasIronDoor), label: `将收音机调频旋钮拧至 ${coreNumber.replace(/、/g, '').slice(0, 1)}.${coreNumber.replace(/、/g, '').slice(1)} 对应频率，收听最终广播完成本关` }
  ]
  const validActions = actions.filter(a => a.check)
  if (validActions.length > 0) {
    validActions.forEach((a, i) => {
      steps.push(`第${validNumbers.length + i + 1}步（执行）：${a.label}`)
    })
  } else {
    steps.push(`最后：将 ${coreNumber} 报给主持人，即可完成本关`)
  }

  if (hasMirror) steps.push('彩蛋：完成后回头看一眼镜子——你会看到不该看到的东西')
  if (hasTalisman) steps.push('重要：谜题解开后，符纸必须立刻焚烧，不可带走')
  if (hasCandle || hasLantern) steps.push('安全提醒：离场前确认所有明火完全熄灭，方可开门')
  if (hasCombLock) steps.push('提示：转盘锁如果操作错误超过3次，必须全部回到 00 重新开始，主持人可在旁边监督')
  return steps.join('\n\n')
}

function generateExecutionChecklist(config: GeneratorConfig, availableProps: string[], hostSteps: HostSteps): ExecutionChecklist {
  const hasCandle = availableProps.includes('candle')
  const hasLantern = availableProps.includes('lantern')
  const hasDoorLock = availableProps.includes('door-lock')
  const hasIronDoor = availableProps.includes('iron-door')
  const hasPadlock = availableProps.includes('padlock')
  const hasCombLock = availableProps.includes('combination-lock')
  const hasLockbox = availableProps.includes('lockbox')
  const hasBlacklight = availableProps.includes('blacklight')
  const hasTape = availableProps.includes('tape-recorder')
  const hasPhono = availableProps.includes('phonograph')
  const hasHorror3 = config.horrorLevel >= 3

  const setup: ExecutionChecklist['setup'] = [
    { id: 's-room', item: '确认房间内无遗留杂物，场地清洁', done: false },
    { id: 's-lights', item: '房间灯光调至预设亮度，测试所有灯光开关', done: false },
    { id: 's-emergency', item: '确认应急出口通畅、灭火器位置、急救包可用', done: false },
    { id: 's-comm', item: '主持人对讲机、耳机调试完毕，通讯畅通', done: false },
    { id: 's-audio', item: '背景音/音效系统测试：开场白+杂音+铃声+脚步声', done: false },
  ]
  hostSteps.prep.forEach((step, i) => setup.push({ id: `sp-${i}`, item: `[道具] ${step}`, done: false }))

  const control: ExecutionChecklist['control'] = [
    { id: 'c-intro', item: '00:00 播放开场白（script.opening）', done: false },
    { id: 'c-01min', item: '01:00 主动观察：玩家是否注意到核心道具（时钟/蜡烛/收音机/铁门）', done: false },
    { id: 'c-03min', item: '03:00 节点：自动/手动触发一级提示（hint.level1）', done: false },
    { id: 'c-05min', item: '05:00 人工评估：玩家是否卡关严重？决定提前给二级提示', done: false },
    { id: 'c-06min', item: '06:00 节点：自动/手动触发二级提示（hint.level2）+ 门外摇铃1次', done: false },
    { id: 'c-08min', item: '08:00 恐怖升级：根据恐怖等级主动增加一次灯光闪烁/脚步声音效', done: false },
    { id: 'c-10min', item: '10:00 节点：自动/手动触发三级提示（hint.level3）', done: false },
    { id: 'c-solve', item: '解谜瞬间：玩家解开核心谜题时给出正向反馈', done: false },
    { id: 'c-ending', item: '播放结尾台词（script.ending）', done: false },
  ]
  hostSteps.during.forEach((step, i) => control.push({ id: `cd-${i}`, item: `[主持] ${step}`, done: false }))

  const reset: ExecutionChecklist['reset'] = [
    { id: 'r-lights', item: '打开全部房间灯光，通风散味', done: false },
    { id: 'r-playeritems', item: '检查玩家随身物品：确认未携带任何道具离场', done: false },
  ]
  hostSteps.cleanup.forEach((step, i) => reset.push({ id: `rc-${i}`, item: step, done: false }))

  const safety: ExecutionChecklist['safety'] = [
    { id: 'f-flame', item: hasCandle || hasLantern ? '🔥 所有蜡烛/明火100%熄灭！（烛芯摸一下确认不烫）' : '本场无明火，跳过', done: false },
    { id: 'f-lock', item: (hasDoorLock || hasIronDoor) ? '🔓 铁门必须处于开锁状态，挂"已清洁"标识' : '本场无铁门，跳过', done: false },
    { id: 'f-battery', item: (hasBlacklight || hasTape || hasPhono) ? '🔋 取出所有电池类道具的电池，防止漏液' : '本场无电池道具，跳过', done: false },
    { id: 'f-check', item: '🧍 工作人员查看房间每个角落，确认玩家无遗漏物品', done: false },
    { id: 'f-report', item: '📋 填写本场损耗登记表（破损道具/异常情况）', done: false },
  ]
  if (hasHorror3) {
    safety.push({ id: 'f-decompression', item: '🧘 重恐结束后留玩家在休息区缓神5分钟，提供水，确认情绪稳定', done: false })
  }
  if ((hasPadlock || hasCombLock || hasLockbox)) {
    safety.splice(2, 0, { id: 'f-resetlocks', item: '🔒 所有锁具密码打乱复位（挂锁/转盘锁/锁盒），准备下一场', done: false })
  }

  return { setup, control, reset, safety }
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
  const executionChecklist = generateExecutionChecklist(config, availableProps, hostSteps)

  const themeInfo = themes.find(t => t.id === config.theme)

  const puzzle: Puzzle = {
    id: generateId(),
    title,
    theme: themeInfo?.name || '神秘',
    difficulty: config.difficulty,
    horrorLevel: config.horrorLevel,
    estimatedTime: 20 + config.difficulty * 10,
    props: availableProps,
    playerCount: { min: Math.max(1, config.playerCount - 2), max: config.playerCount + 2 },
    script,
    hostSteps,
    playerCards,
    hints,
    answer,
    adjustments: adjustments.length > 0 ? adjustments : undefined,
    executionChecklist,
    basedOnHistory: adjustments.length > 0,
    createdAt: Date.now()
  }

  console.log('[PuzzleGenerator] 谜题生成完成:', puzzle.title, '使用道具数:', availableProps.length, '玩家卡:', playerCards.length, '调整数:', adjustments.length)
  return { puzzle, adjustments }
}