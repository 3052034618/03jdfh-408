import React, { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'

const PrompterPage: React.FC = () => {
  const {
    currentPuzzle,
    isGameActive,
    startGame,
    endGame,
    useHint,
    usedHints,
    setConfig,
    reuseHistoryPuzzle
  } = usePuzzleStore()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [activeHintLevel, setActiveHintLevel] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isGameActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1
          if (next === 3 * 60) {
            setActiveHintLevel(1)
            Taro.vibrateShort({ type: 'medium' }).catch(() => {})
          } else if (next === 6 * 60) {
            setActiveHintLevel(2)
            Taro.vibrateShort({ type: 'heavy' }).catch(() => {})
          } else if (next === 10 * 60) {
            setActiveHintLevel(3)
            Taro.vibrateLong({}).catch(() => {})
          }
          return next
        })
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

  const getNextHintTime = (): string => {
    if (!isGameActive || activeHintLevel >= 3) return '-'
    const nextAt = (activeHintLevel + 1) * 3 * 60
    const remain = Math.max(0, nextAt - elapsedTime)
    const m = Math.floor(remain / 60)
    const s = remain % 60
    return `${m}分${s}秒后提示升级`
  }

  const handleStart = () => {
    if (!currentPuzzle) {
      Taro.showActionSheet({
        itemList: ['去生成新谜题', '从历史好评谜题中选择'],
        success: (res) => {
          if (res.tapIndex === 0) {
            Taro.switchTab({ url: '/pages/generator/index' })
          } else {
            Taro.showToast({ title: '请在复盘页选择历史谜题', icon: 'none' })
            Taro.switchTab({ url: '/pages/records/index' })
          }
        }
      }).catch(() => {})
      return
    }
    startGame()
    setElapsedTime(0)
    setIsPaused(false)
    setRevealedHints([])
    setActiveHintLevel(0)
    setConfig({ playerCount: currentPuzzle.playerCount?.min + 1 || 4 })
    Taro.showToast({ title: '游戏开始', icon: 'success' })
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
    Taro.showToast({
      title: !isPaused ? '已暂停' : '继续进行',
      icon: 'none',
      duration: 800
    })
  }

  const handleEnd = () => {
    const hints = [...new Set([...revealedHints, ...usedHints])]
    Taro.showModal({
      title: '结束本场游戏',
      content: `用时${Math.floor(elapsedTime / 60)}分${elapsedTime % 60}秒\n已使用${hints.length}级提示\n是否跳转到复盘填写？`,
      confirmText: '去复盘',
      cancelText: '取消',
      confirmColor: '#00ff88',
      success: (res) => {
        if (res.confirm) {
          endGame(elapsedTime, hints)
          Taro.navigateTo({ url: '/pages/record-form/index' })
        }
      }
    }).catch(() => {})
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
    Taro.vibrateShort({ type: 'light' }).catch(() => {})
  }

  const getHintStatus = (level: number, triggerTime: number): 'available' | 'locked' | 'used' | 'due' => {
    if (revealedHints.includes(level)) return 'used'
    if (activeHintLevel >= level) return 'due'
    if (elapsedTime >= triggerTime * 60) return 'available'
    return 'locked'
  }

  const getLevelName = (level: number): string => {
    const names: Record<number, string> = {
      1: '一级 · 轻微杂音',
      2: '二级 · 关键词重复',
      3: '三级 · 直接指向'
    }
    return names[level] || `第${level}级`
  }

  if (!currentPuzzle) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.noPuzzle}>
          <View style={{ fontSize: '80rpx', marginBottom: '32rpx' }}>📻</View>
          <Text className={styles.noPuzzleText}>暂无进行中的谜题</Text>
          <View style={{ display: 'flex', gap: '24rpx', justifyContent: 'center', flexWrap: 'wrap' }}>
            <View
              style={{
                padding: '24rpx 48rpx',
                background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                borderRadius: '48rpx',
                color: '#0a0a0f',
                fontWeight: 'bold'
              }}
              onClick={() => Taro.switchTab({ url: '/pages/generator/index' })}
            >
              生成新谜题
            </View>
            <View
              style={{
                padding: '24rpx 48rpx',
                background: '#1a1a2e',
                border: '1px solid #00ff88',
                borderRadius: '48rpx',
                color: '#00ff88'
              }}
              onClick={() => Taro.switchTab({ url: '/pages/records/index' })}
            >
              选历史好评
            </View>
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
          {isGameActive ? (isPaused ? '⏸ 已暂停' : '🔴 游戏进行中') : '准备开始'}
        </Text>
        {isGameActive && !isPaused && (
          <Text className={styles.nextHint}>
            {activeHintLevel === 0 ? `🎯 下一级提示：${getNextHintTime()}` :
             activeHintLevel === 3 ? '⚠️ 已到最高提示级别' :
             `⏰ 第${activeHintLevel}级时间到 · ${getNextHintTime()}`}
          </Text>
        )}

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
        <Text className={styles.sectionTitle}>分段提示（自动计时）</Text>
        {activeHintLevel > 0 && isGameActive && (
          <View className={styles.alertBanner}>
            <Text className={styles.alertText}>
              🔔 时间到！建议给出 <Text style={{ color: '#e94560', fontWeight: 'bold' }}>第{activeHintLevel}级</Text> 提示
            </Text>
          </View>
        )}
        <View className={styles.hintList}>
          {currentPuzzle.hints.map((hint) => {
            const status = getHintStatus(hint.level, hint.triggerTime)
            const isRevealed = revealedHints.includes(hint.level)
            const isActive = status === 'due' || (status === 'available' && !isRevealed)

            return (
              <View
                key={hint.level}
                className={classnames(styles.hintCard, {
                  [styles.active]: isActive,
                  [styles.used]: isRevealed,
                  [styles.locked]: status === 'locked',
                  [styles.due]: status === 'due' && !isRevealed
                })}
              >
                <View className={styles.hintHeader}>
                  <Text className={styles.hintLevel}>
                    {status === 'due' && !isRevealed ? '🔔 ' : ''}{getLevelName(hint.level)}
                  </Text>
                  <Text className={styles.hintTime}>{hint.triggerTime}分钟</Text>
                </View>

                <Text
                  className={classnames(styles.hintContent, {
                    [styles.revealed]: isRevealed,
                    [styles.hidden]: !isRevealed && status === 'locked'
                  })}
                >
                  「{hint.content}」
                </Text>

                {status !== 'locked' && !isRevealed && (
                  <View className={styles.revealBtn} onClick={() => handleRevealHint(hint.level)}>
                    {status === 'due' ? '🔥 现在播放此提示' : '点击播放提示'}
                  </View>
                )}

                {isRevealed && (
                  <Text className={styles.hintStatus}>✓ 已在 {formatTime(elapsedTime)} 播放</Text>
                )}

                {status === 'locked' && (
                  <Text className={styles.hintStatus}>
                    🔒 锁定 · 还需 {Math.max(0, hint.triggerTime * 60 - elapsedTime)} 秒
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
