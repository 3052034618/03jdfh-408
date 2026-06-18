import React from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePuzzleStore } from '@/store/puzzleStore'
import { propList, propCategories } from '@/data/props'
import styles from './index.module.scss'

const MinePage: React.FC = () => {
  const { records, puzzles } = usePuzzleStore()

  const stats = {
    totalGames: records.length,
    totalPuzzles: puzzles.length,
    totalProps: propList.length
  }

  const handleMenuItemClick = (type: string) => {
    switch (type) {
      case 'props':
        Taro.showToast({ title: '道具库管理开发中', icon: 'none' })
        break
      case 'preferences':
        Taro.showToast({ title: '偏好设置开发中', icon: 'none' })
        break
      case 'history':
        Taro.switchTab({ url: '/pages/records/index' })
        break
      case 'feedback':
        Taro.showToast({ title: '意见反馈开发中', icon: 'none' })
        break
      case 'about':
        Taro.showToast({ title: '关于我们开发中', icon: 'none' })
        break
      default:
        break
    }
  }

  const renderPropTags = () => {
    const displayedProps = propList.slice(0, 6)
    return (
      <View className={styles.propPreview}>
        {displayedProps.map(prop => (
          <Text key={prop.id} className={styles.propTag}>{prop.name}</Text>
        ))}
        <Text className={styles.propTag}>+{propList.length - 6}个</Text>
      </View>
    )
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View className={styles.shopInfo}>
          <View className={styles.shopAvatar}>📻</View>
          <View className={styles.shopDetails}>
            <Text className={styles.shopName}>阴间电台密室</Text>
            <Text className={styles.shopDesc}>恐怖主题 · 专业DM团队</Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{stats.totalGames}</Text>
            <Text className={styles.statLabel}>总场次</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{stats.totalPuzzles}</Text>
            <Text className={styles.statLabel}>谜题库</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{stats.totalProps}</Text>
            <Text className={styles.statLabel}>道具数</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuSection}>
        <Text className={styles.sectionTitle}>密室管理</Text>
        <View className={styles.menuList}>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('props')}>
            <View className={styles.menuIcon}>🎭</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>道具库管理</Text>
              {renderPropTags()}
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View className={styles.menuItem} onClick={() => handleMenuItemClick('preferences')}>
            <View className={styles.menuIcon}>⚙️</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>偏好设置</Text>
              <Text className={styles.menuSubtitle}>默认难度、恐怖等级等</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View className={styles.menuItem} onClick={() => handleMenuItemClick('history')}>
            <View className={styles.menuIcon}>📊</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>数据统计</Text>
              <Text className={styles.menuSubtitle}>查看详细数据分析</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuSection}>
        <Text className={styles.sectionTitle}>其他</Text>
        <View className={styles.menuList}>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('feedback')}>
            <View className={styles.menuIcon}>💬</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>意见反馈</Text>
              <Text className={styles.menuSubtitle}>告诉我们你的想法</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View className={styles.menuItem} onClick={() => handleMenuItemClick('about')}>
            <View className={styles.menuIcon}>ℹ️</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>关于阴间电台</Text>
              <Text className={styles.menuSubtitle}>版本信息、帮助</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      <View className={styles.aboutSection}>
        <Text className={styles.version}>Version 1.0.0</Text>
        <Text className={styles.copyright}>© 2024 阴间电台 · 恐怖密室谜题生成器</Text>
      </View>
    </ScrollView>
  )
}

export default MinePage
