import React from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePuzzleStore } from '@/store/puzzleStore'
import { propList } from '@/data/props'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'

type RiskCategory = 'fire' | 'lock' | 'battery' | 'sharp' | 'noise'

interface RiskGroup {
  id: RiskCategory
  icon: string
  title: string
  color: string
  riskDesc: string
  props: string[]
  checks: {
    before: string[]
    during: string[]
    reset: string[]
  }
}

const RISK_CATEGORY_MAPPING: Record<RiskCategory, string[]> = {
  fire: ['candle', 'lantern'],
  lock: ['door-lock', 'iron-door', 'padlock', 'combination-lock', 'lockbox'],
  battery: ['flashlight', 'blacklight', 'tape-recorder', 'phonograph', 'radio'],
  sharp: ['key', 'mirror'],
  noise: ['bell', 'hand-bell', 'audio-console', 'microphone', 'headphone']
}

const RISK_TEMPLATES: Record<RiskCategory, Omit<RiskGroup, 'props'>> = {
  fire: {
    id: 'fire',
    icon: '🔥',
    title: '明火物品',
    color: '#ff6b35',
    riskDesc: '蜡烛、灯笼含明火，容易引发皮肤烫伤、地毯窗帘起火、烟感误报',
    checks: {
      before: [
        '确认蜡烛长度>3cm，火焰周围50cm内无纸/布/窗帘等可燃物',
        '确认烛台底部稳固，桌面平整不会倾翻，灭火器随手可及',
        '灯笼内蜡烛使用防倾倒金属托盘，通风良好无一氧化碳聚集风险',
        '告知玩家：不要吹灭/移动蜡烛，有问题举手叫主持人'
      ],
      during: [
        '3分钟时观察蜡烛剩余量，快烧尽时在提示语音掩护下快速更换',
        '若玩家碰倒蜡烛：立刻进入「紧急剧情」带玩家出去，同时灭火',
        '留意烟感，若触发报警：保持冷静疏散，关闭消防通道门'
      ],
      reset: [
        '用金属托盘逐个压灭火焰，禁止用水浇（高温玻璃会炸）',
        '确认所有蜡油冷却凝固，无任何余温后再收纳',
        '开窗通风10分钟，避免下一场有浓烟/蜡味太重'
      ]
    }
  },
  lock: {
    id: 'lock',
    icon: '🔒',
    title: '锁具与铁门',
    color: '#e94560',
    riskDesc: '铁门/挂锁可能夹伤手指、密码锁死无法打开、玩家被反锁在密室',
    checks: {
      before: [
        '铁门电子密码锁：设置1045→手动试开3次，确认电池电量>80%，钥匙放在主持人口袋里',
        '挂锁/转盘锁：设置密码→按现场操作顺序转动3次以上，确保无卡顿',
        '锁盒：打开→放入关键道具→上锁→再开一次验证',
        '所有锁的「应急开锁钥匙」统一挂在主持人腰带扣上，按编号分清楚'
      ],
      during: [
        '第一次玩家接触铁门：用对讲机给「咔哒」锁死音效，确认门是可从外部直接开的',
        '输错密码3次：主动上前给提示（「好像刚才哪一位输反了」），不要让锁死',
        '若发生锁死/夹手：立刻暂停剧情，使用备用钥匙开锁，检查玩家伤势'
      ],
      reset: [
        '结束后必须将所有锁打开→重新设置密码→再打开验证一遍',
        '铁门保持开锁状态，挂「本场已清洁」标识牌',
        '转盘锁归零位（0刻度对准箭头），挂锁挂回原挂钩'
      ]
    }
  },
  battery: {
    id: 'battery',
    icon: '🔋',
    title: '电池与电子设备',
    color: '#4da6ff',
    riskDesc: '手电筒/收音机/紫外线等电子设备电池漏液、过热、无法开机',
    checks: {
      before: [
        '逐个按开关测试：手电筒白光/紫外线10秒、收音机调3个台、留声机转一圈',
        '每台设备电量：低电量立刻更换新电池，备用电池放在同一个透明盒',
        '磁带：倒回开头，A面第一句话确认正常播放',
        '电线：沿墙角用胶带固定好，不要有绊倒玩家的裸露线'
      ],
      during: [
        '6分钟时如果玩家说「没电了」：拿备用设备用「道具袋」形式送进',
        '设备过热：立刻关机取出电池，冷却后更换',
        '收音机收到外界真实电台：立刻干扰，用杂音台覆盖真实信号'
      ],
      reset: [
        '所有电子设备关机，取出电池单独存放（防止长期漏液）',
        '磁带倒回开头，唱片放回原封套，灯泡/LED检查是否完好',
        '设备清单核对：本场带出的所有设备全部收回再离开'
      ]
    }
  },
  sharp: {
    id: 'sharp',
    icon: '🔪',
    title: '尖锐易碎品',
    color: '#ff9f43',
    riskDesc: '钥匙有尖齿、镜子易碎，容易划伤皮肤、扎破手指',
    checks: {
      before: [
        '钥匙：每一把用手摸齿尖，过于锋利的用砂纸打磨圆角',
        '镜子：检查边缘无碎裂，背面胶带加固防摔碎',
        '桌面所有玻璃物品：四角贴防护胶，下方铺软布防坠落',
        '急救包放在入口处，内含创可贴/碘伏/棉签'
      ],
      during: [
        '玩家拿钥匙/镜子时：提示「请轻拿轻放，物品比较旧」',
        '若发生划伤：立刻暂停，带玩家出场消毒包扎',
        '破碎玻璃：立刻停止本场，清扫所有碎片（用手电筒照地面反光）'
      ],
      reset: [
        '清点钥匙数量（几把出场→几把收回），放回原收纳盒',
        '检查镜子/玻璃无划痕，易碎品单独放在防震收纳盒中',
        '急救包使用过的：补全耗材后再离开'
      ]
    }
  },
  noise: {
    id: 'noise',
    icon: '📢',
    title: '大音量设备',
    color: '#b088f9',
    riskDesc: '铃铛/调音台/音响音量过大会刺激听觉，引发心脏病玩家不适',
    checks: {
      before: [
        '音响系统：播放最大音量3秒→不刺耳、无爆音',
        '铃铛/手铃：轻敲确认声音不过于尖锐，避免贴近玩家耳边摇',
        '确认没有心脏病/听觉敏感玩家（前台登记表核对）',
        '惊吓点距离玩家>50cm，禁止从背后直接贴近耳朵发声'
      ],
      during: [
        '高潮段音效：提前降低音量，观察前排玩家反应',
        '若有玩家捂耳朵/蹲下身：立刻降低音量，上前询问情况',
        '铃铛提示：每一次响铃间隔>10秒，不要连续密集响'
      ],
      reset: [
        '所有音响设备关机，音量旋钮归零',
        '铃铛放回原布套，调音台断电',
        '设备电缆盘好，不要有死弯'
      ]
    }
  }
}

const RiskPreviewPage: React.FC = () => {
  const { currentPuzzle } = usePuzzleStore()

  if (!currentPuzzle) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyTitle}>⚠️ 没有本场谜题</Text>
          <Text className={styles.emptyDesc}>请从「历史谜题复开」或「生成器」先生成本场谜题</Text>
          <View className={styles.btnSecondary} onClick={() => Taro.switchTab({ url: '/pages/generator/index' })}>
            去生成
          </View>
        </View>
      </ScrollView>
    )
  }

  const validPropIds = new Set(propList.map(p => p.id))
  const safeProps = (currentPuzzle.props || []).filter(pid => validPropIds.has(pid))
  const getPropName = (propId: string) => propList.find(p => p.id === propId)?.name || propId

  const activeCategories = Object.entries(RISK_CATEGORY_MAPPING)
    .map(([catId, propIds]) => {
      const matched = propIds.filter(pid => safeProps.includes(pid))
      return { id: catId as RiskCategory, matchedProps: matched }
    })
    .filter(cat => cat.matchedProps.length > 0)

  const totalItems = activeCategories.reduce((sum, cat) => {
    const tpl = RISK_TEMPLATES[cat.id]
    return sum + tpl.checks.before.length + tpl.checks.during.length + tpl.checks.reset.length
  }, 0)

  const riskGroups: RiskGroup[] = activeCategories.map(({ id, matchedProps }) => ({
    ...RISK_TEMPLATES[id],
    props: matchedProps
  }))

  const handleConfirm = () => {
    Taro.showModal({
      title: '确认进入提示台？',
      content: '请确认以上所有风险检查项已完成，特别是明火和铁门的安全测试。',
      confirmText: '确认完成',
      cancelText: '再检查一下',
      confirmColor: '#00ff88',
      success: (res) => {
        if (res.confirm) {
          Taro.switchTab({ url: '/pages/prompter/index' })
        }
      }
    })
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerBanner}>
        <Text className={styles.bannerIcon}>⚠️</Text>
        <View className={styles.bannerTextWrap}>
          <Text className={styles.bannerTitle}>本场风险预览</Text>
          <Text className={styles.bannerDesc}>
            谜题：{currentPuzzle.title} · 涉及 {safeProps.length} 个道具 · {riskGroups.length} 类风险 · 共 {totalItems} 项检查
          </Text>
        </View>
      </View>

      {riskGroups.length === 0 && (
        <RadioCard subtitle="本场为低风险配置（只有符纸/日记本/照片等纸质道具）">
          <Text style={{ color: '#8a8a9a', lineHeight: 1.8 }}>
            仍需完成以下通用检查：\n
            · 密室通道无障碍物、应急灯可正常点亮\n
            · 对讲机电量充足，主持人和前台能通联\n
            · 紧急出口标识清晰可见，灭火器在有效期内
          </Text>
        </RadioCard>
      )}

      {riskGroups.map((group) => (
        <View key={group.id} className={styles.riskCard}>
          <View className={styles.riskHeader}>
            <View 
              className={styles.riskIcon}
              style={{ background: `${group.color}15`, borderColor: `${group.color}60` }}
            >
              <Text style={{ fontSize: '40rpx' }}>{group.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
                <Text className={styles.riskTitle}>{group.title}</Text>
                <View className={styles.riskPropCount}>
                  <Text style={{ color: group.color, fontSize: '22rpx', fontWeight: 'bold' }}>
                    {group.props.length} 个道具
                  </Text>
                </View>
              </View>
              <Text className={styles.riskDesc}>{group.riskDesc}</Text>
              <View className={styles.relatedProps}>
                {group.props.map(pid => (
                  <Text key={pid} className={styles.riskPropTag} style={{ 
                    background: `${group.color}10`, 
                    color: group.color,
                    borderColor: `${group.color}30`
                  }}>
                    {getPropName(pid)}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View className={styles.checkPhase}>
            <Text className={styles.phaseTitle}>🟢 开场前检查</Text>
            {group.checks.before.map((item, i) => (
              <View key={`b-${i}`} className={styles.checkItem}>
                <View className={styles.checkBox}>
                  <Text style={{ fontSize: '28rpx', color: group.color }}>□</Text>
                </View>
                <Text className={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>

          <View className={styles.checkPhase}>
            <Text className={styles.phaseTitle}>🟡 进行中注意</Text>
            {group.checks.during.map((item, i) => (
              <View key={`d-${i}`} className={styles.checkItem}>
                <View className={styles.checkBox}>
                  <Text style={{ fontSize: '28rpx', color: group.color }}>□</Text>
                </View>
                <Text className={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>

          <View className={styles.checkPhase}>
            <Text className={styles.phaseTitle}>🔴 结束复位要点</Text>
            {group.checks.reset.map((item, i) => (
              <View key={`r-${i}`} className={styles.checkItem}>
                <View className={styles.checkBox}>
                  <Text style={{ fontSize: '28rpx', color: group.color }}>□</Text>
                </View>
                <Text className={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <RadioCard subtitle="通用检查（每场必做）">
        <View style={{ display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
          {[
            '🚨 应急通道无堆积物，安全出口标识灯点亮正常',
            '📻 对讲机充满电，频道对好，前台/监控室/主持人三方互通测试',
            '🔥 灭火器在有效期，压力指针在绿区，主持人知道放在哪里',
            '🪑 桌椅稳固，地面无油/水/电线裸露易滑倒区域',
            '👁️ 监控全覆盖，夜视效果正常，回放录像权限可用',
            '🧘 重恐场景：在离场处摆放缓神区（有饮用水、椅子、纸巾、空调）'
          ].map((item, i) => (
            <View key={`g-${i}`} style={{ display: 'flex', gap: '16rpx' }}>
              <View style={{ width: '44rpx', height: '44rpx', flexShrink: 0 }}>
                <Text style={{ fontSize: '28rpx', color: '#00ff88' }}>□</Text>
              </View>
              <Text style={{ flex: 1, color: '#c8c8d0', fontSize: '26rpx', lineHeight: 1.6 }}>{item}</Text>
            </View>
          ))}
        </View>
      </RadioCard>

      <View style={{ height: '48rpx' }}></View>

      <View className={styles.bottomBar}>
        <View className={styles.btnBack} onClick={handleBack}>
          返回修改
        </View>
        <View className={styles.btnPrimary} onClick={handleConfirm}>
          全部检查完毕 · 进入提示台
        </View>
      </View>
    </ScrollView>
  )
}

export default RiskPreviewPage
