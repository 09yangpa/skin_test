const call = (owner, method, options) =>
  new Promise((resolve, reject) =>
    owner[method](
      Object.assign({}, options, { success: resolve, fail: reject }),
    ),
  )
async function select(source) {
  if (wx.requirePrivacyAuthorize) await call(wx, 'requirePrivacyAuthorize', {})
  const result = await call(wx, 'chooseMedia', {
    count: 1,
    mediaType: ['image'],
    sourceType: [source],
    camera: 'front',
    sizeType: ['compressed'],
  })
  const src = result.tempFiles[0].tempFilePath
  const info = await call(wx, 'getImageInfo', { src })
  const scale = Math.min(1, 1200 / Math.max(info.width, info.height))
  const file = await call(wx, 'compressImage', {
    src,
    quality: 82,
    compressedWidth: Math.max(1, Math.round(info.width * scale)),
    compressedHeight: Math.max(1, Math.round(info.height * scale)),
  })
  return file.tempFilePath
}
async function encode(path) {
  const fs = wx.getFileSystemManager()
  const { stats } = await call(fs, 'stat', { path })
  if (stats.size > 2 * 1024 * 1024)
    throw Error('照片仍然过大，请换一张较小的照片。')
  const { data } = await call(fs, 'readFile', {
    filePath: path,
    encoding: 'base64',
  })
  const mime = data.startsWith('/9j/')
    ? 'jpeg'
    : data.startsWith('iVBOR')
      ? 'png'
      : data.startsWith('UklGR')
        ? 'webp'
        : ''
  if (!mime) throw Error('不支持该图片格式，请使用 JPG 或 PNG 照片。')
  return 'data:image/' + mime + ';base64,' + data
}
module.exports = { select, encode }
