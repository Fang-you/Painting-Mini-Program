// custom-tab-bar/index.ts
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: 'home',
        selectedIcon: 'home',
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: 'user',
        selectedIcon: 'user',
      },
    ],
  },

  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const data = e.currentTarget.dataset
      const url = data.path

      wx.switchTab({ url })
    },
  },
})
