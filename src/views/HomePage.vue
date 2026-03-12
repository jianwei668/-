<template>
  <div class="page-container home-page">
    <!-- 顶部统计卡片行 -->
    <div class="stats-row home-stats">
      <div class="stats-card" v-for="s in summaryStats" :key="s.label">
        <i :class="s.icon" :style="{ color: s.color }"></i>
        <div class="label">{{ s.label }}</div>
        <div class="value" :style="{ color: s.color }">{{ s.value }}</div>
        <div class="stats-trend" :class="s.trend > 0 ? 'up' : s.trend < 0 ? 'down' : ''">
          <i :class="s.trend > 0 ? 'ri-arrow-up-s-fill' : s.trend < 0 ? 'ri-arrow-down-s-fill' : 'ri-subtract-line'"></i>
          {{ s.trend > 0 ? '+' : '' }}{{ s.trend }}%
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="home-grid">
      <!-- 左列 -->
      <div class="home-left">
        <!-- 系统运行状态 -->
        <div class="panel">
          <div class="panel-title"><i class="ri-pulse-line"></i> 系统运行状态</div>
          <div class="system-status-grid">
            <div class="status-item" v-for="st in systemStatus" :key="st.label">
              <div class="status-label">{{ st.label }}</div>
              <div class="status-bar-wrap">
                <div class="status-bar-bg">
                  <div class="status-bar-fill" :style="{ width: st.percent + '%', background: st.color }"></div>
                </div>
                <span class="status-percent" :style="{ color: st.color }">{{ st.percent }}%</span>
              </div>
            </div>
            <div class="status-meta-row">
              <div class="meta-item">
                <i class="ri-wifi-line" style="color: var(--accent-green);"></i>
                <span>连接状态：<b style="color: var(--accent-green);">在线</b></span>
              </div>
              <div class="meta-item">
                <i class="ri-time-line" style="color: var(--text-highlight);"></i>
                <span>运行时间：<b style="color: var(--text-highlight);">{{ uptime }}</b></span>
              </div>
              <div class="meta-item">
                <i class="ri-database-2-line" style="color: #ffa500;"></i>
                <span>数据库：<b style="color: var(--accent-green);">正常</b></span>
              </div>
              <div class="meta-item">
                <i class="ri-temp-hot-line" style="color: var(--accent-red);"></i>
                <span>服务温度：<b style="color: var(--text-highlight);">{{ serverTemp }}°C</b></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷入口 -->
        <div class="panel">
          <div class="panel-title"><i class="ri-apps-line"></i> 功能快捷入口</div>
          <div class="quick-entry-grid">
            <div class="quick-card" v-for="entry in quickEntries" :key="entry.label" @click="$router.push(entry.route)">
              <div class="quick-icon" :style="{ background: entry.bg }">
                <i :class="entry.icon"></i>
              </div>
              <div class="quick-label">{{ entry.label }}</div>
              <div class="quick-desc">{{ entry.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 传感器状态概览 -->
        <div class="panel">
          <div class="panel-title">
            <span><i class="ri-sensor-line"></i> 传感器状态概览</span>
            <span class="panel-badge" :class="onlineSensorCount === sensors.length ? 'badge-green' : 'badge-yellow'">
              {{ onlineSensorCount }}/{{ sensors.length }} 在线
            </span>
          </div>
          <div class="sensor-grid">
            <div class="sensor-card" v-for="sensor in sensors" :key="sensor.id" :class="{ offline: !sensor.online }">
              <div class="sensor-top">
                <span class="sensor-name">{{ sensor.name }}</span>
                <span class="sensor-status" :style="{ color: sensor.online ? 'var(--accent-green)' : 'var(--accent-red)' }">
                  <i :class="sensor.online ? 'ri-checkbox-blank-circle-fill' : 'ri-close-circle-fill'"></i>
                  {{ sensor.online ? '在线' : '离线' }}
                </span>
              </div>
              <div class="sensor-info">
                <div><i class="ri-map-pin-line"></i> {{ sensor.location }}</div>
                <div><i class="ri-battery-2-charge-line"></i> {{ sensor.battery }}%</div>
                <div><i class="ri-signal-wifi-3-line"></i> {{ sensor.signal }}dBm</div>
              </div>
              <div class="sensor-value">
                <span class="sv-label">实时加速度</span>
                <span class="sv-num" :style="{ color: Math.abs(sensor.acc) > 0.15 ? 'var(--accent-red)' : 'var(--text-highlight)' }">
                  {{ sensor.acc.toFixed(4) }} g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中列 -->
      <div class="home-center">
        <!-- 能量演化趋势 -->
        <div class="panel" style="flex:1;">
          <div class="panel-title">
            <span><i class="ri-line-chart-line"></i> 能量演化趋势分析</span>
            <div class="chart-controls">
              <select class="form-select mini-select" v-model="energySlope">
                <option v-for="s in slopeOptions" :key="s" :value="s">{{ s }}</option>
              </select>
              <select class="form-select mini-select" v-model="energyCondition">
                <option v-for="c in conditionOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div ref="energyChartRef" class="chart-container" style="min-height:260px;"></div>
        </div>

        <!-- 稳定性等级分布 -->
        <div class="panel" style="flex:1;">
          <div class="panel-title">
            <span><i class="ri-pie-chart-line"></i> 稳定性等级分布统计</span>
            <div class="chart-controls">
              <button class="mini-btn" :class="{ active: distChartType === 'bar' }" @click="distChartType = 'bar'; updateDistChart()">
                <i class="ri-bar-chart-2-line"></i>
              </button>
              <button class="mini-btn" :class="{ active: distChartType === 'pie' }" @click="distChartType = 'pie'; updateDistChart()">
                <i class="ri-pie-chart-line"></i>
              </button>
            </div>
          </div>
          <div ref="distributionChartRef" class="chart-container" style="min-height:240px;"></div>
        </div>

        <!-- 动力响应概览 -->
        <div class="panel" style="flex:1;">
          <div class="panel-title">
            <span><i class="ri-earthquake-line"></i> 动力响应实时概览</span>
            <span class="panel-badge badge-blue">自动刷新 {{ refreshInterval }}s</span>
          </div>
          <div ref="dynamicChartRef" class="chart-container" style="min-height:220px;"></div>
        </div>
      </div>

      <!-- 右列 -->
      <div class="home-right">
        <!-- 最近评价结果 -->
        <div class="panel">
          <div class="panel-title"><i class="ri-shield-check-line"></i> 最近评价结果</div>
          <div class="eval-result-card" v-for="(ev, idx) in recentEvals" :key="idx">
            <div class="eval-header">
              <span class="eval-slope">{{ ev.slope }}</span>
              <span class="eval-condition">{{ ev.condition }}</span>
            </div>
            <div class="eval-body">
              <div class="eval-score" :style="{ color: ev.color }">{{ ev.score }}</div>
              <div class="eval-level" :style="{ color: ev.color, borderColor: ev.color }">{{ ev.level }}</div>
            </div>
            <div class="eval-time"><i class="ri-time-line"></i> {{ ev.time }}</div>
          </div>
        </div>

        <!-- 预警信息 -->
        <div class="panel">
          <div class="panel-title">
            <span><i class="ri-alarm-warning-line"></i> 预警信息</span>
            <span class="panel-badge badge-red">{{ alerts.filter(a => !a.resolved).length }} 条未处理</span>
          </div>
          <div class="alert-list">
            <div class="alert-item" v-for="(a, idx) in alerts" :key="idx" :class="'alert-' + a.level">
              <div class="alert-icon">
                <i :class="a.level === 'red' ? 'ri-error-warning-fill' : a.level === 'orange' ? 'ri-alarm-warning-fill' : 'ri-information-fill'"></i>
              </div>
              <div class="alert-content">
                <div class="alert-msg">{{ a.message }}</div>
                <div class="alert-meta">
                  <span><i class="ri-time-line"></i> {{ a.time }}</span>
                  <span :class="a.resolved ? 'resolved' : 'unresolved'">{{ a.resolved ? '已处理' : '未处理' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目信息 -->
        <div class="panel">
          <div class="panel-title"><i class="ri-book-2-line"></i> 科研项目信息</div>
          <div class="project-info-list">
            <div class="proj-row" v-for="p in projectInfo" :key="p.label">
              <span class="proj-label"><i :class="p.icon"></i> {{ p.label }}</span>
              <span class="proj-value">{{ p.value }}</span>
            </div>
          </div>
        </div>

        <!-- 活动时间线 -->
        <div class="panel">
          <div class="panel-title"><i class="ri-history-line"></i> 最近操作记录</div>
          <div class="timeline">
            <div class="timeline-item" v-for="(t, idx) in timeline" :key="idx">
              <div class="timeline-dot" :style="{ background: t.color }"></div>
              <div class="timeline-body">
                <div class="timeline-text">{{ t.text }}</div>
                <div class="timeline-time">{{ t.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部风险矩阵与数据概览 -->
    <div class="home-bottom-grid">
      <div class="panel">
        <div class="panel-title"><i class="ri-grid-line"></i> 风险等级矩阵</div>
        <div ref="riskMatrixRef" class="chart-container" style="min-height:240px;"></div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-bar-chart-grouped-line"></i> 各边坡综合评分对比</div>
        <div ref="slopeCompareRef" class="chart-container" style="min-height:240px;"></div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-radar-line"></i> 评价指标雷达图</div>
        <div ref="radarChartRef" class="chart-container" style="min-height:240px;"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'

const router = useRouter()

// ========== 响应式数据 ==========
const energyChartRef = ref(null)
const distributionChartRef = ref(null)
const dynamicChartRef = ref(null)
const riskMatrixRef = ref(null)
const slopeCompareRef = ref(null)
const radarChartRef = ref(null)

const charts = {}
const refreshInterval = ref(5)
let refreshTimer = null
let uptimeTimer = null
let uptimeSeconds = ref(0)

const energySlope = ref('龙潭边坡')
const energyCondition = ref('汶川波 0.20g')
const distChartType = ref('bar')

const slopeOptions = ['龙潭边坡', '青山边坡', '翠峰边坡', '金沙江边坡', '通江边坡', '望江边坡']
const conditionOptions = ['汶川波 0.20g', 'EL Centro波 0.15g', '人工波 0.30g', 'Kobe波 0.25g', '汶川波 0.40g', '人工波 0.10g']

const serverTemp = ref(42)

// 统计卡片
const summaryStats = reactive([
  { label: '边坡样本', value: '12', icon: 'ri-landscape-line', color: '#00eaff', trend: 8 },
  { label: '分析工况', value: '36', icon: 'ri-list-settings-line', color: '#00ff88', trend: 12 },
  { label: '数据记录', value: '5,248', icon: 'ri-database-2-line', color: '#a78bfa', trend: 24 },
  { label: '已完成评价', value: '28', icon: 'ri-check-double-line', color: '#ffa500', trend: 6 },
  { label: '预警事件', value: '5', icon: 'ri-alarm-warning-line', color: '#f24e4e', trend: -15 },
  { label: '在线传感器', value: '5/6', icon: 'ri-sensor-line', color: '#00eaff', trend: 0 }
])

// 系统状态
const systemStatus = reactive([
  { label: 'CPU 使用率', percent: 34, color: '#00eaff' },
  { label: '内存占用', percent: 62, color: '#00ff88' },
  { label: '磁盘使用', percent: 48, color: '#a78bfa' },
  { label: '数据库负载', percent: 21, color: '#ffa500' }
])

const uptime = ref('0天 0时 0分')

// 快捷入口
const quickEntries = [
  { label: '动力响应分析', icon: 'ri-earthquake-line', desc: '时程分析/频谱/反应谱', route: '/dynamic', bg: 'linear-gradient(135deg, #0a3d6b, #00eaff33)' },
  { label: '能量演化分析', icon: 'ri-flashlight-line', desc: '能量演化/分布/异常', route: '/energy', bg: 'linear-gradient(135deg, #3d0a0a, #f24e4e33)' },
  { label: '稳定性评价', icon: 'ri-shield-check-line', desc: 'AHP/模糊/灰色关联', route: '/stability', bg: 'linear-gradient(135deg, #0a3d1a, #00ff8833)' },
  { label: '实时监测', icon: 'ri-sensor-line', desc: '波形/传感器/预警', route: '/realtime', bg: 'linear-gradient(135deg, #3d2d0a, #ffa50033)' },
  { label: '基础数据管理', icon: 'ri-database-2-line', desc: '边坡/工况/数据导入', route: '/data', bg: 'linear-gradient(135deg, #1a0a3d, #a78bfa33)' },
  { label: '结果导出', icon: 'ri-file-download-line', desc: '报告/Excel/PDF导出', route: '/export', bg: 'linear-gradient(135deg, #0a2d3d, #00bcd433)' }
]

// 传感器
const sensors = reactive([
  { id: 'P1', name: 'P1-坡顶', location: '高程 120m', battery: 92, signal: -45, online: true, acc: 0.0324 },
  { id: 'P2', name: 'P2-坡中上', location: '高程 100m', battery: 87, signal: -52, online: true, acc: 0.0512 },
  { id: 'P3', name: 'P3-坡中', location: '高程 80m', battery: 78, signal: -58, online: true, acc: 0.0198 },
  { id: 'P4', name: 'P4-坡中下', location: '高程 60m', battery: 65, signal: -63, online: true, acc: 0.0756 },
  { id: 'P5', name: 'P5-坡脚', location: '高程 40m', battery: 43, signal: -71, online: true, acc: 0.0423 },
  { id: 'P6', name: 'P6-基准', location: '高程 20m', battery: 12, signal: -85, online: false, acc: 0 }
])

const onlineSensorCount = ref(5)

// 最近评价结果
const recentEvals = reactive([
  { slope: '龙潭边坡', condition: '汶川波 0.20g', score: '62.0', level: '欠稳定', color: '#f24e4e', time: '2026-03-10 14:32' },
  { slope: '龙潭边坡', condition: 'EL Centro波 0.15g', score: '48.5', level: '较稳定', color: '#ffa500', time: '2026-03-08 10:15' },
  { slope: '青山边坡', condition: '汶川波 0.20g', score: '35.2', level: '较稳定', color: '#00eaff', time: '2026-03-05 16:48' },
  { slope: '翠峰边坡', condition: 'Kobe波 0.25g', score: '82.3', level: '不稳定', color: '#f24e4e', time: '2026-02-20 09:22' }
])

// 预警信息
const alerts = reactive([
  { level: 'red', message: 'P4传感器加速度超限 (0.182g > 0.15g)', time: '2026-03-10 14:28', resolved: false },
  { level: 'orange', message: '翠峰边坡安全系数低于1.0 (Fs=0.87)', time: '2026-03-10 12:05', resolved: false },
  { level: 'orange', message: '龙潭边坡能量异常波动检测', time: '2026-03-09 18:42', resolved: true },
  { level: 'yellow', message: 'P6传感器电量不足 (12%)', time: '2026-03-09 08:15', resolved: false },
  { level: 'yellow', message: '数据库空间使用超过80%', time: '2026-03-08 22:30', resolved: true }
])

// 项目信息
const projectInfo = [
  { label: '项目名称', value: '基于能量演化的复杂岩性边坡动力稳定性评价方法', icon: 'ri-award-line' },
  { label: '项目级别', value: '国家级一般项目 (创新训练)', icon: 'ri-medal-line' },
  { label: '项目负责人', value: '汪洋', icon: 'ri-user-star-line' },
  { label: '指导教师', value: '赵延林', icon: 'ri-user-settings-line' },
  { label: '依托单位', value: '黑龙江科技大学', icon: 'ri-building-line' },
  { label: '研究周期', value: '2025.06 - 2026.06', icon: 'ri-calendar-line' }
]

// 活动时间线
const timeline = reactive([
  { text: '完成龙潭边坡汶川波稳定性评价', time: '2026-03-10 14:32', color: '#00eaff' },
  { text: '导出青山边坡评价报告 (PDF)', time: '2026-03-08 16:20', color: '#00ff88' },
  { text: '导入翠峰边坡Kobe波监测数据', time: '2026-03-07 09:45', color: '#a78bfa' },
  { text: '更新系统稳定性阈值参数', time: '2026-03-06 11:30', color: '#ffa500' },
  { text: 'P6传感器信号中断告警', time: '2026-03-05 22:18', color: '#f24e4e' },
  { text: '完成龙潭边坡EL Centro波分析', time: '2026-03-04 15:05', color: '#00eaff' },
  { text: '新增金沙江边坡基础数据', time: '2026-03-03 10:12', color: '#00ff88' },
  { text: '系统升级至 V2.0.0', time: '2026-03-01 08:00', color: '#a78bfa' }
])

// ========== 图表初始化 ==========
function initChart(el, key) {
  if (!el) return null
  if (charts[key]) { charts[key].dispose() }
  charts[key] = echarts.init(el)
  return charts[key]
}

// 能量趋势数据生成
function getEnergyData() {
  const n = 40
  const input = [], dissip = [], elastic = []
  const seed = energySlope.value.length + energyCondition.value.length
  for (let i = 0; i < n; i++) {
    const t = i * 0.5
    const e = (1 - Math.exp(-0.3 * t)) * (600 + seed * 8) + Math.sin(t * 0.5 + seed) * 30
    input.push(Math.round(e * 10) / 10)
    dissip.push(Math.round(e * (0.85 + 0.05 * Math.sin(t * 0.3)) * 10) / 10)
    elastic.push(Math.round((e - dissip[i]) * 10) / 10)
  }
  return { time: Array.from({ length: n }, (_, i) => (i * 0.5).toFixed(1) + 's'), input, dissip, elastic }
}

function updateEnergyChart() {
  const chart = charts.energy
  if (!chart) return
  const d = getEnergyData()
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    legend: { data: ['输入能量', '耗散能', '弹性能'], textStyle: { color: '#b0d0ff' }, top: 5 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category', data: d.time, boundaryGap: false,
      axisLabel: { color: '#b0d0ff', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } }
    },
    series: [
      { name: '输入能量', type: 'line', data: d.input, smooth: true, symbol: 'none', lineStyle: { width: 2, shadowColor: 'rgba(0,234,255,0.4)', shadowBlur: 6 }, itemStyle: { color: '#00eaff' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,234,255,0.15)' }, { offset: 1, color: 'rgba(0,234,255,0)' }]) } },
      { name: '耗散能', type: 'line', data: d.dissip, smooth: true, symbol: 'none', lineStyle: { width: 2, shadowColor: 'rgba(242,78,78,0.4)', shadowBlur: 6 }, itemStyle: { color: '#f24e4e' } },
      { name: '弹性能', type: 'line', data: d.elastic, smooth: true, symbol: 'none', lineStyle: { width: 2, shadowColor: 'rgba(0,255,136,0.4)', shadowBlur: 6 }, itemStyle: { color: '#00ff88' } }
    ]
  })
}

function updateDistChart() {
  const chart = charts.dist
  if (!chart) return
  const levels = ['稳定', '较稳定', '欠稳定', '不稳定']
  const colors = ['#00ff88', '#00eaff', '#ffa500', '#f24e4e']
  const values = [5, 4, 2, 1]
  if (distChartType.value === 'pie') {
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'item' },
      legend: { data: levels, textStyle: { color: '#b0d0ff' }, bottom: 5 },
      series: [{
        type: 'pie', radius: ['35%', '65%'], center: ['50%', '45%'],
        label: { color: '#b0d0ff', formatter: '{b}: {c}个 ({d}%)' },
        data: levels.map((name, i) => ({ name, value: values[i], itemStyle: { color: colors[i] } }))
      }]
    }, true)
  } else {
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category', data: levels,
        axisLabel: { color: '#b0d0ff', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1b5b9e' } }
      },
      yAxis: {
        type: 'value', name: '数量',
        nameTextStyle: { color: '#b0d0ff' },
        axisLabel: { color: '#b0d0ff' },
        splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } }
      },
      series: [{
        type: 'bar', barWidth: '45%',
        data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', color: '#b0d0ff', fontSize: 12 }
      }]
    }, true)
  }
}

// 动力响应概览
function updateDynamicChart() {
  const chart = charts.dynamic
  if (!chart) return
  const n = 200
  const time = []
  const series = []
  const points = ['P1-坡顶', 'P2-坡中上', 'P3-坡中', 'P4-坡中下', 'P5-坡脚']
  const colors = ['#00eaff', '#f24e4e', '#00ff88', '#ffa500', '#a78bfa']
  for (let i = 0; i < n; i++) time.push((i * 0.05).toFixed(2))
  points.forEach((name, idx) => {
    const data = []
    const amp = 0.08 + idx * 0.025
    const phase = idx * 0.4
    const now = Date.now() / 1000
    for (let i = 0; i < n; i++) {
      const t = i * 0.05
      data.push(Math.round((amp * Math.sin(2 * Math.PI * 2.5 * t + phase + now * 0.1) * Math.exp(-0.15 * t) + (Math.random() - 0.5) * 0.005) * 10000) / 10000)
    }
    series.push({
      name, type: 'line', data, symbol: 'none', smooth: true,
      lineStyle: { width: 1.5, color: colors[idx] },
      itemStyle: { color: colors[idx] }
    })
  })
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    legend: { data: points, textStyle: { color: '#b0d0ff', fontSize: 10 }, top: 0 },
    grid: { left: 50, right: 15, top: 30, bottom: 25 },
    xAxis: {
      type: 'category', data: time, boundaryGap: false,
      axisLabel: { color: '#b0d0ff', fontSize: 9, interval: 39 },
      axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: 'a (g)', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.15)' } }
    },
    series
  })
}

// 风险矩阵热力图
function initRiskMatrix() {
  const chart = charts.riskMatrix
  if (!chart) return
  const xData = ['极低', '低', '中', '高', '极高']
  const yData = ['极低', '低', '中', '高', '极高']
  const data = []
  const risk = [
    [1, 1, 2, 2, 3],
    [1, 2, 2, 3, 3],
    [2, 2, 3, 3, 4],
    [2, 3, 3, 4, 4],
    [3, 3, 4, 4, 5]
  ]
  const slopePositions = [
    { x: 1, y: 2, name: '龙潭' },
    { x: 0, y: 1, name: '青山' },
    { x: 3, y: 3, name: '翠峰' },
    { x: 2, y: 2, name: '金沙江' },
    { x: 0, y: 0, name: '通江' },
    { x: 1, y: 1, name: '望江' }
  ]
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      data.push([j, i, risk[i][j]])
    }
  }
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      ...techTooltip,
      formatter: p => {
        if (p.seriesType === 'heatmap') return `可能性: ${xData[p.data[0]]}<br>后果: ${yData[p.data[1]]}<br>风险等级: ${p.data[2]}`
        return p.name
      }
    },
    grid: { left: 60, right: 20, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: xData, name: '可能性', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } }, splitArea: { show: false } },
    yAxis: { type: 'category', data: yData, name: '后果严重度', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } }, splitArea: { show: false } },
    visualMap: { show: false, min: 1, max: 5, inRange: { color: ['#00ff8840', '#00eaff40', '#ffa50060', '#f24e4e70', '#ff2d2d90'] } },
    series: [
      {
        type: 'heatmap', data,
        label: { show: true, color: '#b0d0ff', fontSize: 11, formatter: p => '等级' + p.data[2] },
        itemStyle: { borderColor: '#0a1929', borderWidth: 2 }
      },
      {
        type: 'scatter', coordinateSystem: 'cartesian2d',
        data: slopePositions.map(s => ({ value: [s.x, s.y], name: s.name })),
        symbol: 'diamond', symbolSize: 18,
        itemStyle: { color: '#fff', borderColor: '#00eaff', borderWidth: 2 },
        label: { show: true, position: 'right', color: '#fff', fontSize: 10, formatter: p => p.name }
      }
    ]
  })
}

// 各边坡综合评分对比
function initSlopeCompare() {
  const chart = charts.slopeCompare
  if (!chart) return
  const slopes = ['龙潭', '青山', '翠峰', '金沙江', '通江', '望江']
  const scores = [62.0, 35.2, 82.3, 55.0, 22.4, 18.6]
  const colors = scores.map(s => s >= 76 ? '#f24e4e' : s >= 51 ? '#ffa500' : s >= 26 ? '#00eaff' : '#00ff88')
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 60, right: 20, top: 15, bottom: 30 },
    xAxis: {
      type: 'category', data: slopes,
      axisLabel: { color: '#b0d0ff' },
      axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: '综合得分', max: 100,
      nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } }
    },
    series: [{
      type: 'bar', barWidth: '50%',
      data: scores.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
      label: { show: true, position: 'top', color: '#b0d0ff', formatter: p => p.value.toFixed(1) },
      markLine: {
        silent: true,
        data: [
          { yAxis: 25, lineStyle: { color: '#00ff8880', type: 'dashed' }, label: { show: false } },
          { yAxis: 50, lineStyle: { color: '#00eaff80', type: 'dashed' }, label: { show: false } },
          { yAxis: 75, lineStyle: { color: '#ffa50080', type: 'dashed' }, label: { show: false } }
        ]
      }
    }]
  })
}

// 雷达图
function initRadarChart() {
  const chart = charts.radar
  if (!chart) return
  const indicators = [
    { name: '峰值加速度', max: 100 },
    { name: '放大系数', max: 100 },
    { name: '谱特征', max: 100 },
    { name: '能量耗散比', max: 100 },
    { name: '弹性能占比', max: 100 },
    { name: '安全系数', max: 100 }
  ]
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip },
    legend: { data: ['龙潭边坡', '青山边坡', '翠峰边坡'], textStyle: { color: '#b0d0ff' }, bottom: 0 },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      radius: '60%',
      axisName: { color: '#b0d0ff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.3)' } },
      splitArea: { areaStyle: { color: ['rgba(0,234,255,0.02)', 'rgba(0,234,255,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(27,91,158,0.4)' } }
    },
    series: [{
      type: 'radar',
      data: [
        { name: '龙潭边坡', value: [72, 65, 58, 70, 45, 48], lineStyle: { color: '#00eaff' }, itemStyle: { color: '#00eaff' }, areaStyle: { color: 'rgba(0,234,255,0.15)' } },
        { name: '青山边坡', value: [45, 42, 50, 38, 62, 70], lineStyle: { color: '#00ff88' }, itemStyle: { color: '#00ff88' }, areaStyle: { color: 'rgba(0,255,136,0.15)' } },
        { name: '翠峰边坡', value: [88, 82, 75, 85, 30, 25], lineStyle: { color: '#f24e4e' }, itemStyle: { color: '#f24e4e' }, areaStyle: { color: 'rgba(242,78,78,0.15)' } }
      ]
    }]
  })
}

// ========== 数据刷新 ==========
function refreshData() {
  sensors.forEach(s => {
    if (s.online) {
      s.acc = Math.round((Math.random() * 0.18 - 0.02) * 10000) / 10000
      s.signal = Math.round(-40 - Math.random() * 50)
    }
  })
  systemStatus.forEach(s => {
    s.percent = Math.min(95, Math.max(10, s.percent + Math.round((Math.random() - 0.5) * 6)))
  })
  serverTemp.value = Math.round((40 + Math.random() * 8) * 10) / 10
  updateDynamicChart()
}

function formatUptime(sec) {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${d}天 ${h}时 ${m}分`
}

// ========== 监听切换 ==========
watch([energySlope, energyCondition], () => {
  updateEnergyChart()
})

// ========== 生命周期 ==========
onMounted(() => {
  nextTick(() => {
    initChart(energyChartRef.value, 'energy')
    initChart(distributionChartRef.value, 'dist')
    initChart(dynamicChartRef.value, 'dynamic')
    initChart(riskMatrixRef.value, 'riskMatrix')
    initChart(slopeCompareRef.value, 'slopeCompare')
    initChart(radarChartRef.value, 'radar')

    updateEnergyChart()
    updateDistChart()
    updateDynamicChart()
    initRiskMatrix()
    initSlopeCompare()
    initRadarChart()
  })

  uptimeSeconds.value = 3 * 86400 + 7 * 3600 + 22 * 60
  uptime.value = formatUptime(uptimeSeconds.value)
  uptimeTimer = setInterval(() => {
    uptimeSeconds.value += 60
    uptime.value = formatUptime(uptimeSeconds.value)
  }, 60000)

  refreshTimer = setInterval(() => {
    refreshData()
  }, refreshInterval.value * 1000)

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  clearInterval(refreshTimer)
  clearInterval(uptimeTimer)
  Object.values(charts).forEach(c => c?.dispose())
})

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}
</script>

<style scoped>
.home-page {
  padding-bottom: 20px;
}

/* 统计卡片 */
.home-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}
.home-stats .stats-card {
  position: relative;
  overflow: hidden;
}
.stats-trend {
  font-size: 11px;
  margin-top: 4px;
  color: #8ab4f8;
}
.stats-trend.up { color: var(--accent-green); }
.stats-trend.down { color: var(--accent-red); }

/* 主网格 */
.home-grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 15px;
  margin-bottom: 15px;
}
.home-left, .home-center, .home-right {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 系统状态 */
.system-status-grid {
  padding: 10px;
}
.status-item {
  margin-bottom: 10px;
}
.status-label {
  font-size: 12px;
  color: #8ab4f8;
  margin-bottom: 4px;
}
.status-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(27, 91, 158, 0.2);
  border-radius: 3px;
  overflow: hidden;
}
.status-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s ease;
}
.status-percent {
  font-size: 11px;
  font-weight: bold;
  min-width: 35px;
  text-align: right;
}
.status-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(27, 91, 158, 0.2);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #8ab4f8;
}
.meta-item i { font-size: 13px; }
.meta-item b { font-size: 11px; }

/* 快捷入口 */
.quick-entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px;
}
.quick-card {
  background: var(--panel-bg);
  border: 1px solid rgba(27, 91, 158, 0.2);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
}
.quick-card:hover {
  border-color: var(--text-highlight);
  box-shadow: 0 0 15px rgba(0, 234, 255, 0.15);
  transform: translateY(-2px);
}
.quick-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  margin-bottom: 8px;
}
.quick-label {
  font-size: 13px;
  color: var(--text-main);
  font-weight: 600;
  margin-bottom: 3px;
}
.quick-desc {
  font-size: 10px;
  color: #6a8bb5;
}

/* 传感器 */
.sensor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px;
}
.sensor-card {
  background: rgba(0, 234, 255, 0.03);
  border: 1px solid rgba(27, 91, 158, 0.25);
  border-radius: 6px;
  padding: 8px;
  transition: all 0.3s;
}
.sensor-card:hover {
  border-color: var(--text-highlight);
}
.sensor-card.offline {
  opacity: 0.5;
  border-color: rgba(242, 78, 78, 0.3);
}
.sensor-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.sensor-name {
  font-size: 12px;
  color: var(--text-main);
  font-weight: 600;
}
.sensor-status {
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.sensor-status i { font-size: 8px; }
.sensor-info {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #6a8bb5;
  margin-bottom: 5px;
}
.sensor-info i { font-size: 10px; margin-right: 2px; }
.sensor-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 5px;
  border-top: 1px solid rgba(27, 91, 158, 0.15);
}
.sv-label { font-size: 10px; color: #6a8bb5; }
.sv-num { font-size: 13px; font-weight: bold; font-family: 'Courier New', monospace; }

/* 图表控件 */
.chart-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}
.mini-select {
  padding: 2px 6px !important;
  font-size: 11px !important;
  height: 24px !important;
  min-width: 0 !important;
  background: rgba(27, 91, 158, 0.2) !important;
  border: 1px solid rgba(27, 91, 158, 0.4) !important;
  color: #b0d0ff !important;
  border-radius: 4px !important;
}
.mini-btn {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(27, 91, 158, 0.4);
  background: rgba(27, 91, 158, 0.15);
  color: #6a8bb5;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.2s;
}
.mini-btn:hover, .mini-btn.active {
  border-color: var(--text-highlight);
  color: var(--text-highlight);
  background: rgba(0, 234, 255, 0.1);
}

/* 面板徽章 */
.panel-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.badge-green { background: rgba(0, 255, 136, 0.15); color: var(--accent-green); }
.badge-yellow { background: rgba(255, 165, 0, 0.15); color: #ffa500; }
.badge-red { background: rgba(242, 78, 78, 0.15); color: var(--accent-red); }
.badge-blue { background: rgba(0, 234, 255, 0.12); color: var(--text-highlight); }

/* 评价结果卡片 */
.eval-result-card {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.15);
  transition: background 0.2s;
}
.eval-result-card:hover { background: rgba(0, 234, 255, 0.03); }
.eval-result-card:last-child { border-bottom: none; }
.eval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.eval-slope { font-size: 13px; color: var(--text-main); font-weight: 600; }
.eval-condition { font-size: 11px; color: #6a8bb5; }
.eval-body {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}
.eval-score { font-size: 22px; font-weight: bold; font-family: 'Courier New', monospace; }
.eval-level {
  font-size: 12px;
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 4px;
  font-weight: 600;
}
.eval-time { font-size: 10px; color: #6a8bb5; }
.eval-time i { margin-right: 3px; }

/* 预警列表 */
.alert-list {
  max-height: 240px;
  overflow-y: auto;
}
.alert-item {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.1);
  transition: background 0.2s;
}
.alert-item:hover { background: rgba(0, 234, 255, 0.03); }
.alert-icon { font-size: 18px; padding-top: 2px; }
.alert-red .alert-icon { color: var(--accent-red); }
.alert-orange .alert-icon { color: #ffa500; }
.alert-yellow .alert-icon { color: #ffd700; }
.alert-msg { font-size: 12px; color: var(--text-main); margin-bottom: 3px; }
.alert-meta {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #6a8bb5;
}
.alert-meta i { margin-right: 2px; }
.unresolved { color: var(--accent-red); font-weight: 600; }
.resolved { color: var(--accent-green); }

/* 项目信息 */
.project-info-list {
  padding: 5px 0;
}
.proj-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 7px 12px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.1);
  gap: 10px;
}
.proj-row:last-child { border-bottom: none; }
.proj-label {
  font-size: 12px;
  color: #6a8bb5;
  white-space: nowrap;
}
.proj-label i { margin-right: 4px; color: var(--text-highlight); opacity: 0.6; }
.proj-value {
  font-size: 12px;
  color: var(--text-main);
  text-align: right;
  word-break: break-all;
}

/* 时间线 */
.timeline {
  padding: 5px 12px;
  max-height: 260px;
  overflow-y: auto;
}
.timeline-item {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  position: relative;
}
.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: -6px;
  width: 1px;
  background: rgba(27, 91, 158, 0.3);
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 3px;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}
.timeline-text { font-size: 12px; color: var(--text-main); }
.timeline-time { font-size: 10px; color: #6a8bb5; margin-top: 2px; }

/* 底部网格 */
.home-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
}

/* 响应式 */
@media (max-width: 1400px) {
  .home-grid {
    grid-template-columns: 280px 1fr 280px;
  }
  .home-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 1100px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
  .home-bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
