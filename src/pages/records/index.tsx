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
  const [viewMode, setViewMode] = useState<'records' | 'puzzles' | 'aggregated'>('records')
  const [expandedAggId, setExpandedAggId] = useState<string | null>(null)

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

  const aggregatedStats = (() => {
    const byPuzzle: Record<string, typeof records> = {}
    records.forEach(r => {
      if (!byPuzzle[r.puzzleId]) byPuzzle[r.puzzleId] = []
      byPuzzle[r.puzzleId].push(r)
    })

    return Object.entries(byPuzzle).map(([pid, rs]) => {
      const total = rs.length
      const avgR = rs.reduce((s, r) => s + r.rating, 0) / total
      const avgD = rs.reduce((s, r) => s + (r.duration || 30), 0) / total

      const misunderstandCounter: Record<string, number> = {}
      const reactionCounter: Record<string, number> = {}
      const hintCounter: Record<number, number> = { 1: 0, 2: 0, 3: 0 }

      rs.forEach(r => {
        if (r.mostMisunderstood && r.mostMisunderstood !== '无') {
          r.mostMisunderstood.split(/[；;，,。\n]/).forEach(phrase => {
            const p = phrase.trim()
            if (p) misunderstandCounter[p] = (misunderstandCounter[p] || 0) + 1
          })
        }
        r.horrorReactions.forEach(rea => {
          reactionCounter[rea] = (reactionCounter[rea] || 0) + 1
        })
        r.hintsUsed.forEach(lv => { hintCounter[lv] = (hintCounter[lv] || 0) + 1 })
      })

      const topMisunderstood = Object.entries(misunderstandCounter)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
      const topReactions = Object.entries(reactionCounter)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)

      let verdict: 'recommend' | 'warning' | 'normal' = 'normal'
      if (avgR >= 4 && total >= 2) verdict = 'recommend'
      else if (avgR <= 2.5 || total >= 3 && avgR <= 2.8) verdict = 'warning'

      return {
        puzzleId: pid,
        puzzle: puzzles.find(p => p.id === pid),
        total,
        avgRating: avgR,
        avgDuration: Math.round(avgD),
        topMisunderstood,
        topReactions,
        hintCounter,
        verdict
      }
    }).sort((a, b) => b.total - a.total)
  })()

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
      itemList: [
        '确认道具后复开（推荐）',
        '直接开始（用原配置）',
        '查看谜题详情',
        '仅复制配置到生成器'
      ],
      success: (res) => {
        if (res.tapIndex === 0) {
          Taro.navigateTo({ url: `/pages/puzzle-reuse/index?puzzleId=${puzzleId}` })
          return
        }
        reuseHistoryPuzzle(puzzleId)
        setTimeout(() => {
          if (res.tapIndex === 1) {
            Taro.switchTab({ url: '/pages/prompter/index' })
          } else if (res.tapIndex === 2) {
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
          className={classnames(styles.toggleItem, { [styles.active]: viewMode === 'aggregated' })}
          onClick={() => setViewMode('aggregated')}
        >
          按谜题聚合 ({aggregatedStats.length})
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

      {viewMode === 'aggregated' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>按谜题聚合分析（多场数据合并）</Text>
          {aggregatedStats.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📊</Text>
              <Text className={styles.emptyText}>还没有聚合数据</Text>
              <Text className={styles.emptyHint}>等有多场复盘记录后可以在这里对比各谜题表现</Text>
            </View>
          ) : (
            <View className={styles.recordList}>
              {aggregatedStats.map(agg => {
                const isOpen = expandedAggId === agg.puzzleId
                const hintTotal = agg.hintCounter[1] + agg.hintCounter[2] + agg.hintCounter[3]
                return (
                  <View
                    key={agg.puzzleId}
                    className={classnames(styles.recordCard, {
                      [styles.cardRecommend]: agg.verdict === 'recommend',
                      [styles.cardWarning]: agg.verdict === 'warning'
                    })}
                  >
                    <View
                      onClick={() => setExpandedAggId(isOpen ? null : agg.puzzleId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <View className={styles.recordHeader}>
                        <View style={{ flex: 1 }}>
                          <Text className={styles.recordTitle}>
                            {agg.puzzle?.title || '（谜题数据未保存）'}
                          </Text>
                          <Text style={{ fontSize: '22rpx', color: '#555566', marginTop: '4rpx' }}>
                            {agg.puzzle?.theme || '未知主题'} · 共 {agg.total} 场
                          </Text>
                        </View>
                        <View style={{ textAlign: 'right', minWidth: 100 }}>
                          <Text
                            style={{
                              fontSize: '32rpx',
                              fontWeight: 'bold',
                              color: agg.avgRating >= 4 ? '#00ff88' : agg.avgRating <= 2.5 ? '#e94560' : '#ffaa00'
                            }}
                          >
                            ⭐ {agg.avgRating.toFixed(1)}
                          </Text>
                          <Text style={{ fontSize: '20rpx', color: '#555566', display: 'block' }}>
                            {agg.verdict === 'recommend' && '✅ 强烈推荐'}
                            {agg.verdict === 'warning' && '⚠️ 建议优化'}
                            {agg.verdict === 'normal' && '— 表现中等'}
                          </Text>
                        </View>
                      </View>

                      <View className={styles.recordMeta}>
                        <View className={styles.metaItem}>
                          <Text className={styles.metaLabel}>平均用时：</Text>
                          <Text className={styles.metaValue}>{agg.avgDuration}分钟</Text>
                        </View>
                        <View className={styles.metaItem}>
                          <Text className={styles.metaLabel}>总场次：</Text>
                          <Text className={styles.metaValue}>{agg.total}场</Text>
                        </View>
                        <View className={styles.metaItem}>
                          <Text className={styles.metaLabel}>总提示：</Text>
                          <Text className={styles.metaValue}>
                            {hintTotal}次 / 场均{(hintTotal / Math.max(1, agg.total)).toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ textAlign: 'right', marginTop: '8rpx' }}>
                        <Text style={{ color: '#00ff88', fontSize: '24rpx' }}>
                          {isOpen ? '收起详情 ▲' : '展开分析详情 ▼'}
                        </Text>
                      </View>
                    </View>

                    {isOpen && (
                      <View style={{
                        marginTop: '24rpx',
                        paddingTop: '24rpx',
                        borderTop: '1px dashed rgba(255,255,255,0.08)'
                      }}>
                        {agg.topMisunderstood.length > 0 && (
                          <View style={{ marginBottom: 24 }}>
                            <Text style={{
                              fontSize: 26,
                              color: '#e0e0e0',
                              fontWeight: 'bold',
                              marginBottom: 12,
                              display: 'block'
                            }}>🔍 高频误解（{agg.topMisunderstood.reduce((s, m) => s + m[1], 0)}次）</Text>
                            <View style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {agg.topMisunderstood.map(([phrase, count]) => (
                                <View key={phrase} style={{
                                  padding: '8rpx 16rpx',
                                  background: 'rgba(233, 69, 96, 0.1)',
                                  border: '1px solid rgba(233, 69, 96, 0.3)',
                                  borderRadius: 16,
                                  fontSize: 22,
                                  color: '#ff9aab'
                                }}>
                                  ×{count} {phrase}
                                </View>
                              ))}
                            </View>
                            <Text style={{ fontSize: 20, color: '#555566', marginTop: 8, display: 'block' }}>
                              下次生成会自动避开或改写以上表达
                            </Text>
                          </View>
                        )}

                        {agg.topReactions.length > 0 && (
                          <View style={{ marginBottom: 24 }}>
                            <Text style={{
                              fontSize: 26,
                              color: '#e0e0e0',
                              fontWeight: 'bold',
                              marginBottom: 12,
                              display: 'block'
                            }}>👻 恐怖反应分布（{agg.topReactions.reduce((s, r) => s + r[1], 0)}次）</Text>
                            <View style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {agg.topReactions.map(([rea, count]) => {
                                const weakList = ['笑场', '快速解谜', '无恐怖反应', '玩家觉得不吓人', '主动催进度', '闲聊摆烂', '恐怖场景笑场', '吐槽机关低级']
                                const isWeak = weakList.includes(rea)
                                return (
                                  <View key={rea} style={{
                                    padding: '8rpx 16rpx',
                                    background: isWeak ? 'rgba(255, 159, 67, 0.1)' : 'rgba(0, 255, 136, 0.08)',
                                    border: `1px solid ${isWeak ? 'rgba(255,159,67,0.35)' : 'rgba(0,255,136,0.3)'}`,
                                    borderRadius: 16,
                                    fontSize: 22,
                                    color: isWeak ? '#ff9f43' : '#00ff88'
                                  }}>
                                    {isWeak ? '⚠️' : '💀'} ×{count} {rea}
                                  </View>
                                )
                              })}
                            </View>
                          </View>
                        )}

                        {hintTotal > 0 && (
                          <View style={{ marginBottom: 24 }}>
                            <Text style={{
                              fontSize: 26,
                              color: '#e0e0e0',
                              fontWeight: 'bold',
                              marginBottom: 12,
                              display: 'block'
                            }}>💡 各级提示使用情况</Text>
                            <View style={{ display: 'flex', gap: 16 }}>
                              {[1, 2, 3].map(level => {
                                const c = agg.hintCounter[level] || 0
                                const pct = Math.round(c / Math.max(1, agg.total) * 100)
                                const labels = ['一级杂音', '二级关键词', '三级直接指向']
                                return (
                                  <View key={level} style={{
                                    flex: 1,
                                    padding: 16,
                                    background: '#1a1a2e',
                                    borderRadius: 12,
                                    border: `1px solid ${c > 0 ? 'rgba(0,255,136,0.3)' : '#2a2a3e'}`
                                  }}>
                                    <Text style={{
                                      fontSize: 28,
                                      fontWeight: 'bold',
                                      color: c > 0 ? '#00ff88' : '#555566',
                                      display: 'block',
                                      textAlign: 'center'
                                    }}>{c}次</Text>
                                    <Text style={{
                                      fontSize: 20,
                                      color: '#888899',
                                      display: 'block',
                                      textAlign: 'center',
                                      marginTop: 4
                                    }}>{labels[level - 1]}</Text>
                                    <Text style={{
                                      fontSize: 20,
                                      color: c >= agg.total ? '#e94560' : '#555566',
                                      display: 'block',
                                      textAlign: 'center',
                                      marginTop: 4
                                    }}>{pct}%场次使用</Text>
                                  </View>
                                )
                              })}
                            </View>
                          </View>
                        )}

                        <View style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                          <View style={{
                            flex: 1,
                            padding: '16rpx 24rpx',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                            borderRadius: 12,
                            color: '#0a0a0f',
                            fontWeight: 'bold',
                            fontSize: 24
                          }} onClick={() => {
                            Taro.navigateTo({ url: `/pages/puzzle-reuse/index?puzzleId=${agg.puzzleId}` })
                          }}>
                            确认道具后复开
                          </View>
                          {agg.puzzle && (
                            <View style={{
                              flex: 1,
                              padding: '16rpx 24rpx',
                              textAlign: 'center',
                              background: 'rgba(233,69,96,0.1)',
                              border: '1px solid rgba(233,69,96,0.3)',
                              borderRadius: 12,
                              color: '#e94560',
                              fontWeight: 'bold',
                              fontSize: 24
                            }} onClick={() => {
                              if (agg.puzzle) setCurrentPuzzle(agg.puzzle)
                              Taro.navigateTo({ url: '/pages/puzzle-detail/index' })
                            }}>
                              查看谜题详情
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
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
