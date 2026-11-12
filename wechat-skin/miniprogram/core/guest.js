const { guestBase } = require('../config')
const { bank, route, payload } = require('./survey')

// Guest requests deliberately have no bearer, user ID, device ID, or raw photo.
async function analyze(answers, photo) {
  payload(answers, null)
  const indices = {}
  route(answers).forEach((k) => {
    indices[k] = bank[k].options.findIndex((o) => o.value === answers[k])
  })
  return new Promise((resolve, reject) =>
    wx.request({
      url: guestBase + '/skin-test/analyze',
      method: 'POST',
      timeout: 30000,
      header: { 'Content-Type': 'application/json' },
      data: { lang: 'zh', consent: true, answers: indices, photo },
      success(res) {
        const v = res.data
        if (
          res.statusCode !== 200 ||
          !v ||
          !Number.isFinite(v.score) ||
          !Array.isArray(v.metrics) ||
          v.metrics.length !== 5
        )
          return reject(
            Error(
              res.statusCode === 429
                ? '测评请求较多，请稍后再试。'
                : '未收到有效报告，请稍后重试。',
            ),
          )
        resolve({
          guest: true,
          score: v.score,
          type: v.type,
          summary: v.summary,
          source: v.hasPhotoAnalysis ? '问卷 + 照片辅助指标' : '仅依据问卷',
          metrics: v.metrics,
          steps: [
            ['早间', v.morning],
            ['晚间', v.evening],
            ['护理重点', v.priority],
          ].map(([label, text]) => ({ label, text })),
          advice: v.caution,
          concerns: [],
          weeks: [],
          ingredients: [],
          caution: [],
          candidates: [],
        })
      },
      fail() {
        reject(Error('连接测评服务失败，请检查网络和微信合法域名设置后重试。'))
      },
    }),
  )
}
async function signals(path) {
  try {
    const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: 600,
        height: 600,
      }),
      im = canvas.createImage()
    await new Promise((resolve, reject) => {
      im.onload = resolve
      im.onerror = reject
      im.src = path
    })
    const s = Math.min(1, 600 / Math.max(im.width, im.height)),
      w = Math.round(im.width * s),
      h = Math.round(im.height * s)
    if (Math.min(w, h) < 16) throw Error()
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(im, 0, 0, w, h)
    const px = ctx.getImageData(0, 0, w, h).data,
      dx = Math.floor(Math.max(32, Math.min(96, w, h)) / 16)
    const lum = (i) => px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
    let n = 0,
      rn = 0,
      sn = 0,
      dn = 0,
      tn = 0
    for (let y = Math.round(h * 0.2); y < Math.round(h * 0.8); y += dx)
      for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x += dx) {
        const i = (y * w + x) * 4,
          r = px[i],
          g = px[i + 1],
          b = px[i + 2],
          m = Math.max(r, g, b),
          sat = m ? (m - Math.min(r, g, b)) / m : 0,
          l = lum(i)
        if (r > g * 1.07 && r > b * 1.12 && sat > 0.12) rn++
        if (l > 212 && sat < 0.24) sn++
        if (l < 82) dn++
        if (x + dx < Math.round(w * 0.8)) tn += Math.abs(l - lum(i + dx * 4))
        n++
      }
    return {
      redness: rn / n,
      shine: sn / n,
      darkTone: dn / n,
      texture: tn / n / 255,
    }
  } catch {
    throw Error('当前设备未能读取照片，请更换照片、更新微信或仅用问卷继续。')
  }
}
module.exports = { analyze, signals }
