import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import { propCategories, propList, themes, difficultyLevels, horrorLevels, roomSetups } from '@/data/props'
import styles from './index.module.scss'

const PuzzleReusePage: React.FC = () => {
  const router = useRouter()
  const {
    puzzles,
    records,
    learning,
    config,
    setConfig,
    generateNewPuzzle
  } = usePuzzleStore()

  const puzzleId = router.params?.puzzleId
  const historyPuzzle = puzzles.find(p => p.id === puzzleId)
  const historyRecords = records.filter(r => r.puzzleId === puzzleId)

  const avgRating = historyRecords.length > 0
    ? (historyRecords.reduce((s, r) => s + r.rating, 0) / historyRecords.length).toFixed(1)
    : '4.0'
  const avgDuration = historyRecords.length > 0
    ? Math.round(historyRecords.reduce((s, r) => s + (r.duration || 30), 0) / historyRecords.length)
    : 30
  const totalRounds = historyRecords.length

  const [selectedProps, setSelectedProps] = useState<string[]>(historyPuzzle?.props || config.selectedProps)
  const [playerCount, setPlayerCount] = useState(config.playerCount)
  const [difficulty, setDifficulty] = useState(historyPuzzle?.difficulty || config.difficulty)
  const [horrorLevel, setHorrorLevel] = useState(historyPuzzle?.horrorLevel || config.horrorLevel)
  const [selectedTheme, setSelectedTheme] = useState(
    themes.find(t => t.name === historyPuzzle?.theme)?.id || config.theme
  )
  const [roomSetup, setRoomSetup] = useState<string>(config.roomSetup)

  useEffect(() => {
    if (!puzzleId || !historyPuzzle) {
      Taro.showToast({ title: '未找到历史谜题', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  }, [puzzleId, historyPuzzle])

  const originalPropsSet = new Set(historyPuzzle?.props || [])

  const handlePropToggle = (propId: string) => {
    setSelectedProps(prev => {
      if (prev.includes(propId)) {
        return prev.filter(id => id !== propId)
      } else {
        return [...prev, propId]
      }
    })
  }

  const handleSelectCategory = (catId: string, checked: boolean) => {
    const catProps = propList.filter(p => p.category === catId).map(p => p.id)
    setSelectedProps(prev => {
      if (checked) {
        return Array.from(new Set([...prev, ...catProps]))
      } else {
        return prev.filter(id => !catProps.includes(id))
      }
    })
  }

  const handlePlayerCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(10, playerCount + delta))
    setPlayerCount(newCount)
  }

  const handleReuseAndStart = () => {
    if (selectedProps.length === 0) {
      Taro.showToast({ title: '请至少勾选一个道具', icon: 'none' })
      return
    }

    setConfig({
      roomSetup,
      selectedProps,
      playerCount,
      difficulty,
      horrorLevel,
      theme: selectedTheme
    })

    Taro.showLoading({ title: '生成新谜题...', mask: true })
    setTimeout(() => {
      try {
        const result = generateNewPuzzle()
        Taro.hideLoading()
        const adjCount = result?.adjustments?.length || 0
        Taro.showToast({
          title: adjCount > 0
            ? `已生成（含${adjCount}处学习优化）`
            : '已生成新谜题',
          icon: 'success',
          duration: 1500
        })
        setTimeout(() => {
          Taro.navigateTo({ url: '/pages/risk-preview/index' })
        }, 1500)
      } catch (e) {
        Taro.hideLoading()
        Taro.showToast({ title: '生成失败，请重试', icon: 'none' })
      }
    }, 700)
  }

  const renderLevelDots = (level: number, maxLevel: number, isDanger = false) => {
    return (
      <View className={styles.counterInput} style={{ display: 'inline-flex' }}>
        {Array.from({ length: maxLevel }).map((_, i) => (
          <View
            key={i}
            className={classnames({
              [styles.counterBtn]: true,
              active: i < level
            })}
            style={{
              width: 24, height: 24,
              background: i < level
                ? isDanger ? 'rgba(233,69,96,0.2)' : 'rgba(0,255,136,0.15)'
                : '#1a1a2e',
              border: `1px solid ${i < level
                ? isDanger ? 'rgba(233,69,96,0.6)' : 'rgba(0,255,136,0.6)'
                : '#2a2a3e'}`,
              color: i < level
                ? isDanger ? '#e94560' : '#00ff88'
                : '#555566'
            }}
          />
        ))}
      </View>
    )
  }

  if (!historyPuzzle) {
    return <ScrollView scrollY className={styles.page} />
  }

  const removedOriginal = Array.from(originalPropsSet).filter(p => !selectedProps.includes(p))
  const addedNew = selectedProps.filter(p => !originalPropsSet.has(p))

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.historyCard}>
        <Text className={styles.historyLabel}>★ 历史好评谜题 · 即将复开</Text>
        <Text className={styles.historyTitle}>{historyPuzzle.title}</Text>
        <View className={styles.historyMeta}>
          <Text className={styles.historyChip}>主题：{historyPuzzle.theme}</Text>
          <Text className={styles.historyChip}>
            难度 {'★'.repeat(historyPuzzle.difficulty)}
          </Text>
          <Text className={styles.historyChip}>
            恐怖 {'💀'.repeat(historyPuzzle.horrorLevel || 1)}
          </Text>
          <Text className={styles.historyChip}>
            {historyPuzzle.playerCount.min}-{historyPuzzle.playerCount.max}人
          </Text>
        </View>
        <View className={styles.historyStats}>
          <View className={styles.historyStatItem}>
            <Text className={styles.historyStatNum}>{totalRounds}</Text>
            <Text className={styles.historyStatLabel}>已开场次</Text>
          </View>
          <View className={styles.historyStatItem}>
            <Text className={styles.historyStatNum}>{avgRating}</Text>
            <Text className={styles.historyStatLabel}>平均评分</Text>
          </View>
          <View className={styles.historyStatItem}>
            <Text className={styles.historyStatNum}>{avgDuration}</Text>
            <Text className={styles.historyStatLabel}>平均用时(分)</Text>
          </View>
          <View className={styles.historyStatItem}>
            <Text className={styles.historyStatNum}>{learning.misunderstoodPhrases.length + learning.weakHorrorPhrases.length}</Text>
            <Text className={styles.historyStatLabel}>累计学习</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20rpx' }}>
          <Text className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            本场可用道具
          </Text>
          <Text className={styles.propCount}>
            已选 {selectedProps.length} / {propList.length}
          </Text>
        </View>
        <View className={styles.legendRow}>
          <Text>
            <Text className={styles.legendDot}>★</Text>
            原谜题经典道具（建议保留）
          </Text>
        </View>
        {propCategories.map(cat => {
          const catProps = propList.filter(p => p.category === cat.id)
          if (catProps.length === 0) return null
          const selectedInCat = catProps.filter(p => selectedProps.includes(p.id)).length
          const allSelected = selectedInCat === catProps.length

          return (
            <View key={cat.id} className={styles.propSection}>
              <View className={styles.propCategoryTitle}>
                <Text>{cat.name}（{selectedInCat}/{catProps.length}）</Text>
                <View
                  className={styles.selectAllBtn}
                  onClick={() => handleSelectCategory(cat.id, !allSelected)}
                >
                  {allSelected ? '取消全选' : '全选'}
                </View>
              </View>
              <View className={styles.propList}>
                {catProps.map(prop => (
                  <View
                    key={prop.id}
                    className={classnames(
                      styles.propItem,
                      {
                        [styles.selected]: selectedProps.includes(prop.id),
                        [styles.fromHistory]: originalPropsSet.has(prop.id)
                      }
                    )}
                    onClick={() => handlePropToggle(prop.id)}
                  >
                    {prop.name}
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>本场设置</Text>
        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>玩家人数</Text>
          </View>
          <View className={styles.counterInput}>
            <View className={styles.counterBtn} onClick={() => handlePlayerCountChange(-1)}>
              -
            </View>
            <Text className={styles.counterNum}>{playerCount}</Text>
            <View className={styles.counterBtn} onClick={() => handlePlayerCountChange(1)}>
              +
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>谜题难度</Text>
            <View>{renderLevelDots(difficulty, 3, false)}</View>
          </View>
          <View className={styles.levelRow}>
            {difficultyLevels.map(d => (
              <View
                key={d.id}
                className={classnames(styles.levelOption, { active: difficulty === d.id })}
                onClick={() => setDifficulty(d.id)}
              >
                {d.name}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>恐怖等级</Text>
            <View>{renderLevelDots(horrorLevel, 3, true)}</View>
          </View>
          <View className={styles.levelRow}>
            {horrorLevels.map(h => (
              <View
                key={h.id}
                className={classnames(styles.levelOption, {
                  active: horrorLevel === h.id,
                  danger: true
                })}
                onClick={() => setHorrorLevel(h.id)}
              >
                {h.name}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>故事主题</Text>
          </View>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            {themes.map(theme => (
              <View
                key={theme.id}
                className={classnames(styles.levelOption, { active: selectedTheme === theme.id })}
                style={{ width: '46%', flex: 'none', textAlign: 'left' }}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <Text style={{ fontSize: 26, display: 'block', marginBottom: 4 }}>{theme.name}</Text>
                <Text style={{ fontSize: 20, opacity: 0.6 }}>{theme.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {(removedOriginal.length > 0 || addedNew.length > 0) && (
          <View className={styles.warningRow}>
            <Text>⚠️ </Text>
            <Text>
              {removedOriginal.length > 0 && `移除了${removedOriginal.length}个经典道具，`}
              {addedNew.length > 0 && `新增了${addedNew.length}个道具`}
              —谜题结构将围绕新道具组合重新生成
            </Text>
          </View>
        )}
        <View className={styles.goBtn} onClick={handleReuseAndStart}>
          <Text className={styles.goBtnText}>
            确 认 配 置 · 生 成 新 谜 题 → 进 入 提 示 台
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default PuzzleReusePage
