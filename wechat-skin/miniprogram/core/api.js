const { apiBase } = require('../config')
function request(path, method, data, auth = true) {
  if (!/^https:\/\//i.test(apiBase))
    return Promise.reject(new Error('API 地址必须使用 HTTPS。'))
  const session = getApp().globalData
  const token = auth ? session.token : ''
  if (auth && !token) return Promise.reject(problem(401))
  return new Promise((resolve, reject) =>
    wx.request({
      url: apiBase + path,
      method,
      data,
      timeout: 65000,
      header: Object.assign(
        { 'Content-Type': 'application/json', Accept: 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {},
      ),
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          if (auth && res.statusCode === 401 && session.token === token) {
            session.token = ''
            session.report = null
          }
          reject(problem(res.statusCode, path === '/login'))
          return
        }
        if (
          !res.data ||
          typeof res.data !== 'object' ||
          Array.isArray(res.data)
        )
          return reject(problem(502))
        resolve(res.data)
      },
      fail: () => reject(problem(0)),
    }),
  )
}
function problem(status, login) {
  const messages = {
    0: '连接失败或超时，请检查网络与服务器域名。',
    400: '服务器未接受提交内容，请检查问卷或照片。',
    401: login ? '邮箱或密码不正确。' : '登录已过期，请重新登录。',
    403: '当前账号没有访问权限。',
    404: '没有找到记录。',
    410: '商品已下架。',
    413: '照片过大，请更换图片或仅提交问卷。',
    429: '操作太频繁，请稍后再试。',
    502: '服务器返回了无法读取的数据。',
  }
  const e = new Error(messages[status] || '服务暂时不可用，请稍后再试。')
  e.status = status
  return e
}
async function login(email, password) {
  const r = await request('/login', 'POST', { email, password }, false)
  const token = r.accessToken || r.token
  if (typeof token !== 'string' || !token.trim()) throw problem(502)
  getApp().globalData.token = token
}
const base = '/me/skin-diagnosis'
module.exports = {
  login,
  analyze: (body) => request(base, 'POST', body),
  latest: () => request(base + '/latest', 'GET'),
  catalog: (id) =>
    request(
      '/products/public/' + encodeURIComponent(id) + '?context=brand',
      'GET',
    ),
}
