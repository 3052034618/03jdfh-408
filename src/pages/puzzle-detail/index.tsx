import React, { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import { propList } from '@/data/props'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'

const PuzzleDetailPage: React.FC = () => {
  const { currentPuzzle, generateNewPuzzle } = usePuzzleStore()
  const [activeTab, setActiveTab] = useState<'script' | 'steps' | 'cards' | 'learn' | 'acceptance'>('script')

  const handleStartGame = () => {
    Taro.switchTab({
      url: '/pages/prompter/index'
    })
  }

  const handleRegenerate = () => {
    Taro.showLoading({ title: '生成中...', mask: true })
    setTimeout(() => {
      generateNewPuzzle()
      Taro.hideLoading()
      Taro.showToast({ title: '已生成新谜题', icon: 'success' })
    }, 800)
  }

  const validPropIds = new Set(propList.map(p => p.id))
  const safeProps = (currentPuzzle?.props || []).filter(pid => validPropIds.has(pid))

  const getPropName = (propId: string): string => {
    return propList.find(p => p.id === propId)?.name || propId
  }

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'misunderstanding': return '🔍'
      case 'horror_weak': return '🔥'
      case 'horror_strong': return '💀'
      case 'rating_low': return '⚡'
      default: return '✨'
    }
  }

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'misunderstanding': return '误解优化'
      case 'horror_weak': return '氛围增强'
      case 'horror_strong': return '高效触发'
      case 'rating_low': return '结构优化'
      default: return '调整'
    }
  }

  if (!currentPuzzle) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.noPuzzle}>
          <Text className={styles.noPuzzleText}>暂无谜题</Text>
          <View
            style={{
              padding: '24rpx 48rpx',
              background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
              borderRadius: '48rpx',
              color: '#0a0a0f',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
            onClick={() => Taro.switchTab({ url: '/pages/generator/index' })}
          >
            去生成谜题
          </View>
        </View>
      </ScrollView>
    )
  }

  const scriptParts = [
    { label: '开场', text: currentPuzzle.script.opening },
    { label: '发展', text: currentPuzzle.script.main },
    { label: '高潮', text: currentPuzzle.script.climax },
    { label: '结局', text: currentPuzzle.script.ending }
  ]

  const tabs = [
    { id: 'script' as const, label: '🎙️ 台词提示' },
    { id: 'steps' as const, label: '🎛️ 主持步骤' },
    { id: 'cards' as const, label: '🎴 卡片答案' },
    { id: 'learn' as const, label: '📝 学习调整' },
    { id: 'acceptance' as const, label: '✅ 道具验收' }
  ]

  const propKeywords: Record<string, string[]> = {
    'radio': ['收音机', '调频', '频率', '104.5'],
    'wall-clock': ['时钟', '时间', '10:45', '10点45'],
    'talisman': ['符纸', '朱砂', '符文'],
    'lockbox': ['锁盒', '四位', '密码盒'],
    'mirror': ['镜子', '倒影', '倒着读'],
    'door-lock': ['铁门', '密码锁', '四位密码', '门'],
    'iron-door': ['铁门', '门后', '地下室'],
    'padlock': ['挂锁', '铜锁', '三位', '045'],
    'combination-lock': ['转盘锁', '顺逆顺', '三圈', '木牌'],
    'newspaper': ['报纸', '剪报', '10月4日'],
    'diary': ['日记', '日记本', '凌晨'],
    'photo': ['照片', '合影', '背面日期'],
    'letter': ['信件', '信纸', '落款'],
    'bookshelf': ['书架', '书脊', '页码'],
    'candle': ['蜡烛', '烛台', '火光', '高度'],
    'lantern': ['灯笼', '竹骨架', '投影', '灯光'],
    'flashlight': ['手电筒', '手电', '灯泡', '照墙'],
    'blacklight': ['紫外线', '蓝光', '隐形墨水'],
    'tape-recorder': ['磁带', '录音机', '倒带', 'A面'],
    'phonograph': ['留声机', '唱片', '第十首', '章节'],
    'compass': ['罗盘', '指南针', 'N/E/S/W', '方位'],
    'mask': ['面具', '背面', '壹 〇 肆 伍'],
    'key': ['钥匙', '红线', '结']
  }

  const propAcceptanceData = safeProps.map(propId => {
    const name = getPropName(propId)
    const keywords = propKeywords[propId] || [name]

    const matchingCard = currentPuzzle.playerCards.find(card => {
      const title = card.title.toLowerCase()
      const content = card.content.toLowerCase()
      return keywords.some(kw => 
        title.includes(kw.toLowerCase()) || content.includes(kw.toLowerCase())
      ) || card.id.includes(propId.split('-')[0])
    })
    const playerClue = matchingCard 
      ? `【${matchingCard.title}】\n${matchingCard.content}\n\n提示：${matchingCard.hint || '无'}`
      : '⚠️ 未找到专属玩家卡，请核对生成逻辑'

    const allSteps = [
      ...currentPuzzle.hostSteps.prep.map(s => ({ phase: '准备', text: s })),
      ...currentPuzzle.hostSteps.during.map(s => ({ phase: '进行', text: s })),
      ...currentPuzzle.hostSteps.cleanup.map(s => ({ phase: '复位', text: s }))
    ]
    const relatedSteps = allSteps.filter(item => 
      keywords.some(kw => item.text.includes(kw))
    )
    const hostAction = relatedSteps.length > 0
      ? relatedSteps.map(s => `【${s.phase}】${s.text}`).join('\n\n')
      : '⚠️ 主持步骤里未提到该道具（单道具场景下需手动摆放）'

    const answerText = typeof currentPuzzle.answer === 'string'
      ? currentPuzzle.answer
      : JSON.stringify(currentPuzzle.answer)
    const relatedAnswerLines = answerText.split('\n').filter(line =>
      keywords.some(kw => line.includes(kw))
    )
    const answerRole = relatedAnswerLines.length > 0
      ? relatedAnswerLines.join('\n')
      : keywords.some(kw => answerText.includes(kw))
        ? '在核心答案的数字来源或执行步骤中被用到'
        : '⚠️ 答案中未明确提到该道具（单道具自闭环场景请在玩家卡中查看数字来源）'

    return { propId, name, playerClue, hostAction, answerRole }
  })

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.puzzleHeader}>
        <Text className={styles.puzzleTitle}>{currentPuzzle.title}</Text>
        <Text className={styles.puzzleSubtitle}>—— {currentPuzzle.theme} ——</Text>
        <View className={styles.puzzleMeta}>
          <Text className={styles.metaChip}>难度 {'★'.repeat(currentPuzzle.difficulty)}</Text>
          <Text className={styles.metaChip}>{currentPuzzle.estimatedTime}分钟</Text>
          <Text className={styles.metaChip}>
            {currentPuzzle.playerCount.min}-{currentPuzzle.playerCount.max}人
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>所需道具</Text>
        <View className={styles.propsList}>
          {safeProps.map(propId => (
            <Text key={propId} className={styles.propTag}>{getPropName(propId)}</Text>
          ))}
        </View>
      </View>

      <View className={styles.stageTabs}>
        {tabs.map(tab => (
          <View
            key={tab.id}
            className={`${styles.stageTab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {activeTab === 'script' && (
        <>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>广播台词</Text>
            {scriptParts.map((part, index) => (
              <View key={index} className={styles.scriptCard}>
                <Text className={styles.scriptLabel}>{part.label}</Text>
                <Text className={styles.scriptText}>{part.text}</Text>
              </View>
            ))}
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>分段提示</Text>
            <View className={styles.hintList}>
              {currentPuzzle.hints.map(hint => (
                <View key={hint.level} className={styles.hintItem}>
                  <Text className={styles.hintLevel}>
                    第{hint.level}级 · {hint.triggerTime}分钟
                  </Text>
                  <Text className={styles.hintContent}>「{hint.content}」</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {activeTab === 'steps' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>主持人操作</Text>
          <RadioCard subtitle="准备工作">
            {currentPuzzle.hostSteps.prep.map((step, index) => (
              <View key={`prep-${index}`} className={styles.stepItem}>
                <View className={styles.stepNumber}>{index + 1}</View>
                <Text className={styles.stepText}>{step}</Text>
              </View>
            ))}
          </RadioCard>

          <View style={{ height: '24rpx' }}></View>

          <RadioCard subtitle="游戏进行中">
            {currentPuzzle.hostSteps.during.map((step, index) => (
              <View key={`during-${index}`} className={styles.stepItem}>
                <View className={styles.stepNumber}>{index + 1}</View>
                <Text className={styles.stepText}>{step}</Text>
              </View>
            ))}
          </RadioCard>

          <View style={{ height: '24rpx' }}></View>

          <RadioCard subtitle="结束整理">
            {currentPuzzle.hostSteps.cleanup.map((step, index) => (
              <View key={`cleanup-${index}`} className={styles.stepItem}>
                <View className={styles.stepNumber}>{index + 1}</View>
                <Text className={styles.stepText}>{step}</Text>
              </View>
            ))}
          </RadioCard>
        </View>
      )}

      {activeTab === 'cards' && (
        <>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>玩家提示卡</Text>
            <View className={styles.cardsGrid}>
              {currentPuzzle.playerCards.map(card => (
                <View key={card.id} className={styles.playerCard}>
                  <Text className={styles.cardTitle}>{card.title}</Text>
                  <Text className={styles.cardContent}>{card.content}</Text>
                  {card.hint && (
                    <Text className={styles.cardHint}>提示：{card.hint}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>答案</Text>
            <View className={styles.answerCard}>
              <Text className={styles.answerLabel}>⚠️ 谜底揭晓</Text>
              <Text className={styles.answerText}>{currentPuzzle.answer}</Text>
            </View>
          </View>
        </>
      )}

      {activeTab === 'learn' && (
        <View className={styles.section}>
          {currentPuzzle.adjustments && currentPuzzle.adjustments.length > 0 ? (
            <>
              <View className={styles.adjustmentHeader}>
                <Text className={styles.sectionTitle} style={{ marginBottom: 0 }}>历史学习调整</Text>
                <Text className={styles.adjustmentBadge}>
                  {currentPuzzle.adjustments.length} 处优化
                </Text>
              </View>
              <View className={styles.adjustmentList}>
                {currentPuzzle.adjustments.map((adj, idx) => (
                  <View key={idx} className={styles.adjustmentCard}>
                    <View className={styles.adjustmentTypeRow}>
                      <Text className={styles.adjustmentIcon}>{getAdjustmentIcon(adj.type)}</Text>
                      <Text className={`${styles.adjustmentType} ${styles[`type-${adj.type}`]}`}>
                        {getAdjustmentTypeLabel(adj.type)}
                      </Text>
                    </View>
                    {adj.original && adj.original !== adj.adjusted && (
                      <View className={styles.adjustmentDiff}>
                        <View className={styles.diffRow}>
                          <Text className={styles.diffLabel}>原表达</Text>
                          <Text className={styles.diffOriginal}>{adj.original}</Text>
                        </View>
                        <View className={styles.diffArrow}>↓</View>
                        <View className={styles.diffRow}>
                          <Text className={styles.diffLabel}>改后表达</Text>
                          <Text className={styles.diffAdjusted}>{adj.adjusted}</Text>
                        </View>
                      </View>
                    )}
                    {(!adj.original || adj.original === adj.adjusted) && (
                      <Text className={styles.adjustmentSingle}>{adj.adjusted}</Text>
                    )}
                    <Text className={styles.adjustmentReason}>💡 {adj.reason}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <RadioCard subtitle="暂无学习调整">
              <Text style={{ color: '#8a8a9a', lineHeight: 1.8 }}>
                这套谜题还没有历史复盘记录。\n等完成几场复盘后，这里会显示误解改写、弱反馈升级等学习调整痕迹，以及具体是哪几类反馈触发了本次修改。
              </Text>
            </RadioCard>
          )}
        </View>
      )}

      {activeTab === 'acceptance' && (
        <View className={styles.section}>
          <View className={styles.adjustmentHeader}>
            <Text className={styles.sectionTitle} style={{ marginBottom: 0 }}>本场道具验收清单</Text>
            <Text className={styles.adjustmentBadge}>
              {safeProps.length} 个道具
            </Text>
          </View>
          <View style={{ height: '16rpx' }}></View>
          <RadioCard subtitle="每道具备3项闭环：玩家看得到线索、主持有动作、答案里用得到">
            <View style={{ padding: '4rpx 0' }}>
              <Text style={{ fontSize: '24rpx', color: '#8a8a9a', lineHeight: 1.6 }}>
                ✅ = 该环节正常生效 · ⚠️ = 该环节没有专属内容（单道具自闭环场景请重点核对）
              </Text>
            </View>
          </RadioCard>
          <View style={{ height: '24rpx' }}></View>

          {propAcceptanceData.map((item, idx) => {
            const clueOK = !item.playerClue.includes('⚠️')
            const actionOK = !item.hostAction.includes('⚠️')
            const roleOK = !item.answerRole.includes('⚠️')
            const fullPass = clueOK && actionOK && roleOK
            return (
              <View key={item.propId} className={styles.acceptanceCard}>
                <View className={styles.acceptanceHeader}>
                  <View className={styles.acceptanceIndex}>{idx + 1}</View>
                  <Text className={styles.acceptanceName}>{item.name}</Text>
                  <View className={`${styles.acceptanceBadge} ${fullPass ? styles.fullPass : styles.partialPass}`}>
                    <Text style={{ color: fullPass ? '#0a0a0f' : '#ff9f43', fontSize: '22rpx', fontWeight: 'bold' }}>
                      {fullPass ? '✅ 三全齐' : `⚠️ ${Number(clueOK)+Number(actionOK)+Number(roleOK)}/3`}
                    </Text>
                  </View>
                </View>

                <View className={styles.acceptanceRow}>
                  <View className={`${styles.acceptanceColLabel} ${clueOK ? styles.colOK : styles.colWarn}`}>
                    <Text style={{ color: clueOK ? '#00ff88' : '#ff9f43', fontWeight: 'bold' }}>👁️ 玩家可看线索</Text>
                  </View>
                  <Text className={styles.acceptanceColText}>{item.playerClue}</Text>
                </View>

                <View className={styles.acceptanceRow}>
                  <View className={`${styles.acceptanceColLabel} ${actionOK ? styles.colOK : styles.colWarn}`}>
                    <Text style={{ color: actionOK ? '#00ff88' : '#ff9f43', fontWeight: 'bold' }}>🎛️ 主持操作动作</Text>
                  </View>
                  <Text className={styles.acceptanceColText}>{item.hostAction}</Text>
                </View>

                <View className={styles.acceptanceRow}>
                  <View className={`${styles.acceptanceColLabel} ${roleOK ? styles.colOK : styles.colWarn}`}>
                    <Text style={{ color: roleOK ? '#00ff88' : '#ff9f43', fontWeight: 'bold' }}>💡 答案中的作用</Text>
                  </View>
                  <Text className={styles.acceptanceColText}>{item.answerRole}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      <View className={styles.bottomBar}>
        <View className={styles.regenerateBtn} onClick={handleRegenerate}>
          🔄
        </View>
        <View className={styles.startBtn} onClick={handleStartGame}>
          <Text className={styles.startBtnText}>开始游戏</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default PuzzleDetailPage
