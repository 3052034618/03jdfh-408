import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import { roomSetups, propList, propCategories, horrorLevels, difficultyLevels, themes } from '@/data/props'
import styles from './index.module.scss'

const GeneratorPage: React.FC = () => {
  const { config, setConfig, generateNewPuzzle, currentPuzzle } = usePuzzleStore()
  const [selectedRoom, setSelectedRoom] = useState(config.roomSetup)
  const [selectedProps, setSelectedProps] = useState<string[]>(config.selectedProps)
  const [playerCount, setPlayerCount] = useState(config.playerCount)
  const [difficulty, setDifficulty] = useState(config.difficulty)
  const [horrorLevel, setHorrorLevel] = useState(config.horrorLevel)
  const [selectedTheme, setSelectedTheme] = useState(config.theme)

  useEffect(() => {
    const room = roomSetups.find(r => r.id === selectedRoom)
    if (room && selectedProps.length === 0) {
      setSelectedProps([...room.props])
    }
  }, [])

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoom(roomId)
    const room = roomSetups.find(r => r.id === roomId)
    if (room) {
      setSelectedProps([...room.props])
    }
  }

  const handlePropToggle = (propId: string) => {
    setSelectedProps(prev => {
      if (prev.includes(propId)) {
        return prev.filter(id => id !== propId)
      } else {
        return [...prev, propId]
      }
    })
  }

  const handlePlayerCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(10, playerCount + delta))
    setPlayerCount(newCount)
  }

  const handleGenerate = () => {
    if (selectedProps.length === 0) {
      Taro.showToast({ title: '请至少选择一个道具', icon: 'none' })
      return
    }

    setConfig({
      roomSetup: selectedRoom,
      selectedProps,
      playerCount,
      difficulty,
      horrorLevel,
      theme: selectedTheme
    })

    generateNewPuzzle()

    Taro.navigateTo({
      url: '/pages/puzzle-detail/index'
    })
  }

  const renderLevelDots = (level: number, maxLevel: number, isDanger = false) => {
    return (
      <View className={classnames(styles.levelDots, { [styles.dangerLevel]: isDanger })}>
        {Array.from({ length: maxLevel }).map((_, i) => (
          <View
            key={i}
            className={classnames(styles.levelDot, { [styles.active]: i < level })}
          />
        ))}
      </View>
    )
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.pageHeader}>
        <Text className={styles.title}>阴间电台</Text>
        <Text className={styles.subtitle}>—— 恐怖密室谜题生成器 ——</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>房间布置</Text>
        <View className={styles.roomGrid}>
          {roomSetups.map(room => (
            <View
              key={room.id}
              className={classnames(styles.roomCard, {
                [styles.selected]: selectedRoom === room.id
              })}
              onClick={() => handleRoomSelect(room.id)}
            >
              <Text className={styles.roomName}>{room.name}</Text>
              <Text className={styles.roomDesc}>{room.description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>可用道具</Text>
        <Text style={{ fontSize: '24rpx', color: '#555566', marginBottom: '24rpx' }}>
          只生成用选中道具能完成的谜题
        </Text>

        {propCategories.map(cat => {
          const catProps = propList.filter(p => p.category === cat.id)
          if (catProps.length === 0) return null

          return (
            <View key={cat.id} className={styles.propSection}>
              <Text className={styles.propCategoryTitle}>{cat.name}</Text>
              <View className={styles.propList}>
                {catProps.map(prop => (
                  <View
                    key={prop.id}
                    className={classnames(styles.propItem, {
                      [styles.selected]: selectedProps.includes(prop.id)
                    })}
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
        <Text className={styles.sectionTitle}>游戏设置</Text>

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>玩家人数</Text>
            <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx' }}>
              <View
                style={{
                  width: '56rpx',
                  height: '56rpx',
                  borderRadius: '50%',
                  background: '#252540',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e0e0e0',
                  fontSize: '32rpx',
                  fontWeight: 'bold'
                }}
                onClick={() => handlePlayerCountChange(-1)}
              >
                -
              </View>
              <Text className={styles.sliderValue}>{playerCount}人</Text>
              <View
                style={{
                  width: '56rpx',
                  height: '56rpx',
                  borderRadius: '50%',
                  background: '#252540',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e0e0e0',
                  fontSize: '32rpx',
                  fontWeight: 'bold'
                }}
                onClick={() => handlePlayerCountChange(1)}
              >
                +
              </View>
            </View>
          </View>
        </View>

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>谜题难度</Text>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              {renderLevelDots(difficulty, 3)}
              <Text className={styles.levelLabel}>
                {difficultyLevels.find(d => d.id === difficulty)?.name}
              </Text>
            </View>
          </View>
          <View style={{ display: 'flex', gap: '16rpx' }}>
            {difficultyLevels.map(d => (
              <View
                key={d.id}
                style={{
                  flex: 1,
                  padding: '16rpx',
                  background: difficulty === d.id ? 'rgba(0, 255, 136, 0.1)' : '#1a1a2e',
                  border: `1px solid ${difficulty === d.id ? '#00ff88' : '#2a2a3e'}`,
                  borderRadius: '12rpx',
                  textAlign: 'center'
                }}
                onClick={() => setDifficulty(d.id)}
              >
                <Text style={{ color: difficulty === d.id ? '#00ff88' : '#888899', fontSize: '24rpx' }}>
                  {d.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.sliderSection}>
          <View className={styles.sliderHeader}>
            <Text className={styles.sliderLabel}>恐怖等级</Text>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              {renderLevelDots(horrorLevel, 3, true)}
              <Text className={styles.levelLabel}>
                {horrorLevels.find(h => h.id === horrorLevel)?.name}
              </Text>
            </View>
          </View>
          <View style={{ display: 'flex', gap: '16rpx' }}>
            {horrorLevels.map(h => (
              <View
                key={h.id}
                style={{
                  flex: 1,
                  padding: '16rpx',
                  background: horrorLevel === h.id ? 'rgba(233, 69, 96, 0.1)' : '#1a1a2e',
                  border: `1px solid ${horrorLevel === h.id ? '#e94560' : '#2a2a3e'}`,
                  borderRadius: '12rpx',
                  textAlign: 'center'
                }}
                onClick={() => setHorrorLevel(h.id)}
              >
                <Text style={{ color: horrorLevel === h.id ? '#e94560' : '#888899', fontSize: '24rpx' }}>
                  {h.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>故事主题</Text>
        <View className={styles.themeList}>
          {themes.map(theme => (
            <View
              key={theme.id}
              className={classnames(styles.themeItem, {
                [styles.selected]: selectedTheme === theme.id
              })}
              onClick={() => setSelectedTheme(theme.id)}
            >
              <Text className={styles.themeName}>{theme.name}</Text>
              <Text className={styles.themeDesc}>{theme.description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.generateButton} onClick={handleGenerate}>
          <Text className={styles.generateText}>生 成 谜 题</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default GeneratorPage
