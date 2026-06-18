import type { Puzzle, GameRecord } from '@/types/puzzle'

export const mockPuzzles: Puzzle[] = [
  {
    id: 'puzzle-001',
    title: '午夜频率',
    theme: '失踪者',
    difficulty: 2,
    estimatedTime: 30,
    props: ['radio', 'wall-clock', 'talisman', 'lockbox'],
    playerCount: { min: 2, max: 6 },
    script: {
      opening: '【沙沙声】欢迎收听阴间电台...我是你们的主播...午夜零点，调频104.5...寻找失踪的人...',
      main: '【电流声】墙上的时钟停在了那一刻...符纸上的符文指向真相...找到正确的频率...就能听到答案...',
      climax: '【尖锐杂音】不！不要调到那个频率！...【突然安静】...太迟了...',
      ending: '【微弱的声音】谢谢你们...帮我找到了真相...【渐弱的沙沙声】'
    },
    hostSteps: {
      prep: [
        '确认收音机可以正常调节频率',
        '将时钟调到12:00位置',
        '把符纸放在收音机旁',
        '锁盒密码设置为1045'
      ],
      during: [
        '观察玩家是否注意到时钟',
        '在玩家搜索时播放背景杂音',
        '根据提示等级逐步给予线索'
      ],
      cleanup: [
        '恢复所有道具到初始位置',
        '关闭收音机电源',
        '整理符纸和锁盒'
      ]
    },
    playerCards: [
      {
        id: 'card-1',
        title: '符纸',
        content: '上面写着：「调频至午夜时分，指针指向真相」',
        hint: '注意时钟的指针位置'
      },
      {
        id: 'card-2',
        title: '报纸剪报',
        content: '「著名电台主播于10月4日深夜失踪，最后广播频率104.5」',
        hint: '日期和频率有什么关系？'
      }
    ],
    hints: [
      { level: 1, content: '【轻微杂音】...时...钟...【沙沙声】', triggerTime: 3 },
      { level: 2, content: '【重复关键词】午夜零点...调频...午夜零点...调频...', triggerTime: 6 },
      { level: 3, content: '【清晰声音】把收音机调到104.5，答案就在那里', triggerTime: 10 }
    ],
    answer: '将收音机调至104.5MHz',
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'puzzle-002',
    title: '日记本的秘密',
    theme: '诅咒之物',
    difficulty: 1,
    estimatedTime: 20,
    props: ['diary', 'lockbox', 'candle', 'old-desk'],
    playerCount: { min: 2, max: 4 },
    script: {
      opening: '【翻页声】这是我的日记...第七天...我开始看到一些东西...',
      main: '【诡异的声音】每一页都藏着一个数字...把它们拼起来...就是打开盒子的钥匙...',
      climax: '【尖叫】不！不要打开那个盒子！...【盒盖打开声】...太迟了...',
      ending: '【叹息】你们...也被诅咒了...【笑声渐远】'
    },
    hostSteps: {
      prep: [
        '将日记本放在书桌上',
        '锁盒放在抽屉里',
        '点燃蜡烛营造氛围',
        '密码设置为日记本中的数字'
      ],
      during: [
        '引导玩家翻阅日记',
        '注意玩家是否发现页码线索',
        '适时制造蜡烛摇曳效果'
      ],
      cleanup: [
        '吹灭蜡烛',
        '整理日记本',
        '锁好锁盒放回原位'
      ]
    },
    playerCards: [
      {
        id: 'card-1',
        title: '日记第一页',
        content: '「第一天：我在旧货市场买了一个漂亮的盒子，卖家说它有魔力...」',
        hint: '注意页码'
      }
    ],
    hints: [
      { level: 1, content: '【纸张沙沙声】...第...页...', triggerTime: 3 },
      { level: 2, content: '【低语】数字...每一页都有数字...', triggerTime: 6 },
      { level: 3, content: '【清晰】把日记中提到的日期数字连起来，就是密码', triggerTime: 10 }
    ],
    answer: '日记本中特殊页码组成的四位数字',
    createdAt: Date.now() - 86400000 * 7
  }
]

export const mockRecords: GameRecord[] = [
  {
    id: 'record-001',
    puzzleId: 'puzzle-001',
    puzzleTitle: '午夜频率',
    startTime: Date.now() - 86400000 * 2,
    endTime: Date.now() - 86400000 * 2 + 1500000,
    duration: 25,
    playerCount: 4,
    hintsUsed: [1, 2],
    mostMisunderstood: '玩家以为符纸上的符文是密码，实际上是指向时钟',
    horrorReactions: ['第一个提示时有人尖叫', '收音机杂音让气氛很到位'],
    rating: 4,
    notes: '整体体验不错，第二级提示后很快解开了',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'record-002',
    puzzleId: 'puzzle-002',
    puzzleTitle: '日记本的秘密',
    startTime: Date.now() - 86400000,
    endTime: Date.now() - 86400000 + 1200000,
    duration: 20,
    playerCount: 3,
    hintsUsed: [],
    mostMisunderstood: '无，玩家很快就理解了',
    horrorReactions: ['蜡烛熄灭时吓到了一个女生'],
    rating: 5,
    notes: '新手玩家，难度刚好',
    createdAt: Date.now() - 86400000
  }
]
