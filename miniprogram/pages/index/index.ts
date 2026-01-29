// index.ts
export {}

interface ArtworkItem {
  id: string;
  imageUrl: string;
  authorName: string;
  avatarUrl: string;
  likeCount: number;
  prompt: string;
}

Component({
  data: {
    artworks: [] as ArtworkItem[],
    isLoading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    hasArtworks: false,
    lastRefresh: 0,
    showDetailPopup: false,
    detailArtwork: {} as ArtworkItem,
  },

  lifetimes: {
    attached() {
      this.loadArtworks(true)
    },
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 0 })
      }

      const refresh = wx.getStorageSync('ARTWORKS_REFRESH') || 0
      if (refresh && refresh !== this.data.lastRefresh) {
        this.setData({ lastRefresh: refresh })
        this.loadArtworks(true)
      }
    },
  },

  methods: {
    loadArtworks(reset = false) {
      if (!wx.cloud) {
        this.setData({ isLoading: false, hasMore: false, hasArtworks: false, artworks: [] })
        return
      }

      const { page, pageSize, artworks } = this.data
      const currentPage = reset ? 1 : page

      this.setData({ isLoading: true })

      wx.cloud.callFunction({
        name: 'artworks',
        data: {
          action: 'list',
          page: currentPage,
          pageSize,
        },
      }).then((res: any) => {
        const result = res?.result || {}
        const list = (result.list || []) as any[]

        const mapped: ArtworkItem[] = list.map((item) => ({
          id: item._id,
          imageUrl: item.imageUrl,
          authorName: item.authorName || '匿名用户',
          avatarUrl: item.authorAvatarUrl || '',
          likeCount: Number(item.likeCount || 0),
          prompt: item.prompt || '',
        }))

        const nextArtworks = reset ? mapped : [...artworks, ...mapped]
        const total = nextArtworks.length

        this.setData({
          artworks: nextArtworks,
          isLoading: false,
          page: currentPage + 1,
          hasMore: !!result.hasMore,
          hasArtworks: total > 0,
        })
      }).catch((err: any) => {
        console.error('load artworks error', err)
        this.setData({ isLoading: false })
        wx.showToast({
          title: err?.errMsg || '加载失败',
          icon: 'none',
        })
      })
    },

    onLoadMore() {
      if (!this.data.isLoading && this.data.hasMore) {
        this.loadArtworks(false)
      }
    },

    onCardTap(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id
      const artwork = this.data.artworks.find((item) => item.id === id)
      if (artwork) {
        this.setData({
          showDetailPopup: true,
          detailArtwork: artwork,
        })
      }
    },

    onDetailPopupClose() {
      this.setData({ showDetailPopup: false })
    },

    onPreviewDetailImage() {
      const { detailArtwork } = this.data
      if (detailArtwork.imageUrl) {
        wx.previewImage({
          urls: [detailArtwork.imageUrl],
          current: detailArtwork.imageUrl,
        })
      }
    },

    onCreateTap() {
      wx.navigateTo({
        url: '/pages/create/create',
      })
    },
  },
})
