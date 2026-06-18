import type { PropItem, RoomSetup } from '@/types/puzzle'

export const propCategories = [
  { id: 'audio', name: '音效设备' },
  { id: 'furniture', name: '家具装饰' },
  { id: 'locks', name: '锁具机关' },
  { id: 'papers', name: '纸张符咒' },
  { id: 'lighting', name: '灯光道具' },
  { id: 'props', name: '手持道具' }
]

export const propList: PropItem[] = [
  { id: 'radio', name: '老式收音机', category: 'audio', description: '可调节频率的复古收音机' },
  { id: 'tape-recorder', name: '磁带录音机', category: 'audio', description: '播放神秘录音' },
  { id: 'phonograph', name: '留声机', category: 'audio', description: '播放诡异唱片' },
  { id: 'microphone', name: '复古麦克风', category: 'audio', description: '老式电台播音话筒' },
  { id: 'headphone', name: '监听耳机', category: 'audio', description: '头戴式老旧耳机' },
  { id: 'audio-console', name: '播音控制台', category: 'audio', description: '带旋钮和推子的调音台' },
  { id: 'wall-clock', name: '墙上时钟', category: 'furniture', description: '指针停在特定时刻' },
  { id: 'old-desk', name: '老旧书桌', category: 'furniture', description: '带抽屉的木桌' },
  { id: 'mirror', name: '复古镜子', category: 'furniture', description: '布满灰尘的镜框' },
  { id: 'bookshelf', name: '旧书架', category: 'furniture', description: '堆满古籍的书架' },
  { id: 'lockbox', name: '密码锁盒', category: 'locks', description: '四位数密码锁' },
  { id: 'padlock', name: '挂锁', category: 'locks', description: '铜制老挂锁' },
  { id: 'combination-lock', name: '转盘密码锁', category: 'locks', description: '左右旋转的机械锁' },
  { id: 'door-lock', name: '铁门密码锁', category: 'locks', description: '大门电子密码锁' },
  { id: 'talisman', name: '符纸', category: 'papers', description: '写满朱砂符文的黄纸' },
  { id: 'newspaper', name: '旧报纸', category: 'papers', description: '泛黄的民国报纸' },
  { id: 'diary', name: '日记本', category: 'papers', description: '沾有污渍的旧日记' },
  { id: 'photo', name: '老照片', category: 'papers', description: '黑白合影照' },
  { id: 'letter', name: '手写信件', category: 'papers', description: '字迹潦草的信件' },
  { id: 'candle', name: '蜡烛', category: 'lighting', description: '摇曳的烛光' },
  { id: 'lantern', name: '手提灯笼', category: 'lighting', description: '纸灯笼' },
  { id: 'blacklight', name: '紫外线灯', category: 'lighting', description: '显现隐形文字' },
  { id: 'chandelier', name: '水晶吊灯', category: 'lighting', description: '闪烁不定的吊灯' },
  { id: 'flashlight', name: '手电筒', category: 'props', description: '时亮时暗的手电' },
  { id: 'compass', name: '指南针', category: 'props', description: '指针乱转的罗盘' },
  { id: 'key', name: '老式钥匙', category: 'props', description: '锈迹斑斑的铜钥匙' },
  { id: 'mask', name: '面具', category: 'props', description: '诡异的人脸面具' },
  { id: 'bell', name: '手摇铃铛', category: 'props', description: '招魂铃' }
]

export const roomSetups: RoomSetup[] = [
  {
    id: 'old-room',
    name: '老旧房间',
    description: '民国风格的旧宅房间，墙纸剥落，家具陈旧',
    props: ['wall-clock', 'old-desk', 'mirror', 'candle', 'newspaper', 'diary', 'photo']
  },
  {
    id: 'radio-station',
    name: '电台直播间',
    description: '废弃的广播电台，设备布满灰尘',
    props: ['radio', 'tape-recorder', 'phonograph', 'microphone', 'headphone', 'audio-console', 'newspaper']
  },
  {
    id: 'temple',
    name: '荒村祠堂',
    description: '年久失修的祠堂，香案上散落着符纸',
    props: ['talisman', 'candle', 'lantern', 'lockbox', 'photo', 'mask', 'bell']
  },
  {
    id: 'basement',
    name: '地下室',
    description: '阴暗潮湿的地下室，铁门上挂着锁',
    props: ['padlock', 'combination-lock', 'lockbox', 'flashlight', 'key', 'blacklight', 'door-lock']
  },
  {
    id: 'study',
    name: '书房',
    description: '神秘学者的书房，书架上堆满古籍',
    props: ['old-desk', 'bookshelf', 'diary', 'newspaper', 'letter', 'lockbox', 'candle', 'compass']
  }
]

export const horrorLevels = [
  { id: 1, name: '微恐', description: '氛围营造，无惊吓' },
  { id: 2, name: '中恐', description: '适度惊吓，可接受' },
  { id: 3, name: '重恐', description: '高强度恐怖体验' }
]

export const difficultyLevels = [
  { id: 1, name: '简单', description: '新手友好，提示充足' },
  { id: 2, name: '中等', description: '标准难度' },
  { id: 3, name: '困难', description: '资深玩家挑战' }
]

export const themes = [
  { id: 'missing-person', name: '失踪者', description: '寻找失踪的电台主播' },
  { id: 'cursed-item', name: '诅咒之物', description: '解开被诅咒物品的秘密' },
  { id: 'revenge', name: '复仇', description: '亡灵的复仇计划' },
  { id: 'ritual', name: '仪式', description: '阻止邪恶的召唤仪式' },
  { id: 'time-loop', name: '时间循环', description: '打破无尽的时间轮回' }
]
