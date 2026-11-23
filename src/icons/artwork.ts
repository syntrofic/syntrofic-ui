type Point = readonly [x: number, y: number]
export type IconCategory = 'actions' | 'navigation' | 'content' | 'status' | 'devices'

const number = (value: number) => Number(value.toFixed(3))
const point = ([x, y]: Point) => `${number(x)} ${number(y)}`

function disc(x: number, y: number, radius: number, clockwise = true) {
  const r = number(radius)
  const curve = `A${r} ${r} 0 0 ${Number(clockwise)}`
  return `M${point([x + radius, y])}${curve} ${point([x - radius, y])}${curve} ${point([x + radius, y])}Z`
}

function box(x: number, y: number, width: number, height: number, radius = 1, clockwise = true) {
  const right = x + width
  const bottom = y + height
  const r = Math.min(radius, width / 2, height / 2)
  const start = `M${x + r} ${y}`
  return clockwise
    ? `${start}H${right - r}Q${right} ${y} ${right} ${y + r}V${bottom - r}Q${right} ${bottom} ${right - r} ${bottom}H${x + r}Q${x} ${bottom} ${x} ${bottom - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
    : `${start}Q${x} ${y} ${x} ${y + r}V${bottom - r}Q${x} ${bottom} ${x + r} ${bottom}H${right - r}Q${right} ${bottom} ${right} ${bottom - r}V${y + r}Q${right} ${y} ${right - r} ${y}H${x + r}Z`
}

const ring = (x: number, y: number, r: number, width = 2.25) => disc(x, y, r) + disc(x, y, r - width, false)
const frame = (x: number, y: number, w: number, h: number, radius = 3, width = 2.25) =>
  box(x, y, w, h, radius) + box(x + width, y + width, w - width * 2, h - width * 2, Math.max(.35, radius - width), false)

function polygon(...vertices: Point[]) {
  const area = vertices.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = vertices[(index + 1) % vertices.length]!
    return sum + x * nextY - nextX * y
  }, 0)
  return 'M' + (area < 0 ? vertices.reverse() : vertices).map(point).join('L') + 'Z'
}

function segment([x, y]: Point, [endX, endY]: Point, width: number) {
  const radius = width / 2
  const length = Math.hypot(endX - x, endY - y)
  const dx = (endY - y) * radius / length
  const dy = (x - endX) * radius / length
  const arc = `A${radius} ${radius} 0 0 1`
  return `M${point([x + dx, y + dy])}L${point([endX + dx, endY + dy])}${arc} ${point([endX - dx, endY - dy])}L${point([x - dx, y - dy])}${arc} ${point([x + dx, y + dy])}Z`
}

// Each segment is a filled capsule. Overlapping contours use the same winding on all three renderers.
const line = (...points: Point[]) => points.slice(1).map((end, index) => segment(points[index]!, end, 2.25)).join('')

export interface SyntroficIconDefinition {
  category: IconCategory
  en: string
  zh: string
  keywords: string
  path: string
}

const icon = (category: IconCategory, en: string, zh: string, path: string, keywords = ''): SyntroficIconDefinition =>
  ({ category, en, zh, keywords, path })

const cross = (x: number, y: number, r: number) => line([x - r, y - r], [x + r, y + r]) + line([x + r, y - r], [x - r, y + r])
const tick = (x: number, y: number, size: number) => line([x, y], [x + size * .36, y + size * .32], [x + size, y - size * .35])
const starPoints = (x: number, y: number, radius: number) => Array.from({ length: 10 }, (_, index): Point => {
  const angle = index * Math.PI / 5 - Math.PI / 2
  const distance = radius * (index % 2 === 0 ? 1 : .48)
  return [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]
})
const starOutline = starPoints(12, 12, 9)

export const syntroficIcons = {
  plus: icon('actions', 'Add', '添加', line([5, 12], [19, 12]) + line([12, 5], [12, 19]), 'plus new 创建 新增'),
  minus: icon('actions', 'Minus', '减少', line([5, 12], [19, 12]), 'subtract 减号'),
  close: icon('actions', 'Close', '关闭', cross(12, 12, 6), 'cancel dismiss 取消'),
  check: icon('actions', 'Check', '勾选', tick(4.5, 12.5, 15), 'tick done confirm 确认 对号'),
  'check-double': icon('actions', 'Double check', '双勾', tick(3, 12.25, 11) + line([12.5, 15.5], [14, 17], [21, 9]), 'read 已读'),
  search: icon('actions', 'Search', '搜索', ring(10.5, 10.5, 7.1) + line([15.75, 15.75], [20.5, 20.5]), 'find magnifier 查找 放大镜'),
  filter: icon('actions', 'Filter', '筛选', polygon([3, 4], [21, 4], [21, 6.2], [15, 13], [15, 18], [9, 21], [9, 13], [3, 6.2]), 'funnel 过滤 漏斗'),
  edit: icon('actions', 'Edit', '编辑', polygon([3.4, 16.7], [15.5, 4.6], [19.4, 8.5], [7.3, 20.6], [3, 21]) + polygon([17, 3.1], [18.2, 2.6], [21.4, 5.8], [20.9, 7]), 'pencil 修改'),
  copy: icon('actions', 'Copy', '复制', frame(8, 7, 13, 14) + line([4.2, 15.5], [4.2, 5.2], [5.5, 3.8], [15.5, 3.8]), 'duplicate 拷贝'),
  save: icon('actions', 'Save', '保存', frame(3, 3, 18, 18) + frame(7, 13, 10, 7, 2, 1.8) + box(7, 3.25, 8, 5, 1.15), 'disk 存盘'),
  trash: icon('actions', 'Delete', '删除', frame(5, 7, 14, 14, 3) + line([3, 7], [21, 7]) + line([8, 7], [8, 4], [16, 4], [16, 7]) + line([10, 11], [10, 16.5]) + line([14, 11], [14, 16.5]), 'trash remove 垃圾桶'),
  upload: icon('actions', 'Upload', '上传', line([4, 15], [4, 20], [20, 20], [20, 15]) + line([12, 15], [12, 4]) + line([7.5, 8.5], [12, 4], [16.5, 8.5]), 'import 导入'),
  download: icon('actions', 'Download', '下载', line([4, 15], [4, 20], [20, 20], [20, 15]) + line([12, 4], [12, 15]) + line([7.5, 10.5], [12, 15], [16.5, 10.5]), 'export 导出'),
  refresh: icon('actions', 'Refresh', '刷新', 'M21 10A9.25 9.25 0 1 0 19.8 18.8L18.1 17.2A7 7 0 1 1 19 10ZM15 10.8H21.5V4.3Z', 'reload sync 重试 同步'),
  share: icon('actions', 'Share', '分享', line([6, 12], [18, 5]) + line([6, 12], [18, 19]) + disc(5.5, 12, 3) + disc(18.5, 5, 3) + disc(18.5, 19, 3), 'send 转发'),
  'more-horizontal': icon('actions', 'More horizontal', '更多', disc(5.5, 12, 1.8) + disc(12, 12, 1.8) + disc(18.5, 12, 1.8), 'more ellipsis 操作'),
  'more-vertical': icon('actions', 'More vertical', '更多纵向', disc(12, 5.5, 1.8) + disc(12, 12, 1.8) + disc(12, 18.5, 1.8), 'ellipsis 菜单'),

  home: icon('navigation', 'Home', '首页', 'M2.5 10.2 10.3 3.4Q12 2 13.7 3.4L21.5 10.2 19.8 12.2 19 11.5V19Q19 21 17 21H14V15H10V21H7Q5 21 5 19V11.5L4.2 12.2Z', 'house 主页'),
  menu: icon('navigation', 'Menu', '菜单', box(3.5, 5.5, 17, 2.25, 1.125) + box(3.5, 10.875, 17, 2.25, 1.125) + box(3.5, 16.25, 12.5, 2.25, 1.125), 'hamburger 导航'),
  'chevron-left': icon('navigation', 'Chevron left', '左展开箭头', line([14.5, 5.5], [8, 12], [14.5, 18.5]), 'back 向左 上一页'),
  'chevron-right': icon('navigation', 'Chevron right', '右展开箭头', line([9.5, 5.5], [16, 12], [9.5, 18.5]), 'next 向右 下一页'),
  'chevron-up': icon('navigation', 'Chevron up', '上收起箭头', line([5.5, 14.5], [12, 8], [18.5, 14.5]), 'collapse 向上 收起'),
  'chevron-down': icon('navigation', 'Chevron down', '下展开箭头', line([5.5, 9.5], [12, 16], [18.5, 9.5]), 'expand 向下 下拉'),
  'chevrons-left': icon('navigation', 'Double chevron left', '双左箭头', line([11, 6], [5, 12], [11, 18]) + line([19, 6], [13, 12], [19, 18]), 'first 首页'),
  'chevrons-right': icon('navigation', 'Double chevron right', '双右箭头', line([5, 6], [11, 12], [5, 18]) + line([13, 6], [19, 12], [13, 18]), 'last 末页'),
  'arrow-up': icon('navigation', 'Arrow up', '向上箭头', line([12, 20], [12, 4]) + line([6.5, 9.5], [12, 4], [17.5, 9.5]), 'asc 升序'),
  'arrow-down': icon('navigation', 'Arrow down', '向下箭头', line([12, 4], [12, 20]) + line([6.5, 14.5], [12, 20], [17.5, 14.5]), 'desc 降序'),
  'arrow-left': icon('navigation', 'Arrow left', '向左箭头', line([20, 12], [4, 12]) + line([9.5, 6.5], [4, 12], [9.5, 17.5]), 'back 返回'),
  'arrow-right': icon('navigation', 'Arrow right', '向右箭头', line([4, 12], [20, 12]) + line([14.5, 6.5], [20, 12], [14.5, 17.5]), 'forward 前进'),
  'arrows-up-down': icon('navigation', 'Sort', '排序', line([8, 19], [8, 5]) + line([4.2, 8.8], [8, 5], [11.8, 8.8]) + line([16, 5], [16, 19]) + line([12.2, 15.2], [16, 19], [19.8, 15.2]), 'arrows up down 升降序'),
  'external-link': icon('navigation', 'External link', '外部链接', line([11, 5], [5, 5], [5, 19], [19, 19], [19, 13]) + line([14, 4], [20, 4], [20, 10]) + line([11, 13], [20, 4]), 'new tab 外链'),

  file: icon('content', 'File', '文件', 'M6 3H14L20 9V19Q20 21 18 21H6Q4 21 4 19V5Q4 3 6 3ZM6.25 5.25V18.75H17.75V10H13V5.25Z' + box(8, 13, 8, 2, 1) + box(8, 16, 5, 1.5, .75), 'document 文档'),
  form: icon('content', 'Form', '表单', frame(5, 3, 14, 18, 3) + box(8.1, 7, 7.8, 1.8, .9) + box(8.1, 11, 7.8, 1.8, .9) + box(8.1, 15, 4.5, 2.25, .85), 'fields inputs 表单字段'),
  folder: icon('content', 'Folder', '文件夹', 'M4.5 4.5H9.5L12.5 7H19.5Q21.5 7 21.5 9V18Q21.5 20 19.5 20H4.5Q2.5 20 2.5 18V6.5Q2.5 4.5 4.5 4.5ZM4.75 10V17.75H19.25V10Z', 'directory 目录'),
  archive: icon('content', 'Archive', '归档', frame(3, 3.5, 18, 6, 2, 1.8) + frame(4.5, 8.5, 15, 12, 2.4, 2) + box(9, 12, 6, 2, 1), 'store storage 档案'),
  book: icon('content', 'Book', '手册', 'M3 5Q7.5 3 12 6Q16.5 3 21 5V19.5Q16.5 17.5 12 20.5Q7.5 17.5 3 19.5ZM5.25 6.65V16.75Q8 16.2 10.9 17.4V8Q8.3 6.2 5.25 6.65ZM13.1 8V17.4Q16 16.2 18.75 16.75V6.65Q15.7 6.2 13.1 8Z', 'read docs 说明书'),
  calendar: icon('content', 'Calendar', '日历', frame(3, 5, 18, 16) + line([8, 3.3], [8, 7.7]) + line([16, 3.3], [16, 7.7]) + box(4.5, 10, 15, 2, .8) + box(8, 14.5, 3, 3, .7), 'date schedule 日期 计划'),
  clock: icon('content', 'Clock', '时钟', ring(12, 12, 9.25) + line([12, 7], [12, 12.2], [15.8, 14.2]), 'time 时间 历史'),
  image: icon('content', 'Image', '图片', frame(3, 4, 18, 16) + disc(15.8, 9, 1.6) + polygon([4.6, 16.8], [8.9, 11.5], [12.7, 15.2], [15.1, 13.2], [19.5, 18], [4.6, 18]), 'photo picture 相片'),
  table: icon('content', 'Table', '表格', frame(3, 4, 18, 16) + box(4.2, 8.6, 15.6, 2, .25) + box(4.2, 14, 15.6, 1.8, .25) + box(9, 9.4, 1.8, 9.5, .25) + box(14.7, 9.4, 1.8, 9.5, .25), 'grid rows columns 数据表'),
  layout: icon('content', 'Layout', '布局', frame(3, 4, 18, 16) + box(4.2, 8.5, 15.6, 2, .35) + box(9, 9.4, 2, 9.5, .35), 'window template 窗口 模板'),
  sidebar: icon('content', 'Sidebar', '侧栏', frame(3, 4, 18, 16) + box(4.2, 5.2, 6.7, 13.6, .5), 'panel rail 侧边栏'),
  'view-columns': icon('content', 'Columns', '分栏', frame(3, 4, 18, 16) + box(8.6, 5.2, 1.9, 13.6, .35) + box(13.5, 5.2, 1.9, 13.6, .35), 'columns view 列视图'),
  chart: icon('content', 'Chart', '图表', box(3.5, 12.25, 4.2, 7.75, 1.35) + box(9.9, 7.75, 4.2, 12.25, 1.35) + box(16.3, 4, 4.2, 16, 1.35), 'bar analytics 柱状图 统计'),
  message: icon('content', 'Message', '消息', 'M5.5 3.75H18.5Q21 3.75 21 6.25V15.75Q21 18.25 18.5 18.25H10.5L5 21V18.25Q3 17.9 3 15.75V6.25Q3 3.75 5.5 3.75ZM6 7.8V9.75H18V7.8ZM6 12V13.95H14V12Z', 'chat bubble 聊天 气泡'),
  link: icon('content', 'Link', '链接', line([9.5, 14.5], [14.5, 9.5]) + 'M8.8 6.5 10.8 4.5A5.5 5.5 0 0 1 18.6 12.3L16.5 14.4 14.9 12.8 17 10.7A3.25 3.25 0 0 0 12.4 6.1L10.4 8.1Z' + 'M15.2 17.5 13.2 19.5A5.5 5.5 0 0 1 5.4 11.7L7.5 9.6 9.1 11.2 7 13.3A3.25 3.25 0 0 0 11.6 17.9L13.6 15.9Z', 'chain 连接'),
  code: icon('content', 'Code', '代码', line([7.5, 7], [3.3, 12], [7.5, 17]) + line([16.5, 7], [20.7, 12], [16.5, 17]) + line([13.9, 4.75], [10.1, 19.25]), 'developer terminal 源码'),
  palette: icon('content', 'Palette', '调色板', 'M12 2.75A9.25 9.25 0 1 0 12 21.25C13.9 21.25 14.9 20 14.9 18.6C14.9 17.4 14.1 16.8 14.1 15.9C14.1 14.8 14.9 14.25 16 14.25H18.1C20 14.25 21.25 13 21.25 11.2A9.25 8.75 0 0 0 12 2.75Z' + disc(7, 10.9, 1.45) + disc(10.25, 7.25, 1.45) + disc(14.7, 7.2, 1.45) + disc(17.9, 10.25, 1.35), 'theme color 主题 颜色'),
  cube: icon('content', 'Cube', '立方体', polygon([12, 2.8], [21, 7.4], [12, 12], [3, 7.4]) + polygon([3, 9.4], [11, 13.5], [11, 21], [3, 16.9]) + polygon([13, 13.5], [21, 9.4], [21, 16.9], [13, 21]), 'component module 组件 模块'),
  spark: icon('content', 'Spark', '闪光', polygon([10, 2.5], [12.45, 8.55], [18.5, 11], [12.45, 13.45], [10, 19.5], [7.55, 13.45], [1.5, 11], [7.55, 8.55]) + polygon([19, 14], [20.1, 16.9], [23, 18], [20.1, 19.1], [19, 22], [17.9, 19.1], [15, 18], [17.9, 16.9]), 'agent ai sparkle 智能 助手'),

  info: icon('status', 'Information', '信息', ring(12, 12, 9.3) + disc(12, 8, 1.3) + box(10.875, 10.5, 2.25, 6, 1.125), 'help 提示'),
  success: icon('status', 'Success', '成功', ring(12, 12, 9.3) + tick(7.5, 12.2, 9), 'done 完成'),
  warning: icon('status', 'Warning', '警告', 'M10.7 3.8Q12 1.7 13.3 3.8L21.4 18Q22.4 20 20.1 20H3.9Q1.6 20 2.6 18ZM12 6.1 5.1 17.75H18.9Z' + box(11, 9.25, 2, 4.2, 1) + disc(12, 15.5, 1.05), 'alert caution 注意'),
  error: icon('status', 'Error', '错误', ring(12, 12, 9.3) + cross(12, 12, 3.3), 'failure 失败'),
  bell: icon('status', 'Bell', '铃铛', 'M12 3A5.75 5.75 0 0 1 17.75 8.75V11.75Q17.75 14.75 20 16V18H4V16Q6.25 14.75 6.25 11.75V8.75A5.75 5.75 0 0 1 12 3ZM9 19.25H15A3 2.35 0 0 1 9 19.25Z', 'notification 通知'),
  lock: icon('status', 'Lock', '锁定', frame(4, 9, 16, 12, 3) + 'M6.75 9.5V7.5A5.25 5.25 0 0 1 17.25 7.5V9.5H15V7.5A3 3 0 0 0 9 7.5V9.5Z' + box(10.85, 13.3, 2.3, 4.4, 1.15), 'secure password 密码'),
  eye: icon('status', 'Visible', '可见', 'M2 12Q6.4 5.5 12 5.5T22 12Q17.6 18.5 12 18.5T2 12ZM5 12Q8.2 16.25 12 16.25T19 12Q15.8 7.75 12 7.75T5 12Z' + disc(12, 12, 2.45), 'show view 显示 可见性'),
  'eye-slash': icon('status', 'Hidden', '隐藏', 'M3.4 10Q4.2 8.9 5.4 7.8L7 9.4Q5.8 10.4 5 12Q8.2 16.25 12 16.25Q13.1 16.25 14.3 15.8L16 17.5Q14 18.5 12 18.5Q6.4 18.5 2 12ZM8.3 6.3Q10.2 5.5 12 5.5Q17.6 5.5 22 12Q20.7 14 18.8 15.7L17.2 14.1Q18.2 13.2 19 12Q15.8 7.75 12 7.75Q10.9 7.75 10 8Z' + line([4, 4], [20, 20]), 'hide visibility 不可见'),
  star: icon('status', 'Favorite', '收藏', polygon(...starPoints(12, 12, 9.8)), 'rating favorite 星星 评分'),
  'star-outline': icon('status', 'Favorite outline', '收藏轮廓', line(...starOutline, starOutline[0]!), 'rating star 未评分 空心星'),
  dot: icon('status', 'Dot', '圆点', disc(12, 12, 3.1), 'bullet selection 标记 选中'),

  user: icon('devices', 'User', '用户', disc(12, 7.6, 4) + 'M4 20V18.5Q4 13.4 12 13.4T20 18.5V20Z', 'person account 账户'),
  users: icon('devices', 'People', '成员', disc(9, 7.5, 3.5) + 'M2.5 20V18Q2.5 13 9 13T15.5 18V20ZM15.1 4.3A3.55 3.55 0 0 1 16.4 11.3Q15.2 11.3 14.7 10.9Q16 9.3 16 7.5Q16 5.7 15.1 4.3ZM16 13Q21.5 13 21.5 17.8V20H17.5V18Q17.5 15 16 13Z', 'team group 团队 多人'),
  smartphone: icon('devices', 'Smartphone', '手机', frame(6, 2.75, 12, 18.5, 2.8) + box(9.7, 17.25, 4.6, 1.6, .8), 'native device mobile 原生 移动端'),
  monitor: icon('devices', 'Monitor', '显示器', frame(3, 4, 18, 13, 2.8) + line([12, 17], [12, 20]) + line([8, 20], [16, 20]), 'desktop screen 桌面 屏幕'),
  microphone: icon('devices', 'Microphone', '麦克风', box(9, 3, 6, 11, 3) + 'M5.5 11H7.75V12A4.25 4.25 0 0 0 16.25 12V11H18.5V12A6.5 6.5 0 0 1 13.125 18.4V20H16V22H8V20H10.875V18.4A6.5 6.5 0 0 1 5.5 12Z', 'voice record 语音 录音'),
  play: icon('devices', 'Play', '播放', 'M6 4.7Q6 3 7.6 3.75L20 11Q21.4 12 20 13L7.6 20.25Q6 21 6 19.3Z', 'start video 音视频'),
  pause: icon('devices', 'Pause', '暂停', box(6, 4, 4.5, 16, 1.25) + box(13.5, 4, 4.5, 16, 1.25), 'player 暂停播放'),
  stop: icon('devices', 'Stop', '停止', box(5, 5, 14, 14, 2.5), 'end 结束'),
  sun: icon('devices', 'Sun', '浅色', disc(12, 12, 4.8) + line([12, 2.8], [12, 4.6]) + line([12, 19.4], [12, 21.2]) + line([2.8, 12], [4.6, 12]) + line([19.4, 12], [21.2, 12]) + line([5.5, 5.5], [6.75, 6.75]) + line([17.25, 17.25], [18.5, 18.5]) + line([5.5, 18.5], [6.75, 17.25]) + line([17.25, 6.75], [18.5, 5.5]), 'light theme theme 日间 太阳'),
  moon: icon('devices', 'Moon', '深色', 'M12.9 2.9A9.15 9.15 0 1 0 21.1 14.1 7.9 7.9 0 0 1 12.9 2.9Z' + polygon([18.1, 3.3], [18.75, 5.2], [20.65, 5.85], [18.75, 6.5], [18.1, 8.4], [17.45, 6.5], [15.55, 5.85], [17.45, 5.2]), 'dark theme night 月亮 夜间'),
  wrench: icon('devices', 'Wrench', '工具', 'M16.4 3.1A5.7 5.7 0 0 0 9.35 10.15L3.6 15.9A3.18 3.18 0 0 0 8.1 20.4L13.85 14.65A5.7 5.7 0 0 0 20.9 7.6L17.45 11.05 14.25 9.75 12.95 6.55Z', 'settings tools 扳手'),
  'vue-platform': icon('devices', 'Vue platform', 'Vue 平台', polygon([2.75, 5.5], [7.5, 5.5], [12, 13.3], [16.5, 5.5], [21.25, 5.5], [12, 21]), 'framework web 前端'),
} satisfies Record<string, SyntroficIconDefinition>

export type SyntroficIconName = keyof typeof syntroficIcons

// Historical semantic names remain available through SIcon and SNativeIcon.
export const iconAliases = {
  chevron: 'chevron-right', funnel: 'filter', more: 'more-horizontal',
  theme: 'sun', native: 'smartphone', vue: 'vue-platform',
} as const satisfies Record<string, SyntroficIconName>

export const syntroficIconViewBox = '0 0 24 24'

export function getSyntroficIcon(name: string): SyntroficIconDefinition | undefined {
  const id = name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
  const canonical = Object.hasOwn(iconAliases, id) ? iconAliases[id as keyof typeof iconAliases] : id
  return Object.hasOwn(syntroficIcons, canonical) ? syntroficIcons[canonical as SyntroficIconName] : undefined
}
