// profile.ts
interface Artwork {
  id: string;
  imageUrl: string;
}

Component({
  data: {
    isLoggedIn: true,
    userInfo: {
      nickName: '李小明',
      avatarUrl: '',
    },
    artworks: [] as Artwork[],
  },

  lifetimes: {
    attached() {
      this.loadUserData()
    },
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 1 })
      }
    },
  },

  methods: {
    loadUserData() {
      // 模拟加载用户数据
      const artworks: Artwork[] = []
      for (let i = 0; i < 12; i++) {
        artworks.push({
          id: `artwork-${i}`,
          imageUrl: `https://picsum.photos/200/200?random=${20 + i}`,
        })
      }

      this.setData({ artworks })
    },

    onWechatLogin() {
      wx.showLoading({ title: '登录中...' })

      // 模拟登录
      setTimeout(() => {
        wx.hideLoading()
        this.setData({
          isLoggedIn: true,
          userInfo: {
            nickName: '李小明',
            avatarUrl: '',
          },
        })
        this.loadUserData()
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        })
      }, 1000)
    },

    onSettingsTap() {
      wx.showActionSheet({
        itemList: ['退出登录'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.setData({
              isLoggedIn: false,
              userInfo: {
                nickName: '',
                avatarUrl: '',
              },
              artworks: [],
            })
            wx.showToast({
              title: '已退出登录',
              icon: 'none',
            })
          }
        },
      })
    },

    onArtworkTap(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index
      const urls = this.data.artworks.map((item) => item.imageUrl)
      wx.previewImage({
        urls,
        current: urls[index],
      })
    },

    onCreateTap() {
      wx.navigateTo({
        url: '/pages/create/create',
      })
    },
  },
})
