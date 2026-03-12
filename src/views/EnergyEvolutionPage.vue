<template>
  <div class="page-container">
    <div class="page-title">能量演化分析</div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <span class="form-label">边坡选择</span>
      <select class="form-select" style="width:150px;" v-model="selectedSlope">
        <option v-for="s in slopes" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <span class="form-label">工况选择</span>
      <select class="form-select" style="width:180px;" v-model="selectedCondition">
        <option v-for="c in conditions" :key="c.id" :value="c.id">{{ c.desc }}</option>
      </select>
      <span class="form-label">能量类型</span>
      <select class="form-select" style="width:150px;" v-model="energyFilter">
        <option value="all">全部能量</option>
        <option value="input">输入能</option>
        <option value="dissipation">耗散能</option>
        <option value="elastic">弹性能</option>
        <option value="kinetic">动能</option>
      </select>
      <span class="form-label">分析模式</span>
      <select class="form-select" style="width:130px;" v-model="analysisMode">
        <option value="standard">标准分析</option>
        <option value="phased">分阶段分析</option>
        <option value="layered">逐层分析</option>
      </select>
      <button class="form-btn form-btn-primary" @click="runEnergyAnalysis" :disabled="analyzing">
        <i :class="analyzing ? 'ri-loader-4-line' : 'ri-play-circle-line'"></i> {{ analyzing ? '分析中...' : '开始分析' }}
      </button>
      <button class="form-btn" @click="showThresholdPanel = !showThresholdPanel">
        <i class="ri-alarm-warning-line"></i> 阈值设置
      </button>
      <button class="form-btn" @click="exportEnergyData">
        <i class="ri-download-line"></i> 导出数据
      </button>
    </div>

    <!-- 阈值配置面板 -->
    <div class="panel" v-if="showThresholdPanel" style="margin-bottom:20px;">
      <div class="panel-title">
        <span><i class="ri-alarm-warning-line"></i> 能量异常阈值配置</span>
        <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="showThresholdPanel = false">
          <i class="ri-close-line"></i> 收起
        </button>
      </div>
      <div class="param-grid">
        <div class="param-section" v-for="(th, key) in thresholds" :key="key">
          <div class="param-section-title">{{ th.label }}</div>
          <div class="param-row">
            <span class="param-label">警告阈值</span>
            <input type="number" class="form-input" v-model.number="th.warning" style="width:90px;">
          </div>
          <div class="param-row">
            <span class="param-label">危险阈值</span>
            <input type="number" class="form-input" v-model.number="th.danger" style="width:90px;">
          </div>
          <div class="param-row">
            <span class="param-label">单位</span>
            <span style="color:var(--text-highlight); font-size:13px;">{{ th.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分析进度 -->
    <div class="panel" v-if="analyzing" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:15px; padding:5px 0;">
        <i class="ri-loader-4-line" style="color:var(--text-highlight); font-size:18px; animation: spin 1s linear infinite;"></i>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#fff;">{{ progressText }}</span>
            <span class="tech-num" style="color:var(--text-highlight);">{{ progress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row-4" v-if="analysisComplete">
      <div class="stats-card">
        <i class="ri-flashlight-line" style="color:var(--text-highlight); font-size:20px;"></i>
        <div class="label">总输入能 (kJ)</div>
        <div class="value">{{ energyStats.totalInput }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-fire-line" style="color:var(--accent-red); font-size:20px;"></i>
        <div class="label">总耗散能 (kJ)</div>
        <div class="value" style="color:var(--accent-red);">{{ energyStats.totalDissipation }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-leaf-line" style="color:var(--accent-green); font-size:20px;"></i>
        <div class="label">最大弹性能 (kJ)</div>
        <div class="value" style="color:var(--accent-green);">{{ energyStats.maxElastic }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-percent-line" style="color:#ffa500; font-size:20px;"></i>
        <div class="label">总耗散比 (%)</div>
        <div class="value" :style="{ color: parseFloat(energyStats.dissipationRatio) > 100 ? 'var(--accent-red)' : '#ffa500' }">{{ energyStats.dissipationRatio }}</div>
      </div>
    </div>

    <!-- 能量异常指标 -->
    <div class="card-grid-4" v-if="analysisComplete">
      <div class="rich-card" v-for="(alert, i) in anomalyIndicators" :key="i">
        <i :class="alert.icon" class="card-icon" :style="{ color: alert.color }"></i>
        <div class="card-num" :style="{ color: alert.color, fontSize: '24px' }">{{ alert.value }}</div>
        <div class="card-label">{{ alert.label }}</div>
        <div class="card-trend" :class="alert.status">{{ alert.statusText }}</div>
        <i :class="alert.bgIcon" class="card-bg-icon"></i>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-bar" v-if="analysisComplete">
      <div :class="['tab-item', activeTab === 'evolution' ? 'active' : '']" @click="activeTab = 'evolution'">
        <i class="ri-line-chart-line"></i> 能量演化
      </div>
      <div :class="['tab-item', activeTab === 'distribution' ? 'active' : '']" @click="activeTab = 'distribution'">
        <i class="ri-pie-chart-2-line"></i> 能量分布
      </div>
      <div :class="['tab-item', activeTab === 'balance' ? 'active' : '']" @click="activeTab = 'balance'">
        <i class="ri-scales-2-line"></i> 能量平衡
      </div>
      <div :class="['tab-item', activeTab === 'phased' ? 'active' : '']" @click="activeTab = 'phased'">
        <i class="ri-bar-chart-line"></i> 阶段对比
      </div>
      <div :class="['tab-item', activeTab === 'rate' ? 'active' : '']" @click="activeTab = 'rate'">
        <i class="ri-speed-up-line"></i> 能量速率
      </div>
      <div :class="['tab-item', activeTab === 'anomaly' ? 'active' : '']" @click="activeTab = 'anomaly'">
        <i class="ri-alarm-warning-line"></i> 异常识别
      </div>
    </div>

    <!-- 能量演化趋势 Tab -->
    <div v-show="activeTab === 'evolution' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title">
            <span><i class="ri-line-chart-line"></i> 能量演化趋势图</span>
            <span style="font-size:12px; color:var(--text-highlight);">{{ currentSlopeName }} · {{ currentConditionDesc }}</span>
          </div>
          <div ref="evoChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title">
            <span><i class="ri-stack-line"></i> 能量累积堆叠图</span>
          </div>
          <div ref="stackChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
      </div>
    </div>

    <!-- 能量分布 Tab -->
    <div v-show="activeTab === 'distribution' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 350px;">
          <div class="panel-title"><span><i class="ri-pie-chart-2-line"></i> 终态能量分布</span></div>
          <div ref="pieChartRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
        <div class="panel" style="min-height: 350px;">
          <div class="panel-title"><span><i class="ri-donut-chart-line"></i> 各监测点能量分布</span></div>
          <div ref="pointEnergyRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-table-line"></i> 分层能量统计</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>层位</th>
              <th>高程范围 (m)</th>
              <th>输入能 (kJ)</th>
              <th>耗散能 (kJ)</th>
              <th>弹性能 (kJ)</th>
              <th>动能 (kJ)</th>
              <th>耗散比 (%)</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(layer, i) in layerEnergyData" :key="i">
              <td>{{ layer.name }}</td>
              <td>{{ layer.range }}</td>
              <td>{{ layer.input }}</td>
              <td>{{ layer.dissipation }}</td>
              <td :style="{ color: layer.elastic < 0 ? 'var(--accent-red)' : '' }">{{ layer.elastic }}</td>
              <td>{{ layer.kinetic }}</td>
              <td :style="{ color: layer.ratio > 100 ? 'var(--accent-red)' : layer.ratio > 80 ? '#ffa500' : '' }">{{ layer.ratio }}</td>
              <td><span :class="['status-tag', layer.statusClass]">{{ layer.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 能量平衡 Tab -->
    <div v-show="activeTab === 'balance' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title"><span><i class="ri-scales-2-line"></i> 能量平衡验证</span></div>
          <div ref="balanceChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-check-double-line"></i> 能量守恒校验</div>
          <div class="stat-item">
            <span>输入能总量 (kJ)</span>
            <span class="stat-value" style="font-size:18px;">{{ balanceInfo.inputTotal }}</span>
          </div>
          <div class="stat-item">
            <span>耗散能 + 弹性能 + 动能 (kJ)</span>
            <span class="stat-value" style="font-size:18px;">{{ balanceInfo.sumComponents }}</span>
          </div>
          <div class="stat-item">
            <span>能量残差 (kJ)</span>
            <span class="stat-value" style="font-size:18px;" :style="{ color: Math.abs(balanceInfo.residual) > 1 ? 'var(--accent-red)' : 'var(--accent-green)' }">{{ balanceInfo.residual }}</span>
          </div>
          <div class="stat-item">
            <span>相对误差 (%)</span>
            <span class="stat-value" style="font-size:18px;" :style="{ color: balanceInfo.relativeError > 5 ? 'var(--accent-red)' : 'var(--accent-green)' }">{{ balanceInfo.relativeError }}</span>
          </div>
          <div class="alert-box" :class="balanceInfo.relativeError > 5 ? 'warning' : 'success'" style="margin-top:15px;">
            {{ balanceInfo.relativeError > 5
              ? '⚠ 能量平衡相对误差偏大，建议检查计算参数和模型设置。'
              : '✓ 能量平衡校验通过，计算结果可靠。' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 阶段对比 Tab -->
    <div v-show="activeTab === 'phased' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 350px;">
          <div class="panel-title">
            <span><i class="ri-bar-chart-line"></i> 阶段能量对比分析</span>
            <span style="font-size:12px; color:#8ab4f8;">前期 / 中期 / 后期</span>
          </div>
          <div ref="phaseChartRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
        <div class="panel" style="min-height: 350px;">
          <div class="panel-title">
            <span><i class="ri-percent-line"></i> 各阶段耗散比变化</span>
          </div>
          <div ref="ratioChartRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-table-line"></i> 能量分时段明细</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>时间段</th>
              <th>持续时间 (s)</th>
              <th>输入能 (kJ)</th>
              <th>耗散能 (kJ)</th>
              <th>弹性能变化 (kJ)</th>
              <th>动能变化 (kJ)</th>
              <th>能量增长率</th>
              <th>耗散比 (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(phase, i) in phasedData" :key="i"
                :style="i === phasedData.length - 1 ? 'background:rgba(27,91,158,0.1); font-weight:bold;' : ''">
              <td>{{ phase.name }}</td>
              <td>{{ phase.duration }}</td>
              <td>{{ phase.input }}</td>
              <td>{{ phase.dissipation }}</td>
              <td :style="{ color: phase.elasticChange < 0 ? 'var(--accent-red)' : '' }">{{ phase.elasticChange }}</td>
              <td>{{ phase.kineticChange }}</td>
              <td>{{ phase.growthRate }}</td>
              <td :style="{ color: phase.ratio > 100 ? 'var(--accent-red)' : phase.ratio > 80 ? '#ffa500' : '' }">{{ phase.ratio }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 能量速率 Tab -->
    <div v-show="activeTab === 'rate' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title"><span><i class="ri-speed-up-line"></i> 能量输入/耗散速率</span></div>
          <div ref="rateChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title"><span><i class="ri-line-chart-line"></i> 弹性能变化率</span></div>
          <div ref="elasticRateRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-information-line"></i> 速率分析说明</div>
        <div style="font-size:13px; line-height:1.8; color:#8ab4f8; padding:5px;">
          <p>能量输入速率反映了地震波向边坡传递能量的快慢，耗散速率反映了岩体破坏消耗能量的快慢。</p>
          <p>当耗散速率持续大于输入速率时，说明岩体正在快速损伤，是失稳的前兆信号。</p>
          <p>弹性能变化率为负值表示弹性储能正在释放，岩体发生了不可逆变形。</p>
          <p>最大能量输入速率出现在 <span style="color:var(--text-highlight);">{{ rateInfo.maxInputTime }}s</span>，值为 <span style="color:var(--accent-red);">{{ rateInfo.maxInputRate }} kJ/s</span>。</p>
        </div>
      </div>
    </div>

    <!-- 异常识别 Tab -->
    <div v-show="activeTab === 'anomaly' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 350px;">
          <div class="panel-title"><span><i class="ri-alarm-warning-line"></i> 异常指数时程</span></div>
          <div ref="anomalyChartRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-shield-check-line"></i> 异常检测结果</div>
          <div v-for="(alert, i) in anomalyAlerts" :key="i" class="alert-box" :class="alert.level" style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
              <strong>{{ alert.title }}</strong>
              <span class="tech-num" style="font-size:12px;">{{ alert.time }}</span>
            </div>
            <div>{{ alert.description }}</div>
          </div>
          <div v-if="anomalyAlerts.length === 0" class="alert-box success">
            ✓ 未检测到显著能量异常，能量演化过程正常。
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-lightbulb-line"></i> 能量异常诊断建议</div>
        <ul class="suggestion-list">
          <li v-for="(sug, i) in anomalySuggestions" :key="i">{{ sug }}</li>
        </ul>
      </div>
    </div>

    <!-- 工况对比分析 -->
    <div class="panel" v-if="analysisComplete && comparisonResults.length > 0" style="margin-top:20px;">
      <div class="panel-title">
        <span><i class="ri-git-branch-line"></i> 多工况能量对比</span>
        <button class="form-btn" style="padding:4px 12px; font-size:12px;" @click="addCurrentToComparison">
          <i class="ri-add-line"></i> 添加当前工况
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>工况</th>
            <th>边坡</th>
            <th>总输入能 (kJ)</th>
            <th>总耗散能 (kJ)</th>
            <th>峰值弹性能 (kJ)</th>
            <th>耗散比 (%)</th>
            <th>异常指数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in comparisonResults" :key="i">
            <td>{{ r.condition }}</td>
            <td>{{ r.slope }}</td>
            <td>{{ r.inputTotal }}</td>
            <td>{{ r.dissTotal }}</td>
            <td>{{ r.maxElastic }}</td>
            <td :style="{ color: r.ratio > 100 ? 'var(--accent-red)' : '' }">{{ r.ratio }}</td>
            <td :style="{ color: r.anomalyIndex > 0.3 ? 'var(--accent-red)' : r.anomalyIndex > 0.15 ? '#ffa500' : 'var(--accent-green)' }">{{ r.anomalyIndex }}</td>
            <td><button class="table-btn table-btn-danger" @click="comparisonResults.splice(i, 1)"><i class="ri-delete-bin-line"></i></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'
import {
  generateSeismicWave, integrateToVelocity, integrateToDisplacement,
  computeInputEnergy, computeKineticEnergy, computeDampingEnergy, computeStrainEnergy,
  computeStatistics, downsample, getSlopeData, getWorkConditions, getMonitorPoints
} from '../utils/dataGenerator'

// ==================== 状态 ====================
const slopes = getSlopeData()
const conditions = getWorkConditions()
const monitorPoints = getMonitorPoints()

const selectedSlope = ref('BP-001')
const selectedCondition = ref('GK-001')
const energyFilter = ref('all')
const analysisMode = ref('standard')
const showThresholdPanel = ref(false)
const analyzing = ref(false)
const analysisComplete = ref(false)
const progress = ref(0)
const progressText = ref('')
const activeTab = ref('evolution')

// 阈值配置
const thresholds = reactive({
  dissipationRatio: { label: '耗散比', warning: 90, danger: 120, unit: '%' },
  anomalyIndex: { label: '异常指数', warning: 0.2, danger: 0.4, unit: '' },
  elasticDrop: { label: '弹性能降幅', warning: 30, danger: 50, unit: '%' },
  inputRate: { label: '输入速率', warning: 200, danger: 400, unit: 'kJ/s' }
})

// 能量数据
const energyData = reactive({
  time: [],
  input: [], dissipation: [], elastic: [], kinetic: [],
  inputRate: [], dissRate: [], elasticRate: [],
  anomalyIndex: []
})

const energyStats = reactive({ totalInput: '0', totalDissipation: '0', maxElastic: '0', dissipationRatio: '0' })
const balanceInfo = reactive({ inputTotal: '0', sumComponents: '0', residual: '0', relativeError: '0' })
const rateInfo = reactive({ maxInputRate: '0', maxInputTime: '0' })
const phasedData = reactive([])
const layerEnergyData = reactive([])
const anomalyAlerts = reactive([])
const anomalySuggestions = reactive([])
const anomalyIndicators = reactive([])
const comparisonResults = reactive([])

// ==================== 图表引用 ====================
const evoChartRef = ref(null)
const stackChartRef = ref(null)
const pieChartRef = ref(null)
const pointEnergyRef = ref(null)
const balanceChartRef = ref(null)
const phaseChartRef = ref(null)
const ratioChartRef = ref(null)
const rateChartRef = ref(null)
const elasticRateRef = ref(null)
const anomalyChartRef = ref(null)

let charts = {}

// ==================== 计算属性 ====================
const currentSlopeName = computed(() => slopes.find(s => s.id === selectedSlope.value)?.name || '')
const currentConditionDesc = computed(() => conditions.find(c => c.id === selectedCondition.value)?.desc || '')
const currentCondition = computed(() => conditions.find(c => c.id === selectedCondition.value))

// ==================== 分析逻辑 ====================
async function runEnergyAnalysis() {
  analyzing.value = true
  analysisComplete.value = false
  progress.value = 0

  // Step 1: 生成基础数据
  progressText.value = '正在生成地震波数据...'
  await delay(200)
  const cond = currentCondition.value
  const waveType = cond.wave.includes('汶川') ? 'wenchuan' : cond.wave.includes('EL') ? 'elcentro' : 'artificial'
  const wave = generateSeismicWave(waveType, cond.duration, 0.02, cond.pga)
  progress.value = 15

  // Step 2: 计算速度和位移
  progressText.value = '正在计算速度和位移...'
  await delay(200)
  const vel = integrateToVelocity(wave.acc, 0.02)
  const disp = integrateToDisplacement(vel, 0.02)
  progress.value = 30

  // Step 3: 计算各能量分量
  progressText.value = '正在计算能量分量...'
  await delay(300)
  const inputE = computeInputEnergy(wave.acc, vel, 1.0, 0.02)
  const dampingE = computeDampingEnergy(vel, 0.05, 6.28, 1.0, 0.02)
  const strainE = computeStrainEnergy(disp, 100)
  const kineticE = computeKineticEnergy(vel, 1.0)

  // 缩放到合理范围
  const scaleFactor = 750 / (inputE[inputE.length - 1] || 1)
  const scaledInput = inputE.map(v => parseFloat((v * scaleFactor).toFixed(1)))
  const scaledDamp = dampingE.map(v => parseFloat((v * scaleFactor * 0.9).toFixed(1)))
  const scaledStrain = strainE.map(v => parseFloat((v * scaleFactor * 0.3).toFixed(1)))
  const scaledKinetic = kineticE.map(v => parseFloat((v * scaleFactor * 0.15).toFixed(1)))
  
  energyData.time = wave.time
  energyData.input = scaledInput
  energyData.dissipation = scaledDamp
  energyData.elastic = scaledStrain
  energyData.kinetic = scaledKinetic
  progress.value = 55

  // Step 4: 计算能量速率
  progressText.value = '正在计算能量速率...'
  await delay(200)
  energyData.inputRate = computeRate(scaledInput, 0.02)
  energyData.dissRate = computeRate(scaledDamp, 0.02)
  energyData.elasticRate = computeRate(scaledStrain, 0.02)
  progress.value = 65

  // Step 5: 异常指数计算
  progressText.value = '正在计算异常指数...'
  await delay(200)
  energyData.anomalyIndex = computeAnomalyIndex(scaledInput, scaledDamp, scaledStrain)
  progress.value = 75

  // Step 6: 计算统计与分阶段数据
  progressText.value = '正在进行统计分析...'
  await delay(200)
  updateEnergyStats()
  updatePhasedData()
  updateLayerData()
  updateBalanceInfo()
  updateRateInfo()
  updateAnomalyAlerts()
  updateAnomalyIndicators()
  progress.value = 95

  // 完成
  progressText.value = '分析完成！'
  await delay(300)
  progress.value = 100
  analyzing.value = false
  analysisComplete.value = true

  await nextTick()
  renderAllCharts()
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function computeRate(data, dt) {
  const rate = [0]
  const windowSize = 10
  for (let i = 1; i < data.length; i++) {
    const start = Math.max(0, i - windowSize)
    const r = (data[i] - data[start]) / ((i - start) * dt)
    rate.push(parseFloat(r.toFixed(2)))
  }
  return rate
}

function computeAnomalyIndex(input, dissipation, elastic) {
  return input.map((inp, i) => {
    if (inp === 0) return 0
    const ratio = dissipation[i] / inp
    const elasticRatio = elastic[i] / (inp || 1)
    const anomaly = Math.max(0, ratio - 0.85) + Math.max(0, -elasticRatio) * 2
    return parseFloat(Math.min(1, anomaly).toFixed(3))
  })
}

function updateEnergyStats() {
  const inp = energyData.input
  const diss = energyData.dissipation
  const el = energyData.elastic
  energyStats.totalInput = inp[inp.length - 1]?.toFixed(1) || '0'
  energyStats.totalDissipation = diss[diss.length - 1]?.toFixed(1) || '0'
  energyStats.maxElastic = Math.max(...el).toFixed(1)
  const totalInp = parseFloat(energyStats.totalInput)
  energyStats.dissipationRatio = totalInp > 0
    ? (parseFloat(energyStats.totalDissipation) / totalInp * 100).toFixed(1)
    : '0'
}

function updatePhasedData() {
  const n = energyData.time.length
  const phases = [
    { name: '前期 (上升段)', start: 0, end: Math.floor(n * 0.2) },
    { name: '中期 (主震段)', start: Math.floor(n * 0.2), end: Math.floor(n * 0.55) },
    { name: '后期 (衰减段)', start: Math.floor(n * 0.55), end: n - 1 }
  ]
  
  phasedData.splice(0, phasedData.length)
  let totalInput = 0, totalDiss = 0, totalElastic = 0, totalKinetic = 0
  
  phases.forEach((p, idx) => {
    const input = energyData.input[p.end] - energyData.input[p.start]
    const diss = energyData.dissipation[p.end] - energyData.dissipation[p.start]
    const elastic = energyData.elastic[p.end] - energyData.elastic[p.start]
    const kinetic = energyData.kinetic[p.end] - energyData.kinetic[p.start]
    const duration = (energyData.time[p.end] - energyData.time[p.start]).toFixed(1)
    const ratio = input > 0 ? (diss / input * 100) : 0
    const growthRate = idx > 0 && phasedData[idx - 1]
      ? ((input / parseFloat(phasedData[idx - 1].input) - 1) * 100).toFixed(1) + '%'
      : '-'
    
    totalInput += input; totalDiss += diss; totalElastic += elastic; totalKinetic += kinetic
    
    phasedData.push({
      name: p.name, duration,
      input: input.toFixed(1), dissipation: diss.toFixed(1),
      elasticChange: elastic.toFixed(1), kineticChange: kinetic.toFixed(1),
      growthRate, ratio: ratio.toFixed(1)
    })
  })
  
  phasedData.push({
    name: '总计', duration: energyData.time[energyData.time.length - 1].toFixed(1),
    input: totalInput.toFixed(1), dissipation: totalDiss.toFixed(1),
    elasticChange: totalElastic.toFixed(1), kineticChange: totalKinetic.toFixed(1),
    growthRate: '-',
    ratio: totalInput > 0 ? (totalDiss / totalInput * 100).toFixed(1) : '0'
  })
}

function updateLayerData() {
  const layers = [
    { name: '底层(坡脚)', range: '0-20m', factor: 0.6 },
    { name: '下部', range: '20-40m', factor: 0.8 },
    { name: '中部', range: '40-60m', factor: 1.0 },
    { name: '上部', range: '60-75m', factor: 1.15 },
    { name: '顶部(坡顶)', range: '75-85m', factor: 1.3 }
  ]
  
  const totalInput = parseFloat(energyStats.totalInput)
  layerEnergyData.splice(0, layerEnergyData.length)
  
  layers.forEach(l => {
    const input = (totalInput * l.factor / 4.85).toFixed(1)
    const dissipation = (parseFloat(input) * (0.75 + Math.random() * 0.35)).toFixed(1)
    const elastic = (parseFloat(input) - parseFloat(dissipation)).toFixed(1)
    const kinetic = (parseFloat(input) * 0.08 * (Math.random() + 0.5)).toFixed(1)
    const ratio = parseFloat(input) > 0 ? (parseFloat(dissipation) / parseFloat(input) * 100).toFixed(1) : '0'
    const rNum = parseFloat(ratio)
    
    layerEnergyData.push({
      ...l, input, dissipation, elastic: parseFloat(elastic), kinetic,
      ratio: rNum.toFixed(1),
      status: rNum > 120 ? '异常' : rNum > 90 ? '需关注' : '正常',
      statusClass: rNum > 120 ? 'danger' : rNum > 90 ? 'warning' : 'success'
    })
  })
}

function updateBalanceInfo() {
  const n = energyData.time.length - 1
  const inputTotal = energyData.input[n]
  const sum = energyData.dissipation[n] + energyData.elastic[n] + energyData.kinetic[n]
  const residual = inputTotal - sum
  
  Object.assign(balanceInfo, {
    inputTotal: inputTotal.toFixed(1),
    sumComponents: sum.toFixed(1),
    residual: residual.toFixed(2),
    relativeError: inputTotal > 0 ? (Math.abs(residual) / inputTotal * 100).toFixed(2) : '0'
  })
}

function updateRateInfo() {
  const maxRate = Math.max(...energyData.inputRate)
  const maxIdx = energyData.inputRate.indexOf(maxRate)
  rateInfo.maxInputRate = maxRate.toFixed(1)
  rateInfo.maxInputTime = energyData.time[maxIdx]?.toFixed(2) || '0'
}

function updateAnomalyAlerts() {
  anomalyAlerts.splice(0, anomalyAlerts.length)
  
  // 检查耗散比异常
  const ratio = parseFloat(energyStats.dissipationRatio)
  if (ratio > thresholds.dissipationRatio.danger) {
    anomalyAlerts.push({
      title: '⚠ 耗散比超限', level: 'danger',
      time: energyData.time[energyData.time.length - 1]?.toFixed(1) + 's',
      description: `总耗散比达 ${ratio}%，远超危险阈值 ${thresholds.dissipationRatio.danger}%，表明弹性储能正在大量释放。`
    })
  } else if (ratio > thresholds.dissipationRatio.warning) {
    anomalyAlerts.push({
      title: '⚠ 耗散比偏高', level: 'warning',
      time: energyData.time[energyData.time.length - 1]?.toFixed(1) + 's',
      description: `总耗散比达 ${ratio}%，超过警告阈值 ${thresholds.dissipationRatio.warning}%。`
    })
  }
  
  // 检查弹性能负增长
  const n = energyData.elastic.length
  const halfIdx = Math.floor(n * 0.5)
  const lateElastic = energyData.elastic[n - 1] - energyData.elastic[halfIdx]
  if (lateElastic < 0) {
    anomalyAlerts.push({
      title: '⚠ 中后期弹性能负增长', level: 'danger',
      time: energyData.time[halfIdx]?.toFixed(1) + 's - ' + energyData.time[n - 1]?.toFixed(1) + 's',
      description: `中后期弹性能下降 ${Math.abs(lateElastic).toFixed(1)} kJ，说明岩体发生了不可逆损伤。`
    })
  }
  
  // 检查异常指数
  const maxAnomaly = Math.max(...energyData.anomalyIndex)
  if (maxAnomaly > thresholds.anomalyIndex.danger) {
    const maxIdx = energyData.anomalyIndex.indexOf(maxAnomaly)
    anomalyAlerts.push({
      title: '⚠ 异常指数超限', level: 'danger',
      time: energyData.time[maxIdx]?.toFixed(1) + 's',
      description: `最大异常指数达 ${maxAnomaly.toFixed(3)}，超过危险阈值 ${thresholds.anomalyIndex.danger}。`
    })
  }
  
  // 建议
  anomalySuggestions.splice(0, anomalySuggestions.length)
  if (anomalyAlerts.length > 0) {
    anomalySuggestions.push('建议加强边坡坡顶和坡体中部区域的实时监测，增设位移和加速度传感器。')
    anomalySuggestions.push('建议开展进一步的支护设计分析，评估加设抗滑桩或锚索的可行性。')
    anomalySuggestions.push('建议对比不同地震波作用下的能量演化规律，识别最不利工况。')
    anomalySuggestions.push('建议将能量异常系数纳入长期监测预警指标体系，设置动态阈值。')
    anomalySuggestions.push('建议在雨季来临前完成边坡排水系统的检查与维护，防止水-力耦合加剧失稳风险。')
  } else {
    anomalySuggestions.push('当前工况下能量演化过程正常，建议继续保持监测。')
    anomalySuggestions.push('建议定期进行能量演化分析，跟踪长期变化趋势。')
  }
}

function updateAnomalyIndicators() {
  const ratio = parseFloat(energyStats.dissipationRatio)
  const maxAnomaly = Math.max(...(energyData.anomalyIndex.length ? energyData.anomalyIndex : [0]))
  const elasticMax = parseFloat(energyStats.maxElastic)
  const maxRate = parseFloat(rateInfo.maxInputRate)
  
  anomalyIndicators.splice(0, anomalyIndicators.length)
  anomalyIndicators.push(
    {
      icon: 'ri-percent-line', label: '耗散比', value: ratio.toFixed(1) + '%',
      color: ratio > 100 ? '#f24e4e' : ratio > 80 ? '#ffa500' : '#00ff88',
      status: ratio > 100 ? 'down' : 'up',
      statusText: ratio > 100 ? '超限' : ratio > 80 ? '偏高' : '正常',
      bgIcon: 'ri-percent-line'
    },
    {
      icon: 'ri-alarm-warning-line', label: '异常指数', value: maxAnomaly.toFixed(3),
      color: maxAnomaly > 0.4 ? '#f24e4e' : maxAnomaly > 0.2 ? '#ffa500' : '#00ff88',
      status: maxAnomaly > 0.4 ? 'down' : 'up',
      statusText: maxAnomaly > 0.4 ? '危险' : maxAnomaly > 0.2 ? '警告' : '正常',
      bgIcon: 'ri-alarm-warning-line'
    },
    {
      icon: 'ri-leaf-line', label: '峰值弹性能', value: elasticMax.toFixed(1) + ' kJ',
      color: '#00eaff',
      status: 'up', statusText: '正常',
      bgIcon: 'ri-leaf-line'
    },
    {
      icon: 'ri-speed-up-line', label: '最大输入速率', value: maxRate.toFixed(1) + ' kJ/s',
      color: maxRate > 400 ? '#f24e4e' : maxRate > 200 ? '#ffa500' : '#00eaff',
      status: maxRate > 400 ? 'down' : 'up',
      statusText: maxRate > 400 ? '超限' : maxRate > 200 ? '偏高' : '正常',
      bgIcon: 'ri-speed-up-line'
    }
  )
}

function addCurrentToComparison() {
  comparisonResults.push({
    condition: currentConditionDesc.value,
    slope: currentSlopeName.value,
    inputTotal: energyStats.totalInput,
    dissTotal: energyStats.totalDissipation,
    maxElastic: energyStats.maxElastic,
    ratio: energyStats.dissipationRatio,
    anomalyIndex: Math.max(...(energyData.anomalyIndex.length ? energyData.anomalyIndex : [0])).toFixed(3)
  })
}

function exportEnergyData() {
  if (!analysisComplete.value) return
  let csv = '时间(s),输入能(kJ),耗散能(kJ),弹性能(kJ),动能(kJ),异常指数\n'
  energyData.time.forEach((t, i) => {
    csv += `${t.toFixed(3)},${energyData.input[i]},${energyData.dissipation[i]},${energyData.elastic[i]},${energyData.kinetic[i]},${energyData.anomalyIndex[i] || 0}\n`
  })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `能量演化_${currentSlopeName.value}_${currentConditionDesc.value}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 图表渲染 ====================
function renderAllCharts() {
  renderEvoChart()
  renderStackChart()
  renderPieChart()
  renderPointEnergyChart()
  renderBalanceChart()
  renderPhaseChart()
  renderRatioChart()
  renderRateChart()
  renderElasticRateChart()
  renderAnomalyChart()
}

function getCommonOpt() {
  return {
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true }
  }
}

function getAxisStyle() {
  return {
    axisLabel: { color: '#b0d0ff' },
    axisLine: { lineStyle: { color: '#1b5b9e' } },
    splitLine: { lineStyle: { color: 'rgba(27, 91, 158, 0.2)' } }
  }
}

function initChart(refEl, key) {
  if (!refEl) return null
  if (charts[key]) charts[key].dispose()
  charts[key] = echarts.init(refEl)
  return charts[key]
}

function renderEvoChart() {
  const chart = initChart(evoChartRef.value, 'evo')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  const series = [
    { name: '输入能', data: downsample(energyData.input, 300), color: '#00eaff', areaColor: 'rgba(0,234,255,0.05)' },
    { name: '耗散能', data: downsample(energyData.dissipation, 300), color: '#f24e4e', areaColor: 'rgba(242,78,78,0.05)' },
    { name: '弹性能', data: downsample(energyData.elastic, 300), color: '#00ff88', areaColor: null },
    { name: '动能', data: downsample(energyData.kinetic, 300), color: '#a78bfa', areaColor: null }
  ]
  
  if (energyFilter.value !== 'all') {
    const filterMap = { input: '输入能', dissipation: '耗散能', elastic: '弹性能', kinetic: '动能' }
    const filterName = filterMap[energyFilter.value]
    series.splice(0, series.length, ...series.filter(s => s.name === filterName))
  }
  
  chart.setOption({
    ...getCommonOpt(),
    legend: { data: series.map(s => s.name), textStyle: { color: '#b0d0ff' } },
    xAxis: { type: 'category', boundaryGap: false, data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 20, bottom: 5, borderColor: '#1b5b9e', fillerColor: 'rgba(0,234,255,0.1)', textStyle: { color: '#b0d0ff' } }
    ],
    series: series.map(s => ({
      name: s.name, type: 'line', data: s.data, smooth: true, showSymbol: false,
      itemStyle: { color: s.color },
      areaStyle: s.areaColor ? { color: s.areaColor } : undefined,
      lineStyle: { width: 2, shadowColor: s.color.replace(')', ',0.4)').replace('rgb', 'rgba'), shadowBlur: 8 }
    }))
  })
}

function renderStackChart() {
  const chart = initChart(stackChartRef.value, 'stack')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  chart.setOption({
    ...getCommonOpt(),
    legend: { data: ['耗散能', '弹性能', '动能'], textStyle: { color: '#b0d0ff' } },
    xAxis: { type: 'category', boundaryGap: false, data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [
      { name: '耗散能', type: 'line', stack: 'total', data: downsample(energyData.dissipation, 300), smooth: true, showSymbol: false, areaStyle: { color: 'rgba(242,78,78,0.3)' }, lineStyle: { width: 0 }, itemStyle: { color: '#f24e4e' } },
      { name: '弹性能', type: 'line', stack: 'total', data: downsample(energyData.elastic, 300), smooth: true, showSymbol: false, areaStyle: { color: 'rgba(0,255,136,0.3)' }, lineStyle: { width: 0 }, itemStyle: { color: '#00ff88' } },
      { name: '动能', type: 'line', stack: 'total', data: downsample(energyData.kinetic, 300), smooth: true, showSymbol: false, areaStyle: { color: 'rgba(167,139,250,0.3)' }, lineStyle: { width: 0 }, itemStyle: { color: '#a78bfa' } }
    ]
  })
}

function renderPieChart() {
  const chart = initChart(pieChartRef.value, 'pie')
  if (!chart) return
  
  const n = energyData.time.length - 1
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip },
    legend: { data: ['耗散能', '弹性能', '动能'], textStyle: { color: '#b0d0ff' }, bottom: 10 },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      label: { color: '#b0d0ff', formatter: '{b}: {d}%' },
      labelLine: { lineStyle: { color: '#1b5b9e' } },
      data: [
        { value: energyData.dissipation[n]?.toFixed(1), name: '耗散能', itemStyle: { color: '#f24e4e' } },
        { value: energyData.elastic[n]?.toFixed(1), name: '弹性能', itemStyle: { color: '#00ff88' } },
        { value: energyData.kinetic[n]?.toFixed(1), name: '动能', itemStyle: { color: '#a78bfa' } }
      ],
      emphasis: { itemStyle: { shadowBlur: 15, shadowColor: 'rgba(0,234,255,0.3)' } }
    }]
  })
}

function renderPointEnergyChart() {
  const chart = initChart(pointEnergyRef.value, 'pointEnergy')
  if (!chart) return
  
  const totalInput = parseFloat(energyStats.totalInput)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['输入能', '耗散能', '弹性能'], textStyle: { color: '#b0d0ff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: monitorPoints.map(p => p.id + ' ' + p.name),
      ...getAxisStyle()
    },
    yAxis: { type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [
      {
        name: '输入能', type: 'bar',
        data: monitorPoints.map(p => parseFloat((totalInput * p.amplification / 5).toFixed(1))),
        itemStyle: { color: '#00eaff' }
      },
      {
        name: '耗散能', type: 'bar',
        data: monitorPoints.map(p => parseFloat((totalInput * p.amplification * 0.85 / 5).toFixed(1))),
        itemStyle: { color: '#f24e4e' }
      },
      {
        name: '弹性能', type: 'bar',
        data: monitorPoints.map(p => parseFloat((totalInput * p.amplification * 0.12 / 5).toFixed(1))),
        itemStyle: { color: '#00ff88' }
      }
    ]
  })
}

function renderBalanceChart() {
  const chart = initChart(balanceChartRef.value, 'balance')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  const inp = downsample(energyData.input, 300)
  const diss = downsample(energyData.dissipation, 300)
  const el = downsample(energyData.elastic, 300)
  const kin = downsample(energyData.kinetic, 300)
  const residual = inp.map((v, i) => parseFloat((v - diss[i] - el[i] - kin[i]).toFixed(2)))
  
  chart.setOption({
    ...getCommonOpt(),
    legend: { data: ['输入能', '耗散+弹性+动能', '残差'], textStyle: { color: '#b0d0ff' } },
    xAxis: { type: 'category', data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [
      { name: '输入能', type: 'line', data: inp, smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#00eaff' }, itemStyle: { color: '#00eaff' } },
      { name: '耗散+弹性+动能', type: 'line', data: inp.map((_, i) => parseFloat((diss[i] + el[i] + kin[i]).toFixed(1))), smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#ffa500', type: 'dashed' }, itemStyle: { color: '#ffa500' } },
      { name: '残差', type: 'bar', data: residual, itemStyle: { color: 'rgba(0,255,136,0.3)' }, barWidth: '30%' }
    ]
  })
}

function renderPhaseChart() {
  const chart = initChart(phaseChartRef.value, 'phase')
  if (!chart) return
  
  const phases = phasedData.slice(0, -1)
  chart.setOption({
    ...getCommonOpt(),
    legend: { data: ['输入能', '耗散能', '弹性能变化', '动能变化'], textStyle: { color: '#b0d0ff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: phases.map(p => p.name), ...getAxisStyle() },
    yAxis: { type: 'value', name: '能量 (kJ)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [
      { name: '输入能', type: 'bar', data: phases.map(p => parseFloat(p.input)), itemStyle: { color: '#00eaff' } },
      { name: '耗散能', type: 'bar', data: phases.map(p => parseFloat(p.dissipation)), itemStyle: { color: '#f24e4e' } },
      { name: '弹性能变化', type: 'bar', data: phases.map(p => parseFloat(p.elasticChange)), itemStyle: { color: '#00ff88' } },
      { name: '动能变化', type: 'bar', data: phases.map(p => parseFloat(p.kineticChange)), itemStyle: { color: '#a78bfa' } }
    ]
  })
}

function renderRatioChart() {
  const chart = initChart(ratioChartRef.value, 'ratio')
  if (!chart) return
  
  const phases = phasedData.slice(0, -1)
  chart.setOption({
    ...getCommonOpt(),
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: phases.map(p => p.name), ...getAxisStyle() },
    yAxis: { type: 'value', name: '耗散比 (%)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [{
      type: 'bar', data: phases.map(p => ({
        value: parseFloat(p.ratio),
        itemStyle: { color: parseFloat(p.ratio) > 100 ? '#f24e4e' : parseFloat(p.ratio) > 80 ? '#ffa500' : '#00eaff' }
      })),
      barWidth: '40%',
      label: { show: true, position: 'top', color: '#b0d0ff', formatter: '{c}%' },
      markLine: {
        silent: true,
        data: [
          { yAxis: 100, label: { formatter: '100%', color: '#f24e4e' }, lineStyle: { color: 'rgba(242,78,78,0.5)', type: 'dashed' } }
        ]
      }
    }]
  })
}

function renderRateChart() {
  const chart = initChart(rateChartRef.value, 'rate')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  chart.setOption({
    ...getCommonOpt(),
    legend: { data: ['输入速率', '耗散速率'], textStyle: { color: '#b0d0ff' } },
    xAxis: { type: 'category', data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: 'kJ/s', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [{ type: 'inside' }],
    series: [
      { name: '输入速率', type: 'line', data: downsample(energyData.inputRate, 300), showSymbol: false, smooth: true, lineStyle: { width: 1.5, color: '#00eaff' }, itemStyle: { color: '#00eaff' }, areaStyle: { color: 'rgba(0,234,255,0.05)' } },
      { name: '耗散速率', type: 'line', data: downsample(energyData.dissRate, 300), showSymbol: false, smooth: true, lineStyle: { width: 1.5, color: '#f24e4e' }, itemStyle: { color: '#f24e4e' }, areaStyle: { color: 'rgba(242,78,78,0.05)' } }
    ]
  })
}

function renderElasticRateChart() {
  const chart = initChart(elasticRateRef.value, 'elasticRate')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  const data = downsample(energyData.elasticRate, 300)
  
  chart.setOption({
    ...getCommonOpt(),
    xAxis: { type: 'category', data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: 'kJ/s', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [{ type: 'inside' }],
    visualMap: {
      show: false, pieces: [
        { lte: 0, color: '#f24e4e' },
        { gt: 0, color: '#00ff88' }
      ]
    },
    series: [{
      type: 'line', data, showSymbol: false, smooth: true,
      lineStyle: { width: 1.5 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0,255,136,0.1)' },
          { offset: 0.5, color: 'rgba(0,0,0,0)' },
          { offset: 1, color: 'rgba(242,78,78,0.1)' }
        ])
      },
      markLine: {
        silent: true,
        data: [{ yAxis: 0, lineStyle: { color: 'rgba(255,255,255,0.2)' } }]
      }
    }]
  })
}

function renderAnomalyChart() {
  const chart = initChart(anomalyChartRef.value, 'anomaly')
  if (!chart) return
  
  const time = downsample(energyData.time, 300).map(t => t.toFixed(2) + 's')
  const data = downsample(energyData.anomalyIndex, 300)
  
  chart.setOption({
    ...getCommonOpt(),
    xAxis: { type: 'category', data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: '异常指数', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle(), max: 1 },
    series: [{
      type: 'line', data, showSymbol: false, smooth: true,
      lineStyle: { width: 2, color: '#ffa500' },
      itemStyle: { color: '#ffa500' },
      areaStyle: { color: 'rgba(255,165,0,0.08)' },
      markLine: {
        silent: true,
        data: [
          { yAxis: thresholds.anomalyIndex.warning, label: { formatter: '警告', color: '#ffa500' }, lineStyle: { color: 'rgba(255,165,0,0.4)', type: 'dashed' } },
          { yAxis: thresholds.anomalyIndex.danger, label: { formatter: '危险', color: '#f24e4e' }, lineStyle: { color: 'rgba(242,78,78,0.4)', type: 'dashed' } }
        ]
      }
    }]
  })
}

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ==================== 生命周期 ====================
onMounted(() => {
  window.addEventListener('resize', handleResize)
  runEnergyAnalysis()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
  charts = {}
})

watch(activeTab, async () => {
  await nextTick()
  handleResize()
})
</script>

<style scoped>
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
.param-label {
  font-size: 13px;
  color: #8ab4f8;
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
}
.tab-item:hover {
  background: rgba(0, 234, 255, 0.08);
  color: #fff;
}
.tab-item.active {
  background: rgba(0, 234, 255, 0.15);
  border-color: rgba(0, 234, 255, 0.4);
  color: var(--text-highlight);
  text-shadow: 0 0 6px rgba(0, 234, 255, 0.4);
}
.tab-item i { margin-right: 5px; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
