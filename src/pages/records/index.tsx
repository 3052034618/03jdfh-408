import React, { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'
import dayjs from 'dayjs'

const RecordsPage: React.FC = () => {
  const { records, puzzles, reuseHistoryPuzzle, setPendingReview, setCurrentPuzzle, getRecordsByPuzzle } = usePuzzleStore()
  const [filter, setFilter] = useState<'all' | 'good' | 'normal'>('all')
  const [viewMode, setViewMode] = useState<'records' | 'puzzles'>('records')

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true
    if (filter === 'good') return r.rating >= 4
    if (filter === 'normal') return r.rating < 4
    return true
  })

  const goodRatedPuzzles = puzzles.filter(p => {
    const rs = getRecordsByPuzzle(p.id)
    return rs.length > 0 && rs.reduce((s, r) => s + r.rating, 0) / rs.length >= 4
  })

  const stats = {
    totalGames: records.length,
    avgDuration: records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + (r.duration || 0), 0) / records.length)
      : 0,
    avgRating: records.length > 0
      ? (records.reduce((sum, r) => sum + r.rating, 0) / records.length).toFixed(1)
      : '0.0',
    hintsUsed: records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.hintsUsed.length, 0) / records.length * 10) / 10
      : 0
  }

  const handleReusePuzzle = (puzzleId: string, puzzleTitle: string) => {
    Taro.showActionSheet({
      itemList: ['直接开始本场游戏', '先查看谜题详情', '仅复制配置到生成器'],
      success: (res) => {
        reuseHistoryPuzzle(puzzleId)
        setTimeout(() => {
          if (res.tapIndex === 0) {
            Taro.switchTab({ url: '/pages/prompter/index' })
          } else if (res.tapIndex === 1) {
            Taro.navigateTo({ url: '/pages/puzzle-detail/index' })
          } else {
            Taro.switchTab({ url: '/pages/generator/index' })
          }
          Taro.showToast({ title: `已复用「${puzzleTitle}」`, icon: 'none' })
        }, 100)
      }
    }).catch(() => {})
  }

  const handleOpenRecord = (record: typeof records[0]) => {
    Taro.showActionSheet({
      itemList: [
        '复用本场的谜题再开一场',
        '补充/修改复盘内容',
        `查看本场谜题（共${getRecordsByPuzzle(record.puzzleId).length}场历史）`
      ],
      success: (res) => {
        if (res.tapIndex === 0) {
          handleReusePuzzle(record.puzzleId, record.puzzleTitle)
        } else if (res.tapIndex === 1) {
          const puzzle = puzzles.find(p => p.id === record.puzzleId)
          if (puzzle) setCurrentPuzzle(puzzle)
          setPendingReview({
            puzzleId: record.puzzleId,
            puzzleTitle: record.puzzleTitle,
            duration: record.duration,
            playerCount: record.playerCount,
            hintsUsed: record.hintsUsed,
            elapsedSeconds: record.elapsedSeconds,
            fromHistory: true
          })
          Taro.navigateTo({ url: '/pages/record-form/index' })
        } else {
          const puzzle = puzzles.find(p => p.id === record.puzzleId)
          if (puzzle) {
            setCurrentPuzzle(puzzle)
            Taro.navigateTo({ url: '/pages/puzzle-detail/index' })
          } else {
            Taro.showToast({ title: '该谜题未在本地保存', icon: 'none' })
          }
        }
      }
    }).catch(() => {})
  }

  const renderStars = (rating: number) => {
    return (
      <View className={styles.recordRating}>
        {[1, 2, 3, 4, 5].map(i => (
          <Text
            key={i}
            className={classnames(styles.star, { [styles.filled]: i <= rating })}
          >
            ★
          </Text>
        ))}
      </View>
    )
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.pageHeader}>
        <Text className={styles.pageTitle}>复盘记录</Text>
        <View className={styles.headerActions}>
          <View className={styles.addBtn} onClick={() => Taro.navigateTo({ url: '/pages/record-form/index' })}>
            + 补填
          </View>
        </View>
      </View>

      <View className={styles.viewToggle}>
        <View
          className={classnames(styles.toggleItem, { [styles.active]: viewMode === 'records' })}
          onClick={() => setViewMode('records')}
        >
          历史场次 ({records.length})
        </View>
        <View
          className={classnames(styles.toggleItem, { [styles.active]: viewMode === 'puzzles' })}
          onClick={() => setViewMode('puzzles')}
        >
          好评谜题库 ({goodRatedPuzzles.length})
        </View>
      </View>

      <View className={styles.statsSection}>
        <Text className={styles.sectionTitle}>数据统计</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.totalGames}</Text>
            <Text className={styles.statLabel}>总场次</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.avgDuration}<Text style={{ fontSize: '28rpx' }}>分</Text></Text>
            <Text className={styles.statLabel}>平均用时</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.avgRating}</Text>
            <Text className={styles.statLabel}>平均评分</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.hintsUsed}</Text>
            <Text className={styles.statLabel}>平均提示</Text>
          </View>
        </View>
      </View>

      {viewMode === 'records' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>历史记录</Text>

          <View className={styles.filterBar}>
            <View
              className={classnames(styles.filterItem, { [styles.active]: filter === 'all' })}
              onClick={() => setFilter('all')}
            >
              全部
            </View>
            <View
              className={classnames(styles.filterItem, { [styles.active]: filter === 'good' })}
              onClick={() => setFilter('good')}
            >
              好评（4星+）
            </View>
            <View
              className={classnames(styles.filterItem, { [styles.active]: filter === 'normal' })}
              onClick={() => setFilter('normal')}
            >
              待改进
            </View>
          </View>

          {filteredRecords.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无复盘记录</Text>
              <Text className={styles.emptyHint}>完成一场游戏后，来这里填写复盘吧</Text>
              <View
                style={{
                  marginTop: '32rpx',
                  padding: '20rpx 40rpx',
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                  borderRadius: '48rpx',
                  color: '#0a0a0f',
                  fontWeight: 'bold'
                }}
                onClick={() => Taro.switchTab({ url: '/pages/prompter/index' })}
              >
                去开一场游戏
              </View>
            </View>
          ) : (
            <View className={styles.recordList}>
              {filteredRecords.map(record => (
                <View
                  key={record.id}
                  className={styles.recordCard}
                  onClick={() => handleOpenRecord(record)}
                >
                  <View className={styles.recordHeader}>
                    <Text className={styles.recordTitle}>{record.puzzleTitle}</Text>
                    {renderStars(record.rating)}
                  </View>

                  <View className={styles.recordMeta}>
                    <View className={styles.metaItem}>
                      <Text className={styles.metaLabel}>用时：</Text>
                      <Text className={styles.metaValue}>{record.duration}分钟</Text>
                    </View>
                    <View className={styles.metaItem}>
                      <Text className={styles.metaLabel}>人数：</Text>
                      <Text className={styles.metaValue}>{record.playerCount}人</Text>
                    </View>
                    <View className={styles.metaItem}>
                      <Text className={styles.metaLabel}>提示：</Text>
                      <View className={styles.hintsUsed}>
                        {[1, 2, 3].map(level => (
                          <View
                            key={level}
                            className={classnames(styles.hintBadge, {
                              [styles.used]: record.hintsUsed.includes(level)
                            })}
                          >
                            {level}
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View className={styles.recordPreview}>
                    <Text className={styles.previewLabel}>💡 误解点：</Text>
                    <Text className={styles.previewText}>{record.mostMisunderstood}</Text>
                  </View>

                  {record.horrorReactions.length > 0 && (
                    <View className={styles.recordPreview}>
                      <Text className={styles.previewLabel}>👻 反应：</Text>
                      <Text className={styles.previewText}>
                        {record.horrorReactions.join('、')}
                      </Text>
                    </View>
                  )}

                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16rpx' }}>
                    <Text className={styles.recordDate}>
                      {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                    <View className={styles.cardAction}>
                      查看详情 ›
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {viewMode === 'puzzles' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>好评谜题库（可直接复用）</Text>
          {goodRatedPuzzles.length === 0 ? (
            <RadioCard subtitle="等有了几场4星+的复盘记录后，这里会自动收集优秀谜题供复用">
              <View style={{ textAlign: 'center', padding: '40rpx 0' }}>
                <Text style={{ fontSize: '64rpx', marginBottom: '16rpx' }}>🧪</Text>
                <Text style={{ color: '#888899', fontSize: '26rpx' }}>
                  还没有收集到好评谜题
                </Text>
                <Text style={{ color: '#555566', fontSize: '24rpx', marginTop: '8rpx', display: 'block' }}>
                  等谜题获得4星以上评分后会自动出现在这里
                </Text>
              </View>
            </RadioCard>
          ) : (
            <View className={styles.recordList}>
              {goodRatedPuzzles.map(puzzle => {
                const rs = getRecordsByPuzzle(puzzle.id)
                const avgR = rs.length > 0 ? (rs.reduce((s, r) => s + r.rating, 0) / rs.length).toFixed(1) : '0'
                return (
                  <View
                    key={puzzle.id}
                    className={styles.recordCard}
                    onClick={() => handleReusePuzzle(puzzle.id, puzzle.title)}
                  >
                    <View className={styles.recordHeader}>
                      <View>
                        <Text className={styles.recordTitle}>{puzzle.title}</Text>
                        <Text style={{ fontSize: '22rpx', color: '#555566', marginTop: '4rpx' }}>
                          {puzzle.theme} · 难度{'★'.repeat(puzzle.difficulty)}
                        </Text>
                      </View>
                      <View style={{ textAlign: 'right' }}>
                        <Text style={{ fontSize: '32rpx', color: '#ffaa00', fontWeight: 'bold' }}>⭐ {avgR}</Text>
                        <Text style={{ fontSize: '22rpx', color: '#555566' }}>{rs.length}场</Text>
                      </View>
                    </View>
                    <View className={styles.recordMeta}>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>道具：</Text>
                        <Text className={styles.metaValue}>{puzzle.props.length}个</Text>
                      </View>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>预计：</Text>
                        <Text className={styles.metaValue}>{puzzle.estimatedTime}分钟</Text>
                      </View>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaLabel}>提示卡：</Text>
                        <Text className={styles.metaValue}>{puzzle.playerCards.length}张</Text>
                      </View>
                    </View>
                    <View style={{ textAlign: 'right', marginTop: '16rpx' }}>
                      <Text style={{ color: '#00ff88', fontSize: '26rpx', fontWeight: '500' }}>
                        点击复用本场 ›
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

export default RecordsPage
