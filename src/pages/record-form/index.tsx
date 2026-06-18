import React, { useState, useEffect } from 'react'
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import type { GameRecord } from '@/types/puzzle'
import styles from './index.module.scss'

const RecordFormPage: React.FC = () => {
  const {
    currentPuzzle,
    addRecord,
    consumePendingReview,
    captureChecklistStatus,
    config
  } = usePuzzleStore()

  const [duration, setDuration] = useState(25)
  const [playerCount, setPlayerCount] = useState(4)
  const [hintsUsed, setHintsUsed] = useState<number[]>([])
  const [mostMisunderstood, setMostMisunderstood] = useState('')
  const [horrorReactions, setHorrorReactions] = useState<string[]>([])
  const [newReaction, setNewReaction] = useState('')
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')
  const [presetLoaded, setPresetLoaded] = useState(false)

  useEffect(() => {
    const pending = consumePendingReview()
    if (pending) {
      console.log('[RecordForm] 加载预设复盘数据:', pending)
      if (pending.duration) setDuration(pending.duration)
      if (pending.playerCount) setPlayerCount(pending.playerCount)
      if (pending.hintsUsed && pending.hintsUsed.length > 0) setHintsUsed(pending.hintsUsed)
      setPresetLoaded(true)
      Taro.showToast({
        title: '已自动填入用时和提示',
        icon: 'none',
        duration: 1500
      })
    } else {
      if (currentPuzzle) {
        setPlayerCount(config.playerCount || 4)
      }
      setPresetLoaded(true)
    }
  }, [])

  const strongReactions = [
    '尖叫',
    '抱头蹲防',
    '不敢回头',
    '抱住同伴',
    '要求降低恐怖度',
    '被音效吓到',
    '后退躲远',
    '抓住道具不放'
  ]

  const weakFeedbackTags = [
    '笑场',
    '快速解谜',
    '无恐怖反应',
    '玩家觉得不吓人',
    '主动催进度',
    '闲聊摆烂',
    '恐怖场景笑场',
    '吐槽机关低级'
  ]

  const isWeakTag = (tag: string) => weakFeedbackTags.includes(tag)

  const misunderstoodSuggestions = [
    '玩家以为符纸上的符文是密码',
    '没有注意到墙上的时钟指针',
    '不知道要去调收音机的频率',
    '误解了日记里的日期含义',
    '密码位数猜错了',
    '没发现老照片背面的字'
  ]

  const handleDurationChange = (delta: number) => {
    const newDuration = Math.max(1, Math.min(120, duration + delta))
    setDuration(newDuration)
  }

  const handlePlayerCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(20, playerCount + delta))
    setPlayerCount(newCount)
  }

  const handleHintToggle = (level: number) => {
    setHintsUsed(prev => {
      if (prev.includes(level)) {
        return prev.filter(l => l !== level)
      } else {
        return [...prev, level].sort()
      }
    })
  }

  const handleReactionAdd = (reaction: string) => {
    if (!reaction.trim()) return
    if (horrorReactions.includes(reaction)) return
    setHorrorReactions(prev => [...prev, reaction])
    setNewReaction('')
  }

  const handleReactionRemove = (reaction: string) => {
    setHorrorReactions(prev => prev.filter(r => r !== reaction))
  }

  const handleMisunderstoodPick = (text: string) => {
    setMostMisunderstood(prev => prev ? prev + '；' + text : text)
  }

  const handleSubmit = () => {
    const puzzleId = currentPuzzle?.id || 'unknown'
    const puzzleTitle = currentPuzzle?.title || '未命名谜题'

    if (!mostMisunderstood.trim()) {
      Taro.showModal({
        title: '提示',
        content: '还没有填写"最常误解的句子"，建议记录下来以便后续优化表达，确认提交吗？',
        confirmText: '确认提交',
        cancelText: '去填写',
        confirmColor: '#00ff88',
        success: (res) => {
          if (res.confirm) {
            doSubmit(puzzleId, puzzleTitle)
          }
        }
      }).catch(() => {})
      return
    }
    doSubmit(puzzleId, puzzleTitle)
  }

  const doSubmit = (puzzleId: string, puzzleTitle: string) => {
    const checklistStatus = captureChecklistStatus(puzzleId)

    const record: GameRecord = {
      id: `record-${Date.now()}`,
      puzzleId,
      puzzleTitle,
      startTime: Date.now() - duration * 60 * 1000,
      endTime: Date.now(),
      duration,
      playerCount,
      hintsUsed: [...hintsUsed],
      mostMisunderstood: mostMisunderstood.trim() || '无',
      horrorReactions,
      rating,
      notes,
      createdAt: Date.now(),
      elapsedSeconds: duration * 60,
      checklistStatus: checklistStatus || undefined
    }

    addRecord(record)

    Taro.showToast({
      title: '复盘已保存，下次生成将自动优化',
      icon: 'none',
      duration: 2000
    })

    setTimeout(() => {
      Taro.switchTab({ url: '/pages/records/index' })
    }, 2000)
  }

  const renderStars = () => {
    return (
      <View className={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map(star => (
          <Text
            key={star}
            className={classnames(styles.star, { [styles.filled]: star <= rating })}
            onClick={() => setRating(star)}
          >
            ★
          </Text>
        ))}
      </View>
    )
  }

  if (!presetLoaded) {
    return <View className={styles.page} />
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.formHeaderCard}>
        <Text className={styles.formHeaderTitle}>📋 填写本场复盘</Text>
        <Text className={styles.formHeaderDesc}>记录玩家表现，下次生成谜题时将自动优化表达</Text>
        {currentPuzzle && (
          <View className={styles.puzzleInfo}>
            <Text className={styles.puzzleTitle}>{currentPuzzle.title}</Text>
            <Text className={styles.puzzleMeta}>主题：{currentPuzzle.theme}</Text>
          </View>
        )}
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>基本信息</Text>
        <View className={styles.formCard}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>游戏时长（分钟）</Text>
            <View className={styles.timeRow}>
              <View
                className={styles.counterBtn}
                onClick={() => handleDurationChange(-5)}
              >
                -
              </View>
              <View className={styles.timeInput}>
                <Text className={styles.timeNum}>{duration}</Text>
                <Text className={styles.timeUnit}>分钟</Text>
              </View>
              <View
                className={styles.counterBtn}
                onClick={() => handleDurationChange(5)}
              >
                +
              </View>
            </View>
            <View className={styles.quickTimes}>
              {[10, 15, 20, 30, 45, 60].map(t => (
                <View
                  key={t}
                  className={styles.quickTimeBtn}
                  onClick={() => setDuration(t)}
                >
                  {t}分钟
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>玩家人数</Text>
            <View className={styles.counterInput}>
              <View
                className={styles.counterBtn}
                onClick={() => handlePlayerCountChange(-1)}
              >
                -
              </View>
              <Text className={styles.counterValue}>{playerCount}</Text>
              <View
                className={styles.counterBtn}
                onClick={() => handlePlayerCountChange(1)}
              >
                +
              </View>
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              使用的提示 {hintsUsed.length > 0 && <Text style={{ color: '#00ff88' }}>（已自动填入）</Text>}
            </Text>
            <View className={styles.hintSelector}>
              {[1, 2, 3].map(level => (
                <View
                  key={level}
                  className={classnames(styles.hintOption, {
                    [styles.selected]: hintsUsed.includes(level)
                  })}
                  onClick={() => handleHintToggle(level)}
                >
                  <Text className={styles.hintOptionLevel}>第{level}级</Text>
                  <Text className={styles.hintOptionDesc}>
                    {level === 1 ? '轻微杂音' : level === 2 ? '关键词重复' : '直接指向'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>玩家评分</Text>
            {renderStars()}
          </View>
        </View>
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>反馈记录（用于后续优化生成）</Text>
        <View className={styles.formCard}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>最常误解的句子/线索</Text>
            <Text className={styles.formHint}>填写后下次生成时将自动避开类似表达，或改写为更清晰的版本</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="请输入玩家最容易误解的内容..."
              value={mostMisunderstood}
              onInput={(e) => setMostMisunderstood(e.detail.value)}
              maxlength={300}
            />
            {misunderstoodSuggestions.length > 0 && (
              <>
                <Text style={{ fontSize: '22rpx', color: '#555566', marginTop: '16rpx', marginBottom: '8rpx' }}>快速选择（可多选）：</Text>
                <View className={styles.suggestedTags}>
                  {misunderstoodSuggestions.map(tag => (
                    <View
                      key={tag}
                      className={styles.suggestedTag}
                      onClick={() => handleMisunderstoodPick(tag)}
                    >
                      + {tag}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>恐怖反应</Text>
            <Text className={styles.formHint}>💀 强触发（绿色）→ 下次追加同类表达；⚠️ 弱反馈（橙色）→ 下次升级压迫感</Text>
            <View className={styles.tagInput}>
              {horrorReactions.map(reaction => (
                <View
                  key={reaction}
                  className={classnames(
                    styles.tagItem,
                    isWeakTag(reaction) ? styles.weakTag : styles.strongTag
                  )}
                >
                  <Text>{isWeakTag(reaction) ? '⚠️ ' : '💀 '}{reaction}</Text>
                  <Text
                    className={styles.tagRemove}
                    onClick={() => handleReactionRemove(reaction)}
                  >
                    ×
                  </Text>
                </View>
              ))}
            </View>
            <Input
              className={styles.formInput}
              placeholder="输入反应后按回车添加..."
              value={newReaction}
              onInput={(e) => setNewReaction(e.detail.value)}
              onConfirm={() => handleReactionAdd(newReaction)}
            />

            <Text style={{ fontSize: '22rpx', color: '#00ff88', marginTop: '20rpx', marginBottom: '10rpx', fontWeight: 'bold' }}>
              💀 强有效触发（下次追加同类描写）
            </Text>
            <View className={styles.suggestedTags}>
              {strongReactions.filter(r => !horrorReactions.includes(r)).map(tag => (
                <View
                  key={tag}
                  className={classnames(styles.suggestedTag, styles.suggestedStrong)}
                  onClick={() => handleReactionAdd(tag)}
                >
                  + {tag}
                </View>
              ))}
            </View>

            <Text style={{ fontSize: '22rpx', color: '#ff9f43', marginTop: '20rpx', marginBottom: '10rpx', fontWeight: 'bold' }}>
              ⚠️ 弱反馈信号（下次升级压迫感）
            </Text>
            <View className={styles.suggestedTags}>
              {weakFeedbackTags.filter(r => !horrorReactions.includes(r)).map(tag => (
                <View
                  key={tag}
                  className={classnames(styles.suggestedTag, styles.suggestedWeak)}
                  onClick={() => handleReactionAdd(tag)}
                >
                  + {tag}
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>备注</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="其他需要记录的内容..."
              value={notes}
              onInput={(e) => setNotes(e.detail.value)}
              maxlength={500}
            />
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          <Text className={styles.submitText}>保 存 并 优 化 下 次 生 成</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default RecordFormPage
