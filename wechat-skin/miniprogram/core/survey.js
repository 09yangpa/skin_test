const bank = require('./questions')
const young = ['youngConcern', 'youngOilTiming']
const mature = ['matureConcern', 'matureRecovery']
const common = [
  'afterCleanse',
  'routineStyle',
  'avoidPreference',
  'sensitivity',
  'breakoutFrequency',
  'sunExposure',
  'toneConcern',
  'sleep',
]
const isYoung = (age) => age === '10대' || age === '20대'
function route(a) {
  return ['gender', 'ageRange'].concat(
    a.ageRange ? (isYoung(a.ageRange) ? young : mature).concat(common) : [],
  )
}
function answer(a, key, value) {
  if (
    !route(a).includes(key) ||
    !bank[key].options.some((o) => o.value === value)
  )
    throw Error('选项无效，请重新选择。')
  const out = Object.assign({}, a, { [key]: value })
  if (key === 'ageRange') {
    out.ageCourse = isYoung(value) ? 'A_10_20' : 'B_30_50'
    ;(isYoung(value) ? mature : young).forEach((k) => delete out[k])
  }
  return out
}
function payload(a, photo) {
  const keys = route(a)
  if (
    keys.length !== 12 ||
    keys.some((k) => !bank[k].options.some((o) => o.value === a[k]))
  )
    throw Error('请完成全部 12 道题。')
  const answers = { ageCourse: isYoung(a.ageRange) ? 'A_10_20' : 'B_30_50' }
  keys.forEach((k) => {
    answers[k] = a[k]
  })
  return { answers, images: photo ? [photo] : [], analysisLevel: 'full' }
}
module.exports = { bank, route, answer, payload }
