const copy = require('./report-copy')
const dict = Object.assign({}, copy, {
  '유분·피지': '油脂与皮脂',
  '건조·장벽': '干燥与屏障',
  '민감·붉은기': '敏感与泛红',
  '톤·자국': '肤色与印迹',
  '생활 습관': '生活习惯',
  '유수분 밸런스 유지': '保持水油平衡',
  '속건조·장벽': '缺水与屏障',
  '피지·모공': '皮脂与毛孔',
  안정: '平稳',
  '관리 권장': '建议关注',
  '우선 관리': '优先护理',
  글리세린: '甘油',
  스쿠알란: '角鲨烷',
  세라마이드: '神经酰胺',
  판테놀: '泛醇',
  히알루론산: '透明质酸',
  나이아신아마이드: '烟酰胺',
  녹차: '绿茶',
  아연: '锌',
  시카: '积雪草',
  마데카소사이드: '羟基积雪草苷',
  알란토인: '尿囊素',
  '비타민C 유도체': '维生素 C 衍生物',
  향료: '香精',
  에센셜오일: '精油',
  '산/필링 성분': '酸类及去角质成分',
  '고농도 산 성분': '高浓度酸类',
  레티노이드: '维 A 类',
  '무거운 오일감': '厚重油感',
  '수분 케어': '补水护理',
  '장벽·보습 케어': '屏障保湿',
  '진정 케어': '舒缓护理',
  '톤 케어': '匀肤护理',
  '탄력 케어': '弹性护理',
  '피지·모공 케어': '皮脂与毛孔护理',
  '피부결 케어': '肤质护理',
  '보습 마무리용 크림': '适合作为保湿收尾',
  '현재 피부 목표와 기본 보습 루틴에 맞는 후보입니다.':
    '与当前护理目标及基础保湿步骤相符。',
  '수분/보습': '补水保湿',
  '장벽 보완': '屏障护理',
  진정: '舒缓',
  '피지 밸런스': '油脂平衡',
  피부결: '肤质',
  '탄력/안티에이징': '弹性护理',
  토코페롤: '生育酚',
  락틱애씨드: '乳酸',
})
const list = (v) => (Array.isArray(v) ? v : [])
const zh = (s) =>
  typeof s === 'string' ? dict[s] || (!/[가-힣]/.test(s) ? s : '') : ''
function translated(items) {
  return [...new Set(list(items).map(zh).filter(Boolean))]
}
function reason(s) {
  const suffix = ' 관련 등록 성분 정보'
  return typeof s === 'string' &&
    s.endsWith(suffix) &&
    zh(s.slice(0, -suffix.length))
    ? '已登记的成分信息：' + zh(s.slice(0, -suffix.length))
    : zh(s)
}
function week(row) {
  if (row.week === '1주차 · 루틴 정리') return '固定早晚清洁与保湿步骤。'
  if (row.week === '4주차 · 유지 기준 만들기')
    return '留下适合自己的产品和护理步骤。'
  const m = /^(2|3)주차 · (.+) (집중|보완)$/.exec(row.week)
  if (m && zh(m[2]))
    return m[1] === '2'
      ? '针对「' + zh(m[2]) + '」，增加一种产品或一个习惯。'
      : '在现有步骤中补充「' + zh(m[2]) + '」护理。'
  return zh(row.focus)
}
const num = (n) =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100
function present(r) {
  const d = r && r.diagnosis,
    p = d && d.professionalReport,
    score = p && p.overallScore
  if (
    !r ||
    !r.diagnosisId ||
    !p ||
    !score ||
    !num(score.score) ||
    !list(p.categoryAnalysis).length
  )
    throw Error('没有可显示的完整报告。旧版记录可能需要重新测评。')
  const plan = p.typeAnalysis || {},
    routine = d.routine || {},
    rec = r.recommendations || {}
  const ingredients = list(p.recommendedIngredients).join('·').split('·')
  return {
    score: score.score,
    type:
      zh(plan.title) ||
      zh((d.skinType || '').replace(/으로 추정$/, '')) ||
      '肌肤护理报告',
    summary: zh(score.summary),
    date: String(r.savedAt || '').slice(0, 10),
    source: r.hasPhotoAnalysis
      ? '问卷 + 照片辅助'
      : r.imageCount > 0
        ? '照片未能用于分析 · 仅依据问卷'
        : '仅依据问卷',
    concerns: translated(d.priorityConcerns),
    metrics: list(p.categoryAnalysis)
      .filter((m) => m && zh(m.label) && num(m.score))
      .map((m) => ({
        label: zh(m.label),
        score: m.score,
        level: zh(m.level),
        summary: zh(m.summary),
        action: zh(m.recommendation || m.action),
      })),
    steps: [
      ['早间', routine.morning],
      ['晚间', routine.evening],
      ['日常重点', routine.weekly],
    ]
      .map(([label, v]) => ({ label, text: translated(v).join(' ') }))
      .filter((s) => s.text),
    weeks: list(p.fourWeekRoadmap)
      .map((w, i) => ({ label: '第 ' + (i + 1) + ' 周', text: week(w) }))
      .filter((s) => s.text),
    ingredients: translated(ingredients),
    caution: translated(
      list(p.cautionIngredients).concat(list(rec.cautionIngredients)),
    ),
    advice: zh(plan.watchOut),
    candidates: candidates(rec),
  }
}
function candidates(rec) {
  const map = new Map()
  for (const group of list(rec.routine).concat(list(rec.priceTiers)))
    for (const p of list(group.products)) {
      const id = p && (p.productId || p.id)
      if (/^[a-f0-9]{24}$/i.test(id) && !map.has(id))
        map.set(id, {
          id,
          reasons: list(p.reasons).map(reason).filter(Boolean),
          ingredients: list(p.keyIngredients).map((v) => zh(v) || String(v)),
        })
    }
  return Array.from(map.values())
}
module.exports = { present, candidates }
