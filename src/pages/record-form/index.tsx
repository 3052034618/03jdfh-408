import React, { useState } from 'react'
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import type { GameRecord } from '@/types/puzzle'
import styles from './index.module.scss'

const RecordFormPage: React.FC = () => {
  const { currentPuzzle, addRecord } = usePuzzleStore()

  const [duration, setDuration] = useState(25)
  const [playerCount, setPlayerCount] = useState(4)
  const [hintsUsed, setHintsUsed] = useState<number[]>([])
  const [mostMisunderstood, setMostMisunderstood] = useState('')
  const [horrorReactions, setHorrorReactions] = useState<string[]>([])
  const [newReaction, setNewReaction] = useState('')
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')

  const suggestedReactions = [
    '尖叫',
    '抱头蹲防',
    '不敢回头',
    '抱住同伴',
    '要求降低恐怖度',
    '笑场',
    '快速解谜',
    '被音效吓到'
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

  const handleSubmit = () => {
    if (!currentPuzzle) {
      Taro.showToast({ title: '请先选择谜题', icon: 'none' })
      return
    }

    const record: GameRecord = {
      id: `record-${Date.now()}`,
      puzzleId: currentPuzzle.id,
      puzzleTitle: currentPuzzle.title,
      startTime: Date.now() - duration * 60 * 1000,
      endTime: Date.now(),
      duration,
      playerCount,
      hintsUsed,
      mostMisunderstood: mostMisunderstood || '无',
      horrorReactions,
      rating,
      notes,
      createdAt: Date.now()
    }

    addRecord(record)

    Taro.showToast({
      title: '复盘已保存',
      icon: 'success',
      duration: 1500
    })

    setTimeout(() => {
      Taro.switchTab({ url: '/pages/records/index' })
    }, 1500)
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

  return (
    <ScrollView scrollY className={styles.page}>
      {currentPuzzle && (
        <View className={styles.puzzleInfo}>
          <Text className={styles.puzzleTitle}>{currentPuzzle.title}</Text>
          <Text className={styles.puzzleMeta}>主题：{currentPuzzle.theme}</Text>
        </View>
      )}

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
            <Text className={styles.formLabel}>使用的提示</Text>
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
        <Text className={styles.sectionTitle}>反馈记录</Text>
        <View className={styles.formCard}>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>最常误解的句子/线索</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="请输入玩家最容易误解的内容..."
              value={mostMisunderstood}
              onInput={(e) => setMostMisunderstood(e.detail.value)}
              maxlength={200}
            />
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>恐怖反应</Text>
            <View className={styles.tagInput}>
              {horrorReactions.map(reaction => (
                <View key={reaction} className={styles.tagItem}>
                  <Text>{reaction}</Text>
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
            <View className={styles.suggestedTags}>
              {suggestedReactions.map(tag => (
                <View
                  key={tag}
                  className={styles.suggestedTag}
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
          <Text className={styles.submitText}>保 存 复 盘</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default RecordFormPage
