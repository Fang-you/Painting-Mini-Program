// profile.ts
interface Artwork {
  id: string;
  imageUrl: string;
}

const STORAGE_KEY = 'AI_DRAW_USER'

type CachedUser = {
  openid?: string;
  userId?: string;
  nickName: string;
  avatarUrl: string;
}

function randomCloudPath(prefix: string) {
  const ts = Date.now()
  const rnd = Math.random().toString(16).slice(2)
  return `${prefix}/${ts}-${rnd}.png`
}

Component({
  data: {
    isLoggedIn: false,
    userInfo: {
      nickName: '',
      avatarUrl: '',
    },
    openid: '',
    userId: '',
    artworks: [] as Artwork[],
    showNicknamePopup: false,
    editingNickName: '',
    isUpdatingNickName: false,
  },

  lifetimes: {
    attached() {
      const cached = wx.getStorageSync(STORAGE_KEY) as CachedUser | ''
      if (cached && typeof cached === 'object' && cached.nickName) {
        this.setData({
          isLoggedIn: true,
          userInfo: {
            nickName: cached.nickName,
            avatarUrl: cached.avatarUrl || '',
          },
          openid: cached.openid || '',
          userId: cached.userId || '',
        })
        this.loadUserData()
      }
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

    onChooseAvatar(e: WechatMiniprogram.CustomEvent) {
      if (!this.data.isLoggedIn) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        })
        return
      }

      const avatarUrl = (e.detail && (e.detail as any).avatarUrl) ? (e.detail as any).avatarUrl : ''
      if (!avatarUrl) return

      if (!wx.cloud) {
        wx.showToast({
          title: '云开发未初始化',
          icon: 'none',
        })
        return
      }

      wx.showLoading({ title: '更新头像中...' })

      wx.cloud.uploadFile({
        cloudPath: randomCloudPath('avatars'),
        filePath: avatarUrl,
      }).then((uploadRes) => {
        return wx.cloud.callFunction({
          name: 'updateUserProfile',
          data: {
            avatarUrl: uploadRes.fileID,
          },
        }).then(() => uploadRes.fileID)
      }).then((fileID) => {
        wx.hideLoading()
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            avatarUrl: fileID,
          },
        })

        const cached = wx.getStorageSync(STORAGE_KEY) as CachedUser | ''
        if (cached && typeof cached === 'object') {
          wx.setStorageSync(STORAGE_KEY, {
            ...cached,
            avatarUrl: fileID,
          } as CachedUser)
        }

        wx.showToast({
          title: '头像已更新',
          icon: 'success',
        })
      }).catch((err: any) => {
        console.error('update avatar error', err)
        wx.hideLoading()
        wx.showToast({
          title: err?.errMsg || '更新失败',
          icon: 'none',
        })
      })
    },

    onNicknameTap() {
      if (!this.data.isLoggedIn) return
      this.setData({
        showNicknamePopup: true,
        editingNickName: this.data.userInfo.nickName || '',
      })
    },

    onNicknamePopupClose() {
      this.setData({ showNicknamePopup: false })
    },

    onNicknameInputChange(e: WechatMiniprogram.CustomEvent) {
      this.setData({ editingNickName: e.detail.value })
    },

    onNicknameCancel() {
      this.setData({ showNicknamePopup: false })
    },

    onNicknameConfirm() {
      const nickName = (this.data.editingNickName || '').trim()
      if (!nickName) {
        wx.showToast({ title: '请输入用户名', icon: 'none' })
        return
      }

      if (!wx.cloud) {
        wx.showToast({ title: '云开发未初始化', icon: 'none' })
        return
      }

      this.setData({ isUpdatingNickName: true })

      wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          nickName,
        },
      }).then(() => {
        this.setData({
          isUpdatingNickName: false,
          showNicknamePopup: false,
          userInfo: {
            ...this.data.userInfo,
            nickName,
          },
        })

        const cached = wx.getStorageSync(STORAGE_KEY) as CachedUser | ''
        if (cached && typeof cached === 'object') {
          wx.setStorageSync(STORAGE_KEY, {
            ...cached,
            nickName,
          } as CachedUser)
        }

        wx.showToast({ title: '已保存', icon: 'success' })
      }).catch((err: any) => {
        console.error('update nickname error', err)
        this.setData({ isUpdatingNickName: false })
        wx.showToast({ title: err?.errMsg || '保存失败', icon: 'none' })
      })
    },

    onWechatLogin() {
      if (!wx.cloud) {
        wx.showToast({
          title: '云开发未初始化',
          icon: 'none',
        })
        return
      }

      wx.getUserProfile({
        desc: '用于完善个人资料与管理作品',
        success: (profileRes) => {
          const userInfo = (profileRes as any).userInfo || {}
          wx.showLoading({ title: '登录中...' })

          wx.cloud.callFunction({
            name: 'login',
            data: {
              userInfo,
            },
          }).then((callRes: any) => {
            wx.hideLoading()
            const result = callRes?.result || {}
            const nickName = result?.user?.nickName || userInfo.nickName || ''
            const avatarUrl = result?.user?.avatarUrl || userInfo.avatarUrl || ''

            this.setData({
              isLoggedIn: true,
              userInfo: {
                nickName,
                avatarUrl,
              },
              openid: result?.openid || '',
              userId: result?.userId || '',
            })

            wx.setStorageSync(STORAGE_KEY, {
              openid: result?.openid || '',
              userId: result?.userId || '',
              nickName,
              avatarUrl,
            } as CachedUser)

            this.loadUserData()
            wx.showToast({
              title: result?.isNew ? '注册成功' : '登录成功',
              icon: 'success',
            })
          }).catch((err: any) => {
            console.error('cloud login error', err)
            wx.hideLoading()
            wx.showToast({
              title: err?.errMsg || '登录失败',
              icon: 'none',
            })
          })
        },
        fail: () => {
          wx.showToast({
            title: '已取消授权',
            icon: 'none',
          })
        },
      })
    },

    onSettingsTap() {
      wx.showActionSheet({
        itemList: ['退出登录'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.removeStorageSync(STORAGE_KEY)
            this.setData({
              isLoggedIn: false,
              userInfo: {
                nickName: '',
                avatarUrl: '',
              },
              openid: '',
              userId: '',
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

    onPublishFromProfile() {
      wx.navigateTo({
        url: '/pages/create/create',
      })
    },
  },
})
