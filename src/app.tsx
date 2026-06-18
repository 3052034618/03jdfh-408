import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { usePuzzleStore } from '@/store/puzzleStore';
import './app.scss';

function App(props) {
  const initFromStorage = usePuzzleStore(state => state.initFromStorage);

  useEffect(() => {
    initFromStorage();
    console.log('[App] 阴间电台初始化完成');
  }, [initFromStorage]);

  useDidShow(() => {
    console.log('[App] 小程序回到前台');
  });

  useDidHide(() => {
    console.log('[App] 小程序退到后台');
  });

  return props.children;
}

export default App;
