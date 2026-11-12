const api = require('../../core/api')
const { present } = require('../../core/report')
Page({
  data: { signed: false, busy: false, error: '', password: '' },
  onShow() {
    this.setData({
      signed: !!getApp().globalData.token,
      busy: false,
      error: '',
      password: '',
    })
  },
  toggleMember() {
    this.setData({ memberOpen: !this.data.memberOpen, error: '' })
  },
  async login(e) {
    if (this.data.busy) return
    const { email, password } = e.detail.value
    if (!String(email || '').trim() || !password)
      return this.setData({ error: '请输入会员邮箱和密码。' })
    this.setData({ busy: true, error: '' })
    try {
      await api.login(email.trim(), password)
      this.setData({ signed: true, password: '' })
    } catch (e) {
      this.setData({ error: e.message, password: '' })
    } finally {
      this.setData({ busy: false })
    }
  },
  guest() {
    if (this.data.busy) return
    getApp().globalData.report = null
    wx.navigateTo({ url: '/pages/survey/index?mode=guest' })
  },
  start() {
    if (this.data.signed && !this.data.busy) {
      getApp().globalData.report = null
      wx.navigateTo({ url: '/pages/survey/index' })
    }
  },
  preview() {
    if (this.data.busy) return
    getApp().globalData.report = require('../../core/example')
    wx.navigateTo({ url: '/pages/report/index' })
  },
  async latest() {
    if (this.data.busy) return
    this.setData({ busy: true, error: '' })
    try {
      getApp().globalData.report = present(await api.latest())
      wx.navigateTo({ url: '/pages/report/index' })
    } catch (e) {
      this.setData({
        signed: !!getApp().globalData.token,
        error: e.status === 404 ? '还没有测评记录。' : e.message,
      })
    } finally {
      this.setData({ busy: false })
    }
  },
  logout() {
    getApp().globalData.token = ''
    getApp().globalData.report = null
    this.setData({ signed: false, password: '', error: '' })
  },
})
