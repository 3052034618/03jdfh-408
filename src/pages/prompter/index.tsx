import React, { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'

const PrompterPage: React.FC = () => {
  const { currentPuzzle, isGameActive, startGame, endGame, useHint, currentHintLevel } = usePuzzleStore()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isGameActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isGameActive, isPaused])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (!currentPuzzle) {
      Taro.showToast({ title: '请先生成或选择谜题', icon: 'none' })
      return
    }
    startGame()
    setElapsedTime(0)
    setIsPaused(false)
    setRevealedHints([])
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleEnd = () => {
    Taro.showModal({
      title: '结束游戏',
      content: '确定要结束本场游戏吗？结束后可填写复盘记录。',
      confirmText: '结束',
      cancelText: '取消',
      confirmColor: '#e94560',
      success: (res) => {
        if (res.confirm) {
          endGame()
          Taro.navigateTo({
            url: '/pages/record-form/index'
          })
        }
      }
    })
  }

  const handleRevealHint = (level: number) => {
    if (!isGameActive) {
      Taro.showToast({ title: '请先开始游戏', icon: 'none' })
      return
    }

    setRevealedHints(prev => {
      if (prev.includes(level)) return prev
      return [...prev, level]
    })
    useHint(level)
  }

  const getHintStatus = (level: number, triggerTime: number): 'available' | 'locked' | 'used' => {
    if (revealedHints.includes(level)) return 'used'
    if (elapsedTime >= triggerTime * 60) return 'available'
    return 'locked'
  }

  const getLevelName = (level: number): string => {
    const names: Record<number, string> = {
      1: '一级提示 · 轻微杂音',
      2: '二级提示 · 关键词重复',
      3: '三级提示 · 直接指向'
    }
    return names[level] || `第${level}级提示`
  }

  if (!currentPuzzle) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.noPuzzle}>
          <Text className={styles.noPuzzleText}>暂无进行中的谜题</Text>
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

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.puzzleInfo}>
        <Text className={styles.puzzleTitle}>{currentPuzzle.title}</Text>
        <View className={styles.puzzleMeta}>
          <Text className={styles.metaItem}>主题：{currentPuzzle.theme}</Text>
          <Text className={styles.metaItem}>难度：{'★'.repeat(currentPuzzle.difficulty)}</Text>
          <Text className={styles.metaItem}>预计：{currentPuzzle.estimatedTime}分钟</Text>
        </View>
      </View>

      <View className={styles.timerSection}>
        <View className={styles.timerGlow}></View>
        <View className={styles.timerDisplay}>{formatTime(elapsedTime)}</View>
        <Text className={styles.timerLabel}>
          {isGameActive ? (isPaused ? '已暂停' : '游戏进行中') : '准备开始'}
        </Text>

        <View className={styles.controlButtons}>
          {!isGameActive ? (
            <View className={classnames(styles.controlBtn, styles.start)} onClick={handleStart}>
              开始
            </View>
          ) : (
            <>
              <View className={classnames(styles.controlBtn, styles.pause)} onClick={handlePause}>
                {isPaused ? '继续' : '暂停'}
              </View>
              <View className={classnames(styles.controlBtn, styles.end)} onClick={handleEnd}>
                结束
              </View>
            </>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>分段提示</Text>
        <View className={styles.hintList}>
          {currentPuzzle.hints.map((hint) => {
            const status = getHintStatus(hint.level, hint.triggerTime)
            const isRevealed = revealedHints.includes(hint.level)

            return (
              <View
                key={hint.level}
                className={classnames(styles.hintCard, {
                  [styles.active]: status === 'available' && !isRevealed,
                  [styles.used]: isRevealed,
                  [styles.locked]: status === 'locked'
                })}
              >
                <View className={styles.hintHeader}>
                  <Text className={styles.hintLevel}>{getLevelName(hint.level)}</Text>
                  <Text className={styles.hintTime}>{hint.triggerTime}分钟触发</Text>
                </View>

                <Text
                  className={classnames(styles.hintContent, {
                    [styles.revealed]: isRevealed,
                    [styles.hidden]: !isRevealed && status !== 'available'
                  })}
                >
                  「{hint.content}」
                </Text>

                {status === 'available' && !isRevealed && (
                  <View className={styles.revealBtn} onClick={() => handleRevealHint(hint.level)}>
                    点击播放提示
                  </View>
                )}

                {isRevealed && (
                  <Text className={styles.hintStatus}>✓ 已播放</Text>
                )}

                {status === 'locked' && (
                  <Text className={styles.hintStatus}>
                    锁定中 · 还需 {hint.triggerTime * 60 - elapsedTime} 秒
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>主持人操作步骤</Text>
        <RadioCard subtitle="游戏进行中的操作要点">
          <View className={styles.stepsCard}>
            <Text className={styles.stepsTitle}>进行中</Text>
            {currentPuzzle.hostSteps.during.map((step, index) => (
              <View key={index} className={styles.stepItem}>
                <View className={styles.stepNumber}>{index + 1}</View>
                <Text className={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </RadioCard>
      </View>
    </ScrollView>
  )
}

export default PrompterPage
