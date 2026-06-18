import React, { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import RadioCard from '@/components/RadioCard'
import styles from './index.module.scss'
import dayjs from 'dayjs'

const RecordsPage: React.FC = () => {
  const { records } = usePuzzleStore()
  const [filter, setFilter] = useState<'all' | 'good' | 'normal'>('all')

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true
    if (filter === 'good') return r.rating >= 4
    if (filter === 'normal') return r.rating < 4
    return true
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

  const handleRecordClick = (recordId: string) => {
    Taro.showToast({
      title: '详情功能开发中',
      icon: 'none'
    })
  }

  const handleAddRecord = () => {
    Taro.navigateTo({
      url: '/pages/record-form/index'
    })
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
        <View className={styles.addBtn} onClick={handleAddRecord}>
          + 新增
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
            <Text className={styles.statLabel}>平均提示次数</Text>
          </View>
        </View>
      </View>

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
          </View>
        ) : (
          <View className={styles.recordList}>
            {filteredRecords.map(record => (
              <View
                key={record.id}
                className={styles.recordCard}
                onClick={() => handleRecordClick(record.id)}
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
                  <Text className={styles.previewLabel}>最常误解：</Text>
                  <Text className={styles.previewText}>{record.mostMisunderstood}</Text>
                </View>

                {record.horrorReactions.length > 0 && (
                  <View className={styles.recordPreview}>
                    <Text className={styles.previewLabel}>恐怖反应：</Text>
                    <Text className={styles.previewText}>
                      {record.horrorReactions.join('、')}
                    </Text>
                  </View>
                )}

                <Text className={styles.recordDate}>
                  {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default RecordsPage
