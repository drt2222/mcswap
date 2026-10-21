# 真实 MCP 接入说明

麦麦换一换通过麦当劳官方 MCP 获取餐品营养数据，以真实餐品组成用户餐盘，并在用户约束下计算替换方案。网页展示的是明确标注时间的调用快照，不把静态快照称为实时数据。

## 服务与实际工具

- Server：`https://mcp.mcd.cn`
- 传输：Streamable HTTP，支持 JSON 与 SSE 响应
- 认证：`Authorization: Bearer ${MCD_MCP_TOKEN}`
- 实际业务工具：`list-nutrition-foods`，参数 `{}`
- 运行代码：[scripts/sync.mjs](scripts/sync.mjs)
- 数据校验：[scripts/nutrition.mjs](scripts/nutrition.mjs)
- 发布数据：[public/data/nutrition.json](public/data/nutrition.json)

开发过程中已执行真实初始化、工具发现和营养查询；当前快照取得 160 条记录，合并 2 条字段完全一致的重复记录后得到 158 款餐品。获取时间保存在快照 `source.fetchedAt`，也显示在网页底部和来源说明。原始返回包含的跟踪等非必要字段不发布。

## 调用与处理流程

```mermaid
flowchart LR
  A[本机环境变量或 .env.local] --> B[MCP initialize]
  B --> C[notifications/initialized]
  C --> D[tools/list]
  D --> E[tools/call: list-nutrition-foods]
  E --> F[校验行数、字段、数值与重复记录]
  F --> G[原子替换营养快照]
  G --> H[静态网页加载快照]
  H --> I[锁定约束与替换组合穷举]
  I --> J[三方向建议与餐盘分享]
```

1. 从环境变量或本地 `.env.local` 读取 Token。无 Token 时明确退出。
2. 以 MCP 协议版本 `2025-03-26` 发起初始化，后续使用服务器协商版本；若返回会话 ID，带入后续请求。
3. 发送初始化完成通知并查询工具列表，确认营养查询工具存在。
4. 调用 `list-nutrition-foods`，读取 `structuredContent`；兼容文本中的原始 JSON。
5. 严格解析表格，验证列名、行数、非负有限数值；缺失值不当成零，冲突重复记录导致整个同步失败。
6. 只输出名称、稳定 ID、本地分类、营养数值及来源元数据。全部验证后原子替换快照；失败保留原快照。
7. 浏览器只加载脱敏后的快照，不访问 MCP、不接收 Token。

## 复现真实调用

需要 Node.js 22+ 与自行申请的 [官方 MCP Token](https://open.mcd.cn/mcp)。

```sh
npm ci
cp .env.example .env.local
# 用编辑器在 .env.local 填写 MCD_MCP_TOKEN，勿提交此文件
npm run sync
npm test
npm run dev
```

配置示例见 [mcp-config.example.json](mcp-config.example.json)。这是支持环境变量插值的 MCP 客户端的配置示例；具体客户端的插值语法以其文档为准。本项目同步脚本直接读取环境变量，不依赖客户端插值。

测试、构建与公开演示不需要配置 Token，也不会在部署时触发账户操作。更新快照后，应先审查公开字段和测试结果，再提交。

## 数据口径与业务价值

数值来自 MCP；单位与单份计算口径独立核对自 [麦当劳官方营养计算器](https://www.mcdonalds.com.cn/nutrition_calculator)：能量为千焦 / 大卡，蛋白质、脂肪、碳水为克，钠、钙为毫克。计算器标注的配方数据更新时间不等于 MCP 抓取时间，本项目不声称抓取即代表配方更新。

原始接口给出单品列表。本项目将其变为可解释的决策辅助：保留用户锁定的餐品、限定最多改变的格数、分别寻找更低能量 / 更多蛋白质 / 更低钠的方案，同时展示其他指标的代价。它不生成虚构餐品、价格、优惠或营养数值。

分类为本地按名称整理的粗粒度类别，不是官方分类，也不代表口味等价或同一价格。不同规格按名称区分；供应、过敏原、价格、个人健康状况不参与计算。产品仅作信息比较，不构成医疗、营养处方或购买建议。
