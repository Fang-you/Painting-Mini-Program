// create.ts
export {}

interface StyleTag {
  label: string;
  value: string;
  selected: boolean;
}

function buildFullPrompt(prompt: string, styles: string[]) {
  const cleanPrompt = (prompt || '').trim()
  if (!cleanPrompt) return ''
  if (!styles || styles.length === 0) return cleanPrompt
  return `${cleanPrompt}，风格：${styles.join('，')}`
}

Component({
  lifetimes: {
    detached() {
      const self = this as any
      if (typeof self._clearPollTimer === 'function') {
        self._clearPollTimer()
      }
    },
  },

  pageLifetimes: {
    hide() {
      const self = this as any
      if (typeof self._clearPollTimer === 'function') {
        self._clearPollTimer()
      }
    },
  },

  data: {
    prompt: '',
    isGenerating: false,
    generatedImage: '',
    generatedPrompt: '',
    taskId: '',
    taskStatus: '',
    styleTags: [
      { label: '机械风', value: 'mechanical', selected: false },
      { label: '未来风', value: 'futuristic', selected: false },
      { label: '动漫风', value: 'anime', selected: false },
      { label: '水彩风', value: 'watercolor', selected: false },
      { label: '油画风', value: 'oil_painting', selected: false },
      { label: '赛博朋克', value: 'cyberpunk', selected: false },
      { label: '写实风', value: 'realistic', selected: false },
      { label: '像素风', value: 'pixel', selected: false },
    ] as StyleTag[],
    selectedStyles: [] as string[],
  },

  methods: {
    _clearPollTimer() {
      const self = this as any
      if (self._pollTimer) {
        clearTimeout(self._pollTimer)
        self._pollTimer = null
      }
    },

    _pollTask(taskId: string) {
      if (!wx.cloud) {
        this.setData({ isGenerating: false })
        wx.showToast({ title: '云开发未初始化', icon: 'none' })
        return
      }

      wx.cloud.callFunction({
        name: 'wanx',
        data: {
          name: 'get',
          taskId,
        },
      }).then((res: any) => {
        const result = res?.result || {}
        if (!result.ok) {
          this.setData({ isGenerating: false })
          wx.showToast({ title: result.errMsg || '查询失败', icon: 'none' })
          return
        }

        const status = result.taskStatus || ''
        const imageUrl = result.imageUrl || ''
        const actualPrompt = result.actualPrompt || ''
        this.setData({ taskStatus: status })

        if (status === 'SUCCEEDED' && imageUrl) {
          this._clearPollTimer()
          this.setData({
            isGenerating: false,
            generatedImage: imageUrl,
            generatedPrompt: actualPrompt || this.data.generatedPrompt,
          })
          return
        }

        if (status === 'FAILED' || status === 'CANCELED') {
          this._clearPollTimer()
          this.setData({ isGenerating: false })
          wx.showToast({ title: '生成失败，请重试', icon: 'none' })
          return
        }

        const self = this as any
        self._pollTimer = setTimeout(() => {
          this._pollTask(taskId)
        }, 3000)
      }).catch((err: any) => {
        console.error('poll task error', err)
        this._clearPollTimer()
        this.setData({ isGenerating: false })
        wx.showToast({ title: err?.errMsg || err?.message || '查询失败', icon: 'none' })
      })
    },

    onStyleTagTap(e: WechatMiniprogram.TouchEvent) {
      const value = e.currentTarget.dataset.value as string
      const styleTags = this.data.styleTags.map((tag) => ({
        ...tag,
        selected: tag.value === value ? !tag.selected : tag.selected,
      }))
      const selectedStyles = styleTags.filter((tag) => tag.selected).map((tag) => tag.label)
      this.setData({ styleTags, selectedStyles })
    },

    onPromptChange(e: WechatMiniprogram.CustomEvent) {
      this.setData({
        prompt: e.detail.value,
      })
    },

    onGenerate() {
      const { prompt, selectedStyles } = this.data
      const fullPrompt = buildFullPrompt(prompt, selectedStyles)
      if (!fullPrompt) {
        wx.showToast({
          title: '请输入提示词',
          icon: 'none',
        })
        return
      }

      if (!wx.cloud) {
        wx.showToast({ title: '云开发未初始化', icon: 'none' })
        return
      }

      this._clearPollTimer()
      this.setData({
        isGenerating: true,
        taskId: '',
        taskStatus: '',
        generatedImage: '',
        generatedPrompt: fullPrompt,
      })

      wx.cloud.callFunction({
        name: 'wanx',
        data: {
          name: 'create',
          prompt: fullPrompt,
          n: 1,
          size: '1024*1024',
          negativePrompt: '',
          promptExtend: true,
          watermark: false,
          // seed: 123456,
        },
      }).then((res: any) => {
        const result = res?.result || {}
        if (!result.ok) {
          this.setData({ isGenerating: false })
          wx.showToast({ title: result.errMsg || '创建任务失败', icon: 'none' })
          return
        }

        const taskId = result.taskId || ''
        const taskStatus = result.taskStatus || ''
        if (!taskId) {
          this.setData({ isGenerating: false })
          wx.showToast({ title: '未获取到任务ID', icon: 'none' })
          return
        }

        this.setData({ taskId, taskStatus })
        this._pollTask(taskId)
      }).catch((err: any) => {
        console.error('create task error', err)
        this.setData({ isGenerating: false })
        wx.showToast({ title: err?.errMsg || err?.message || '生成失败', icon: 'none' })
      })
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
  },
})
