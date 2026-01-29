// profile.ts
export {}

interface Artwork {
  id: string;
  imageUrl: string;
  likeCount: number;
  index: number;
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
    leftColumn: [] as Artwork[],
    rightColumn: [] as Artwork[],
    lastRefresh: 0,
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
        this.loadUserArtworks()
      }
    },
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 1 })
      }

      if (!this.data.isLoggedIn) return
      const refresh = wx.getStorageSync('ARTWORKS_REFRESH') || 0
      if (refresh && refresh !== this.data.lastRefresh) {
        this.setData({ lastRefresh: refresh })
      }

      this.loadUserArtworks()
    },
  },

  methods: {
    loadUserArtworks() {
      if (!this.data.isLoggedIn) {
        this.setData({ artworks: [], leftColumn: [], rightColumn: [] })
        return
      }
      if (!wx.cloud) {
        wx.showToast({ title: '云开发未初始化', icon: 'none' })
        return
      }

      wx.cloud.callFunction({
        name: 'artworks',
        data: {
          action: 'listUser',
          page: 1,
          pageSize: 50,
        },
      }).then((res: any) => {
        const result = res?.result || {}
        const list = (result.list || []) as any[]
        const artworks: Artwork[] = list.map((item, index) => ({
          id: item._id,
          imageUrl: item.imageUrl,
          likeCount: Number(item.likeCount || 0),
          index,
        }))

        const leftColumn: Artwork[] = []
        const rightColumn: Artwork[] = []
        artworks.forEach((item, i) => {
          if (i % 2 === 0) {
            leftColumn.push(item)
          } else {
            rightColumn.push(item)
          }
        })

        this.setData({ artworks, leftColumn, rightColumn })
      }).catch((err: any) => {
        console.error('load user artworks error', err)
        wx.showToast({ title: err?.errMsg || '加载失败', icon: 'none' })
      })
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

            this.loadUserArtworks()
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
      const artwork = this.data.artworks[index]
      if (!artwork) return

      wx.showActionSheet({
        itemList: ['预览图片', '删除画作'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 预览图片
            const urls = this.data.artworks.map((item) => item.imageUrl)
            wx.previewImage({
              urls,
              current: urls[index],
            })
          } else if (res.tapIndex === 1) {
            // 删除画作
            this.deleteArtwork(artwork.id, index)
          }
        },
      })
    },

    deleteArtwork(artworkId: string, index: number) {
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定要删除这幅画作吗？',
        confirmColor: '#e74c3c',
        success: (res) => {
          if (!res.confirm) return

          if (!wx.cloud) {
            wx.showToast({ title: '云开发未初始化', icon: 'none' })
            return
          }

          wx.showLoading({ title: '删除中...' })

          wx.cloud.callFunction({
            name: 'artworks',
            data: {
              action: 'delete',
              artworkId,
            },
          }).then((callRes: any) => {
            wx.hideLoading()
            const result = callRes?.result || {}
            if (!result.ok) {
              wx.showToast({ title: result.errMsg || '删除失败', icon: 'none' })
              return
            }

            // 从本地列表移除
            const artworks = this.data.artworks.filter((_, i) => i !== index)
            const leftColumn: Artwork[] = []
            const rightColumn: Artwork[] = []
            artworks.forEach((item, i) => {
              const newItem = { ...item, index: i }
              if (i % 2 === 0) {
                leftColumn.push(newItem)
              } else {
                rightColumn.push(newItem)
              }
            })

            this.setData({ artworks, leftColumn, rightColumn })

            // 设置刷新标记，让首页也刷新
            wx.setStorageSync('ARTWORKS_REFRESH', Date.now())

            wx.showToast({ title: '已删除', icon: 'success' })
          }).catch((err: any) => {
            console.error('delete artwork error', err)
            wx.hideLoading()
            wx.showToast({ title: err?.errMsg || '删除失败', icon: 'none' })
          })
        },
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
