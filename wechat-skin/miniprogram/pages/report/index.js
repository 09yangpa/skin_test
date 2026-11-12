const { load } = require('../../core/products')
Page({
  data: { r: null, products: [], fetching: false, partial: false, broken: {} },
  onLoad() {
    this.alive = true
    const r = getApp().globalData.report
    if (!r) return wx.reLaunch({ url: '/pages/home/index' })
    this.setData({ r })
    this.refresh()
  },
  onUnload() {
    this.alive = false
  },
  async refresh() {
    if (this.data.fetching || !this.data.r) return
    const candidates = this.data.r.candidates,
      results = []
    let partial = false
    this.setData({ fetching: true, partial: false })
    for (let i = 0; i < candidates.length; i += 4) {
      if (!this.alive) return
      const chunk = await Promise.all(
        candidates.slice(i, i + 4).map(async (c) => {
          try {
            return await load(c)
          } catch (e) {
            partial = true
            return null
          }
        }),
      )
      results.push(...chunk.filter(Boolean))
    }
    if (this.alive)
      this.setData({ products: results, partial, fetching: false })
  },
  broken(e) {
    this.setData({ ['broken.' + e.currentTarget.dataset.id]: true })
  },
  open(e) {
    wx.navigateTo({
      url: '/pages/product/index?id=' + e.currentTarget.dataset.id,
    })
  },
  restart() {
    if (this.data.r && this.data.r.guest) {
      getApp().globalData.report = null
      wx.redirectTo({ url: '/pages/survey/index?mode=guest' })
      return
    }
    if (!getApp().globalData.token)
      return wx.reLaunch({ url: '/pages/home/index' })
    getApp().globalData.report = null
    wx.redirectTo({ url: '/pages/survey/index' })
  },
})
