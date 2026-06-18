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
  const [activeTab, setActiveTab] = useState<'script' | 'steps' | 'cards'>('script')

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

  const getPropName = (propId: string): string => {
    return propList.find(p => p.id === propId)?.name || propId
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
          {currentPuzzle.props.map(propId => (
            <Text key={propId} className={styles.propTag}>{getPropName(propId)}</Text>
          ))}
        </View>
      </View>

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

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>答案</Text>
        <View className={styles.answerCard}>
          <Text className={styles.answerLabel}>⚠️ 谜底揭晓</Text>
          <Text className={styles.answerText}>{currentPuzzle.answer}</Text>
        </View>
      </View>

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
