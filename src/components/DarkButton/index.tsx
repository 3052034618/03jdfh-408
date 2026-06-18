import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface DarkButtonProps {
  text: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  block?: boolean
  glow?: boolean
}

const DarkButton: React.FC<DarkButtonProps> = ({
  text,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  block = false,
  glow = false
}) => {
  return (
    <Button
      className={classnames(
        styles.darkButton,
        styles[variant],
        styles[size],
        {
          [styles.block]: block,
          [styles.disabled]: disabled,
          [styles.glow]: glow
        }
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Text className={styles.buttonText}>{text}</Text>
    </Button>
  )
}

export default DarkButton
