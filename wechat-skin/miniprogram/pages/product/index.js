const { load } = require('../../core/products')
Page({
  data: { p: null, loading: true, error: '', broken: false },
  onLoad(options) {
    this.alive = true
    const r = getApp().globalData.report
    this.c = r && r.candidates.find((c) => c.id === options.id)
    this.refresh()
  },
  onUnload() {
    this.alive = false
  },
  async refresh() {
    if (!this.c)
      return this.setData({ loading: false, error: '没有可查看的推荐商品。' })
    this.setData({ loading: true, error: '', broken: false })
    try {
      const p = await load(this.c)
      if (this.alive)
        this.setData({ p, error: p ? '' : '该商品已下架或不再公开展示。' })
    } catch (e) {
      if (this.alive) this.setData({ p: null, error: e.message })
    } finally {
      if (this.alive) this.setData({ loading: false })
    }
  },
  imageError() {
    this.setData({ broken: true })
  },
})
