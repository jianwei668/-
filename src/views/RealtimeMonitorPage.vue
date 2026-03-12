<template>
  <div class="page-container">
    <div class="page-title"><i class="ri-radar-line" style="color:var(--text-highlight);"></i> 实时监测</div>

    <!-- 控制栏 -->
    <div class="filter-bar">
      <span class="form-label">监测边坡</span>
      <select class="form-select" style="width:150px;" v-model="selectedSlope">
        <option v-for="s in slopes" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <span class="form-label">刷新频率</span>
      <select class="form-select" style="width:120px;" v-model="interval" @change="onIntervalChange">
        <option :value="1000">1 秒</option>
        <option :value="2000">2 秒</option>
        <option :value="5000">5 秒</option>
        <option :value="10000">10 秒</option>
      </select>
      <span class="form-label">通道</span>
      <select class="form-select" style="width:130px;" v-model="activeChannel">
        <option value="all">全部通道</option>
        <option value="acc">加速度</option>
        <option value="disp">位移</option>
        <option value="stress">应力</option>
        <option value="energy">能量</option>
      </select>
      <span :class="['status-tag', connectionStatus.class]" style="margin-left:10px;">
        <i :class="connectionStatus.icon"></i> {{ connectionStatus.text }}
      </span>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <button class="form-btn form-btn-primary" @click="toggleMonitoring">
          <i :class="isRunning ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
          {{ isRunning ? '暂停监测' : '启动监测' }}
        </button>
        <button class="form-btn" @click="toggleRecording" :class="{ 'form-btn-danger': isRecording }">
          <i :class="isRecording ? 'ri-stop-circle-line' : 'ri-record-circle-line'"></i>
          {{ isRecording ? '停止录制' : '开始录制' }}
        </button>
        <button class="form-btn" @click="showAlertConfig = !showAlertConfig">
          <i class="ri-alarm-warning-line"></i> 预警设置
        </button>
        <button class="form-btn" @click="exportRecordedData" :disabled="recordedData.length === 0">
          <i class="ri-download-line"></i> 导出
        </button>
      </div>
    </div>

    <!-- 预警配置面板 -->
    <div class="panel" v-if="showAlertConfig" style="margin-bottom:20px;">
      <div class="panel-title">
        <span><i class="ri-alarm-warning-line"></i> 预警阈值配置</span>
        <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="showAlertConfig = false"><i class="ri-close-line"></i> 收起</button>
      </div>
      <div class="param-grid">
        <div class="param-section" v-for="(th, key) in alertThresholds" :key="key">
          <div class="param-section-title">{{ th.label }}</div>
          <div class="param-row">
            <span class="param-label">蓝色预警</span>
            <input type="number" class="form-input" v-model.number="th.blue" style="width:80px;" step="0.1">
          </div>
          <div class="param-row">
            <span class="param-label">黄色预警</span>
            <input type="number" class="form-input" v-model.number="th.yellow" style="width:80px;" step="0.1">
          </div>
          <div class="param-row">
            <span class="param-label">橙色预警</span>
            <input type="number" class="form-input" v-model.number="th.orange" style="width:80px;" step="0.1">
          </div>
          <div class="param-row">
            <span class="param-label">红色预警</span>
            <input type="number" class="form-input" v-model.number="th.red" style="width:80px;" step="0.1">
          </div>
        </div>
      </div>
    </div>

    <!-- 实时数据卡片 -->
    <div class="stats-row-4">
      <div class="stats-card">
        <i class="ri-speed-up-line"></i>
        <div class="label">实时加速度 (m/s²)</div>
        <div class="value" :style="{ color: accColor }">{{ currentAcc.toFixed(3) }}</div>
        <div class="trend" :class="accTrend > 0 ? 'up' : 'down'">{{ accTrend > 0 ? '↑' : '↓' }} {{ Math.abs(accTrend).toFixed(1) }}%</div>
      </div>
      <div class="stats-card">
        <i class="ri-expand-up-down-line"></i>
        <div class="label">实时位移 (mm)</div>
        <div class="value" :style="{ color: dispColor }">{{ currentDisp.toFixed(2) }}</div>
        <div class="trend" :class="dispTrend > 0 ? 'up' : 'down'">{{ dispTrend > 0 ? '↑' : '↓' }} {{ Math.abs(dispTrend).toFixed(1) }}%</div>
      </div>
      <div class="stats-card">
        <i class="ri-flashlight-line"></i>
        <div class="label">累计耗散能 (kJ)</div>
        <div class="value" style="color:#ffa500;">{{ cumulativeEnergy.toFixed(1) }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-shield-check-line"></i>
        <div class="label">综合安全评级</div>
        <div class="value" :style="{ fontSize: '18px', color: safetyInfo.color }">
          <span class="pulse-dot" :style="{ background: safetyInfo.color }"></span>
          {{ safetyInfo.text }}
        </div>
      </div>
    </div>

    <!-- 预警状态条 -->
    <div class="alert-status-bar" v-if="activeAlerts.length > 0">
      <div v-for="(alert, i) in activeAlerts.slice(0, 3)" :key="i" class="alert-item" :class="alert.level">
        <i :class="alert.icon"></i>
        <span class="alert-time">{{ alert.time }}</span>
        <span>{{ alert.message }}</span>
        <button class="alert-dismiss" @click="dismissAlert(i)"><i class="ri-close-line"></i></button>
      </div>
      <div v-if="activeAlerts.length > 3" style="text-align:center; padding:4px; font-size:12px; color:#8ab4f8;">
        还有 {{ activeAlerts.length - 3 }} 条预警...
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div :class="['tab-item', activeTab === 'realtime' ? 'active' : '']" @click="activeTab = 'realtime'">
        <i class="ri-pulse-line"></i> 实时波形
      </div>
      <div :class="['tab-item', activeTab === 'multichannel' ? 'active' : '']" @click="activeTab = 'multichannel'">
        <i class="ri-sound-module-line"></i> 多通道
      </div>
      <div :class="['tab-item', activeTab === 'spectrum' ? 'active' : '']" @click="activeTab = 'spectrum'">
        <i class="ri-bar-chart-line"></i> 频谱分析
      </div>
      <div :class="['tab-item', activeTab === 'sensors' ? 'active' : '']" @click="activeTab = 'sensors'">
        <i class="ri-map-pin-line"></i> 传感器
      </div>
      <div :class="['tab-item', activeTab === 'alerts' ? 'active' : '']" @click="activeTab = 'alerts'">
        <i class="ri-alarm-warning-line"></i> 预警记录
        <span v-if="alertHistory.length > 0" class="badge">{{ alertHistory.length }}</span>
      </div>
      <div :class="['tab-item', activeTab === 'log' ? 'active' : '']" @click="activeTab = 'log'">
        <i class="ri-file-list-3-line"></i> 日志
      </div>
    </div>

    <!-- 实时波形 Tab -->
    <div v-show="activeTab === 'realtime'">
      <div class="content-grid">
        <div class="panel" style="min-height:320px;">
          <div class="panel-title">
            <span><i class="ri-pulse-line"></i> 实时加速度监测</span>
            <span class="live-indicator"><i class="ri-record-circle-line"></i> LIVE</span>
          </div>
          <div ref="realtimeAccRef" style="flex:1; width:100%; min-height:270px;"></div>
        </div>
        <div class="panel" style="min-height:320px;">
          <div class="panel-title">
            <span><i class="ri-expand-up-down-line"></i> 实时位移监测</span>
            <span class="live-indicator"><i class="ri-record-circle-line"></i> LIVE</span>
          </div>
          <div ref="realtimeDispRef" style="flex:1; width:100%; min-height:270px;"></div>
        </div>
      </div>
      <div class="content-grid">
        <div class="panel" style="min-height:300px;">
          <div class="panel-title">
            <span><i class="ri-fire-line"></i> 实时应力监测</span>
            <span class="live-indicator"><i class="ri-record-circle-line"></i> LIVE</span>
          </div>
          <div ref="realtimeStressRef" style="flex:1; width:100%; min-height:250px;"></div>
        </div>
        <div class="panel" style="min-height:300px;">
          <div class="panel-title">
            <span><i class="ri-flashlight-line"></i> 实时能量累积</span>
            <span class="live-indicator"><i class="ri-record-circle-line"></i> LIVE</span>
          </div>
          <div ref="realtimeEnergyRef" style="flex:1; width:100%; min-height:250px;"></div>
        </div>
      </div>
    </div>

    <!-- 多通道 Tab -->
    <div v-show="activeTab === 'multichannel'">
      <div class="panel" style="min-height:400px;">
        <div class="panel-title">
          <span><i class="ri-sound-module-line"></i> 多通道波形对比</span>
          <div style="display:flex; gap:8px;">
            <label v-for="p in sensorList" :key="p.id" class="channel-label"
              :style="{ color: p.color, borderColor: selectedSensors.includes(p.id) ? p.color : 'transparent' }">
              <input type="checkbox" :value="p.id" v-model="selectedSensors" style="display:none;">
              <i :class="selectedSensors.includes(p.id) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"></i>
              {{ p.id }}
            </label>
          </div>
        </div>
        <div ref="multiChannelRef" style="flex:1; width:100%; min-height:350px;"></div>
      </div>
    </div>

    <!-- 频谱分析 Tab -->
    <div v-show="activeTab === 'spectrum'">
      <div class="content-grid">
        <div class="panel" style="min-height:350px;">
          <div class="panel-title"><span><i class="ri-bar-chart-line"></i> 实时频谱（FFT）</span></div>
          <div ref="spectrumRef" style="flex:1; width:100%; min-height:300px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-information-line"></i> 频域特征</div>
          <div class="stat-item">
            <span>主频 (Hz)</span>
            <span class="stat-value">{{ spectrumInfo.mainFreq }}</span>
          </div>
          <div class="stat-item">
            <span>峰值频率 (Hz)</span>
            <span class="stat-value">{{ spectrumInfo.peakFreq }}</span>
          </div>
          <div class="stat-item">
            <span>频带宽度 (Hz)</span>
            <span class="stat-value">{{ spectrumInfo.bandwidth }}</span>
          </div>
          <div class="stat-item">
            <span>谱面积</span>
            <span class="stat-value">{{ spectrumInfo.spectralArea }}</span>
          </div>
          <div class="stat-item">
            <span>均方根频率 (Hz)</span>
            <span class="stat-value">{{ spectrumInfo.rmsFreq }}</span>
          </div>
          <div class="alert-box info" style="margin-top:12px;">
            频谱分析基于最近 {{ bufferSize }} 个采样点的实时数据，采用快速傅里叶变换（FFT）。
          </div>
        </div>
      </div>
    </div>

    <!-- 传感器管理 Tab -->
    <div v-show="activeTab === 'sensors'">
      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-map-pin-line"></i> 传感器管理</span>
          <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="checkAllSensors">
            <i class="ri-refresh-line"></i> 全部自检
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>传感器</th>
              <th>位置</th>
              <th>高程 (m)</th>
              <th>类型</th>
              <th>状态</th>
              <th>最新数据</th>
              <th>更新时间</th>
              <th>信号质量</th>
              <th>电量</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sensorList" :key="s.id">
              <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px;" :style="{ background: s.color }"></span>{{ s.id }}</td>
              <td>{{ s.name }}</td>
              <td>{{ s.elevation }}</td>
              <td>{{ s.type }}</td>
              <td><span :class="['status-tag', s.online ? 'success' : 'danger']">{{ s.online ? '在线' : '离线' }}</span></td>
              <td :style="{ color: Math.abs(s.latestAcc) > 2 ? 'var(--accent-red)' : '' }">{{ s.latestAcc.toFixed(3) }} m/s²</td>
              <td>{{ s.lastUpdate }}</td>
              <td>
                <div class="signal-bar">
                  <span v-for="i in 5" :key="i" :class="['bar', i <= s.signal ? 'active' : '']"></span>
                </div>
              </td>
              <td>
                <div class="battery-bar" :class="s.battery < 20 ? 'low' : s.battery < 50 ? 'medium' : 'high'">
                  <div class="battery-fill" :style="{ width: s.battery + '%' }"></div>
                  <span class="battery-text">{{ s.battery }}%</span>
                </div>
              </td>
              <td>
                <button class="table-btn table-btn-primary" @click="calibrateSensor(s)"><i class="ri-tools-line"></i></button>
                <button class="table-btn" :class="s.online ? 'table-btn-danger' : 'table-btn-success'" @click="toggleSensor(s)">
                  <i :class="s.online ? 'ri-shutdown-line' : 'ri-play-line'"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-grid-3" style="margin-top:20px;">
        <div class="rich-card">
          <i class="ri-sensor-line card-icon" style="color:var(--text-highlight);"></i>
          <div class="card-num">{{ sensorList.filter(s => s.online).length }} / {{ sensorList.length }}</div>
          <div class="card-label">在线传感器</div>
          <i class="ri-sensor-line card-bg-icon"></i>
        </div>
        <div class="rich-card">
          <i class="ri-battery-charge-line card-icon" style="color:var(--accent-green);"></i>
          <div class="card-num">{{ avgBattery }}%</div>
          <div class="card-label">平均电量</div>
          <i class="ri-battery-charge-line card-bg-icon"></i>
        </div>
        <div class="rich-card">
          <i class="ri-signal-wifi-3-line card-icon" style="color:#ffa500;"></i>
          <div class="card-num">{{ avgSignal.toFixed(1) }}</div>
          <div class="card-label">平均信号强度</div>
          <i class="ri-signal-wifi-3-line card-bg-icon"></i>
        </div>
      </div>
    </div>

    <!-- 预警记录 Tab -->
    <div v-show="activeTab === 'alerts'">
      <div class="content-grid">
        <div class="panel" style="min-height:350px;">
          <div class="panel-title"><i class="ri-bar-chart-line"></i> 预警次数统计</div>
          <div ref="alertStatsRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title">
            <span><i class="ri-alarm-warning-line"></i> 预警记录 ({{ alertHistory.length }})</span>
            <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="alertHistory.splice(0)">
              <i class="ri-delete-bin-line"></i> 清除
            </button>
          </div>
          <div class="alert-list">
            <div v-for="(alert, i) in alertHistory.slice(-20).reverse()" :key="i" class="alert-record" :class="alert.level">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong><i :class="alert.icon"></i> {{ alert.title }}</strong>
                <span style="font-size:11px; color:#8ab4f8;">{{ alert.time }}</span>
              </div>
              <div style="font-size:12px; margin-top:4px; color:#aaa;">{{ alert.message }}</div>
            </div>
            <div v-if="alertHistory.length === 0" style="text-align:center; padding:30px; color:#555;">暂无预警记录</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志 Tab -->
    <div v-show="activeTab === 'log'">
      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-file-list-3-line"></i> 系统日志</span>
          <div style="display:flex; gap:8px;">
            <select class="form-select" style="width:100px; padding:3px 8px; font-size:12px;" v-model="logFilter">
              <option value="all">全部</option>
              <option value="info">信息</option>
              <option value="success">正常</option>
              <option value="warning">预警</option>
              <option value="danger">危险</option>
            </select>
            <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="logs.splice(0)">
              <i class="ri-delete-bin-line"></i> 清除
            </button>
          </div>
        </div>
        <div class="log-container" ref="logRef">
          <div v-for="(log, i) in filteredLogs" :key="i" :class="['log-entry', log.level]">
            <span class="log-time">{{ log.time }}</span>
            <span :class="['status-tag', log.level]">{{ log.tag }}</span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 录制状态 -->
    <div class="recording-bar" v-if="isRecording">
      <i class="ri-record-circle-line recording-dot"></i>
      <span>正在录制... 已采集 <strong>{{ recordedData.length }}</strong> 条数据，时长 {{ recordingDuration }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'
import { getSlopeData, getMonitorPoints } from '../utils/dataGenerator'

// ==================== 常量 ====================
const slopes = getSlopeData()
const bufferSize = 128

// ==================== 状态 ====================
const selectedSlope = ref('BP-001')
const interval = ref(2000)
const activeChannel = ref('all')
const isRunning = ref(false)
const isRecording = ref(false)
const showAlertConfig = ref(false)
const activeTab = ref('realtime')
const logFilter = ref('all')

const currentAcc = ref(0)
const currentDisp = ref(0)
const currentStress = ref(0)
const cumulativeEnergy = ref(0)
const accTrend = ref(0)
const dispTrend = ref(0)
let prevAcc = 0
let prevDisp = 0
let tickCount = 0
let timer = null

// 预警阈值
const alertThresholds = reactive({
  acceleration: { label: '加速度 (m/s²)', blue: 0.5, yellow: 1.0, orange: 1.8, red: 2.5 },
  displacement: { label: '位移 (mm)', blue: 3, yellow: 6, orange: 10, red: 15 },
  stress: { label: '应力 (MPa)', blue: 1.0, yellow: 2.0, orange: 3.5, red: 5.0 },
  energy: { label: '累计能量 (kJ)', blue: 200, yellow: 500, orange: 800, red: 1200 }
})

// 连接状态
const connectionStatus = computed(() => {
  if (isRunning.value) return { class: 'success', icon: 'ri-wifi-line', text: '已连接' }
  return { class: 'danger', icon: 'ri-wifi-off-line', text: '已断开' }
})

// 安全评级
const safetyInfo = computed(() => {
  const a = Math.abs(currentAcc.value)
  const d = Math.abs(currentDisp.value)
  if (a > alertThresholds.acceleration.red || d > alertThresholds.displacement.red)
    return { text: '红色预警', color: '#ff4444' }
  if (a > alertThresholds.acceleration.orange || d > alertThresholds.displacement.orange)
    return { text: '橙色预警', color: '#ff8800' }
  if (a > alertThresholds.acceleration.yellow || d > alertThresholds.displacement.yellow)
    return { text: '黄色预警', color: '#ffa500' }
  if (a > alertThresholds.acceleration.blue || d > alertThresholds.displacement.blue)
    return { text: '蓝色预警', color: '#4488ff' }
  return { text: '安全', color: '#00ff88' }
})

const accColor = computed(() => {
  const a = Math.abs(currentAcc.value)
  return a > 2 ? 'var(--accent-red)' : a > 1 ? '#ffa500' : 'var(--text-highlight)'
})
const dispColor = computed(() => {
  const d = Math.abs(currentDisp.value)
  return d > 10 ? 'var(--accent-red)' : d > 5 ? '#ffa500' : 'var(--text-highlight)'
})

// 传感器列表
const sensorList = reactive([
  { id: 'P1', name: '坡脚', elevation: 15, type: '三轴加速度', color: '#00eaff', online: true, latestAcc: 0, lastUpdate: '--', signal: 5, battery: 92 },
  { id: 'P2', name: '下部坡体', elevation: 30, type: '三轴加速度', color: '#f24e4e', online: true, latestAcc: 0, lastUpdate: '--', signal: 4, battery: 85 },
  { id: 'P3', name: '坡体中部', elevation: 45, type: '三轴加速度+位移', color: '#00ff88', online: true, latestAcc: 0, lastUpdate: '--', signal: 5, battery: 78 },
  { id: 'P4', name: '上部坡体', elevation: 60, type: '三轴加速度', color: '#a78bfa', online: true, latestAcc: 0, lastUpdate: '--', signal: 4, battery: 65 },
  { id: 'P5', name: '坡顶', elevation: 75, type: '三轴加速度+位移', color: '#ffa500', online: true, latestAcc: 0, lastUpdate: '--', signal: 3, battery: 71 },
  { id: 'P6', name: '坡后缘', elevation: 82, type: '裂缝计+加速度', color: '#36d7b7', online: true, latestAcc: 0, lastUpdate: '--', signal: 4, battery: 88 }
])

const selectedSensors = ref(['P1', 'P3', 'P5'])

const avgBattery = computed(() => {
  const online = sensorList.filter(s => s.online)
  return online.length ? Math.round(online.reduce((s, a) => s + a.battery, 0) / online.length) : 0
})
const avgSignal = computed(() => {
  const online = sensorList.filter(s => s.online)
  return online.length ? online.reduce((s, a) => s + a.signal, 0) / online.length : 0
})

// 波形缓冲
const accBuffer = reactive(Array(120).fill(0))
const dispBuffer = reactive(Array(120).fill(0))
const stressBuffer = reactive(Array(120).fill(0))
const energyBuffer = reactive(Array(120).fill(0))
const timeLabels = reactive(Array(120).fill(''))
const sensorBuffers = reactive({})
sensorList.forEach(s => { sensorBuffers[s.id] = Array(120).fill(0) })

// 频谱
const spectrumInfo = reactive({ mainFreq: '0', peakFreq: '0', bandwidth: '0', spectralArea: '0', rmsFreq: '0' })

// 日志与预警
const logs = reactive([])
const activeAlerts = reactive([])
const alertHistory = reactive([])
const alertCountByLevel = reactive({ blue: 0, yellow: 0, orange: 0, red: 0 })

// 录制
const recordedData = reactive([])
let recordingStart = null
const recordingDuration = computed(() => {
  if (!recordingStart) return '0s'
  const secs = Math.floor((Date.now() - recordingStart) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
})

// ==================== 图表引用 ====================
const realtimeAccRef = ref(null)
const realtimeDispRef = ref(null)
const realtimeStressRef = ref(null)
const realtimeEnergyRef = ref(null)
const multiChannelRef = ref(null)
const spectrumRef = ref(null)
const alertStatsRef = ref(null)
const logRef = ref(null)

let charts = {}

const filteredLogs = computed(() => {
  if (logFilter.value === 'all') return logs
  return logs.filter(l => l.level === logFilter.value)
})

// ==================== 图表初始化 ====================
function getCommonRealtimeOpt(name, unit, color) {
  return {
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category', data: timeLabels,
      axisLabel: { color: '#b0d0ff', interval: 19, fontSize: 10 },
      axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: unit, nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27, 91, 158, 0.2)' } }
    },
    series: [{
      type: 'line', data: [], showSymbol: false, smooth: true,
      itemStyle: { color }, areaStyle: { color: color.replace(')', ',0.05)').replace('rgb', 'rgba') || `${color}0d` },
      lineStyle: { width: 1.5, shadowColor: color.replace(')', ',0.3)').replace('rgb', 'rgba') || `${color}4d`, shadowBlur: 6 }
    }]
  }
}

function initCharts() {
  // 加速度
  const accChart = initChart(realtimeAccRef.value, 'acc')
  if (accChart) accChart.setOption(getCommonRealtimeOpt('加速度', 'm/s²', '#00eaff'))
  
  // 位移
  const dispChart = initChart(realtimeDispRef.value, 'disp')
  if (dispChart) dispChart.setOption(getCommonRealtimeOpt('位移', 'mm', '#00ff88'))
  
  // 应力
  const stressChart = initChart(realtimeStressRef.value, 'stress')
  if (stressChart) stressChart.setOption(getCommonRealtimeOpt('应力', 'MPa', '#f24e4e'))
  
  // 能量
  const energyChart = initChart(realtimeEnergyRef.value, 'energy')
  if (energyChart) energyChart.setOption(getCommonRealtimeOpt('累计能量', 'kJ', '#ffa500'))
  
  // 多通道
  initMultiChannelChart()
  
  // 频谱
  initSpectrumChart()
  
  // 预警统计
  initAlertStatsChart()
}

function initChart(refEl, key) {
  if (!refEl) return null
  if (charts[key]) charts[key].dispose()
  charts[key] = echarts.init(refEl)
  return charts[key]
}

function initMultiChannelChart() {
  const chart = initChart(multiChannelRef.value, 'multi')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    legend: { data: selectedSensors.value, textStyle: { color: '#b0d0ff' } },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category', data: timeLabels,
      axisLabel: { color: '#b0d0ff', interval: 19 },
      axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: 'm/s²', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27, 91, 158, 0.2)' } }
    },
    dataZoom: [{ type: 'inside' }],
    series: selectedSensors.value.map(id => {
      const sensor = sensorList.find(s => s.id === id)
      return {
        name: id, type: 'line', showSymbol: false, smooth: true,
        data: sensorBuffers[id] || [],
        lineStyle: { width: 1.5, color: sensor?.color || '#00eaff' },
        itemStyle: { color: sensor?.color || '#00eaff' }
      }
    })
  })
}

function initSpectrumChart() {
  const chart = initChart(spectrumRef.value, 'spectrum')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value', name: '频率 (Hz)', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: '幅值', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27, 91, 158, 0.2)' } }
    },
    series: [{
      type: 'bar', barWidth: '70%', data: [],
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#00eaff' }, { offset: 1, color: 'rgba(0,234,255,0.1)' }
      ])}
    }]
  })
}

function initAlertStatsChart() {
  const chart = initChart(alertStatsRef.value, 'alertStats')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category', data: ['蓝色预警', '黄色预警', '橙色预警', '红色预警'],
      axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } }
    },
    yAxis: {
      type: 'value', name: '次数', nameTextStyle: { color: '#b0d0ff' },
      axisLabel: { color: '#b0d0ff' },
      splitLine: { lineStyle: { color: 'rgba(27, 91, 158, 0.2)' } }
    },
    series: [{
      type: 'bar', barWidth: '40%',
      data: [
        { value: 0, itemStyle: { color: '#4488ff' } },
        { value: 0, itemStyle: { color: '#ffa500' } },
        { value: 0, itemStyle: { color: '#ff8800' } },
        { value: 0, itemStyle: { color: '#ff4444' } }
      ],
      label: { show: true, position: 'top', color: '#b0d0ff' }
    }]
  })
}

// ==================== 数据生成 ====================
function generateData() {
  tickCount++
  const now = new Date()
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  // 基础信号：随机 + 正弦 + 偶尔突变
  const phase = tickCount * 0.15
  const burst = Math.random() > 0.95 ? (Math.random() - 0.5) * 4 : 0
  const acc = (Math.random() - 0.5) * 1.8 + Math.sin(phase) * 0.4 + burst
  const disp = Math.abs(acc) * 3.5 + (Math.random() - 0.5) * 1.5 + Math.sin(phase * 0.3) * 2
  const stress = Math.abs(acc) * 1.2 + Math.random() * 0.5 + 0.3
  
  accTrend.value = prevAcc !== 0 ? ((acc - prevAcc) / (Math.abs(prevAcc) + 0.001)) * 100 : 0
  dispTrend.value = prevDisp !== 0 ? ((disp - prevDisp) / (Math.abs(prevDisp) + 0.001)) * 100 : 0
  prevAcc = acc
  prevDisp = disp

  currentAcc.value = acc
  currentDisp.value = disp
  currentStress.value = stress
  cumulativeEnergy.value += Math.abs(acc) * 0.3

  // 更新缓冲
  accBuffer.push(parseFloat(acc.toFixed(3))); accBuffer.shift()
  dispBuffer.push(parseFloat(disp.toFixed(2))); dispBuffer.shift()
  stressBuffer.push(parseFloat(stress.toFixed(2))); stressBuffer.shift()
  energyBuffer.push(parseFloat(cumulativeEnergy.value.toFixed(1))); energyBuffer.shift()
  timeLabels.push(ts); timeLabels.shift()

  // 更新传感器数据
  sensorList.forEach(s => {
    if (!s.online) return
    const ampFactor = 0.4 + (s.elevation / 82) * 0.9
    const sAcc = acc * ampFactor + (Math.random() - 0.5) * 0.3
    s.latestAcc = sAcc
    s.lastUpdate = ts
    s.signal = Math.random() > 0.05 ? Math.ceil(Math.random() * 2 + 3) : 2
    s.battery = Math.max(5, s.battery - (Math.random() < 0.02 ? 1 : 0))
    if (sensorBuffers[s.id]) {
      sensorBuffers[s.id].push(parseFloat(sAcc.toFixed(3)))
      sensorBuffers[s.id].shift()
    }
  })

  // 更新图表
  updateRealtimeCharts()

  // 频谱计算（每5个tick）
  if (tickCount % 5 === 0) updateSpectrum()

  // 预警检查
  checkAlerts(acc, disp, stress, ts)

  // 添加日志（概率性）
  if (Math.random() > 0.65) {
    const absAcc = Math.abs(acc)
    const isWarn = absAcc > alertThresholds.acceleration.yellow
    addLog(ts, isWarn ? 'warning' : 'success', isWarn ? '预警' : '正常',
      isWarn ? `P5 坡顶加速度 ${absAcc.toFixed(3)} m/s² 超过黄色阈值` : `各监测点数据正常，系统运行稳定`)
  }

  // 录制
  if (isRecording.value) {
    recordedData.push({ time: ts, acc: acc.toFixed(3), disp: disp.toFixed(2), stress: stress.toFixed(2), energy: cumulativeEnergy.value.toFixed(1) })
  }
}

function updateRealtimeCharts() {
  const tl = [...timeLabels]
  charts.acc?.setOption({ xAxis: { data: tl }, series: [{ data: [...accBuffer] }] })
  charts.disp?.setOption({ xAxis: { data: tl }, series: [{ data: [...dispBuffer] }] })
  charts.stress?.setOption({ xAxis: { data: tl }, series: [{ data: [...stressBuffer] }] })
  charts.energy?.setOption({ xAxis: { data: tl }, series: [{ data: [...energyBuffer] }] })
  
  // 多通道
  if (charts.multi) {
    charts.multi.setOption({
      xAxis: { data: tl },
      legend: { data: selectedSensors.value },
      series: selectedSensors.value.map(id => {
        const sensor = sensorList.find(s => s.id === id)
        return {
          name: id, data: [...(sensorBuffers[id] || [])],
          lineStyle: { color: sensor?.color }, itemStyle: { color: sensor?.color }
        }
      })
    })
  }
}

function updateSpectrum() {
  // 简化FFT
  const N = Math.min(bufferSize, accBuffer.length)
  const data = accBuffer.slice(-N)
  const dt = interval.value / 1000
  const freqs = []
  const amps = []
  const halfN = Math.floor(N / 2)
  
  for (let k = 1; k < halfN; k++) {
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N
      re += data[n] * Math.cos(angle)
      im += data[n] * Math.sin(angle)
    }
    const freq = k / (N * dt)
    if (freq > 25) break
    const amp = Math.sqrt(re * re + im * im) / N * 2
    freqs.push(freq)
    amps.push(parseFloat(amp.toFixed(4)))
  }
  
  if (amps.length === 0) return
  
  const maxAmp = Math.max(...amps)
  const maxIdx = amps.indexOf(maxAmp)
  const totalArea = amps.reduce((s, a) => s + a, 0)
  const weightedFreq = amps.reduce((s, a, i) => s + a * freqs[i], 0) / (totalArea || 1)
  
  spectrumInfo.mainFreq = weightedFreq.toFixed(2)
  spectrumInfo.peakFreq = freqs[maxIdx]?.toFixed(2) || '0'
  spectrumInfo.bandwidth = freqs.length > 0 ? (freqs[freqs.length - 1] - freqs[0]).toFixed(1) : '0'
  spectrumInfo.spectralArea = totalArea.toFixed(3)
  spectrumInfo.rmsFreq = Math.sqrt(amps.reduce((s, a, i) => s + a * freqs[i] * freqs[i], 0) / (totalArea || 1)).toFixed(2)
  
  charts.spectrum?.setOption({
    xAxis: { type: 'value' },
    series: [{ data: freqs.map((f, i) => [f, amps[i]]) }]
  })
}

function checkAlerts(acc, disp, stress, ts) {
  const absAcc = Math.abs(acc)
  const absDisp = Math.abs(disp)
  
  const checks = [
    { val: absAcc, th: alertThresholds.acceleration, name: '加速度', unit: 'm/s²', sensor: 'P5' },
    { val: absDisp, th: alertThresholds.displacement, name: '位移', unit: 'mm', sensor: 'P3' }
  ]
  
  checks.forEach(c => {
    let level, color, icon, levelName
    if (c.val >= c.th.red) { level = 'danger'; color = '#ff4444'; icon = 'ri-alarm-warning-fill'; levelName = '红色'; alertCountByLevel.red++ }
    else if (c.val >= c.th.orange) { level = 'warning'; color = '#ff8800'; icon = 'ri-alarm-warning-line'; levelName = '橙色'; alertCountByLevel.orange++ }
    else if (c.val >= c.th.yellow) { level = 'warning'; color = '#ffa500'; icon = 'ri-error-warning-line'; levelName = '黄色'; alertCountByLevel.yellow++ }
    else return
    
    const msg = `${c.sensor} ${c.name}达到 ${c.val.toFixed(3)} ${c.unit}，触发${levelName}预警`
    
    activeAlerts.push({ time: ts, message: msg, level, icon })
    if (activeAlerts.length > 5) activeAlerts.shift()
    
    alertHistory.push({ time: ts, title: `${levelName}预警 - ${c.name}`, message: msg, level, icon })
    
    addLog(ts, level, levelName + '预警', msg)
    
    updateAlertStatsChart()
  })
}

function updateAlertStatsChart() {
  charts.alertStats?.setOption({
    series: [{
      data: [
        { value: alertCountByLevel.blue, itemStyle: { color: '#4488ff' } },
        { value: alertCountByLevel.yellow, itemStyle: { color: '#ffa500' } },
        { value: alertCountByLevel.orange, itemStyle: { color: '#ff8800' } },
        { value: alertCountByLevel.red, itemStyle: { color: '#ff4444' } }
      ]
    }]
  })
}

function addLog(ts, level, tag, msg) {
  logs.push({ time: ts, level, tag, msg })
  if (logs.length > 200) logs.shift()
  nextTick(() => { if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight })
}

function dismissAlert(i) { activeAlerts.splice(i, 1) }

// ==================== 控制逻辑 ====================
function toggleMonitoring() {
  if (isRunning.value) {
    clearInterval(timer)
    timer = null
    isRunning.value = false
    addLog(getTS(), 'info', '信息', '监测已暂停')
  } else {
    timer = setInterval(generateData, interval.value)
    isRunning.value = true
    addLog(getTS(), 'info', '信息', '监测已启动，刷新间隔 ' + interval.value + 'ms')
  }
}

function onIntervalChange() {
  if (isRunning.value) {
    clearInterval(timer)
    timer = setInterval(generateData, interval.value)
    addLog(getTS(), 'info', '信息', '刷新间隔已调整为 ' + interval.value + 'ms')
  }
}

function toggleRecording() {
  if (isRecording.value) {
    isRecording.value = false
    addLog(getTS(), 'info', '信息', `录制停止，共采集 ${recordedData.length} 条数据`)
  } else {
    recordedData.splice(0)
    recordingStart = Date.now()
    isRecording.value = true
    addLog(getTS(), 'info', '信息', '数据录制已开始')
  }
}

function exportRecordedData() {
  if (recordedData.length === 0) return
  let csv = '时间,加速度(m/s²),位移(mm),应力(MPa),累计能量(kJ)\n'
  recordedData.forEach(d => { csv += `${d.time},${d.acc},${d.disp},${d.stress},${d.energy}\n` })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `实时监测数据_${getTS().replace(/:/g, '')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function calibrateSensor(s) {
  addLog(getTS(), 'info', '信息', `传感器 ${s.id} (${s.name}) 开始自检校准...`)
  s.signal = 5
}

function toggleSensor(s) {
  s.online = !s.online
  addLog(getTS(), s.online ? 'success' : 'warning', s.online ? '上线' : '离线',
    `传感器 ${s.id} (${s.name}) 已${s.online ? '上线' : '离线'}`)
}

function checkAllSensors() {
  sensorList.forEach(s => { if (s.online) s.signal = 5 })
  addLog(getTS(), 'success', '自检', '全部在线传感器自检完成')
}

function getTS() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ==================== 生命周期 ====================
onMounted(() => {
  window.addEventListener('resize', handleResize)
  addLog(getTS(), 'info', '系统', '实时监测系统初始化...')
  nextTick(() => {
    initCharts()
    generateData()
    timer = setInterval(generateData, interval.value)
    isRunning.value = true
    addLog(getTS(), 'success', '系统', '系统启动完成，开始实时数据采集')
  })
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
  charts = {}
})

watch(activeTab, async () => {
  await nextTick()
  handleResize()
  if (activeTab.value === 'multichannel') initMultiChannelChart()
  if (activeTab.value === 'spectrum') initSpectrumChart()
  if (activeTab.value === 'alerts') initAlertStatsChart()
})

watch(selectedSensors, () => {
  if (activeTab.value === 'multichannel') initMultiChannelChart()
})
</script>

<style scoped>
.signal-bar {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}
.signal-bar .bar {
  width: 4px;
  background: rgba(27, 91, 158, 0.3);
  border-radius: 1px;
}
.signal-bar .bar:nth-child(1) { height: 4px; }
.signal-bar .bar:nth-child(2) { height: 7px; }
.signal-bar .bar:nth-child(3) { height: 10px; }
.signal-bar .bar:nth-child(4) { height: 13px; }
.signal-bar .bar:nth-child(5) { height: 16px; }
.signal-bar .bar.active {
  background: var(--accent-green);
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.4);
}
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  padding: 4px;
  background: rgba(13, 33, 67, 0.5);
  border: 1px solid rgba(27, 91, 158, 0.3);
}
.tab-item {
  padding: 8px 18px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
  white-space: nowrap;
  position: relative;
}
.tab-item:hover { background: rgba(0, 234, 255, 0.08); color: #fff; }
.tab-item.active {
  background: rgba(0, 234, 255, 0.15);
  border-color: rgba(0, 234, 255, 0.4);
  color: var(--text-highlight);
  text-shadow: 0 0 6px rgba(0, 234, 255, 0.4);
}
.tab-item i { margin-right: 5px; }
.badge {
  position: absolute;
  top: 2px;
  right: 4px;
  background: var(--accent-red);
  color: #fff;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}
.live-indicator {
  font-size: 12px;
  color: var(--accent-green);
  animation: blink 1.5s ease-in-out infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.param-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
.param-section {
  padding: 10px;
  border: 1px solid rgba(27, 91, 158, 0.2);
  background: rgba(0,0,0,0.15);
}
.param-section-title {
  font-size: 14px;
  color: var(--text-highlight);
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(0, 234, 255, 0.15);
}
.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}
.param-label { font-size: 13px; color: #8ab4f8; }
.alert-status-bar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 12px;
  border-left: 3px solid;
}
.alert-item.warning { background: rgba(255,165,0,0.08); border-color: #ffa500; color: #ffa500; }
.alert-item.danger { background: rgba(242,78,78,0.08); border-color: #f24e4e; color: #f24e4e; }
.alert-time { color: #8ab4f8; font-size: 11px; }
.alert-dismiss { background: none; border: none; color: #555; cursor: pointer; margin-left: auto; font-size: 14px; }
.alert-dismiss:hover { color: #fff; }
.channel-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.3s;
}
.channel-label:hover { background: rgba(0,234,255,0.05); }
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.15);
  color: #8ab4f8;
  font-size: 13px;
}
.stat-value { color: var(--text-highlight); font-size: 16px; font-weight: bold; }
.log-container {
  max-height: 350px;
  overflow-y: auto;
  padding: 5px;
}
.log-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(27, 91, 158, 0.1);
  font-size: 12px;
}
.log-time { color: #555; white-space: nowrap; font-family: 'Courier New', monospace; }
.log-msg { color: #8ab4f8; }
.log-entry.warning .log-msg { color: #ffa500; }
.log-entry.danger .log-msg { color: #f24e4e; }
.alert-list {
  max-height: 400px;
  overflow-y: auto;
}
.alert-record {
  padding: 10px;
  margin-bottom: 6px;
  border-left: 3px solid;
}
.alert-record.warning { background: rgba(255,165,0,0.05); border-color: #ffa500; }
.alert-record.danger { background: rgba(242,78,78,0.05); border-color: #f24e4e; }
.battery-bar {
  width: 50px;
  height: 16px;
  background: rgba(27, 91, 158, 0.2);
  border: 1px solid rgba(27, 91, 158, 0.3);
  border-radius: 3px;
  position: relative;
  display: inline-block;
}
.battery-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}
.battery-bar.high .battery-fill { background: var(--accent-green); }
.battery-bar.medium .battery-fill { background: #ffa500; }
.battery-bar.low .battery-fill { background: var(--accent-red); }
.battery-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}
.recording-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(27, 12, 12, 0.85);
  border: 1px solid var(--accent-red);
  padding: 8px 20px;
  font-size: 13px;
  color: #f24e4e;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  backdrop-filter: blur(10px);
}
.recording-dot {
  animation: blink 1s ease-in-out infinite;
  color: var(--accent-red);
}
.trend {
  font-size: 11px;
  margin-top: 4px;
}
.trend.up { color: var(--accent-red); }
.trend.down { color: var(--accent-green); }
.form-btn-danger {
  border-color: var(--accent-red) !important;
  color: var(--accent-red) !important;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
