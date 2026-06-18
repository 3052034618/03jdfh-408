import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface RadioCardProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  glow?: boolean
}

const RadioCard: React.FC<RadioCardProps> = ({
  title,
  subtitle,
  children,
  className,
  onClick,
  glow = false
}) => {
  return (
    <View
      className={classnames(styles.radioCard, className, {
        [styles.glow]: glow,
        [styles.clickable]: onClick
      })}
      onClick={onClick}
    >
      <View className={styles.cardHeader}>
        <View className={styles.radioIndicator}>
          <View className={styles.indicatorLight}></View>
          <View className={styles.indicatorText}>FM</View>
        </View>
        {title && <Text className={styles.cardTitle}>{title}</Text>}
      </View>
      {subtitle && <Text className={styles.cardSubtitle}>{subtitle}</Text>}
      <View className={styles.cardContent}>{children}</View>
      <View className={styles.cardFooter}>
        <View className={styles.staticLine}></View>
      </View>
    </View>
  )
}

export default RadioCard
