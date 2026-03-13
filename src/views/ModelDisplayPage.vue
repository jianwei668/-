<template>
  <div class="page-container">
    <div class="page-title">地质模型展示</div>

    <!-- Controls Bar -->
    <div class="filter-bar">
      <span class="form-label">边坡选择</span>
      <select class="form-select" style="width:160px;" v-model="selectedSlopeId" @change="rebuildChart">
        <option v-for="s in slopeProfiles" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <div class="view-tab-group">
        <button
          v-for="tab in viewTabs" :key="tab.key"
          :class="['model-view-tab', { active: viewMode === tab.key }]"
          @click="viewMode = tab.key; rebuildChart()"
        ><i :class="tab.icon"></i> {{ tab.label }}</button>
      </div>
      <div class="layer-toggles">
        <span
          v-for="tog in displayToggles" :key="tog.key"
          class="layer-tog"
          @click="tog.visible = !tog.visible; rebuildChart()"
        >
          <span class="tog-dot" :style="{ background: tog.visible ? tog.color : 'rgba(80,80,100,0.4)' }"></span>
          <span :style="{ color: tog.visible ? tog.color : '#555' }">{{ tog.label }}</span>
        </span>
      </div>
      <button class="form-btn form-btn-primary" style="margin-left:auto;" @click="rebuildChart">
        <i class="ri-refresh-line"></i> 刷新
      </button>
      <button class="form-btn" @click="exportImage">
        <i class="ri-image-line"></i> 导出图像
      </button>
    </div>

    <!-- Main Layout -->
    <div class="model-layout">
      <!-- Left Sidebar -->
      <div class="model-sidebar">
        <!-- Slope Params -->
        <div class="panel">
          <div class="panel-title"><i class="ri-landscape-line"></i> 边坡基本参数</div>
          <div class="param-info-grid">
            <div class="pi-row" v-for="p in activeSlope.params" :key="p.label">
              <span class="pi-key">{{ p.label }}</span>
              <span class="pi-val" :style="{ color: p.color || 'var(--text-highlight)' }">{{ p.value }}</span>
            </div>
          </div>
        </div>

        <!-- Layer Legend -->
        <div class="panel">
          <div class="panel-title"><i class="ri-layers-line"></i> 地质层序</div>
          <div class="geo-layers">
            <div class="geo-layer-row" v-for="layer in activeSlope.layers" :key="layer.name">
              <div class="geo-swatch" :style="{ background: layer.fillColor, borderColor: layer.strokeColor }"></div>
              <div class="geo-layer-detail">
                <div class="gl-name">{{ layer.name }}</div>
                <div class="gl-props"><span>E={{ layer.E }} GPa</span><span>φ={{ layer.phi }}°</span><span>ρ={{ layer.rho }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monitoring Points -->
        <div class="panel">
          <div class="panel-title">
            <span><i class="ri-map-pin-2-line"></i> 监测点</span>
            <span class="panel-badge badge-green">{{ activeSlope.monitorPoints.length }} 个</span>
          </div>
          <div class="monitor-pts">
            <div class="mp-row" v-for="pt in activeSlope.monitorPoints" :key="pt.id">
              <span class="mp-dot" :style="{ background: pt.color }"></span>
              <span class="mp-id">{{ pt.id }}</span>
              <span class="mp-pos">({{ pt.x }}, {{ pt.y }}) m</span>
              <span class="mp-badge" :class="pt.status">{{ pt.statusText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Chart Area -->
      <div class="model-main">
        <div class="panel model-chart-panel">
          <div class="panel-title">
            <span>
              <i :class="currentViewTab.icon"></i>
              {{ currentViewTab.label }} — {{ activeSlope.name }}
            </span>
            <div class="chart-meta-info">
              <span><i class="ri-ruler-line"></i> 比例 1:{{ activeSlope.scale }}</span>
              <span><i class="ri-focus-3-line"></i> 基准：{{ activeSlope.datum }}</span>
            </div>
          </div>
          <div ref="chartRef" class="model-chart-canvas"></div>
        </div>

        <!-- Analysis Info Cards -->
        <div class="analysis-card-row">
          <div class="panel analysis-card" v-for="card in activeSlope.analysisCards" :key="card.label">
            <i :class="card.icon" :style="{ color: card.color, fontSize: '20px' }"></i>
            <div class="ac-body">
              <div class="ac-label">{{ card.label }}</div>
              <div class="ac-value" :style="{ color: card.color }">{{ card.value }}</div>
              <div class="ac-unit">{{ card.unit }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

// ===================== Static Data =====================

const SLOPE_PROFILES = [
  {
    id: 'K78',
    name: 'K78 复合岩性边坡',
    scale: 1500,
    datum: '黄海高程',
    terrain: [[0, 72], [40, 72], [100, 65], [140, 30], [160, 20], [200, 20]],
    layerInterfaces: [
      { yBot: 0,  yTop: 18, fill: 'rgba(18,35,65,0.96)',  stroke: 'rgba(60,120,200,0.55)', label: '深部基岩',   labelX: 6,  labelY: 9  },
      { yBot: 18, yTop: 36, fill: 'rgba(22,55,72,0.92)',  stroke: 'rgba(50,140,120,0.5)',  label: '中风化岩',   labelX: 6,  labelY: 26 },
      { yBot: 36, yTop: 56, fill: 'rgba(40,68,42,0.87)',  stroke: 'rgba(80,138,60,0.45)',  label: '强风化岩',   labelX: 6,  labelY: 45 },
      { yBot: 56, yTop: 90, fill: 'rgba(65,55,28,0.82)',  stroke: 'rgba(140,108,50,0.45)', label: '残坡积层',   labelX: 6,  labelY: 63 },
    ],
    waterTable: [[0, 58], [40, 56], [100, 49], [140, 26], [160, 18], [200, 18]],
    failureArc: { cx: 135, cy: 100, r: 80.5, a1: -158.2, a2: -75.6 },
    monitorPoints: [
      { id: 'P1', x: 162, y: 22, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P2', x: 140, y: 33, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P3', x: 112, y: 47, color: '#ffa500', status: 'warning', statusText: '预警' },
      { id: 'P4', x: 82,  y: 62, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P5', x: 48,  y: 71, color: '#00ff88', status: 'normal',  statusText: '正常' },
    ],
    // Plan view data
    planContourLevels: [20, 30, 40, 50, 60, 70],
    params: [
      { label: '边坡高度',   value: '60 m' },
      { label: '坡面倾角',   value: '45°' },
      { label: '主要岩性',   value: '花岗岩 / 砂岩' },
      { label: '坡长',       value: '200 m' },
      { label: '内摩擦角',   value: '38°' },
      { label: '内聚力',     value: '85 kPa' },
      { label: '天然容重',   value: '26.5 kN/m³' },
      { label: '地震设防烈度', value: '8度 (0.20g)' },
    ],
    layers: [
      { name: '残坡积层',     fillColor: '#41371c', strokeColor: '#8a6d30', E: 0.05, phi: 25, rho: '1.90' },
      { name: '强风化花岗岩', fillColor: '#284428', strokeColor: '#508a3a', E: 0.8,  phi: 32, rho: '2.20' },
      { name: '中风化花岗岩', fillColor: '#173848', strokeColor: '#286a8a', E: 5.5,  phi: 42, rho: '2.55' },
      { name: '微风化基岩',   fillColor: '#0e2240', strokeColor: '#1a4a8a', E: 28,   phi: 52, rho: '2.70' },
    ],
    analysisCards: [
      { label: '静力安全系数 Fs',  value: '1.38', unit: '静力工况',    icon: 'ri-shield-check-line',    color: '#00ff88' },
      { label: '动力安全系数',     value: '1.12', unit: '8度地震工况', icon: 'ri-pulse-line',            color: '#ffa500' },
      { label: '潜在最大位移',     value: '18.6', unit: 'mm',         icon: 'ri-arrow-right-up-line',   color: '#00eaff' },
      { label: '综合稳定性等级',   value: '基本稳定', unit: '',         icon: 'ri-bar-chart-grouped-line', color: '#00eaff' },
    ],
  },
  {
    id: 'K92',
    name: 'K92 软岩边坡',
    scale: 1200,
    datum: '黄海高程',
    terrain: [[0, 62], [50, 62], [90, 56], [130, 22], [160, 15], [200, 15]],
    layerInterfaces: [
      { yBot: 0,  yTop: 14, fill: 'rgba(20,32,55,0.96)',  stroke: 'rgba(55,110,180,0.55)', label: '基岩',       labelX: 6,  labelY: 7  },
      { yBot: 14, yTop: 28, fill: 'rgba(35,50,65,0.9)',   stroke: 'rgba(60,130,110,0.5)',  label: '中风化页岩', labelX: 6,  labelY: 20 },
      { yBot: 28, yTop: 46, fill: 'rgba(50,60,42,0.85)',  stroke: 'rgba(90,130,55,0.45)',  label: '强风化页岩', labelX: 6,  labelY: 36 },
      { yBot: 46, yTop: 90, fill: 'rgba(72,60,30,0.8)',   stroke: 'rgba(140,110,45,0.45)', label: '坡积黏土',   labelX: 6,  labelY: 53 },
    ],
    waterTable: [[0, 50], [50, 48], [90, 43], [130, 18], [160, 13], [200, 13]],
    failureArc: { cx: 115, cy: 95, r: 75, a1: -155, a2: -70 },
    monitorPoints: [
      { id: 'P1', x: 158, y: 17, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P2', x: 135, y: 28, color: '#f24e4e', status: 'alarm',   statusText: '告警' },
      { id: 'P3', x: 108, y: 42, color: '#ffa500', status: 'warning', statusText: '预警' },
      { id: 'P4', x: 72,  y: 58, color: '#00ff88', status: 'normal',  statusText: '正常' },
    ],
    planContourLevels: [15, 25, 35, 45, 55, 62],
    params: [
      { label: '边坡高度',   value: '47 m' },
      { label: '坡面倾角',   value: '35°' },
      { label: '主要岩性',   value: '页岩 / 泥岩' },
      { label: '坡长',       value: '200 m' },
      { label: '内摩擦角',   value: '28°' },
      { label: '内聚力',     value: '55 kPa' },
      { label: '天然容重',   value: '24.0 kN/m³' },
      { label: '地震设防烈度', value: '7度 (0.15g)' },
    ],
    layers: [
      { name: '坡积黏土',   fillColor: '#483c1e', strokeColor: '#8a6e2d', E: 0.02, phi: 18, rho: '1.85' },
      { name: '强风化页岩', fillColor: '#323c2a', strokeColor: '#5a8237', E: 0.3,  phi: 26, rho: '2.10' },
      { name: '中风化页岩', fillColor: '#223241', strokeColor: '#286882', E: 2.2,  phi: 34, rho: '2.40' },
      { name: '微风化基岩', fillColor: '#142037', strokeColor: '#1a4278', E: 15,   phi: 44, rho: '2.60' },
    ],
    analysisCards: [
      { label: '静力安全系数 Fs',  value: '1.18', unit: '静力工况',    icon: 'ri-shield-check-line',    color: '#ffa500' },
      { label: '动力安全系数',     value: '0.96', unit: '7度地震工况', icon: 'ri-pulse-line',            color: '#f24e4e' },
      { label: '潜在最大位移',     value: '42.3', unit: 'mm',         icon: 'ri-arrow-right-up-line',   color: '#f24e4e' },
      { label: '综合稳定性等级',   value: '欠稳定', unit: '',          icon: 'ri-bar-chart-grouped-line', color: '#ffa500' },
    ],
  },
  {
    id: 'S12',
    name: 'S12 高陡硬岩边坡',
    scale: 2000,
    datum: '黄海高程',
    terrain: [[0, 82], [30, 82], [70, 78], [110, 38], [140, 22], [200, 22]],
    layerInterfaces: [
      { yBot: 0,  yTop: 24, fill: 'rgba(14,28,58,0.97)',  stroke: 'rgba(50,100,200,0.6)',  label: '深部花岗岩', labelX: 6,  labelY: 12 },
      { yBot: 24, yTop: 44, fill: 'rgba(18,50,68,0.93)',  stroke: 'rgba(40,130,130,0.55)', label: '中风化岩',   labelX: 6,  labelY: 33 },
      { yBot: 44, yTop: 62, fill: 'rgba(35,62,38,0.88)',  stroke: 'rgba(70,130,60,0.5)',   label: '强风化岩',   labelX: 6,  labelY: 52 },
      { yBot: 62, yTop: 90, fill: 'rgba(58,50,26,0.83)',  stroke: 'rgba(130,100,45,0.5)',  label: '残积土',     labelX: 6,  labelY: 71 },
    ],
    waterTable: [[0, 68], [30, 66], [70, 62], [110, 34], [140, 20], [200, 20]],
    failureArc: { cx: 150, cy: 115, r: 92, a1: -148, a2: -68 },
    monitorPoints: [
      { id: 'P1', x: 145, y: 25, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P2', x: 120, y: 42, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P3', x: 92,  y: 60, color: '#ffa500', status: 'warning', statusText: '预警' },
      { id: 'P4', x: 58,  y: 76, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P5', x: 25,  y: 81, color: '#00ff88', status: 'normal',  statusText: '正常' },
      { id: 'P6', x: 35,  y: 40, color: '#00ff88', status: 'normal',  statusText: '正常' },
    ],
    planContourLevels: [22, 34, 46, 58, 70, 82],
    params: [
      { label: '边坡高度',   value: '80 m' },
      { label: '坡面倾角',   value: '55°' },
      { label: '主要岩性',   value: '花岗岩 / 片麻岩' },
      { label: '坡长',       value: '200 m' },
      { label: '内摩擦角',   value: '48°' },
      { label: '内聚力',     value: '120 kPa' },
      { label: '天然容重',   value: '27.2 kN/m³' },
      { label: '地震设防烈度', value: '9度 (0.40g)' },
    ],
    layers: [
      { name: '残积土',       fillColor: '#3a3219', strokeColor: '#80642d', E: 0.04, phi: 22, rho: '1.88' },
      { name: '强风化片麻岩', fillColor: '#233e26', strokeColor: '#46803c', E: 1.2,  phi: 36, rho: '2.30' },
      { name: '中风化片麻岩', fillColor: '#123244', strokeColor: '#206882', E: 8.5,  phi: 46, rho: '2.60' },
      { name: '微风化花岗岩', fillColor: '#0a1c3c', strokeColor: '#163e78', E: 42,   phi: 56, rho: '2.72' },
    ],
    analysisCards: [
      { label: '静力安全系数 Fs',  value: '1.65', unit: '静力工况',    icon: 'ri-shield-check-line',    color: '#00ff88' },
      { label: '动力安全系数',     value: '1.28', unit: '9度地震工况', icon: 'ri-pulse-line',            color: '#00ff88' },
      { label: '潜在最大位移',     value: '9.4',  unit: 'mm',         icon: 'ri-arrow-right-up-line',   color: '#00eaff' },
      { label: '综合稳定性等级',   value: '稳定', unit: '',            icon: 'ri-bar-chart-grouped-line', color: '#00ff88' },
    ],
  },
]

// ===================== Component State =====================

const selectedSlopeId = ref('K78')
const viewMode = ref('section')
const chartRef = ref(null)
let chartInstance = null

const viewTabs = [
  { key: 'section', label: '断面模型', icon: 'ri-layout-column-line' },
  { key: 'plan',    label: '平面图',   icon: 'ri-map-2-line' },
  { key: '3d',      label: '三维视图', icon: 'ri-3d-cube-sphere-line' },
]

const displayToggles = reactive([
  { key: 'layers',   label: '地质层',   color: '#8ab4f8', visible: true },
  { key: 'failure',  label: '滑动面',   color: '#f24e4e', visible: true },
  { key: 'water',    label: '地下水位', color: '#4499ff', visible: true },
  { key: 'monitors', label: '监测点',   color: '#00ff88', visible: true },
])

const activeSlope = computed(() =>
  SLOPE_PROFILES.find(s => s.id === selectedSlopeId.value) || SLOPE_PROFILES[0]
)

const currentViewTab = computed(() =>
  viewTabs.find(t => t.key === viewMode.value) || viewTabs[0]
)

// ===================== Utility Functions =====================

function interpTerrain(terrainPts, x) {
  if (x <= terrainPts[0][0]) return terrainPts[0][1]
  if (x >= terrainPts[terrainPts.length - 1][0]) return terrainPts[terrainPts.length - 1][1]
  for (let i = 0; i < terrainPts.length - 1; i++) {
    if (x >= terrainPts[i][0] && x <= terrainPts[i + 1][0]) {
      const t = (x - terrainPts[i][0]) / (terrainPts[i + 1][0] - terrainPts[i][0])
      return terrainPts[i][1] + t * (terrainPts[i + 1][1] - terrainPts[i][1])
    }
  }
  return terrainPts[terrainPts.length - 1][1]
}

function generateArc(cx, cy, r, a1Deg, a2Deg, steps = 80) {
  const pts = []
  const step = (a2Deg - a1Deg) / steps
  for (let i = 0; i <= steps; i++) {
    const ang = (a1Deg + i * step) * (Math.PI / 180)
    const x = cx + r * Math.cos(ang)
    const y = cy + r * Math.sin(ang)
    if (x >= 0 && x <= 200) pts.push([x, y])
  }
  return pts
}

// ===================== Cross-Section Render =====================

function buildCrossSectionOption(slope, toggles) {
  const { terrain, layerInterfaces, waterTable, failureArc, monitorPoints } = slope
  const layerOn   = toggles.find(t => t.key === 'layers').visible
  const failureOn = toggles.find(t => t.key === 'failure').visible
  const waterOn   = toggles.find(t => t.key === 'water').visible
  const monitorOn = toggles.find(t => t.key === 'monitors').visible

  const failurePts = failureArc
    ? generateArc(failureArc.cx, failureArc.cy, failureArc.r, failureArc.a1, failureArc.a2)
    : []

  // Capture terrain for closure
  const terrainCopy = terrain.slice()
  const layersCopy  = layerInterfaces.slice()

  return {
    backgroundColor: 'rgba(7,14,26,0.9)',
    animation: false,
    grid: { left: 70, right: 20, top: 50, bottom: 70 },
    legend: {
      data: ['地表线', '潜在滑动面', '地下水位', '监测点'],
      bottom: 6,
      left: 'center',
      textStyle: { color: '#b0d0ff', fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 18,
      itemHeight: 4,
    },
    tooltip: {
      backgroundColor: 'rgba(7,14,26,0.95)',
      borderColor: 'rgba(0,234,255,0.3)',
      borderWidth: 1,
      textStyle: { color: '#b0d0ff', fontSize: 12 },
      formatter(params) {
        if (params.seriesName === '监测点') {
          const pt = monitorPoints[params.dataIndex]
          if (!pt) return ''
          return `<b style="color:${pt.color}">${pt.id} 监测点</b><br>` +
            `水平距离：${pt.x} m<br>高程：${pt.y} m<br>` +
            `状态：<span style="color:${pt.color}">${pt.statusText}</span>`
        }
        if (Array.isArray(params.data)) {
          return `x = ${(+params.data[0]).toFixed(1)} m<br>高程 = ${(+params.data[1]).toFixed(1)} m`
        }
        return ''
      },
    },
    xAxis: {
      type: 'value', min: 0, max: 200,
      name: '水平距离 (m)',
      nameGap: 28,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.8)' } },
      axisTick:  { lineStyle: { color: 'rgba(27,91,158,0.5)' } },
      axisLabel: { color: '#b0d0ff', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.12)', type: 'dashed' } },
      nameTextStyle: { color: '#b0d0ff', fontSize: 11 },
    },
    yAxis: {
      type: 'value', min: 0, max: 90,
      name: '高程 (m)',
      nameGap: 20,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.8)' } },
      axisTick:  { lineStyle: { color: 'rgba(27,91,158,0.5)' } },
      axisLabel: { color: '#b0d0ff', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.12)', type: 'dashed' } },
      nameTextStyle: { color: '#b0d0ff', fontSize: 11 },
    },
    series: [
      // ---- Geological layers (custom renderItem) ----
      ...(layerOn ? [{
        type: 'custom',
        name: '_geo',
        data: [[0, 0]],
        silent: true,
        z: 1,
        renderItem(params, api) {
          function coordPt(x, y) { return api.coord([x, y]) }
          function terrainAt(x) { return interpTerrain(terrainCopy, x) }

          function buildLayerPts(yBot, yTop, steps = 120) {
            const pts = []
            for (let i = 0; i <= steps; i++) {
              const x = (i / steps) * 200
              pts.push(coordPt(x, Math.min(yBot, terrainAt(x))))
            }
            for (let i = steps; i >= 0; i--) {
              const x = (i / steps) * 200
              pts.push(coordPt(x, Math.min(yTop, terrainAt(x))))
            }
            return pts
          }

          // Sky mask — covers area above terrain with chart background
          const skyPts = [
            coordPt(0, 90),
            ...terrainCopy.map(p => coordPt(p[0], p[1])),
            coordPt(200, 90),
          ]

          const layerPolygons = layersCopy.map(layer => ({
            type: 'polygon',
            shape: { points: buildLayerPts(layer.yBot, layer.yTop) },
            style: { fill: layer.fill, stroke: layer.stroke, lineWidth: 0.5 },
          }))

          const layerLabels = layersCopy.map(layer => ({
            type: 'text',
            x: coordPt(layer.labelX, layer.labelY)[0] + 4,
            y: coordPt(layer.labelX, layer.labelY)[1] - 6,
            style: {
              text: layer.label,
              fill: 'rgba(176,208,255,0.7)',
              fontSize: 10,
              fontFamily: 'Microsoft YaHei, sans-serif',
            },
          }))

          return {
            type: 'group',
            children: [
              ...layerPolygons,
              ...layerLabels,
              // Sky mask drawn last (on top of layers, below series lines)
              {
                type: 'polygon',
                shape: { points: skyPts },
                style: { fill: 'rgba(7,14,26,0.94)', lineWidth: 0 },
              },
            ],
          }
        },
      }] : []),

      // ---- Terrain surface line ----
      {
        type: 'line',
        name: '地表线',
        data: terrain,
        lineStyle: { color: '#00eaff', width: 2.5, shadowColor: 'rgba(0,234,255,0.5)', shadowBlur: 10 },
        itemStyle: { color: '#00eaff' },
        symbol: 'none',
        z: 10,
      },

      // ---- Failure surface arc ----
      {
        type: 'line',
        name: '潜在滑动面',
        data: failureOn ? failurePts : [],
        lineStyle: { color: '#f24e4e', width: 2, type: 'dashed', shadowColor: 'rgba(242,78,78,0.4)', shadowBlur: 6 },
        itemStyle: { color: '#f24e4e' },
        symbol: 'none',
        z: 11,
      },

      // ---- Water table ----
      {
        type: 'line',
        name: '地下水位',
        data: waterOn ? waterTable : [],
        lineStyle: { color: '#4499ff', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#4499ff' },
        symbol: 'none',
        z: 11,
      },

      // ---- Monitoring points ----
      {
        type: 'scatter',
        name: '监测点',
        data: monitorOn ? monitorPoints.map(p => [p.x, p.y]) : [],
        symbolSize: 11,
        itemStyle: {
          color(params) { return monitorPoints[params.dataIndex]?.color || '#00ff88' },
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1.5,
          shadowColor: 'rgba(0,255,136,0.5)',
          shadowBlur: 6,
        },
        label: {
          show: true,
          formatter(params) { return monitorPoints[params.dataIndex]?.id || '' },
          position: 'top',
          color: '#00ff88',
          fontSize: 10,
          fontWeight: 'bold',
        },
        z: 12,
      },
    ],
  }
}

// ===================== Plan View Render =====================

function buildPlanViewOption(slope, toggles) {
  const monitorOn = toggles.find(t => t.key === 'monitors').visible
  const { terrain, monitorPoints, planContourLevels } = slope

  // Build simplified plan contour lines (ellipse-like offsets from the crest)
  // Using the slope profile to generate rough contour lines in plan view
  // X = along-slope (0-200), Z = depth (0-100)
  const contourSeries = planContourLevels.map((elev, idx) => {
    // Find x range where terrain >= elev (slope is above this elevation)
    let xStart = 200, xEnd = 0
    for (let x = 0; x <= 200; x++) {
      const t = interpTerrain(terrain, x)
      if (t >= elev) {
        if (x < xStart) xStart = x
        if (x > xEnd) xEnd = x
      }
    }
    // Create contour line as an arc in plan (top view)
    // In plan view: x-axis = along slope (0-200), y-axis = depth into hill (0-100)
    const contourData = []
    for (let z = 0; z <= 100; z += 2) {
      // Slight sinusoidal variation for a realistic irregular contour
      const offset = 3 * Math.sin((z / 100) * Math.PI * 2 + idx * 0.8)
      contourData.push([xStart + offset, z])
    }
    return {
      type: 'line',
      name: `${elev}m等高线`,
      data: contourData,
      lineStyle: {
        color: `rgba(0,${120 + idx * 20},${200 + idx * 8},0.55)`,
        width: 1,
        type: idx % 2 === 0 ? 'solid' : 'dashed',
      },
      itemStyle: { color: `rgba(0,${120 + idx * 20},${200 + idx * 8},0.55)` },
      symbol: 'none',
      smooth: true,
      showInLegend: false,
    }
  })

  // Slope crest line (top of slope in plan view)
  const crestX = terrain.reduce((acc, p) => Math.min(acc, p[1] >= 65 ? p[0] : 200), 200)
  const crestLine = []
  for (let z = 0; z <= 100; z += 5) {
    crestLine.push([crestX + 2 * Math.sin(z / 10), z])
  }

  // Slope toe line
  const toeLine = []
  for (let z = 0; z <= 100; z += 5) {
    const toeX = terrain[terrain.length - 2][0] + 2 * Math.sin(z / 8)
    toeLine.push([toeX, z])
  }

  // Geological unit zone (fill background for slope body)
  const slopeFillData = [[0, 0], [200, 0], [200, 100], [0, 100]]

  return {
    backgroundColor: 'rgba(7,14,26,0.9)',
    animation: false,
    grid: { left: 70, right: 20, top: 50, bottom: 70 },
    legend: { show: false },
    tooltip: {
      backgroundColor: 'rgba(7,14,26,0.95)',
      borderColor: 'rgba(0,234,255,0.3)',
      borderWidth: 1,
      textStyle: { color: '#b0d0ff', fontSize: 12 },
      formatter(params) {
        if (params.seriesName === '监测点') {
          const pt = monitorPoints[params.dataIndex]
          if (!pt) return ''
          return `<b style="color:${pt.color}">${pt.id}</b><br>` +
            `沿坡距离：${pt.x} m<br>` +
            `状态：<span style="color:${pt.color}">${pt.statusText}</span>`
        }
        return `沿坡距离：${(+params.data[0]).toFixed(1)} m`
      },
    },
    xAxis: {
      type: 'value', min: 0, max: 200,
      name: '沿坡水平距离 (m)',
      nameGap: 28,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.8)' } },
      axisTick:  { lineStyle: { color: 'rgba(27,91,158,0.5)' } },
      axisLabel: { color: '#b0d0ff', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.12)', type: 'dashed' } },
      nameTextStyle: { color: '#b0d0ff', fontSize: 11 },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      name: '坡向宽度 (m)',
      nameGap: 20,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.8)' } },
      axisTick:  { lineStyle: { color: 'rgba(27,91,158,0.5)' } },
      axisLabel: { color: '#b0d0ff', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.12)', type: 'dashed' } },
      nameTextStyle: { color: '#b0d0ff', fontSize: 11 },
    },
    series: [
      // Contour lines
      ...contourSeries,
      // Crest line
      {
        type: 'line',
        name: '坡顶线',
        data: crestLine,
        lineStyle: { color: '#00eaff', width: 2, shadowColor: 'rgba(0,234,255,0.4)', shadowBlur: 6 },
        itemStyle: { color: '#00eaff' },
        symbol: 'none',
        smooth: true,
      },
      // Toe line
      {
        type: 'line',
        name: '坡脚线',
        data: toeLine,
        lineStyle: { color: '#00ff88', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#00ff88' },
        symbol: 'none',
        smooth: true,
      },
      // Monitoring points (in plan: x = along slope, y = mid-depth)
      {
        type: 'scatter',
        name: '监测点',
        data: monitorOn
          ? monitorPoints.map(p => [p.x, 50 + (p.y - 45) * 0.4])
          : [],
        symbolSize: 11,
        itemStyle: {
          color(params) { return monitorPoints[params.dataIndex]?.color || '#00ff88' },
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1.5,
          shadowColor: 'rgba(0,255,136,0.5)',
          shadowBlur: 6,
        },
        label: {
          show: true,
          formatter(params) { return monitorPoints[params.dataIndex]?.id || '' },
          position: 'top',
          color: '#00ff88',
          fontSize: 10,
          fontWeight: 'bold',
        },
      },
    ],
  }
}

// ===================== 3D Perspective View Render =====================

function buildThreeDOption(slope, toggles) {
  const { terrain, layerInterfaces, monitorPoints } = slope
  const monitorOn = toggles.find(t => t.key === 'monitors').visible
  const layerOn   = toggles.find(t => t.key === 'layers').visible

  // Isometric projection: screen(x, y, z) → (sx, sy)
  const ISO_ANGLE = 30 * (Math.PI / 180)
  const ISO_SCALE_Z = 0.45
  function proj(x, y, z) {
    return [
      x + z * Math.cos(ISO_ANGLE) * ISO_SCALE_Z,
      y + z * Math.sin(ISO_ANGLE) * ISO_SCALE_Z * 0.6,
    ]
  }

  const Z_SLICES = [0, 16, 32, 48, 64, 80]

  // Generate terrain profile series for each Z slice
  const terrainSliceSeries = Z_SLICES.map((z, idx) => {
    const data = terrain.map(p => proj(p[0], p[1], z))
    const opacity = 0.5 + 0.5 * (idx / (Z_SLICES.length - 1))
    return {
      type: 'line',
      name: `terrain_z${z}`,
      data,
      lineStyle: { color: `rgba(0,234,255,${opacity * 0.7})`, width: idx === 0 ? 2.5 : 1, shadowBlur: idx === 0 ? 8 : 0, shadowColor: 'rgba(0,234,255,0.4)' },
      itemStyle: { color: `rgba(0,234,255,${opacity})` },
      symbol: 'none',
      showInLegend: false,
    }
  })

  // Vertical edge lines (connecting front and back at key terrain points)
  const edgeSeries = terrain.map((p, i) => {
    const frontPt = proj(p[0], p[1], 0)
    const backPt  = proj(p[0], p[1], 80)
    return {
      type: 'line',
      name: `edge_${i}`,
      data: [frontPt, backPt],
      lineStyle: { color: 'rgba(27,91,158,0.35)', width: 0.8 },
      itemStyle: { color: 'rgba(27,91,158,0.35)' },
      symbol: 'none',
      showInLegend: false,
    }
  })

  // Top-surface mesh patches (between terrain slices)
  const terrainSeries = []
  for (let zi = 0; zi < Z_SLICES.length - 1; zi++) {
    const z0 = Z_SLICES[zi], z1 = Z_SLICES[zi + 1]
    for (let xi = 0; xi < terrain.length - 1; xi++) {
      const x0 = terrain[xi][0], y0 = interpTerrain(terrain, x0)
      const x1 = terrain[xi + 1][0], y1 = interpTerrain(terrain, x1)
      const p00 = proj(x0, y0, z0)
      const p10 = proj(x1, y1, z0)
      const p11 = proj(x1, y1, z1)
      const p01 = proj(x0, y0, z1)
      // Elevation-based color (higher = more cyan, lower = more blue)
      const avgY = (y0 + y1) / 2
      const t = Math.max(0, Math.min(1, (avgY - 15) / 70))
      const r = Math.round(0 + t * 20)
      const g = Math.round(80 + t * 140)
      const bv = Math.round(100 + t * 80)
      const alpha = 0.25 + (zi / (Z_SLICES.length - 1)) * 0.25
      terrainSeries.push({
        type: 'custom',
        name: `patch_${zi}_${xi}`,
        data: [[0, 0]],
        silent: true,
        showInLegend: false,
        renderItem(ps, api) {
          return {
            type: 'polygon',
            shape: { points: [p00, p10, p11, p01] },
            style: { fill: `rgba(${r},${g},${bv},${alpha})`, stroke: `rgba(${r},${g},${bv},0.2)`, lineWidth: 0.5 },
          }
        },
        z: 1,
      })
    }
  }

  // Geological layers on front face (z=0)
  const layerFrontSeries = layerOn ? layerInterfaces.map((layer) => {
    const steps = 80
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 200
      const y = Math.min(layer.yBot, interpTerrain(terrain, x))
      pts.push(proj(x, y, 0))
    }
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * 200
      const y = Math.min(layer.yTop, interpTerrain(terrain, x))
      pts.push(proj(x, y, 0))
    }
    return {
      type: 'custom',
      name: `layer_${layer.label}`,
      data: [[0, 0]],
      silent: true,
      showInLegend: false,
      renderItem(ps, api) {
        return {
          type: 'polygon',
          shape: { points: pts },
          style: { fill: layer.fill, stroke: layer.stroke, lineWidth: 0.5 },
        }
      },
      z: 2,
    }
  }) : []

  // Sky mask for front face
  const frontTerrainProjPts = terrain.map(p => proj(p[0], p[1], 0))
  const skyPts3d = [
    proj(0, 90, 0),
    ...frontTerrainProjPts,
    proj(200, 90, 0),
  ]
  const skyMaskSeries = [{
    type: 'custom',
    name: '_sky3d',
    data: [[0, 0]],
    silent: true,
    showInLegend: false,
    renderItem(ps, api) {
      return {
        type: 'polygon',
        shape: { points: skyPts3d },
        style: { fill: 'rgba(7,14,26,0.94)', lineWidth: 0 },
      }
    },
    z: 5,
  }]

  // Monitoring points (front face only)
  const monitorData = monitorOn
    ? monitorPoints.map(p => proj(p.x, p.y, 0))
    : []

  // Compute screen coordinate bounds for axis scaling
  const allPts = [
    ...Z_SLICES.flatMap(z => terrain.map(p => proj(p[0], p[1], z))),
    proj(0, 0, 0), proj(200, 0, 0), proj(0, 0, 80), proj(200, 0, 80),
  ]
  const minX3d = Math.min(...allPts.map(p => p[0])) - 5
  const maxX3d = Math.max(...allPts.map(p => p[0])) + 5
  const minY3d = Math.min(...allPts.map(p => p[1])) - 5
  const maxY3d = Math.max(...allPts.map(p => p[1])) + 5

  return {
    backgroundColor: 'rgba(7,14,26,0.9)',
    animation: false,
    grid: { left: 30, right: 20, top: 30, bottom: 60 },
    legend: {
      data: ['地表线(正面)'],
      bottom: 6,
      left: 'center',
      textStyle: { color: '#b0d0ff', fontSize: 11 },
    },
    tooltip: {
      backgroundColor: 'rgba(7,14,26,0.95)',
      borderColor: 'rgba(0,234,255,0.3)',
      borderWidth: 1,
      textStyle: { color: '#b0d0ff', fontSize: 12 },
    },
    xAxis: {
      type: 'value', min: minX3d, max: maxX3d,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.4)' } },
      axisTick:  { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value', min: minY3d, max: maxY3d,
      axisLine:  { lineStyle: { color: 'rgba(27,91,158,0.4)' } },
      axisTick:  { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    series: [
      ...terrainSeries,
      ...layerFrontSeries,
      ...skyMaskSeries,
      // Front terrain line (highlighted)
      {
        type: 'line',
        name: '地表线(正面)',
        data: terrain.map(p => proj(p[0], p[1], 0)),
        lineStyle: { color: '#00eaff', width: 2.5, shadowColor: 'rgba(0,234,255,0.5)', shadowBlur: 10 },
        itemStyle: { color: '#00eaff' },
        symbol: 'none',
        z: 10,
      },
      // Back terrain line
      {
        type: 'line',
        name: '地表线(背面)',
        data: terrain.map(p => proj(p[0], p[1], 80)),
        lineStyle: { color: 'rgba(0,234,255,0.3)', width: 1 },
        itemStyle: { color: 'rgba(0,234,255,0.3)' },
        symbol: 'none',
        showInLegend: false,
        z: 6,
      },
      ...edgeSeries,
      ...terrainSliceSeries,
      // Monitoring points
      {
        type: 'scatter',
        name: '监测点',
        data: monitorData,
        symbolSize: 11,
        itemStyle: {
          color(params) { return monitorPoints[params.dataIndex]?.color || '#00ff88' },
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1.5,
          shadowColor: 'rgba(0,255,136,0.6)',
          shadowBlur: 8,
        },
        label: {
          show: true,
          formatter(params) { return monitorPoints[params.dataIndex]?.id || '' },
          position: 'top',
          color: '#00ff88',
          fontSize: 10,
          fontWeight: 'bold',
        },
        showInLegend: false,
        z: 12,
      },
    ],
  }
}

// ===================== Chart Lifecycle =====================

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
}

function rebuildChart() {
  if (!chartInstance) initChart()
  if (!chartInstance) return

  const slope = activeSlope.value
  let option
  if (viewMode.value === 'section') {
    option = buildCrossSectionOption(slope, displayToggles)
  } else if (viewMode.value === 'plan') {
    option = buildPlanViewOption(slope, displayToggles)
  } else {
    option = buildThreeDOption(slope, displayToggles)
  }
  chartInstance.setOption(option, true)
}

function exportImage() {
  if (!chartInstance) return
  const url = chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#070e1a' })
  const link = document.createElement('a')
  link.href = url
  link.download = `地质模型_${activeSlope.value.id}_${viewMode.value}.png`
  link.click()
}

const resizeObserver = new ResizeObserver(() => {
  if (chartInstance) chartInstance.resize()
})

onMounted(async () => {
  await nextTick()
  initChart()
  rebuildChart()
  if (chartRef.value) resizeObserver.observe(chartRef.value)
})

onUnmounted(() => {
  resizeObserver.disconnect()
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
/* ---- Layout ---- */
.model-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.model-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
}

.model-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* ---- View Tabs ---- */
.view-tab-group {
  display: flex;
  gap: 2px;
  margin-left: 16px;
}

.model-view-tab {
  padding: 5px 12px;
  background: rgba(10, 28, 60, 0.6);
  border: 1px solid rgba(27, 91, 158, 0.5);
  color: #8ab4f8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
}
.model-view-tab:first-child { border-radius: 4px 0 0 4px; }
.model-view-tab:last-child  { border-radius: 0 4px 4px 0; }
.model-view-tab:hover  { background: rgba(0, 234, 255, 0.08); color: #00eaff; }
.model-view-tab.active {
  background: rgba(0, 234, 255, 0.12);
  border-color: rgba(0, 234, 255, 0.5);
  color: #00eaff;
}

/* ---- Layer Toggles ---- */
.layer-toggles {
  display: flex;
  gap: 12px;
  margin-left: 16px;
  align-items: center;
}
.layer-tog {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
  transition: opacity 0.2s;
}
.layer-tog:hover { opacity: 0.8; }
.tog-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  transition: background 0.2s;
}

/* ---- Slope Param Info ---- */
.param-info-grid { display: flex; flex-direction: column; gap: 5px; }
.pi-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.15);
  font-size: 12px;
}
.pi-key { color: #8ab4f8; }
.pi-val { color: var(--text-highlight); font-weight: 600; }

/* ---- Geo Layers ---- */
.geo-layers { display: flex; flex-direction: column; gap: 8px; }
.geo-layer-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.geo-swatch {
  width: 28px;
  height: 18px;
  border: 1px solid;
  border-radius: 2px;
  flex-shrink: 0;
}
.geo-layer-detail { flex: 1; min-width: 0; }
.gl-name  { font-size: 12px; color: #b0d0ff; font-weight: 600; }
.gl-props { font-size: 11px; color: #6080a8; margin-top: 2px; display: flex; gap: 6px; }
.gl-props span + span::before { content: '·'; margin-right: 6px; }

/* ---- Monitoring Points ---- */
.monitor-pts { display: flex; flex-direction: column; gap: 6px; }
.mp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 4px;
  border-radius: 3px;
  background: rgba(10, 24, 50, 0.3);
}
.mp-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mp-id   { color: var(--text-highlight); font-weight: bold; width: 24px; }
.mp-pos  { color: #6888a8; flex: 1; font-size: 11px; }
.mp-badge {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
}
.mp-badge.normal  { background: rgba(0, 255, 136, 0.15); color: #00ff88; border: 1px solid rgba(0,255,136,0.3); }
.mp-badge.warning { background: rgba(255, 165, 0, 0.15); color: #ffa500; border: 1px solid rgba(255,165,0,0.3); }
.mp-badge.alarm   { background: rgba(242, 78, 78, 0.15);  color: #f24e4e; border: 1px solid rgba(242,78,78,0.3); }

/* ---- Model Chart Panel ---- */
.model-chart-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.model-chart-canvas {
  flex: 1;
  min-height: 380px;
  width: 100%;
}
.chart-meta-info {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #6888a8;
}
.chart-meta-info span { display: flex; align-items: center; gap: 4px; }

/* ---- Analysis Cards ---- */
.analysis-card-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.analysis-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px !important;
}
.ac-body { flex: 1; min-width: 0; }
.ac-label { font-size: 11px; color: #8ab4f8; }
.ac-value { font-size: 18px; font-weight: bold; font-family: 'Courier New', Courier, monospace; margin: 2px 0; }
.ac-unit  { font-size: 11px; color: #6070a0; }
</style>
