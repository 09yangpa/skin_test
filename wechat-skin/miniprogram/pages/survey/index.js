const { bank, route, answer, payload } = require('../../core/survey')
const { present } = require('../../core/report')
const api = require('../../core/api')
const photo = require('../../core/photo')
const guest = require('../../core/guest')
Page({
  data: {
    i: 0,
    q: null,
    selected: '',
    photoStep: false,
    path: '',
    consent: false,
    busy: false,
    picking: false,
    error: '',
    progress: 0,
    uncertain: false,
    expired: false,
  },
  onLoad(options = {}) {
    this.answers = {}
    this.alive = true
    this.setData({
      guest: options.mode === 'guest' || !getApp().globalData.token,
    })
    this.show(0)
  },
  onUnload() {
    this.alive = false
    this.answers = null
  },
  home() {
    wx.reLaunch({ url: '/pages/home/index' })
  },
  show(i) {
    const ids = route(this.answers),
      q = bank[ids[i]]
    this.setData({
      i,
      q: q || null,
      photoStep: !q,
      selected: q ? this.answers[q.id] || '' : '',
      progress: Math.round((i / 12) * 100),
      error: '',
    })
  },
  choose(e) {
    if (this.data.busy || !this.data.q) return
    const { key, index } = e.currentTarget.dataset
    if (key !== this.data.q.id) return
    this.answers = answer(this.answers, key, bank[key].options[index].value)
    this.setData({ selected: this.answers[key] })
  },
  next() {
    if (this.data.selected && this.data.q) this.show(this.data.i + 1)
  },
  prev() {
    if (this.data.i && !this.data.busy && !this.data.picking)
      this.show(this.data.i - 1)
  },
  consent(e) {
    this.setData({ consent: e.detail.value.includes('ok') })
  },
  async pick(e) {
    if (this.data.busy || this.data.picking) return
    this.setData({ picking: true, error: '' })
    try {
      const path = await photo.select(e.currentTarget.dataset.source)
      if (this.alive) this.setData({ path })
    } catch (e) {
      if (this.alive && !/cancel/i.test(e.errMsg || ''))
        this.setData({
          error:
            '未能读取照片。请检查微信隐私授权和相机或相册权限，或仅用问卷继续。',
        })
    } finally {
      if (this.alive) this.setData({ picking: false })
    }
  },
  remove() {
    if (!this.data.busy && !this.data.picking) this.setData({ path: '' })
  },
  async submit(e) {
    if (
      !this.data.photoStep ||
      !this.data.consent ||
      this.data.picking ||
      this.data.busy ||
      this.data.expired
    )
      return
    const withPhoto =
      e.currentTarget.dataset.mode === 'photo' && !!this.data.path
    let sent = false
    this.setData({ busy: true, error: '', uncertain: false })
    try {
      if (this.data.guest) {
        const summary = withPhoto ? await guest.signals(this.data.path) : null
        if (!this.alive) return
        const v = await guest.analyze(this.answers, summary)
        if (!this.alive) return
        getApp().globalData.report = v
        this.setData({ path: '' })
        wx.redirectTo({ url: '/pages/report/index' })
        return
      }
      const dataUrl = withPhoto ? await photo.encode(this.data.path) : null
      if (!this.alive) return
      const body = payload(this.answers, dataUrl)
      sent = true
      const r = await api.analyze(body)
      if (!this.alive) return
      getApp().globalData.report = present(r)
      this.setData({ path: '' })
      wx.redirectTo({ url: '/pages/report/index' })
    } catch (e) {
      if (this.alive)
        this.setData({
          error: e.message || '提交失败，请稍后再试。',
          expired: e.status === 401,
          uncertain:
            sent &&
            (e.status === 0 || e.status >= 500 || e.status === undefined),
        })
    } finally {
      if (this.alive) this.setData({ busy: false })
    }
  },
  privacy() {
    if (wx.openPrivacyContract)
      wx.openPrivacyContract({
        fail: () =>
          wx.showToast({ title: '请在微信设置中查看隐私指引', icon: 'none' }),
      })
  },
})
