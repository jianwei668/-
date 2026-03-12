<template>
  <div class="page-container">
    <div class="page-title">稳定性评价</div>

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
      <span class="form-label">评价模型</span>
      <select class="form-select" style="width:180px;" v-model="evalModel">
        <option value="weighted">加权综合评分法</option>
        <option value="fuzzy">模糊综合评判法</option>
        <option value="grey">灰色关联分析法</option>
      </select>
      <button class="form-btn form-btn-primary" @click="runEvaluation" :disabled="evaluating">
        <i :class="evaluating ? 'ri-loader-4-line' : 'ri-play-circle-line'"></i> {{ evaluating ? '评价中...' : '开始评价' }}
      </button>
      <button class="form-btn" @click="showWeightPanel = !showWeightPanel">
        <i class="ri-equalizer-line"></i> 权重配置
      </button>
      <button class="form-btn" @click="exportReport">
        <i class="ri-file-pdf-line"></i> 导出报告
      </button>
    </div>

    <!-- 权重配置面板 -->
    <div class="panel" v-if="showWeightPanel" style="margin-bottom:20px;">
      <div class="panel-title">
        <span><i class="ri-equalizer-line"></i> 指标权重配置（AHP层次分析法）</span>
        <div style="display:flex; gap:8px;">
          <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="recalcAHP">
            <i class="ri-refresh-line"></i> 重新计算
          </button>
          <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="showWeightPanel = false">
            <i class="ri-close-line"></i> 收起
          </button>
        </div>
      </div>
      <div style="margin-bottom:12px; font-size:13px; color:#8ab4f8;">
        请填写两两比较判断矩阵（i行j列表示指标i相对指标j的重要性，取值 1/9~9）
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr>
              <th></th>
              <th v-for="(ind, i) in indicatorNames" :key="i" style="white-space:nowrap;">{{ ind }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in ahpMatrix" :key="i">
              <td style="color:var(--text-highlight); white-space:nowrap;">{{ indicatorNames[i] }}</td>
              <td v-for="(val, j) in row" :key="j">
                <input v-if="i !== j" type="number" class="form-input" style="width:55px; padding:3px 5px; font-size:12px; text-align:center;"
                  v-model.number="ahpMatrix[i][j]" step="0.5" min="0.11" max="9"
                  @change="onAHPChange(i, j)">
                <span v-else style="color:#555;">1</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="display:flex; gap:25px; margin-top:12px; flex-wrap:wrap; align-items:center;">
        <div v-for="(w, i) in weights" :key="i" style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:12px; color:#8ab4f8;">{{ indicatorNames[i] }}:</span>
          <span style="color:var(--text-highlight); font-weight:bold; font-size:13px;">{{ (w * 100).toFixed(1) }}%</span>
        </div>
        <div style="margin-left:auto; display:flex; gap:15px; align-items:center;">
          <span style="font-size:12px;" :style="{ color: ahpCR <= 0.1 ? 'var(--accent-green)' : 'var(--accent-red)' }">
            CR = {{ ahpCR.toFixed(4) }} {{ ahpCR <= 0.1 ? '✓ 通过' : '✗ 不通过' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 评价进度 -->
    <div class="panel" v-if="evaluating" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:15px; padding:5px 0;">
        <i class="ri-loader-4-line" style="color:var(--text-highlight); font-size:18px; animation: spin 1s linear infinite;"></i>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#fff;">{{ progressText }}</span>
            <span class="tech-num" style="color:var(--text-highlight);">{{ progress }}%</span>
          </div>
          <div class="progress-bar"><div class="fill" :style="{ width: progress + '%' }"></div></div>
        </div>
      </div>
    </div>

    <!-- 评价结果总览卡片 -->
    <div v-if="evalComplete" style="display:flex; gap:20px; margin-bottom:20px;">
      <div class="eval-result-card" style="flex:1; text-align:center; padding:25px;">
        <div style="color:#aaa; font-size:14px; margin-bottom:8px;">综合评分</div>
        <div class="eval-score" :style="{ color: resultColor, textShadow: '0 0 15px ' + resultColor + '80' }">{{ evalResult.score }}</div>
        <div class="eval-level" :style="{ color: resultColor }">[ {{ evalResult.level }} ]</div>
        <div style="margin-top:15px; display:flex; justify-content:center; gap:20px;">
          <div>
            <span class="form-label">风险等级</span>
            <span :class="['status-tag', evalResult.riskClass]" style="margin-left:8px;">{{ evalResult.risk }}</span>
          </div>
          <div>
            <span class="form-label">安全系数</span>
            <span style="margin-left:8px; font-size:16px; font-weight:bold;" :style="{ color: evalResult.safetyFactor < 1.0 ? 'var(--accent-red)' : evalResult.safetyFactor < 1.3 ? '#ffa500' : 'var(--accent-green)' }">
              {{ evalResult.safetyFactor }}
            </span>
          </div>
        </div>
      </div>
      <div class="eval-result-card" style="flex:1; text-align:center; padding:25px;">
        <div style="color:#aaa; font-size:14px; margin-bottom:8px;">评价方法</div>
        <div style="color:var(--text-highlight); font-size:18px; margin-bottom:10px;">{{ evalModelName }}</div>
        <div style="color:#8ab4f8; font-size:13px;">{{ currentSlopeName }} · {{ currentConditionDesc }}</div>
        <div style="margin-top:15px; display:flex; justify-content:center; gap:25px;">
          <div style="text-align:center;">
            <div style="color:#aaa; font-size:12px;">动力安全系数</div>
            <div style="color:var(--text-highlight); font-size:20px; font-weight:bold;">{{ evalResult.dynamicSF }}</div>
          </div>
          <div style="text-align:center;">
            <div style="color:#aaa; font-size:12px;">静力安全系数</div>
            <div style="color:var(--accent-green); font-size:20px; font-weight:bold;">{{ evalResult.staticSF }}</div>
          </div>
          <div style="text-align:center;">
            <div style="color:#aaa; font-size:12px;">安全系数降幅</div>
            <div style="color:var(--accent-red); font-size:20px; font-weight:bold;">{{ evalResult.sfDrop }}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar" v-if="evalComplete">
      <div :class="['tab-item', activeTab === 'scoring' ? 'active' : '']" @click="activeTab = 'scoring'">
        <i class="ri-list-ordered"></i> 指标评分
      </div>
      <div :class="['tab-item', activeTab === 'radar' ? 'active' : '']" @click="activeTab = 'radar'">
        <i class="ri-radar-line"></i> 雷达图
      </div>
      <div :class="['tab-item', activeTab === 'sensitivity' ? 'active' : '']" @click="activeTab = 'sensitivity'">
        <i class="ri-line-chart-line"></i> 敏感性分析
      </div>
      <div :class="['tab-item', activeTab === 'safety' ? 'active' : '']" @click="activeTab = 'safety'">
        <i class="ri-shield-line"></i> 安全系数
      </div>
      <div :class="['tab-item', activeTab === 'comparison' ? 'active' : '']" @click="activeTab = 'comparison'">
        <i class="ri-git-branch-line"></i> 方法对比
      </div>
      <div :class="['tab-item', activeTab === 'risk' ? 'active' : '']" @click="activeTab = 'risk'">
        <i class="ri-alarm-warning-line"></i> 风险矩阵
      </div>
    </div>

    <!-- 指标评分 Tab -->
    <div v-show="activeTab === 'scoring' && evalComplete">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title">
            <span><i class="ri-list-ordered"></i> 指标评分明细</span>
            <span style="font-size:12px; color:#8ab4f8;">{{ evalModelName }}</span>
          </div>
          <div class="indicator-row" style="background:rgba(27,91,158,0.15); font-weight:bold; font-size:13px;">
            <div class="indicator-name">评价指标</div>
            <div class="indicator-value">实测值</div>
            <div class="indicator-score">权重</div>
            <div class="indicator-score">得分</div>
          </div>
          <div class="indicator-row" v-for="(ind, i) in indicatorScores" :key="i">
            <div class="indicator-name">{{ ind.name }}</div>
            <div class="indicator-value">{{ ind.measured }}</div>
            <div class="indicator-score" style="color:#8ab4f8;">{{ (weights[i] * 100).toFixed(1) }}%</div>
            <div class="indicator-score" :style="{ color: ind.score < 60 ? 'var(--accent-red)' : ind.score < 75 ? '#ffa500' : 'var(--accent-green)' }">{{ ind.score }}</div>
          </div>
          <div class="indicator-row" style="background:rgba(0,0,0,0.2); margin-top:10px; font-weight:bold;">
            <div class="indicator-name" style="color:#fff;">加权综合得分</div>
            <div class="indicator-value"></div>
            <div class="indicator-score"></div>
            <div class="indicator-score" :style="{ color: resultColor, fontSize: '24px' }">{{ evalResult.score }}</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-bar-chart-horizontal-line"></i> 单项得分分布</div>
          <div ref="scoreBarRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
      </div>
    </div>

    <!-- 雷达图 Tab -->
    <div v-show="activeTab === 'radar' && evalComplete">
      <div class="content-grid">
        <div class="panel" style="min-height:380px;">
          <div class="panel-title"><i class="ri-radar-line"></i> 综合评价雷达图</div>
          <div ref="radarChartRef" style="flex:1; width:100%; min-height:340px;"></div>
        </div>
        <div class="panel" style="min-height:380px;">
          <div class="panel-title"><i class="ri-pie-chart-line"></i> 权重分布</div>
          <div ref="weightPieRef" style="flex:1; width:100%; min-height:340px;"></div>
        </div>
      </div>
    </div>

    <!-- 敏感性分析 Tab -->
    <div v-show="activeTab === 'sensitivity' && evalComplete">
      <div class="panel" style="min-height:380px;">
        <div class="panel-title">
          <span><i class="ri-line-chart-line"></i> 参数敏感性分析（龙卷风图）</span>
          <span style="font-size:12px; color:#8ab4f8;">各指标 ±20% 变化对综合得分的影响</span>
        </div>
        <div ref="sensitivityRef" style="flex:1; width:100%; min-height:340px;"></div>
      </div>
      <div class="panel" style="margin-top:20px;">
        <div class="panel-title"><i class="ri-information-line"></i> 敏感性分析结论</div>
        <div style="font-size:13px; line-height:1.8; color:#8ab4f8; padding:5px;">
          <p v-for="(s, i) in sensitivityConclusions" :key="i">{{ s }}</p>
        </div>
      </div>
    </div>

    <!-- 安全系数 Tab -->
    <div v-show="activeTab === 'safety' && evalComplete">
      <div class="content-grid">
        <div class="panel" style="min-height:380px;">
          <div class="panel-title"><span><i class="ri-shield-line"></i> 安全系数时程曲线</span></div>
          <div ref="safetyChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-information-line"></i> 安全系数分析</div>
          <div class="stat-item">
            <span>静力安全系数 Fs</span>
            <span class="stat-value" style="font-size:18px; color:var(--accent-green);">{{ evalResult.staticSF }}</span>
          </div>
          <div class="stat-item">
            <span>最小动力安全系数 Fd_min</span>
            <span class="stat-value" style="font-size:18px;" :style="{ color: parseFloat(evalResult.minDynamicSF) < 1.0 ? 'var(--accent-red)' : '#ffa500' }">{{ evalResult.minDynamicSF }}</span>
          </div>
          <div class="stat-item">
            <span>平均动力安全系数 Fd_avg</span>
            <span class="stat-value" style="font-size:18px;">{{ evalResult.dynamicSF }}</span>
          </div>
          <div class="stat-item">
            <span>安全系数降幅</span>
            <span class="stat-value" style="font-size:18px; color:var(--accent-red);">{{ evalResult.sfDrop }}%</span>
          </div>
          <div class="stat-item">
            <span>Fs &lt; 1.0 持续时间 (s)</span>
            <span class="stat-value" style="font-size:18px;" :style="{ color: parseFloat(evalResult.unsafeDuration) > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }">{{ evalResult.unsafeDuration }}</span>
          </div>
          <div class="alert-box" :class="parseFloat(evalResult.minDynamicSF) < 1.0 ? 'danger' : parseFloat(evalResult.minDynamicSF) < 1.3 ? 'warning' : 'success'" style="margin-top:15px;">
            {{ parseFloat(evalResult.minDynamicSF) < 1.0
              ? '⚠ 最小动力安全系数小于1.0，边坡在该工况下可能发生局部失稳。'
              : parseFloat(evalResult.minDynamicSF) < 1.3
                ? '⚠ 动力安全系数偏低，建议加强监测和设计复核。'
                : '✓ 动力安全系数满足规范要求，边坡在该工况下是安全的。' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 方法对比 Tab -->
    <div v-show="activeTab === 'comparison' && evalComplete">
      <div class="content-grid">
        <div class="panel" style="min-height:350px;">
          <div class="panel-title"><i class="ri-git-branch-line"></i> 三种方法对比</div>
          <div ref="comparisonChartRef" style="flex:1; width:100%; min-height:290px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-table-line"></i> 方法对比明细</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>评价方法</th>
                <th>综合得分</th>
                <th>稳定性等级</th>
                <th>风险等级</th>
                <th>一致性</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in methodResults" :key="i">
                <td>{{ m.name }}</td>
                <td :style="{ color: m.color }">{{ m.score }}</td>
                <td :style="{ color: m.color }">{{ m.level }}</td>
                <td><span :class="['status-tag', m.riskClass]">{{ m.risk }}</span></td>
                <td :style="{ color: m.consistent ? 'var(--accent-green)' : '#ffa500' }">{{ m.consistent ? '一致' : '偏差' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="alert-box info" style="margin-top:12px;">
            {{ methodConsistency }}
          </div>
        </div>
      </div>
    </div>

    <!-- 风险矩阵 Tab -->
    <div v-show="activeTab === 'risk' && evalComplete">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-alarm-warning-line"></i> 风险等级矩阵</div>
          <div class="risk-matrix">
            <div class="matrix-header"></div>
            <div class="matrix-header" v-for="col in riskMatrixCols" :key="col">{{ col }}</div>
            <template v-for="(row, ri) in riskMatrixRows" :key="ri">
              <div class="matrix-label">{{ row }}</div>
              <div v-for="(cell, ci) in riskMatrix[ri]" :key="ci"
                :class="['matrix-cell', cell.class, cell.current ? 'current' : '']">
                {{ cell.text }}
                <div v-if="cell.current" class="matrix-marker">★</div>
              </div>
            </template>
          </div>
          <div style="font-size:12px; color:#8ab4f8; margin-top:10px; text-align:center;">
            横轴：破坏后果严重性 &nbsp;|&nbsp; 纵轴：失稳发生可能性 &nbsp;|&nbsp; ★ 当前边坡位置
          </div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-shield-check-line"></i> 风险措施建议</div>
          <div v-for="(measure, i) in riskMeasures" :key="i" class="alert-box" :class="measure.level" style="margin-bottom:10px;">
            <strong>{{ measure.title }}</strong>
            <div style="margin-top:5px;">{{ measure.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 评价结论与建议 -->
    <div class="content-grid" v-if="evalComplete" style="margin-top:20px;">
      <div class="panel">
        <div class="panel-title"><i class="ri-file-text-line"></i> 评价结论</div>
        <div style="font-size:14px; line-height:2; color:#ccc; padding:5px;">
          <p>本次评价采用<span style="color:var(--text-highlight);">{{ evalModelName }}</span>，对{{ currentSlopeName }}在{{ currentConditionDesc }}工况下的动力稳定性进行了综合评估。</p>
          <p>评价结果显示，该边坡综合得分为 <span :style="{ color: resultColor }" style="font-weight:bold;">{{ evalResult.score }} 分</span>，稳定性等级为<span :style="{ color: resultColor }" style="font-weight:bold;">「{{ evalResult.level }}」</span>，属于{{ evalResult.risk }}级别。</p>
          <p>动力安全系数为 <span style="font-weight:bold;" :style="{ color: parseFloat(evalResult.dynamicSF) < 1.3 ? 'var(--accent-red)' : 'var(--accent-green)' }">{{ evalResult.dynamicSF }}</span>，较静力安全系数下降了 <span style="color:var(--accent-red); font-weight:bold;">{{ evalResult.sfDrop }}%</span>。</p>
          <p v-for="(c, i) in evalConclusions" :key="i">{{ c }}</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-lightbulb-line"></i> 评价建议</div>
        <ul class="suggestion-list">
          <li v-for="(sug, i) in evalSuggestions" :key="i">{{ sug }}</li>
        </ul>
      </div>
    </div>

    <!-- 历史评价 -->
    <div class="panel" v-if="evalHistory.length > 0" style="margin-top:20px;">
      <div class="panel-title"><i class="ri-history-line"></i> 评价历史记录</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>边坡</th>
            <th>工况</th>
            <th>方法</th>
            <th>得分</th>
            <th>等级</th>
            <th>安全系数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(h, i) in evalHistory" :key="i">
            <td>{{ h.time }}</td>
            <td>{{ h.slope }}</td>
            <td>{{ h.condition }}</td>
            <td>{{ h.method }}</td>
            <td :style="{ color: h.color }">{{ h.score }}</td>
            <td><span :class="['status-tag', h.riskClass]">{{ h.level }}</span></td>
            <td>{{ h.sf }}</td>
            <td>
              <button class="table-btn table-btn-primary" @click="loadHistory(h)"><i class="ri-eye-line"></i></button>
              <button class="table-btn table-btn-danger" @click="evalHistory.splice(i, 1)"><i class="ri-delete-bin-line"></i></button>
            </td>
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
import { getSlopeData, getWorkConditions, getMonitorPoints } from '../utils/dataGenerator'
import {
  ahpWeights, getDefaultAHPMatrix, weightedScore, getDefaultScoreFunctions,
  getStabilityLevel, sensitivityAnalysis, computeSafetyFactor, computeDynamicSafetyFactor,
  fuzzyComprehensiveEvaluation, getDefaultThresholds, greyRelationalAnalysis
} from '../utils/algorithms'

// ==================== 静态数据 ====================
const slopes = getSlopeData()
const conditions = getWorkConditions()
const indicatorNames = ['最大位移', '峰值加速度', '最大应力', '能量异常系数', '耗散比', '放大系数']
const indicatorUnits = ['mm', 'm/s²', 'MPa', '', '%', '']

// ==================== 状态 ====================
const selectedSlope = ref('BP-001')
const selectedCondition = ref('GK-001')
const evalModel = ref('weighted')
const showWeightPanel = ref(false)
const evaluating = ref(false)
const evalComplete = ref(false)
const progress = ref(0)
const progressText = ref('')
const activeTab = ref('scoring')

// AHP矩阵与权重
const ahpMatrix = reactive(getDefaultAHPMatrix())
const weights = ref([])
const ahpCR = ref(0)

// 指标实测值与得分
const indicatorScores = reactive([])

// 评价结果
const evalResult = reactive({
  score: '0', level: '', risk: '', riskClass: 'info', color: '#00eaff',
  safetyFactor: '0', dynamicSF: '0', staticSF: '0', minDynamicSF: '0',
  sfDrop: '0', unsafeDuration: '0'
})

// 三种方法对比结果
const methodResults = reactive([])
const methodConsistency = ref('')

// 敏感性
const sensitivityConclusions = reactive([])

// 安全系数时程数据
const safetyTimeSeries = reactive({ time: [], dynamic: [] })

// 风险矩阵
const riskMatrixRows = ['很可能', '可能', '不太可能', '罕见']
const riskMatrixCols = ['轻微', '一般', '较严重', '严重', '灾难性']
const riskMatrix = reactive([])
const riskMeasures = reactive([])

// 结论建议
const evalConclusions = reactive([])
const evalSuggestions = reactive([])
const evalHistory = reactive([])

// ==================== 图表引用 ====================
const radarChartRef = ref(null)
const weightPieRef = ref(null)
const scoreBarRef = ref(null)
const sensitivityRef = ref(null)
const safetyChartRef = ref(null)
const comparisonChartRef = ref(null)

let charts = {}

// ==================== 计算属性 ====================
const currentSlopeName = computed(() => slopes.find(s => s.id === selectedSlope.value)?.name || '')
const currentConditionDesc = computed(() => conditions.find(c => c.id === selectedCondition.value)?.desc || '')
const currentCondition = computed(() => conditions.find(c => c.id === selectedCondition.value))
const evalModelName = computed(() => {
  const map = { weighted: '加权综合评分法', fuzzy: '模糊综合评判法', grey: '灰色关联分析法' }
  return map[evalModel.value] || ''
})
const resultColor = computed(() => evalResult.color)

// ==================== AHP计算 ====================
function recalcAHP() {
  const result = ahpWeights(ahpMatrix.map(r => [...r]))
  weights.value = result.weights
  ahpCR.value = result.CR
}

function onAHPChange(i, j) {
  if (ahpMatrix[i][j] > 0) {
    ahpMatrix[j][i] = parseFloat((1 / ahpMatrix[i][j]).toFixed(3))
  }
  recalcAHP()
}

// ==================== 生成指标实测值 ====================
function generateMeasuredValues() {
  const cond = currentCondition.value
  const pga = cond?.pga || 0.2
  const baseFactor = pga / 0.2

  return [
    parseFloat((8 + Math.random() * 12 * baseFactor).toFixed(1)),   // 最大位移 mm
    parseFloat((1.5 + Math.random() * 2.5 * baseFactor).toFixed(2)), // 峰值加速度 m/s²
    parseFloat((2 + Math.random() * 3 * baseFactor).toFixed(2)),     // 最大应力 MPa
    parseFloat((0.1 + Math.random() * 0.5 * baseFactor).toFixed(2)), // 能量异常系数
    parseFloat((60 + Math.random() * 50 * baseFactor).toFixed(1)),   // 耗散比 %
    parseFloat((1.1 + Math.random() * 0.8 * baseFactor).toFixed(2))  // 放大系数
  ]
}

// ==================== 评价逻辑 ====================
async function runEvaluation() {
  evaluating.value = true
  evalComplete.value = false
  progress.value = 0

  try {
  // Step 1: 计算权重
  progressText.value = '正在计算指标权重（AHP法）...'
  await delay(200)
  recalcAHP()
  progress.value = 10

  // Step 2: 生成指标数据
  progressText.value = '正在获取指标实测值...'
  await delay(200)
  const measured = generateMeasuredValues()
  progress.value = 25

  // Step 3: 加权评分法
  progressText.value = '正在计算加权综合评分...'
  await delay(300)
  const scoreFns = getDefaultScoreFunctions()
  const wsResult = weightedScore(measured, weights.value, scoreFns)
  const scores = wsResult.scores
  const wscore = wsResult.totalScore
  progress.value = 40

  // 填充指标明细
  indicatorScores.splice(0, indicatorScores.length)
  measured.forEach((val, i) => {
    indicatorScores.push({
      name: indicatorNames[i] + (indicatorUnits[i] ? ` (${indicatorUnits[i]})` : ''),
      measured: val, score: scores[i]
    })
  })

  // Step 4: 模糊综合评判
  progressText.value = '正在进行模糊综合评判...'
  await delay(200)
  const thresholdSet = getDefaultThresholds()
  const fuzzyResult = fuzzyComprehensiveEvaluation(measured, weights.value, thresholdSet)
  const fuzzyScoreMap = [90, 72, 55, 30]
  const fuzzyScore = fuzzyResult.result.reduce((s, m, i) => s + m * fuzzyScoreMap[i], 0)
  progress.value = 55

  // Step 5: 灰色关联分析
  progressText.value = '正在进行灰色关联分析...'
  await delay(200)
  const referencePattern = [5, 1.0, 1.5, 0.05, 50, 1.0]
  const greyResults = greyRelationalAnalysis([measured], referencePattern)
  const greyScore = parseFloat((greyResults[0].grade * 100).toFixed(1))
  progress.value = 65

  // Step 6: 安全系数计算
  progressText.value = '正在计算安全系数时程...'
  await delay(200)
  const cond = currentCondition.value
  const slope = { cohesion: 45, frictionAngle: 32, unitWeight: 24.5, slopeAngle: 40, height: 80, waterLevel: 0 }
  const staticResult = computeSafetyFactor(slope)
  const staticSF = staticResult.safetyFactor
  
  // 生成安全系数时程
  const duration = cond?.duration || 7
  safetyTimeSeries.time = []
  safetyTimeSeries.dynamic = []
  const dt = 0.05
  let minSF = staticSF
  let unsafeTime = 0
  for (let t = 0; t <= duration; t += dt) {
    safetyTimeSeries.time.push(parseFloat(t.toFixed(3)))
    const tNorm = t / duration
    let kh = 0
    if (tNorm < 0.15) kh = cond.pga * tNorm / 0.15
    else if (tNorm < 0.6) kh = cond.pga * (1 + 0.3 * Math.sin(2 * Math.PI * 3 * tNorm))
    else kh = cond.pga * Math.exp(-3 * (tNorm - 0.6))
    kh *= (0.8 + 0.4 * Math.random())
    const sfResult = computeDynamicSafetyFactor(slope, Math.abs(kh))
    const sf = sfResult.safetyFactor
    safetyTimeSeries.dynamic.push(parseFloat(sf.toFixed(3)))
    if (sf < minSF) minSF = sf
    if (sf < 1.0) unsafeTime += dt
  }
  const avgSF = (safetyTimeSeries.dynamic.reduce((a, b) => a + b, 0) / safetyTimeSeries.dynamic.length)
  progress.value = 80

  // Step 7: 确定当前方法的最终得分
  progressText.value = '正在汇总评价结果...'
  await delay(200)
  let finalScore = 0
  if (evalModel.value === 'weighted') finalScore = wscore
  else if (evalModel.value === 'fuzzy') finalScore = fuzzyScore
  else finalScore = greyScore

  const stabilityInfo = getStabilityLevel(finalScore)
  Object.assign(evalResult, {
    score: finalScore.toFixed(1),
    level: stabilityInfo.level,
    risk: stabilityInfo.risk,
    riskClass: stabilityInfo.class,
    color: stabilityInfo.color,
    safetyFactor: avgSF.toFixed(2),
    dynamicSF: avgSF.toFixed(2),
    staticSF: staticSF.toFixed(2),
    minDynamicSF: minSF.toFixed(2),
    sfDrop: ((1 - avgSF / staticSF) * 100).toFixed(1),
    unsafeDuration: unsafeTime.toFixed(2)
  })
  progress.value = 85

  // 方法对比
  updateMethodResults(wscore, fuzzyScore, greyScore)
  
  // 敏感性分析
  updateSensitivity(measured, scores)
  
  // 风险矩阵
  updateRiskMatrix(finalScore)
  
  // 结论建议
  updateConclusions(measured, finalScore, stabilityInfo)
  progress.value = 95

  // 保存历史
  saveToHistory()

  // 完成
  progressText.value = '评价完成！'
  await delay(300)
  progress.value = 100
  evaluating.value = false
  evalComplete.value = true

  await nextTick()
  renderAllCharts()
  } catch (err) {
    console.error('评价过程出错:', err)
    progressText.value = '评价出错: ' + err.message
    evaluating.value = false
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function updateMethodResults(wscore, fscore, gscore) {
  const results = [
    { name: '加权综合评分法', score: wscore },
    { name: '模糊综合评判法', score: fscore },
    { name: '灰色关联分析法', score: gscore }
  ]
  
  methodResults.splice(0, methodResults.length)
  const levels = results.map(r => getStabilityLevel(r.score))
  results.forEach((r, i) => {
    methodResults.push({
      name: r.name, score: r.score.toFixed(1),
      level: levels[i].level, risk: levels[i].risk,
      riskClass: levels[i].class, color: levels[i].color,
      consistent: levels[i].level === levels[0].level
    })
  })
  
  const allSame = levels.every(l => l.level === levels[0].level)
  methodConsistency.value = allSame
    ? `三种评价方法结果一致，均为「${levels[0].level}」等级，评价结果可信度高。`
    : `三种评价方法结果存在差异，建议综合考虑各方法结果，以最不利结果作为参考。`
}

function updateSensitivity(measured, scores) {
  const result = sensitivityAnalysis(measured, weights.value, getDefaultScoreFunctions(), 0.2)
  
  sensitivityConclusions.splice(0, sensitivityConclusions.length)
  const sorted = result.indicators.sort((a, b) => b.sensitivity - a.sensitivity)
  
  sensitivityConclusions.push(
    `敏感性最高的指标为「${indicatorNames[sorted[0].index]}」，敏感系数为 ${sorted[0].sensitivity.toFixed(3)}，对综合得分影响最大。`,
    `敏感性最低的指标为「${indicatorNames[sorted[sorted.length - 1].index]}」，敏感系数为 ${sorted[sorted.length - 1].sensitivity.toFixed(3)}。`,
    `建议重点关注敏感性排名前3的指标：${sorted.slice(0, 3).map(s => indicatorNames[s.index]).join('、')}，它们的变化对评价结果影响最大。`
  )
}

function updateRiskMatrix(score) {
  const likelihoodIdx = score >= 80 ? 3 : score >= 60 ? 2 : score >= 45 ? 1 : 0
  const consequenceIdx = score >= 80 ? 0 : score >= 60 ? 2 : score >= 45 ? 3 : 4
  
  const colors = [
    ['low', 'low', 'medium', 'medium', 'high'],
    ['low', 'medium', 'medium', 'high', 'high'],
    ['medium', 'medium', 'high', 'high', 'extreme'],
    ['medium', 'high', 'high', 'extreme', 'extreme']
  ]
  const labels = { low: '低风险', medium: '中风险', high: '高风险', extreme: '极高风险' }
  
  riskMatrix.splice(0, riskMatrix.length)
  for (let r = 0; r < 4; r++) {
    const row = []
    for (let c = 0; c < 5; c++) {
      row.push({
        text: labels[colors[r][c]],
        class: colors[r][c],
        current: r === likelihoodIdx && c === consequenceIdx
      })
    }
    riskMatrix.push(row)
  }
  
  riskMeasures.splice(0, riskMeasures.length)
  if (score < 45) {
    riskMeasures.push(
      { title: '紧急措施', level: 'danger', desc: '立即暂停施工，启动应急预案，疏散危险区域人员。' },
      { title: '加固措施', level: 'danger', desc: '紧急加设临时支护结构（如喷锚支护），消除即刻失稳风险。' },
      { title: '监测措施', level: 'warning', desc: '提升监测频率至每小时一次，增设裂缝监测和深部位移监测。' }
    )
  } else if (score < 60) {
    riskMeasures.push(
      { title: '预防措施', level: 'warning', desc: '开展边坡稳定性详细分析，制定针对性加固方案（抗滑桩/锚索）。' },
      { title: '监测措施', level: 'warning', desc: '提升监测频率至每日一次，重点监测坡顶位移和坡体深部变形。' },
      { title: '应急准备', level: 'info', desc: '完善应急预案，明确预警判据和响应程序，备妥应急物资。' }
    )
  } else if (score < 80) {
    riskMeasures.push(
      { title: '常规措施', level: 'info', desc: '维持现有支护体系，按计划开展定期检查和维护。' },
      { title: '监测措施', level: 'info', desc: '保持常规监测频率，关注季节性变化（雨季、冻融期）。' }
    )
  } else {
    riskMeasures.push(
      { title: '评估合格', level: 'success', desc: '边坡稳定性良好，维持现有条件即可。建议每年进行一次全面评估。' }
    )
  }
}

function updateConclusions(measured, score, info) {
  evalConclusions.splice(0, evalConclusions.length)
  
  const weakest = indicatorScores.reduce((min, s) => s.score < min.score ? s : min, indicatorScores[0])
  evalConclusions.push(`主要风险指标为「${weakest.name}」，得分仅 ${weakest.score} 分，实测值为 ${weakest.measured}，需重点关注。`)
  
  if (parseFloat(evalResult.minDynamicSF) < 1.0) {
    evalConclusions.push(`最小动力安全系数为 ${evalResult.minDynamicSF}，小于1.0，存在瞬时失稳可能，持续 ${evalResult.unsafeDuration} 秒。`)
  }
  
  evalSuggestions.splice(0, evalSuggestions.length)
  if (score < 60) {
    evalSuggestions.push('建议加强边坡坡顶和坡体中部区域的实时监测，增设位移和加速度传感器。')
    evalSuggestions.push('建议开展进一步的支护设计分析，评估加设抗滑桩或锚索的可行性。')
    evalSuggestions.push('建议对比不同地震波作用下的评价结果，识别最不利工况。')
    evalSuggestions.push('建议将能量异常系数纳入长期监测预警指标体系，设置动态阈值。')
    evalSuggestions.push('建议在雨季来临前完成边坡排水系统的检查与维护，防止水-力耦合加剧失稳风险。')
  } else if (score < 80) {
    evalSuggestions.push('建议保持当前监测频率，关注雨季和冻融期的变化。')
    evalSuggestions.push('建议定期复核边坡稳定性，尤其是发生显著降雨或地震后。')
    evalSuggestions.push('建议完善应急预案，明确各级预警的响应措施。')
  } else {
    evalSuggestions.push('边坡稳定性良好，建议维持现有监测和维护制度。')
    evalSuggestions.push('建议每年进行一次全面的稳定性复核评估。')
  }
}

function saveToHistory() {
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  evalHistory.unshift({
    time: ts,
    slope: currentSlopeName.value,
    condition: currentConditionDesc.value,
    method: evalModelName.value,
    score: evalResult.score,
    level: evalResult.level,
    riskClass: evalResult.riskClass,
    color: evalResult.color,
    sf: evalResult.dynamicSF
  })
}

function loadHistory(h) {
  // 简单回显历史
  alert(`历史记录: ${h.time}\n边坡: ${h.slope}\n工况: ${h.condition}\n方法: ${h.method}\n得分: ${h.score}\n等级: ${h.level}\n安全系数: ${h.sf}`)
}

function exportReport() {
  if (!evalComplete.value) return
  let text = '========== 稳定性评价报告 ==========\n\n'
  text += `评价时间: ${new Date().toLocaleString()}\n`
  text += `边坡: ${currentSlopeName.value}\n`
  text += `工况: ${currentConditionDesc.value}\n`
  text += `方法: ${evalModelName.value}\n\n`
  text += `综合得分: ${evalResult.score}\n`
  text += `稳定性等级: ${evalResult.level}\n`
  text += `风险等级: ${evalResult.risk}\n`
  text += `安全系数: ${evalResult.dynamicSF}\n`
  text += `最小安全系数: ${evalResult.minDynamicSF}\n\n`
  text += '--- 指标评分 ---\n'
  indicatorScores.forEach(s => { text += `${s.name}: 实测=${s.measured}, 得分=${s.score}\n` })
  text += '\n--- 建议 ---\n'
  evalSuggestions.forEach(s => { text += `· ${s}\n` })
  
  const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `稳定性评价报告_${currentSlopeName.value}.txt`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 图表渲染 ====================
function renderAllCharts() {
  renderRadarChart()
  renderWeightPieChart()
  renderScoreBarChart()
  renderSensitivityChart()
  renderSafetyChart()
  renderComparisonChart()
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

function renderRadarChart() {
  const chart = initChart(radarChartRef.value, 'radar')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: indicatorNames.map(n => ({ name: n, max: 100 })),
      center: ['50%', '50%'],
      radius: '65%',
      axisName: { color: '#b0d0ff', fontSize: 11 },
      splitArea: { areaStyle: { color: ['rgba(27,91,158,0.1)', 'rgba(27,91,158,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(27,91,158,0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(27,91,158,0.3)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: indicatorScores.map(s => s.score),
        name: currentSlopeName.value,
        areaStyle: { color: evalResult.color.replace(')', ',0.2)').replace('rgb', 'rgba').replace('#', '') ? `${evalResult.color}33` : 'rgba(0,234,255,0.2)' },
        lineStyle: { color: evalResult.color },
        itemStyle: { color: evalResult.color }
      }]
    }]
  })
}

function renderWeightPieChart() {
  const chart = initChart(weightPieRef.value, 'weightPie')
  if (!chart) return
  
  const colors = ['#00eaff', '#f24e4e', '#00ff88', '#a78bfa', '#ffa500', '#36d7b7']
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip },
    series: [{
      type: 'pie', radius: ['35%', '65%'], center: ['50%', '50%'],
      label: { color: '#b0d0ff', formatter: '{b}\n{d}%', fontSize: 11 },
      labelLine: { lineStyle: { color: '#1b5b9e' } },
      data: indicatorNames.map((n, i) => ({
        name: n, value: parseFloat((weights.value[i] * 100).toFixed(1)),
        itemStyle: { color: colors[i] }
      })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,234,255,0.3)' } }
    }]
  })
}

function renderScoreBarChart() {
  const chart = initChart(scoreBarRef.value, 'scoreBar')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '20%', right: '10%', bottom: '5%', top: '5%', containLabel: false },
    xAxis: { type: 'value', max: 100, ...getAxisStyle() },
    yAxis: { type: 'category', data: indicatorScores.map(s => s.name.split(' (')[0]), inverse: true, ...getAxisStyle() },
    series: [{
      type: 'bar', barWidth: '50%',
      data: indicatorScores.map(s => ({
        value: s.score,
        itemStyle: { color: s.score < 60 ? '#f24e4e' : s.score < 75 ? '#ffa500' : '#00ff88' }
      })),
      label: { show: true, position: 'right', color: '#b0d0ff', formatter: '{c}分' },
      markLine: {
        silent: true,
        data: [
          { xAxis: 60, lineStyle: { color: 'rgba(242,78,78,0.4)', type: 'dashed' }, label: { formatter: '60', color: '#f24e4e' } },
          { xAxis: 80, lineStyle: { color: 'rgba(0,255,136,0.4)', type: 'dashed' }, label: { formatter: '80', color: '#00ff88' } }
        ]
      }
    }]
  })
}

function renderSensitivityChart() {
  const chart = initChart(sensitivityRef.value, 'sensitivity')
  if (!chart) return
  
  const measured = indicatorScores.map(s => s.measured)
  const saResult = sensitivityAnalysis(measured, weights.value, getDefaultScoreFunctions(), 0.2)
  const sorted = saResult.indicators
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['-20%变化', '+20%变化'], textStyle: { color: '#b0d0ff' } },
    grid: { left: '18%', right: '8%', bottom: '5%', top: '15%', containLabel: false },
    xAxis: { type: 'value', name: '得分变化', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    yAxis: {
      type: 'category',
      data: sorted.map(r => indicatorNames[r.index]),
      inverse: true, ...getAxisStyle()
    },
    series: [
      {
        name: '-20%变化', type: 'bar', stack: 'total',
        data: sorted.map(r => {
          const low = r.variations.find(v => v.factor <= 0.81)
          return low ? low.change : 0
        }),
        itemStyle: { color: '#00ff88' }, barWidth: '40%'
      },
      {
        name: '+20%变化', type: 'bar', stack: 'total',
        data: sorted.map(r => {
          const high = r.variations.find(v => v.factor >= 1.19)
          return high ? high.change : 0
        }),
        itemStyle: { color: '#f24e4e' }, barWidth: '40%'
      }
    ]
  })
}

function renderSafetyChart() {
  const chart = initChart(safetyChartRef.value, 'safety')
  if (!chart) return
  
  const time = safetyTimeSeries.time.filter((_, i) => i % 3 === 0).map(t => t.toFixed(2) + 's')
  const data = safetyTimeSeries.dynamic.filter((_, i) => i % 3 === 0)
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: { type: 'category', data: time, ...getAxisStyle() },
    yAxis: { type: 'value', name: '安全系数', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 18, bottom: 5, borderColor: '#1b5b9e', fillerColor: 'rgba(0,234,255,0.1)', textStyle: { color: '#b0d0ff' } }
    ],
    visualMap: {
      show: false, pieces: [
        { lte: 1.0, color: '#f24e4e' },
        { gt: 1.0, lte: 1.3, color: '#ffa500' },
        { gt: 1.3, color: '#00ff88' }
      ]
    },
    series: [{
      type: 'line', data, showSymbol: false, smooth: true,
      lineStyle: { width: 2 },
      markLine: {
        silent: true,
        data: [
          { yAxis: 1.0, label: { formatter: 'Fs=1.0', color: '#f24e4e' }, lineStyle: { color: 'rgba(242,78,78,0.5)', type: 'dashed' } },
          { yAxis: 1.3, label: { formatter: 'Fs=1.3', color: '#ffa500' }, lineStyle: { color: 'rgba(255,165,0,0.3)', type: 'dashed' } },
          { yAxis: parseFloat(evalResult.staticSF), label: { formatter: '静力Fs', color: '#00ff88' }, lineStyle: { color: 'rgba(0,255,136,0.3)', type: 'dashed' } }
        ]
      }
    }]
  })
}

function renderComparisonChart() {
  const chart = initChart(comparisonChartRef.value, 'comparison')
  if (!chart) return
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: methodResults.map(m => m.name),
      ...getAxisStyle()
    },
    yAxis: { type: 'value', name: '综合得分', nameTextStyle: { color: '#b0d0ff' }, max: 100, ...getAxisStyle() },
    series: [{
      type: 'bar', barWidth: '35%',
      data: methodResults.map(m => ({
        value: parseFloat(m.score),
        itemStyle: { color: m.color }
      })),
      label: { show: true, position: 'top', color: '#b0d0ff', formatter: '{c}分' },
      markLine: {
        silent: true,
        data: [
          { yAxis: 60, lineStyle: { color: 'rgba(242,78,78,0.3)', type: 'dashed' }, label: { formatter: '60', color: '#f24e4e' } },
          { yAxis: 80, lineStyle: { color: 'rgba(0,255,136,0.3)', type: 'dashed' }, label: { formatter: '80', color: '#00ff88' } }
        ]
      }
    }]
  })
}

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  recalcAHP()
  runEvaluation()
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
.eval-result-card {
  background: rgba(13, 33, 67, 0.6);
  border: 1px solid rgba(27, 91, 158, 0.3);
  padding: 20px;
}
.risk-matrix {
  display: grid;
  grid-template-columns: 100px repeat(5, 1fr);
  gap: 3px;
  margin-top: 10px;
}
.matrix-header {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-highlight);
  background: rgba(0, 234, 255, 0.1);
  border: 1px solid rgba(27, 91, 158, 0.2);
}
.matrix-label {
  padding: 8px;
  font-size: 12px;
  color: #b0d0ff;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 234, 255, 0.05);
  border: 1px solid rgba(27, 91, 158, 0.2);
}
.matrix-cell {
  padding: 12px 8px;
  text-align: center;
  font-size: 11px;
  border: 1px solid rgba(27, 91, 158, 0.15);
  position: relative;
}
.matrix-cell.low { background: rgba(0, 255, 136, 0.15); color: #00ff88; }
.matrix-cell.medium { background: rgba(255, 165, 0, 0.15); color: #ffa500; }
.matrix-cell.high { background: rgba(242, 78, 78, 0.15); color: #f24e4e; }
.matrix-cell.extreme { background: rgba(242, 78, 78, 0.3); color: #ff4444; }
.matrix-cell.current { border: 2px solid var(--text-highlight); box-shadow: 0 0 10px rgba(0, 234, 255, 0.3); }
.matrix-marker {
  position: absolute;
  top: 2px;
  right: 4px;
  color: var(--text-highlight);
  font-size: 14px;
}
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.15);
  color: #8ab4f8;
  font-size: 13px;
}
.stat-value { color: var(--text-highlight); }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
