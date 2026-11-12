// value 为 Flutter 原始协议值，请勿翻译。
module.exports = {
  toneConcern: {
    id: 'toneConcern',
    label: '肤色观察',
    prompt: '关于肤色，您最在意哪一点？',
    options: [
      {
        value: '잡티와 색소 침착',
        text: '色斑或色素沉着',
      },
      {
        value: '트러블 후 붉거나 검은 자국',
        text: '痘痘留下的红印或暗印',
      },
      {
        value: '전체적인 칙칙함',
        text: '整体偏暗沉',
      },
      {
        value: '특별한 고민이 없어요',
        text: '没有特别在意的',
      },
    ],
  },
  sleep: {
    id: 'sleep',
    label: '作息习惯',
    prompt: '最近的睡眠时间和质量如何？',
    options: [
      {
        value: '5시간 미만이고 자주 깨요',
        text: '不足 5 小时，且容易醒',
      },
      {
        value: '5~6시간 정도 자요',
        text: '约 5–6 小时',
      },
      {
        value: '6~7시간 정도 무난하게 자요',
        text: '约 6–7 小时，睡得尚可',
      },
      {
        value: '7시간 이상 숙면해요',
        text: '至少 7 小时，睡眠安稳',
      },
    ],
  },
  sensitivity: {
    id: 'sensitivity',
    label: '敏感反应',
    prompt: '换用新的护肤品时，您的皮肤通常有什么反应？',
    options: [
      {
        value: '높음',
        text: '容易刺痛或泛红',
      },
      {
        value: '보통',
        text: '偶尔不适',
      },
      {
        value: '낮음',
        text: '几乎没有特别反应',
      },
      {
        value: '잘 모르겠어요',
        text: '不确定',
      },
    ],
  },
  breakoutFrequency: {
    id: 'breakoutFrequency',
    label: '痘痘频率',
    prompt: '您多久会出现痘痘？',
    options: [
      {
        value: '항상 여러 개가 있어요',
        text: '经常同时有好几颗',
      },
      {
        value: '한 달에 2~3번 생겨요',
        text: '每月两三次',
      },
      {
        value: '피곤하거나 특정 시기에만 생겨요',
        text: '仅在疲劳或特定时期出现',
      },
      {
        value: '거의 생기지 않아요',
        text: '几乎不会',
      },
    ],
  },
  sunExposure: {
    id: 'sunExposure',
    label: '日晒习惯',
    prompt: '平时的户外活动与防晒习惯如何？',
    options: [
      {
        value: '야외 활동이 많고 선크림은 잘 안 발라요',
        text: '户外时间长，很少用防晒',
      },
      {
        value: '야외 활동이 많지만 선크림을 챙겨요',
        text: '户外时间长，会注意防晒',
      },
      {
        value: '주로 실내에 있고 가끔 발라요',
        text: '大多在室内，偶尔用防晒',
      },
      {
        value: '대부분 실내에 있어요',
        text: '几乎一直在室内',
      },
    ],
  },
  gender: {
    id: 'gender',
    label: '基本信息',
    prompt: '请选择您的性别。',
    options: [
      {
        value: '남성',
        text: '男',
      },
      {
        value: '여성',
        text: '女',
      },
    ],
  },
  ageRange: {
    id: 'ageRange',
    label: '基本信息',
    prompt: '您的年龄段是？',
    options: [
      {
        value: '10대',
        text: '10–19 岁',
      },
      {
        value: '20대',
        text: '20–29 岁',
      },
      {
        value: '30대',
        text: '30–39 岁',
      },
      {
        value: '40대',
        text: '40–49 岁',
      },
      {
        value: '50대 이상',
        text: '50 岁及以上',
      },
    ],
  },
  youngConcern: {
    id: 'youngConcern',
    label: '当前关注',
    prompt: '您现在最想改善哪种状况？',
    options: [
      {
        value: '갑작스러운 트러블과 붉은 자국',
        text: '突然冒痘或留下红印',
      },
      {
        value: '넓어지는 모공과 과도한 피지',
        text: '毛孔明显、出油多',
      },
      {
        value: '푸석하고 칙칙한 피부 톤',
        text: '肤色暗沉、缺乏光泽',
      },
      {
        value: '세안 후 유독 심한 속당김',
        text: '洁面后明显紧绷',
      },
      {
        value: '특별한 고민 없이 현재 상태를 유지하고 싶어요',
        text: '保持现状即可',
      },
    ],
  },
  youngOilTiming: {
    id: 'youngOilTiming',
    label: '出油规律',
    prompt: '一天中，什么时候开始感觉脸上出油？',
    options: [
      {
        value: '오전부터 금방',
        text: '从早上就开始',
      },
      {
        value: '점심 지나서 오후쯤',
        text: '午后开始',
      },
      {
        value: '저녁이나 밤늦게쯤 / 유분이 거의 없음',
        text: '傍晚以后，或几乎不出油',
      },
      {
        value: '유분과 건조함이 모두 크게 느껴지지 않아요',
        text: '出油和干燥都不明显',
      },
    ],
  },
  matureConcern: {
    id: 'matureConcern',
    label: '当前关注',
    prompt: '您现在最想改善哪种状况？',
    options: [
      {
        value: '탄력 저하와 미세한 주름',
        text: '弹性下降、细纹明显',
      },
      {
        value: '쉽게 붉어지고 따가운 예민함',
        text: '容易泛红或有刺痛感',
      },
      {
        value: '짙어지는 잡티와 기미, 칙칙한 톤',
        text: '色斑加深、肤色暗沉',
      },
      {
        value: '아무리 발라도 해소되지 않는 극심한 건조함',
        text: '涂抹护肤品后仍很干燥',
      },
      {
        value: '특별한 고민 없이 현재 상태를 유지하고 싶어요',
        text: '保持现状即可',
      },
    ],
  },
  matureRecovery: {
    id: 'matureRecovery',
    label: '恢复状态',
    prompt: '枕印会留很久，或一到换季皮肤就容易不稳定吗？',
    options: [
      {
        value: '피부 회복이 느리다고 확연히 느껴요',
        text: '是的，明显比以前恢复得慢',
      },
      {
        value: '컨디션이나 계절에 따라 가끔 그래요',
        text: '偶尔会，取决于状态或季节',
      },
      {
        value: '아직은 탄탄하고 회복이 빠른 편이에요',
        text: '不会，皮肤弹性和恢复状态都不错',
      },
    ],
  },
  afterCleanse: {
    id: 'afterCleanse',
    label: '洁面感受',
    prompt: '洁面后不涂护肤品，约半小时后有什么感觉？',
    options: [
      {
        value: '전체적으로 당기고 건조해요',
        text: '全脸紧绷干燥',
      },
      {
        value: '당김이나 번들거림 없이 편안해요',
        text: '舒适，不干也不油',
      },
      {
        value: 'T존만 번들거려요',
        text: '只有 T 区（额头、鼻子）出油',
      },
      {
        value: '얼굴 전체가 번들거리고 유분이 올라와요',
        text: '全脸都油亮',
      },
    ],
  },
  routineStyle: {
    id: 'routineStyle',
    label: '护理偏好',
    prompt: '哪种日常护肤方式最适合您？',
    options: [
      {
        value: '올인원 마니아',
        text: '一瓶多效，简单快捷',
      },
      {
        value: '미니멀리스트',
        text: '精简到两三步就好',
      },
      {
        value: '베이직 정석',
        text: '习惯爽肤水、精华、面霜的基础流程',
      },
      {
        value: '맥시멀리스트',
        text: '愿意尝试更多步骤',
      },
    ],
  },
  avoidPreference: {
    id: 'avoidPreference',
    label: '使用偏好',
    prompt: '选护肤品时，您最想避开什么？',
    options: [
      {
        value: '강한 향',
        text: '浓烈的人工香味',
      },
      {
        value: '무겁고 답답한 사용감',
        text: '厚重闷肤的质地',
      },
      {
        value: '끈적거리는 잔여감',
        text: '黏腻的残留感',
      },
      {
        value: '없음',
        text: '没有特别要避开的',
      },
    ],
  },
}
