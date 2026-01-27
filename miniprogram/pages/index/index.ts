// index.ts
const avatarColors = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
]

const authorNames = ['小明', '艺术家', '创意达人', '画画爱好者', '梦想家', '设计师小王', 'AI大师', '灵感捕手']

interface ArtworkItem {
  id: string;
  imageUrl: string;
  authorName: string;
  avatarColor: string;
  likeCount: number;
}

Component({
  data: {
    leftColumn: [] as ArtworkItem[],
    rightColumn: [] as ArtworkItem[],
    isLoading: false,
    page: 1,
  },

  lifetimes: {
    attached() {
      this.loadArtworks()
    },
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 0 })
      }
    },
  },

  methods: {
    loadArtworks() {
      const { page, leftColumn, rightColumn } = this.data
      this.setData({ isLoading: true })

      // 模拟加载数据
      setTimeout(() => {
        const newItems: ArtworkItem[] = []
        for (let i = 0; i < 6; i++) {
          const id = `${page}-${i}`
          newItems.push({
            id,
            imageUrl: `https://picsum.photos/300/${280 + Math.floor(Math.random() * 120)}?random=${page}${i}`,
            authorName: authorNames[Math.floor(Math.random() * authorNames.length)],
            avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
            likeCount: Math.floor(Math.random() * 500) + 10,
          })
        }

        // 分配到左右两列
        const newLeft = [...leftColumn]
        const newRight = [...rightColumn]
        newItems.forEach((item, index) => {
          if (index % 2 === 0) {
            newLeft.push(item)
          } else {
            newRight.push(item)
          }
        })

        this.setData({
          leftColumn: newLeft,
          rightColumn: newRight,
          isLoading: false,
          page: page + 1,
        })
      }, 500)
    },

    onLoadMore() {
      if (!this.data.isLoading) {
        this.loadArtworks()
      }
    },

    onCardTap(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id
      console.log('点击画作:', id)
    },

    onCreateTap() {
      wx.navigateTo({
        url: '/pages/create/create',
      })
    },
  },
})
