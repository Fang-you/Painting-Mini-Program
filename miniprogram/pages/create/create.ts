// create.ts
Component({
  data: {
    prompt: '',
    isGenerating: false,
    generatedImage: '',
    generatedPrompt: '',
  },

  methods: {
    onPromptChange(e: WechatMiniprogram.CustomEvent) {
      this.setData({
        prompt: e.detail.value,
      })
    },

    onGenerate() {
      const { prompt } = this.data
      if (!prompt) {
        wx.showToast({
          title: '请输入提示词',
          icon: 'none',
        })
        return
      }

      this.setData({ isGenerating: true })

      // 模拟AI生成图片
      setTimeout(() => {
        const randomId = Math.floor(Math.random() * 1000)
        this.setData({
          isGenerating: false,
          generatedImage: `https://picsum.photos/400/400?random=${randomId}`,
          generatedPrompt: prompt,
        })
      }, 2000)
    },

    onPreviewImage() {
      const { generatedImage } = this.data
      if (generatedImage) {
        wx.previewImage({
          urls: [generatedImage],
          current: generatedImage,
        })
      }
    },

    onPublish() {
      wx.showLoading({ title: '发布中...' })

      // 模拟发布
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '发布成功',
          icon: 'success',
        })

        // 返回首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index',
          })
        }, 1500)
      }, 1000)
    },
  },
})
