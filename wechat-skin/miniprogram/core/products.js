const api = require('./api')
const off = new Set([
  'deleted',
  'removed',
  'archived',
  'hidden',
  'hide',
  'invisible',
  'inactive',
  'disabled',
  'private',
  'draft',
  'unpublished',
  'pending',
  'rejected',
  'blocked',
  'suspended',
  'closed',
  'off',
  'not_visible',
  'not_for_sale',
])
const no = (x) =>
  ['false', '0', 'no', 'n', 'hidden', 'hide'].includes(String(x).toLowerCase())
const yes = (x) => ['true', '1', 'yes', 'y'].includes(String(x).toLowerCase())
function available(p) {
  if (
    p.salesOrganization &&
    String(p.salesOrganization).toLowerCase() !== 'blacksmith'
  )
    return false
  return [
    p,
    p.product,
    p.sellerProduct || p.seller_product,
    p.assignment,
    p.productAssignment || p.product_assignment,
    p.listing,
    p.availability,
    p.meta,
  ]
    .filter(Boolean)
    .every(
      (v) =>
        !v.deletedAt &&
        !yes(v.isDeleted) &&
        !yes(v.vipOnly) &&
        ![
          'isSellable',
          'sellerVisible',
          'isVisible',
          'visible',
          'isExposed',
          'isDisplayed',
          'exposed',
          'displayed',
          'displayYn',
          'exposeYn',
          'isActive',
          'active',
          'enabled',
          'isEnabled',
          'useYn',
        ].some((k) => no(v[k])) &&
        ![
          'status',
          'productStatus',
          'salesStatus',
          'visibilityStatus',
          'displayStatus',
          'publicationStatus',
          'publishStatus',
          'effectiveStatus',
          'state',
        ].some((k) =>
          off.has(String(v[k]).toLowerCase().replace(/[ -]/g, '_')),
        ),
    )
}
function first(...xs) {
  return xs.find((x) => typeof x === 'string' && x.trim()) || ''
}
function image(v) {
  if (Array.isArray(v)) return v.map(image).find(Boolean) || ''
  const s =
    typeof v === 'string'
      ? v
      : v &&
        first(
          v.originUrl,
          v.originalUrl,
          v.fullUrl,
          v.fileUrl,
          v.publicUrl,
          v.cdnUrl,
          v.url,
          v.imageUrl,
          v.src,
          v.thumbnailUrl,
        )
  return /^https:\/\//i.test(s || '') ? s : ''
}
function decode(v) {
  if (typeof v === 'string' && /^[\s]*[\[{]/.test(v)) {
    try {
      return JSON.parse(v)
    } catch (_) {
      return null
    }
  }
  return v
}
function cover(p) {
  const explicit = Object.prototype.hasOwnProperty.call(p, 'primaryMedia')
  if (explicit || p.media != null) {
    const m = decode(explicit ? p.primaryMedia : p.media)
    const rows = (Array.isArray(m) ? m : [m])
      .filter(
        (x) =>
          x &&
          ['image', 'video'].includes(x.type) &&
          (explicit || x.placement === 'primary'),
      )
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    const item = rows.find((x) => yes(x.isPrimary)) || rows[0]
    return item
      ? image(item.type === 'video' ? item.thumbnailUrl : item.url)
      : ''
  }
  return (
    [p.primaryImages, p.images, p.imageUrl, p.thumbnailUrl, p.imageUrls]
      .map(decode)
      .map(image)
      .find(Boolean) || ''
  )
}
async function load(c) {
  let p
  try {
    p = await api.catalog(c.id)
  } catch (e) {
    if ([404, 410].includes(e.status)) return null
    throw e
  }
  if ((p._id || p.id || p.productId) !== c.id || !available(p)) return null
  const fields = [
    'finalDisplayPrice',
    'final_display_price',
    'finalPrice',
    'final_price',
    'finalUnitPrice',
    'final_unit_price',
  ]
  const prices = []
  for (const keys of [fields, ['displayPrice', 'display_price']])
    for (const src of [p, p.pricing || {}, p.attributes || {}])
      for (const k of keys) prices.push(src[k])
  const price = prices
    .concat([p.brandPrice, p.price])
    .map(Number)
    .find((v) => Number.isFinite(v) && v > 0)
  return Object.assign({}, c, {
    name: first(p.nameZh, p.nameKo, p.productName, p.name, p.title) || '商品',
    brand: first(
      p.brandNameZh,
      p.brandNameKo,
      p.brandName,
      (p.brand || {}).displayName,
      p.brand,
    ),
    price: price
      ? '₩ ' + String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : '价格待确认',
    volume: first(p.volume, p.capacity),
    image: cover(p),
  })
}
module.exports = { load, available, cover }
