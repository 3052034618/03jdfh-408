export default defineAppConfig({
  pages: [
    'pages/generator/index',
    'pages/prompter/index',
    'pages/records/index',
    'pages/mine/index',
    'pages/puzzle-detail/index',
    'pages/record-form/index',
    'pages/puzzle-reuse/index',
    'pages/risk-preview/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#0a0a0f',
    navigationBarTitleText: '阴间电台',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0a0a0f'
  },
  tabBar: {
    color: '#555566',
    selectedColor: '#00ff88',
    backgroundColor: '#0a0a0f',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/generator/index',
        text: '生成器'
      },
      {
        pagePath: 'pages/prompter/index',
        text: '提示台'
      },
      {
        pagePath: 'pages/records/index',
        text: '复盘'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
