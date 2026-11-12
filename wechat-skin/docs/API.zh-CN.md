# CastShop 肌肤测评接口

## 默认路径：访客测评（无需会员 / 无需 wx.login）

将 https://kai.blacksmithio.com 配为 request 合法域名。POST /skin-test/analyze（JSON，最大 2 KiB），不传 Authorization、openid、cookie、会员 ID 或照片。实例限流返回 429，稍后可重新提交；访客不写入会员数据库，无历史可查。网络失败不是示例模式。

请求样例：见 [guest-request.json](../examples/guest-request.json)。lang 为 zh 或 ko；consent 必须为 true；answers 包含本次 12 题的选项序号（从 0 开始，须与 core/questions.js 的顺序一致）。photo 为 null 或仅含 redness、shine、darkTone、texture 四个 0–1 数值的对象。前端在设备内提取摘要；不要传 data URL 或本地路径。
成功 200，直接读取 score、type、summary、metrics、morning、evening、priority、caution、hasPhotoAnalysis、version。此路由不提供订单、商品、登录及读写会员记录的能力。

    curl --fail-with-body 'https://kai.blacksmithio.com/skin-test/analyze' -H 'Content-Type: application/json' --data-binary @examples/guest-request.json

## 可选会员路径：边界与配置

客户端只调用 CastShop HTTPS 服务，不连接 MongoDB、SQLite 或外部 AI。生产地址为 https://castshop.blacksmithio.com/api；接口路径均相对此根地址。测试域名、测试会员及密码请通过团队的安全渠道获取。客户端不应内置共享 token、AppSecret、JWT 签名密钥或数据库凭证。

| 场景 | 方法和路径 | 返回 |
| --- | --- | --- |
| 已有会员登录 | POST /login | 200；读取 accessToken 或 token |
| 提交并保存 | POST /me/skin-diagnosis | 201；返回完整记录 |
| 读取最近结果 | GET /me/skin-diagnosis/latest | 200；无记录 404 |
| 查询历史（接口说明，未制作列表页面） | GET /me/skin-diagnosis/history?page=1&size=10 | 200；items、page、size、total |
| 核验公开商品 | GET /products/public/{productId}?context=brand | 200；返回商品对象；404/410 不再展示 |

### 认证

已有密码会员：以 JSON 提交 {"email":"<测试会员邮箱>","password":"<输入的密码>"} 至 /login。后续请求发送 Authorization: Bearer <CastShop accessToken> 及 Content-Type: application/json。示例项目只在 App 内存保存访问令牌；进程重启需再登录，401 清除会话，不静默重放写操作。不保存密码、refreshToken 或原图。

不支持把微信 openid、wx.login 返回的 code、微信 access_token 直接当作 CastShop Bearer。如果要接微信快捷登录，需要双方另约服务端换票及账号绑定接口；服务端验证微信登录凭证并映射会员后，再下发该会员的 CastShop 令牌。不要将 AppSecret 放入小程序，也不要用共享会员实现访客入口。当前交付不依赖尚不存在的微信登录接口。

### 提交与照片

完整可复制的请求见 [analyze-request.json](../examples/analyze-request.json)，完整响应结构见 [analyze-response.json](../examples/analyze-response.json)。不要在日志、工单或截图中贴真实令牌、密码、面部图片或完整含照片的请求。

- 固定 analysisLevel 为 full，answers 使用 core/questions.js 内的 id/value；例如显示「容易刺痛或泛红」，实际提交 sensitivity = "높음"。不能把显示文字翻译后作为协议值发送。
- 基本字段 gender、ageRange；10–29 岁发送 ageCourse=A_10_20、youngConcern、youngOilTiming；30 岁以上发送 ageCourse=B_30_50、matureConcern、matureRecovery。两个分支互斥。
- 公共题 afterCleanse、routineStyle、avoidPreference、sensitivity、breakoutFrequency、sunExposure、toneConcern、sleep。共 12 个用户答案，另加 1 个派生字段 ageCourse。
- 无照片传 images: []；有照片传 images: ["data:image/jpeg;base64,<实际内容>"] 等正确 MIME 的 data URL。不可传本地路径、HTTP 地址、多张图片或 multipart。当前使用 wx.request JSON，不使用 wx.uploadFile。
- 选择照片后仅在提交时读取；最长边目标 1200 像素，压缩质量 82，客户端限制压缩后 2 MiB。服务端仍有独立大小及代理限制。非支持格式、超限或授权失败时可以重选或跳过，绝不暗中忽略已选择的照片。
- 目标引擎以问卷为主。照片中央的颜色、亮度和明暗仅作辅助，不进行脸部检测。是否参与分析看 hasPhotoAnalysis，不是看 imageCount。服务端保存问卷、结果与照片计数，不在诊断记录中写入原图。分析前需让客户看到用途、同意说明及不上传的选择。

示例（仅限获准的测试环境；从项目根目录执行；该 POST 会写入一条记录）：

```sh
# 事先在本地环境设置 CASTSHOP_API_BASE 和 CASTSHOP_TEST_TOKEN；不要提交这些变量的值
curl --fail-with-body -X POST "${CASTSHOP_API_BASE:?}/me/skin-diagnosis" \
  -H "Authorization: Bearer ${CASTSHOP_TEST_TOKEN:?}" \
  -H 'Content-Type: application/json' --data-binary @examples/analyze-request.json
```

### 解析与商品

响应根对象直接包含 diagnosisId、savedAt、imageCount、hasPhotoAnalysis、diagnosis、recommendations；不是 data.data。综合分读取 diagnosis.professionalReport.overallScore.score，五项指标读取 categoryAnalysis，四周计划读取 fourWeekRoadmap。综合分越高越稳定，分项分数越高越需要关注。客户端不通过问卷或照片数量推算服务端分数。

从 recommendations.routine[].products[] 与 priceTiers[].products[] 合并去重；用 productId（缺失时 id）查询当前公开目录，再核对 ID 和状态。卡片和详情均不使用过期推荐价格/图片兜底；目录查询异常可重试，下架或不匹配的商品不展示。价格用韩元 ₩，没有汇率换算。推荐理由和已登记成分分开，不把商品名推断的功效当作已验证配方。接入商城时使用核验后的商品 ID 映射中国商城 SKU，不按名称模糊跳转。

### 错误策略

400：检查键、枚举值、分支、图片格式；401：会员凭证失效或登录信息错误；403：账号或资源无权限；404：没有最近记录/商品；413：换小图或不传图；429：稍后再试；5xx、非 JSON、网络失败或超时（65 秒）：提示异常，不生成示例结果、不自动重复 POST。若可能已提交成功，请先用同一会员查看最近报告及日期。重复提交可能生成多条记录。
