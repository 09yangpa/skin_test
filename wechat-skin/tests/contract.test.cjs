const { test } = require('node:test')
const assert = require('node:assert/strict')
const s = require('../miniprogram/core/survey')
const r = require('../miniprogram/core/report')
const products = require('../miniprogram/core/products')
const api = require('../miniprogram/core/api')
const photo = require('../miniprogram/core/photo')
const example = require('../examples/analyze-response.json')
const request = require('../examples/analyze-request.json')
function complete(age) {
  let a = {}
  for (let i = 0; i < 12; i++) {
    const k = s.route(a)[i]
    a = s.answer(a, k, s.bank[k].options[k === 'ageRange' ? age : 0].value)
  }
  return a
}
test('两条路径均 12 题：韩文协议值、互斥分支、公共答案保留', () => {
  for (let age = 0; age < 5; age++) {
    const a = complete(age),
      p = s.payload(a, 'data:image/jpeg;base64,/9j/')
    assert.equal(s.route(a).length, 12)
    assert.equal(Object.keys(p.answers).length, 13)
    assert.equal(p.answers.ageCourse, age < 2 ? 'A_10_20' : 'B_30_50')
    assert.equal('matureConcern' in a, age >= 2)
    assert.equal('youngConcern' in a, age < 2)
    assert.equal(p.images.length, 1)
    assert.equal(p.analysisLevel, 'full')
  }
  const a = complete(0),
    updated = s.answer(a, 'ageRange', '40대')
  assert.equal(updated.sleep, a.sleep)
  assert.equal(updated.youngOilTiming, undefined)
  assert.throws(() => s.payload(updated))
  assert.throws(() => s.answer(updated, 'sensitivity', '容易刺痛或泛红'))
  assert.deepEqual(s.payload(request.answers), request)
})
test('服务端结果的翻译与示例一致；不伪造照片信号、不容忍空报告', () => {
  const v = r.present(example),
    preview = require('../miniprogram/core/example')
  assert.deepEqual({ ...v, example: true, date: '示例' }, preview)
  assert.equal(v.score, example.diagnosis.professionalReport.overallScore.score)
  assert.equal(v.metrics.length, 5)
  assert.equal(v.weeks.length, 4)
  assert.equal(v.steps.length, 3)
  assert.equal(v.type, '敏感缺水混合型')
  assert.match(r.present({ ...example, imageCount: 1 }).source, /未能/)
  assert.match(
    r.present({ ...example, imageCount: 1, hasPhotoAnalysis: true }).source,
    /辅助/,
  )
  assert.throws(() => r.present({ diagnosisId: 'x', diagnosis: {} }))
})
test('商品：两种推荐去重、目录可见性、代表媒体优先', () => {
  const p = {
    id: 'a'.repeat(24),
    reasons: ['수분 케어'],
    keyIngredients: ['글리세린'],
  }
  const a = r.candidates({
    routine: [{ products: [p] }],
    priceTiers: [{ products: [p, { id: 'invalid' }] }],
  })
  assert.equal(a.length, 1)
  assert.equal(a[0].reasons[0], '补水护理')
  assert.equal(a[0].ingredients[0], '甘油')
  assert.equal(products.available({ listing: { isDisplayed: false } }), false)
  assert.equal(products.available({ vipOnly: true }), false)
  const url = 'https://cdn.example/img'
  assert.equal(
    products.cover({ media: [{ type: 'image', url, placement: 'primary' }] }),
    url,
  )
  assert.equal(
    products.cover({ primaryMedia: { type: 'video', url }, imageUrl: url }),
    '',
  )
  assert.equal(products.cover({ primaryMedia: null, imageUrl: url }), '')
})
test('真实协议：登录、受保护 POST、读取最近记录、401 与超时不重放', async () => {
  const app = { globalData: { token: '', report: null } },
    calls = []
  global.getApp = () => app
  let reply
  global.wx = {
    request: (o) => {
      calls.push(o)
      reply(o)
    },
  }
  await assert.rejects(api.latest(), { status: 401 })
  reply = (o) =>
    o.success({ statusCode: 200, data: { accessToken: 'test-only' } })
  await api.login('test@example.invalid', 'not-real')
  assert.ok(calls[0].url.endsWith('/api/login'))
  assert.equal(calls[0].header.Authorization, undefined)
  reply = (o) => o.success({ statusCode: 201, data: example })
  const out = await api.analyze(request)
  assert.equal(out.diagnosisId, example.diagnosisId)
  assert.deepEqual(calls[1].data.images, [])
  assert.equal(calls[1].header.Authorization, 'Bearer test-only')
  assert.equal(calls[1].method, 'POST')
  await api.latest()
  assert.ok(calls[2].url.endsWith('/latest'))
  reply = (o) => o.fail({})
  await assert.rejects(api.analyze(request), { status: 0 })
  assert.equal(calls.length, 4)
  reply = (o) => o.success({ statusCode: 200, data: '<html>' })
  await assert.rejects(api.latest(), { status: 502 })
  reply = (o) => o.success({ statusCode: 401, data: {} })
  await assert.rejects(api.latest(), { status: 401 })
  assert.equal(app.globalData.token, '')
})
test('照片：相机拍摄、相册取消、尺寸上限、MIME 与 Base64', async () => {
  const fs = {
    stat: (o) => o.success({ stats: { size: 10 } }),
    readFile: (o) => o.success({ data: '/9j/test' }),
  }
  global.wx = {
    getFileSystemManager: () => fs,
    requirePrivacyAuthorize: (o) => o.success({}),
    chooseMedia: (o) => {
      if (o.sourceType[0] === 'album') return o.fail({ errMsg: 'cancel' })
      assert.equal(o.camera, 'front')
      assert.equal(o.count, 1)
      o.success({ tempFiles: [{ tempFilePath: 'a' }] })
    },
    getImageInfo: (o) => o.success({ width: 1600, height: 800 }),
    compressImage: (o) => {
      assert.equal(o.compressedWidth, 1200)
      assert.equal(o.compressedHeight, 600)
      o.success({ tempFilePath: 'b' })
    },
  }
  assert.equal(await photo.select('camera'), 'b')
  await assert.rejects(photo.select('album'))
  assert.equal(await photo.encode('b'), 'data:image/jpeg;base64,/9j/test')
  fs.stat = (o) => o.success({ stats: { size: 3000000 } })
  await assert.rejects(photo.encode('b'), /过大/)
})
test('页面流转：回答、返回、同意、无照片提交、生成中文报告', async () => {
  let definition, route
  global.Page = (p) => {
    definition = p
  }
  const app = { globalData: { token: 'unittest' } }
  global.getApp = () => app
  global.wx = {
    redirectTo: (o) => {
      route = o.url
    },
    request: (o) => {
      assert.equal(o.data.answers.ageCourse, 'A_10_20')
      assert.deepEqual(o.data.images, [])
      o.success({ statusCode: 201, data: example })
    },
  }
  require('../miniprogram/pages/survey/index')
  const page = Object.assign({}, definition, {
    data: { ...definition.data },
    setData(v) {
      Object.assign(this.data, v)
    },
  })
  page.onLoad()
  for (let i = 0; i < 12; i++) {
    page.choose({
      currentTarget: { dataset: { key: page.data.q.id, index: 0 } },
    })
    page.next()
  }
  page.prev()
  assert.equal(page.data.q.id, 'sleep')
  page.next()
  assert.equal(page.data.photoStep, true)
  await page.submit({ currentTarget: { dataset: { mode: 'survey' } } })
  assert.equal(route, undefined)
  page.consent({ detail: { value: ['ok'] } })
  await page.submit({ currentTarget: { dataset: { mode: 'survey' } } })
  assert.equal(route, '/pages/report/index')
  assert.equal(app.globalData.report.type, '敏感缺水混合型')
})

test('目录实时核验：品牌图、最终价、下架与网络错误分开处理', async () => {
  const id = 'b'.repeat(24)
  const c = { id, reasons: ['补水护理'], ingredients: ['甘油'] }
  global.getApp = () => ({ globalData: { token: 'unit-test' } })
  let status = 200,
    data = {
      _id: id,
      salesOrganization: 'blacksmith',
      brandNameKo: '测试品牌',
      nameKo: '测试面霜',
      pricing: { finalDisplayPrice: 22000 },
      brandPrice: 88000,
      primaryMedia: {
        type: 'image',
        url: 'https://img.example.invalid/item.jpg',
      },
    }
  global.wx = {
    request(o) {
      assert.ok(o.url.endsWith('/products/public/' + id + '?context=brand'))
      o.success({ statusCode: status, data })
    },
  }
  const p = await products.load(c)
  assert.deepEqual(
    [p.price, p.image, p.reasons[0]],
    ['₩ 22,000', data.primaryMedia.url, '补水护理'],
  )
  data.isVisible = false
  assert.equal(await products.load(c), null)
  status = 404
  assert.equal(await products.load(c), null)
  status = 500
  await assert.rejects(products.load(c), { status: 500 })
})

test('访客不需要账号，只发送答案序号和摘要，不访问会员或商品 API', async () => {
  const guest = require('../miniprogram/core/guest')
  const expected = require('../examples/guest-request.json')
  const server = {
    score: 61,
    type: '干燥屏障护理型',
    metrics: Array(5).fill({ score: 40 }),
    summary: '测试',
    morning: '早间',
    evening: '晚间',
    priority: '重点',
    caution: '注意',
    hasPhotoAnalysis: false,
  }
  global.getApp = () => ({ globalData: { token: '' } })
  const calls = []
  global.wx = {
    request(o) {
      calls.push(o)
      o.success({ statusCode: 200, data: server })
    },
  }
  const r = await guest.analyze(request.answers, null)
  assert.equal(r.guest, true)
  assert.equal(r.score, 61)
  assert.deepEqual(r.candidates, [])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://kai.blacksmithio.com/skin-test/analyze')
  assert(!calls[0].header.Authorization)
  assert.deepEqual(calls[0].data, expected)
  assert(!/data:image|accessToken|password/.test(JSON.stringify(calls[0].data)))
  global.wx.request = (o) => o.success({ statusCode: 429 })
  await assert.rejects(guest.analyze(request.answers, null), /频繁|较多/)
})
test('访客照片只在设备内处理，不调用上传接口', async () => {
  const guest = require('../miniprogram/core/guest')
  const image = {
    width: 40,
    height: 40,
    set src(v) {
      this.onload()
    },
  }
  global.wx = {
    createOffscreenCanvas() {
      return {
        createImage: () => image,
        getContext: () => ({
          drawImage() {},
          getImageData() {
            return { data: new Uint8ClampedArray(40 * 40 * 4).fill(230) }
          },
        }),
      }
    },
  }
  assert.deepEqual(await guest.signals('temporary-test-path'), {
    redness: 0,
    shine: 1,
    darkTone: 0,
    texture: 0,
  })
})
