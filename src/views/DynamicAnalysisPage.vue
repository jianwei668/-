<template>
  <div class="page-container">
    <div class="page-title">动力响应分析</div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <span class="form-label">边坡选择</span>
      <select class="form-select" style="width:150px;" v-model="selectedSlope" @change="onParamChange">
        <option v-for="s in slopes" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <span class="form-label">工况选择</span>
      <select class="form-select" style="width:180px;" v-model="selectedCondition" @change="onParamChange">
        <option v-for="c in conditions" :key="c.id" :value="c.id">{{ c.desc }}</option>
      </select>
      <span class="form-label">指标类型</span>
      <select class="form-select" style="width:120px;" v-model="indicatorType" @change="onParamChange">
        <option value="acceleration">加速度</option>
        <option value="velocity">速度</option>
        <option value="displacement">位移</option>
      </select>
      <span class="form-label">监测点</span>
      <select class="form-select" style="width:130px;" v-model="selectedPoint" @change="onParamChange">
        <option value="all">全部</option>
        <option v-for="p in monitorPoints" :key="p.id" :value="p.id">{{ p.id }} {{ p.name }}</option>
      </select>
      <button class="form-btn form-btn-primary" @click="runAnalysis" :disabled="analyzing">
        <i :class="analyzing ? 'ri-loader-4-line' : 'ri-play-circle-line'"></i> {{ analyzing ? '分析中...' : '开始分析' }}
      </button>
      <button class="form-btn" @click="showParamPanel = !showParamPanel">
        <i class="ri-settings-3-line"></i> 参数配置
      </button>
      <button class="form-btn" @click="exportData">
        <i class="ri-download-line"></i> 导出数据
      </button>
    </div>

    <!-- 参数配置面板 -->
    <div class="panel param-config-panel" v-if="showParamPanel">
      <div class="panel-title">
        <span><i class="ri-settings-3-line"></i> 分析参数配置</span>
        <button class="form-btn" style="padding:4px 10px; font-size:12px;" @click="showParamPanel = false">
          <i class="ri-close-line"></i> 收起
        </button>
      </div>
      <div class="param-grid">
        <div class="param-section">
          <div class="param-section-title"><i class="ri-earthquake-line"></i> 地震波参数</div>
          <div class="param-row">
            <span class="param-label">峰值加速度 (g)</span>
            <input type="number" class="form-input" v-model.number="waveParams.pga" step="0.05" min="0.05" max="1.0" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">持续时间 (s)</span>
            <input type="number" class="form-input" v-model.number="waveParams.duration" step="1" min="5" max="60" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">时间步长 (s)</span>
            <select class="form-select" v-model.number="waveParams.dt" style="width:100px;">
              <option :value="0.01">0.01</option>
              <option :value="0.02">0.02</option>
              <option :value="0.05">0.05</option>
            </select>
          </div>
          <div class="param-row">
            <span class="param-label">阻尼比</span>
            <input type="number" class="form-input" v-model.number="waveParams.damping" step="0.01" min="0.01" max="0.3" style="width:100px;">
          </div>
        </div>
        <div class="param-section">
          <div class="param-section-title"><i class="ri-landscape-line"></i> 边坡岩体参数</div>
          <div class="param-row">
            <span class="param-label">弹性模量 (GPa)</span>
            <input type="number" class="form-input" v-model.number="rockParams.elasticModulus" step="0.5" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">泊松比</span>
            <input type="number" class="form-input" v-model.number="rockParams.poissonRatio" step="0.01" min="0.1" max="0.5" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">密度 (kg/m³)</span>
            <input type="number" class="form-input" v-model.number="rockParams.density" step="100" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">内摩擦角 (°)</span>
            <input type="number" class="form-input" v-model.number="rockParams.frictionAngle" step="1" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">黏聚力 (kPa)</span>
            <input type="number" class="form-input" v-model.number="rockParams.cohesion" step="5" style="width:100px;">
          </div>
        </div>
        <div class="param-section">
          <div class="param-section-title"><i class="ri-bar-chart-2-line"></i> 分析设置</div>
          <div class="param-row">
            <span class="param-label">频谱分析范围 (Hz)</span>
            <input type="number" class="form-input" v-model.number="analysisSettings.maxFreq" step="5" min="10" max="100" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">反应谱阻尼比</span>
            <input type="number" class="form-input" v-model.number="analysisSettings.spectrumDamping" step="0.01" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">反应谱周期范围 (s)</span>
            <input type="number" class="form-input" v-model.number="analysisSettings.maxPeriod" step="1" min="2" max="10" style="width:100px;">
          </div>
          <div class="param-row">
            <span class="param-label">图表显示点数</span>
            <select class="form-select" v-model.number="analysisSettings.displayPoints" style="width:100px;">
              <option :value="300">300</option>
              <option :value="500">500</option>
              <option :value="1000">1000</option>
            </select>
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
            <span style="color:#fff;">{{ analysisStepText }}</span>
            <span class="tech-num" style="color:var(--text-highlight);">{{ analysisProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="fill" :style="{ width: analysisProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row-4" v-if="analysisComplete">
      <div class="stats-card">
        <i class="ri-arrow-up-line" style="color:var(--accent-red); font-size:20px;"></i>
        <div class="label">最大值 ({{ unitLabel }})</div>
        <div class="value" style="color:var(--accent-red);">{{ stats.max }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-arrow-down-line" style="color:var(--accent-green); font-size:20px;"></i>
        <div class="label">最小值 ({{ unitLabel }})</div>
        <div class="value" style="color:var(--accent-green);">{{ stats.min }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-pulse-line" style="color:var(--text-highlight); font-size:20px;"></i>
        <div class="label">均方根值 ({{ unitLabel }})</div>
        <div class="value">{{ stats.rms }}</div>
      </div>
      <div class="stats-card">
        <i class="ri-time-line" style="color:#ffa500; font-size:20px;"></i>
        <div class="label">峰值时刻 (s)</div>
        <div class="value" style="color:#ffa500;">{{ peakTime }}</div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-bar" v-if="analysisComplete">
      <div :class="['tab-item', activeTab === 'timeseries' ? 'active' : '']" @click="activeTab = 'timeseries'">
        <i class="ri-line-chart-line"></i> 时程曲线
      </div>
      <div :class="['tab-item', activeTab === 'spectrum' ? 'active' : '']" @click="activeTab = 'spectrum'">
        <i class="ri-sound-module-line"></i> 频谱分析
      </div>
      <div :class="['tab-item', activeTab === 'response' ? 'active' : '']" @click="activeTab = 'response'">
        <i class="ri-bar-chart-2-line"></i> 反应谱
      </div>
      <div :class="['tab-item', activeTab === 'arias' ? 'active' : '']" @click="activeTab = 'arias'">
        <i class="ri-fire-line"></i> Arias强度
      </div>
      <div :class="['tab-item', activeTab === 'phase' ? 'active' : '']" @click="activeTab = 'phase'">
        <i class="ri-contrast-2-line"></i> 相平面
      </div>
      <div :class="['tab-item', activeTab === 'compare' ? 'active' : '']" @click="activeTab = 'compare'">
        <i class="ri-git-merge-line"></i> 多点对比
      </div>
    </div>

    <!-- 时程曲线 Tab -->
    <div v-show="activeTab === 'timeseries' && analysisComplete">
      <div class="content-grid-3-1">
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title">
            <span><i class="ri-line-chart-line"></i> {{ currentSlopeName }} · {{ currentConditionDesc }} · {{ indicatorLabel }}时程曲线</span>
            <span :class="['status-tag', analysisComplete ? 'success' : 'info']">{{ analysisComplete ? '分析完成' : '待分析' }}</span>
          </div>
          <div ref="dynamicChartRef" style="flex:1; width:100%; min-height:300px;"></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="panel">
            <div class="panel-title"><i class="ri-bar-chart-grouped-line"></i> 响应统计指标</div>
            <div class="stat-item">
              <span>最大值</span>
              <span class="stat-value" style="font-size:18px; color:var(--accent-red);">{{ stats.max }}</span>
            </div>
            <div class="stat-item">
              <span>最小值</span>
              <span class="stat-value" style="font-size:18px; color:var(--accent-green);">{{ stats.min }}</span>
            </div>
            <div class="stat-item">
              <span>均值</span>
              <span class="stat-value" style="font-size:18px;">{{ stats.mean }}</span>
            </div>
            <div class="stat-item">
              <span>均方根</span>
              <span class="stat-value" style="font-size:18px;">{{ stats.rms }}</span>
            </div>
            <div class="stat-item">
              <span>标准差</span>
              <span class="stat-value" style="font-size:18px;">{{ stats.std }}</span>
            </div>
            <div class="stat-item">
              <span>峰值时刻</span>
              <span class="stat-value" style="font-size:18px; color:#ffa500;">{{ peakTime }}s</span>
            </div>
          </div>
          <div class="panel" style="flex:1;">
            <div class="panel-title"><i class="ri-file-text-line"></i> 分析说明</div>
            <div style="font-size:13px; line-height:1.8; color:#8ab4f8;">
              <p>该工况下{{ currentSlopeName }}{{ indicatorLabel }}响应较为明显，峰值出现在第 {{ peakTime }} 秒附近。</p>
              <p v-if="indicatorType === 'acceleration'">
                加速度放大系数约为 <span style="color:var(--text-highlight);">{{ amplificationFactor }}</span>，
                {{ amplificationFactor > 1.5 ? '表明边坡对地震动有显著放大效应，需要关注。' : '边坡放大效应在正常范围内。' }}
              </p>
              <p>Arias强度为 <span style="color:var(--text-highlight);">{{ ariasIntensityValue }}</span> m/s，
                {{ ariasIntensityValue > 0.5 ? '属于中强地震作用。' : '属于弱-中等地震作用。' }}
              </p>
              <p>建议结合能量演化分析和稳定性评价进一步评估。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 频谱分析 Tab -->
    <div v-show="activeTab === 'spectrum' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 340px;">
          <div class="panel-title"><span><i class="ri-sound-module-line"></i> 傅里叶幅值谱</span></div>
          <div ref="spectrumChartRef" style="flex:1; width:100%; min-height:280px;"></div>
        </div>
        <div class="panel" style="min-height: 340px;">
          <div class="panel-title"><span><i class="ri-bar-chart-horizontal-line"></i> 功率谱密度</span></div>
          <div ref="psdChartRef" style="flex:1; width:100%; min-height:280px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-information-line"></i> 频谱特征分析</div>
        <div class="info-grid-3">
          <div class="info-item">
            <div class="info-label">主频率</div>
            <div class="info-val" style="color:var(--text-highlight);">{{ spectrumInfo.dominantFreq }} Hz</div>
          </div>
          <div class="info-item">
            <div class="info-label">平均频率</div>
            <div class="info-val">{{ spectrumInfo.meanFreq }} Hz</div>
          </div>
          <div class="info-item">
            <div class="info-label">频带宽度</div>
            <div class="info-val">{{ spectrumInfo.bandwidth }} Hz</div>
          </div>
          <div class="info-item">
            <div class="info-label">主频幅值</div>
            <div class="info-val" style="color:var(--accent-red);">{{ spectrumInfo.peakAmplitude }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">频谱重心</div>
            <div class="info-val">{{ spectrumInfo.centroid }} Hz</div>
          </div>
          <div class="info-item">
            <div class="info-label">能量集中度</div>
            <div class="info-val" style="color:#ffa500;">{{ spectrumInfo.concentration }}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 反应谱 Tab -->
    <div v-show="activeTab === 'response' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 340px;">
          <div class="panel-title"><span><i class="ri-bar-chart-2-line"></i> 加速度反应谱 (Sa)</span></div>
          <div ref="responseSaRef" style="flex:1; width:100%; min-height:280px;"></div>
        </div>
        <div class="panel" style="min-height: 340px;">
          <div class="panel-title"><span><i class="ri-bar-chart-2-line"></i> 位移反应谱 (Sd)</span></div>
          <div ref="responseSdRef" style="flex:1; width:100%; min-height:280px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-information-line"></i> 反应谱特征值</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>特征参数</th>
              <th>Sa 最大值</th>
              <th>对应周期 (s)</th>
              <th>Sd 最大值</th>
              <th>对应周期 (s)</th>
              <th>平台段范围 (s)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>当前工况</td>
              <td style="color:var(--accent-red);">{{ responseInfo.saMax }}</td>
              <td>{{ responseInfo.saPeakPeriod }}</td>
              <td style="color:var(--text-highlight);">{{ responseInfo.sdMax }}</td>
              <td>{{ responseInfo.sdPeakPeriod }}</td>
              <td>{{ responseInfo.plateauRange }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Arias强度 Tab -->
    <div v-show="activeTab === 'arias' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 340px;">
          <div class="panel-title"><span><i class="ri-fire-line"></i> Arias强度累积曲线</span></div>
          <div ref="ariasChartRef" style="flex:1; width:100%; min-height:280px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-timer-line"></i> 强震持时分析</div>
          <div class="stat-item">
            <span>总Arias强度 (m/s)</span>
            <span class="stat-value" style="font-size:18px; color:var(--accent-red);">{{ ariasInfo.total }}</span>
          </div>
          <div class="stat-item">
            <span>5%起点时刻 (s)</span>
            <span class="stat-value" style="font-size:18px;">{{ ariasInfo.t5 }}</span>
          </div>
          <div class="stat-item">
            <span>95%终点时刻 (s)</span>
            <span class="stat-value" style="font-size:18px;">{{ ariasInfo.t95 }}</span>
          </div>
          <div class="stat-item">
            <span>显著持时 D5-95 (s)</span>
            <span class="stat-value" style="font-size:18px; color:var(--text-highlight);">{{ ariasInfo.duration }}</span>
          </div>
          <div class="stat-item">
            <span>75%能量释放时刻 (s)</span>
            <span class="stat-value" style="font-size:18px; color:#ffa500;">{{ ariasInfo.t75 }}</span>
          </div>
          <div class="alert-box" :class="ariasInfo.total > 0.5 ? 'warning' : 'info'" style="margin-top:15px;">
            {{ ariasInfo.total > 0.5 ? '⚠ Arias强度较大，属于中强地震，需关注边坡动力稳定性。' : '✓ Arias强度适中，地震作用相对温和。' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 相平面图 Tab -->
    <div v-show="activeTab === 'phase' && analysisComplete">
      <div class="content-grid">
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title"><span><i class="ri-contrast-2-line"></i> 加速度-速度相平面图</span></div>
          <div ref="phaseChartRef" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
        <div class="panel" style="min-height: 380px;">
          <div class="panel-title"><span><i class="ri-contrast-2-line"></i> 速度-位移相平面图</span></div>
          <div ref="phaseChart2Ref" style="flex:1; width:100%; min-height:320px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-information-line"></i> 相平面分析</div>
        <div style="font-size:13px; line-height:1.8; color:#8ab4f8; padding:5px;">
          <p>相平面图反映了系统动力响应的运动轨迹特征。轨迹越趋于收敛（螺旋向内），说明系统具有耗能能力，动力稳定性较好；轨迹越发散，说明系统可能趋于不稳定。</p>
          <p>当前工况下，相平面轨迹呈现<span style="color:var(--text-highlight);">{{ phaseTrajectoryType }}</span>特征，表明{{ phaseAnalysisDesc }}。</p>
        </div>
      </div>
    </div>

    <!-- 多点对比 Tab -->
    <div v-show="activeTab === 'compare' && analysisComplete">
      <div class="panel" style="min-height: 380px; margin-bottom:20px;">
        <div class="panel-title">
          <span><i class="ri-git-merge-line"></i> 各监测点{{ indicatorLabel }}时程对比</span>
          <div>
            <button v-for="p in monitorPoints" :key="p.id"
              :class="['form-btn', compareVisiblePoints.includes(p.id) ? 'form-btn-primary' : '']"
              style="padding:3px 8px; font-size:11px; margin-left:4px;"
              @click="toggleComparePoint(p.id)">
              {{ p.id }}
            </button>
          </div>
        </div>
        <div ref="compareChartRef" style="flex:1; width:100%; min-height:300px;"></div>
      </div>
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-focus-3-line"></i> 各监测点峰值对比</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>监测点</th>
                <th>位置描述</th>
                <th>相对高度 (m)</th>
                <th>峰值 ({{ unitLabel }})</th>
                <th>放大系数</th>
                <th>到达时间 (s)</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pointCompareData" :key="p.id">
                <td>{{ p.id }}</td>
                <td>{{ p.name }}</td>
                <td>{{ p.height }}</td>
                <td :style="{ color: p.peakColor }">{{ p.peak }}</td>
                <td :style="{ color: p.ampColor }">{{ p.amplification }}</td>
                <td>{{ p.arrivalTime }}</td>
                <td>
                  <i :class="p.trend > 0 ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"
                     :style="{ color: p.trend > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }"></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="panel" style="min-height:280px;">
          <div class="panel-title"><i class="ri-bar-chart-box-line"></i> 放大系数沿高程分布</div>
          <div ref="ampProfileRef" style="flex:1; width:100%; min-height:240px;"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="ri-lightbulb-line"></i> 多点对比分析结论</div>
        <div style="font-size:13px; line-height:1.8; color:#8ab4f8; padding:5px;">
          <p>各监测点{{ indicatorLabel }}响应沿高程呈递增趋势，坡顶放大效应最为显著。</p>
          <p>最大放大系数出现在 <span style="color:var(--accent-red);">{{ maxAmpPoint }}</span>，放大系数为 <span style="color:var(--text-highlight);">{{ maxAmpValue }}</span>。</p>
          <p>坡体中部至坡顶区域为响应放大的主要区域，建议加强该区域的监测和支护设计。</p>
        </div>
      </div>
    </div>

    <!-- 分析历史记录 -->
    <div class="panel" v-if="analysisHistory.length > 0" style="margin-top:20px;">
      <div class="panel-title">
        <span><i class="ri-history-line"></i> 分析历史记录</span>
        <button class="form-btn form-btn-danger" style="padding:3px 10px; font-size:12px;" @click="clearHistory">
          <i class="ri-delete-bin-line"></i> 清空
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>分析时间</th>
            <th>边坡</th>
            <th>工况</th>
            <th>指标</th>
            <th>峰值</th>
            <th>放大系数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(h, i) in analysisHistory" :key="i">
            <td>{{ i + 1 }}</td>
            <td style="font-family:Consolas,monospace; font-size:12px;">{{ h.time }}</td>
            <td>{{ h.slopeName }}</td>
            <td>{{ h.conditionDesc }}</td>
            <td>{{ h.indicator }}</td>
            <td :style="{ color: 'var(--accent-red)' }">{{ h.peak }}</td>
            <td>{{ h.amplification }}</td>
            <td>
              <button class="table-btn" @click="loadHistory(h)"><i class="ri-refresh-line"></i> 加载</button>
              <button class="table-btn table-btn-danger" @click="removeHistory(i)"><i class="ri-delete-bin-line"></i></button>
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
import {
  generateSeismicWave, integrateToVelocity, integrateToDisplacement,
  computeFFT, computeResponseSpectrum, computeAriasIntensity,
  generateMonitorPointData, computeStatistics, downsample,
  getSlopeData, getWorkConditions, getMonitorPoints
} from '../utils/dataGenerator'

// ==================== 状态 ====================
const slopes = getSlopeData()
const conditions = getWorkConditions()
const monitorPoints = getMonitorPoints()

const selectedSlope = ref('BP-001')
const selectedCondition = ref('GK-001')
const indicatorType = ref('acceleration')
const selectedPoint = ref('all')
const showParamPanel = ref(false)
const analyzing = ref(false)
const analysisComplete = ref(false)
const analysisProgress = ref(0)
const analysisStepText = ref('')
const activeTab = ref('timeseries')
const compareVisiblePoints = ref(['P1', 'P3', 'P5'])

const waveParams = reactive({ pga: 0.20, duration: 20, dt: 0.02, damping: 0.05 })
const rockParams = reactive({ elasticModulus: 15.0, poissonRatio: 0.25, density: 2650, frictionAngle: 35, cohesion: 120 })
const analysisSettings = reactive({ maxFreq: 25, spectrumDamping: 0.05, maxPeriod: 6, displayPoints: 500 })

// 分析结果数据
const analysisData = reactive({
  time: [], acc: [], vel: [], disp: [],
  fftFreq: [], fftAmp: [],
  responsePeriods: [], responseSa: [], responseSv: [], responseSd: [],
  ariasIntensity: [],
  pointData: {}
})

const stats = reactive({ max: 0, min: 0, mean: 0, rms: 0, std: 0, range: 0 })
const spectrumInfo = reactive({ dominantFreq: 0, meanFreq: 0, bandwidth: 0, peakAmplitude: 0, centroid: 0, concentration: 0 })
const responseInfo = reactive({ saMax: 0, saPeakPeriod: 0, sdMax: 0, sdPeakPeriod: 0, plateauRange: '' })
const ariasInfo = reactive({ total: 0, t5: 0, t95: 0, t75: 0, duration: 0 })
const analysisHistory = reactive([])

// ==================== 图表引用 ====================
const dynamicChartRef = ref(null)
const spectrumChartRef = ref(null)
const psdChartRef = ref(null)
const responseSaRef = ref(null)
const responseSdRef = ref(null)
const ariasChartRef = ref(null)
const phaseChartRef = ref(null)
const phaseChart2Ref = ref(null)
const compareChartRef = ref(null)
const ampProfileRef = ref(null)

let charts = {}

// ==================== 计算属性 ====================
const currentSlopeName = computed(() => slopes.find(s => s.id === selectedSlope.value)?.name || '')
const currentConditionDesc = computed(() => conditions.find(c => c.id === selectedCondition.value)?.desc || '')
const currentCondition = computed(() => conditions.find(c => c.id === selectedCondition.value))
const indicatorLabel = computed(() => ({ acceleration: '加速度', velocity: '速度', displacement: '位移' }[indicatorType.value]))
const unitLabel = computed(() => ({ acceleration: 'm/s²', velocity: 'm/s', displacement: 'mm' }[indicatorType.value]))
const peakTime = computed(() => {
  const data = currentDisplayData.value
  if (!data.length) return '0.00'
  const maxIdx = data.indexOf(Math.max(...data.map(Math.abs)))
  return (maxIdx * waveParams.dt).toFixed(2)
})
const amplificationFactor = computed(() => {
  if (!analysisData.acc.length) return '1.00'
  const basePeak = Math.max(...analysisData.acc.map(Math.abs))
  const inputPga = waveParams.pga * 9.81
  return inputPga > 0 ? (basePeak / inputPga).toFixed(2) : '1.00'
})
const ariasIntensityValue = computed(() => {
  const ia = analysisData.ariasIntensity
  return ia.length > 0 ? ia[ia.length - 1].toFixed(3) : '0.000'
})
const currentDisplayData = computed(() => {
  switch (indicatorType.value) {
    case 'velocity': return analysisData.vel
    case 'displacement': return analysisData.disp.map(d => d * 1000) // m -> mm
    default: return analysisData.acc
  }
})
const phaseTrajectoryType = computed(() => {
  const maxAcc = stats.max
  return maxAcc > 3 ? '明显发散' : maxAcc > 1.5 ? '轻微发散' : '基本收敛'
})
const phaseAnalysisDesc = computed(() => {
  const maxAcc = stats.max
  return maxAcc > 3
    ? '系统动力响应较大，可能趋于不稳定，需重点关注。'
    : maxAcc > 1.5
    ? '系统存在一定的能量积累，但整体尚可控。'
    : '系统具有较好的耗能能力，动力稳定性良好。'
})

const pointCompareData = computed(() => {
  return monitorPoints.map(p => {
    const data = analysisData.pointData[p.id] || []
    const peak = data.length ? Math.max(...data.map(Math.abs)) : 0
    const basePeak = analysisData.pointData['P1']?.length
      ? Math.max(...analysisData.pointData['P1'].map(Math.abs)) : 1
    const amp = basePeak > 0 ? (peak / basePeak) : 1
    const peakIdx = data.indexOf(Math.max(...data.map(Math.abs)))
    return {
      id: p.id, name: p.name, height: p.height,
      peak: peak.toFixed(3),
      amplification: amp.toFixed(2),
      arrivalTime: (peakIdx * waveParams.dt).toFixed(2),
      peakColor: peak > 2 ? 'var(--accent-red)' : peak > 1 ? '#ffa500' : 'var(--text-highlight)',
      ampColor: amp > 1.5 ? 'var(--accent-red)' : amp > 1.2 ? '#ffa500' : 'var(--text-main)',
      trend: amp - 1
    }
  })
})

const maxAmpPoint = computed(() => {
  const sorted = [...pointCompareData.value].sort((a, b) => parseFloat(b.amplification) - parseFloat(a.amplification))
  return sorted[0]?.id + ' ' + sorted[0]?.name || ''
})
const maxAmpValue = computed(() => {
  const sorted = [...pointCompareData.value].sort((a, b) => parseFloat(b.amplification) - parseFloat(a.amplification))
  return sorted[0]?.amplification || '1.00'
})

// ==================== 分析逻辑 ====================
function onParamChange() {
  if (analysisComplete.value) {
    runAnalysis()
  }
}

async function runAnalysis() {
  analyzing.value = true
  analysisComplete.value = false
  analysisProgress.value = 0

  // Step 1: 生成地震波
  analysisStepText.value = '正在生成地震波数据...'
  await delay(300)
  
  const waveType = getWaveType(selectedCondition.value)
  const wave = generateSeismicWave(waveType, waveParams.duration, waveParams.dt, waveParams.pga)
  analysisData.time = wave.time
  analysisData.acc = wave.acc
  analysisProgress.value = 15

  // Step 2: 积分计算速度和位移
  analysisStepText.value = '正在计算速度和位移...'
  await delay(200)
  analysisData.vel = integrateToVelocity(wave.acc, waveParams.dt)
  analysisData.disp = integrateToDisplacement(analysisData.vel, waveParams.dt)
  analysisProgress.value = 30

  // Step 3: FFT频谱分析
  analysisStepText.value = '正在进行频谱分析...'
  await delay(300)
  const fft = computeFFT(wave.acc, waveParams.dt)
  analysisData.fftFreq = fft.freq
  analysisData.fftAmp = fft.amplitude
  updateSpectrumInfo(fft)
  analysisProgress.value = 50

  // Step 4: 反应谱
  analysisStepText.value = '正在计算反应谱...'
  await delay(400)
  const resp = computeResponseSpectrum(wave.acc, waveParams.dt, analysisSettings.spectrumDamping)
  analysisData.responsePeriods = resp.periods
  analysisData.responseSa = resp.sa
  analysisData.responseSv = resp.sv
  analysisData.responseSd = resp.sd
  updateResponseInfo(resp)
  analysisProgress.value = 70

  // Step 5: Arias强度
  analysisStepText.value = '正在计算Arias强度...'
  await delay(200)
  analysisData.ariasIntensity = computeAriasIntensity(wave.acc, waveParams.dt)
  updateAriasInfo(analysisData.ariasIntensity, wave.time)
  analysisProgress.value = 80

  // Step 6: 各监测点数据
  analysisStepText.value = '正在生成各监测点数据...'
  await delay(300)
  monitorPoints.forEach(p => {
    analysisData.pointData[p.id] = generateMonitorPointData(wave.acc, p.amplification, Math.floor(Math.random() * 5))
  })
  analysisProgress.value = 90

  // Step 7: 统计计算
  analysisStepText.value = '正在计算统计指标...'
  await delay(200)
  const displayData = currentDisplayData.value
  const s = computeStatistics(displayData)
  Object.assign(stats, s)
  analysisProgress.value = 100

  analysisStepText.value = '分析完成！'
  await delay(300)
  analyzing.value = false
  analysisComplete.value = true

  // 保存历史
  addToHistory()

  await nextTick()
  renderAllCharts()
}

function getWaveType(conditionId) {
  const c = conditions.find(c => c.id === conditionId)
  if (!c) return 'wenchuan'
  if (c.wave.includes('汶川')) return 'wenchuan'
  if (c.wave.includes('EL') || c.wave.includes('Centro')) return 'elcentro'
  if (c.wave.includes('Kobe')) return 'elcentro'
  return 'artificial'
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function updateSpectrumInfo(fft) {
  const maxAmp = Math.max(...fft.amplitude)
  const maxIdx = fft.amplitude.indexOf(maxAmp)
  const dominantFreq = fft.freq[maxIdx]
  
  let weightedSum = 0, totalAmp = 0
  fft.freq.forEach((f, i) => {
    weightedSum += f * fft.amplitude[i]
    totalAmp += fft.amplitude[i]
  })
  
  const meanFreq = totalAmp > 0 ? weightedSum / totalAmp : 0
  const threshold = maxAmp * 0.1
  const bandFreqs = fft.freq.filter((_, i) => fft.amplitude[i] > threshold)
  const bandwidth = bandFreqs.length > 0 ? bandFreqs[bandFreqs.length - 1] - bandFreqs[0] : 0
  
  // 能量集中度：主频±1Hz范围内的能量占比
  const mainBandEnergy = fft.amplitude.reduce((sum, a, i) => {
    return Math.abs(fft.freq[i] - dominantFreq) <= 1 ? sum + a * a : sum
  }, 0)
  const totalEnergy = fft.amplitude.reduce((sum, a) => sum + a * a, 0)
  
  Object.assign(spectrumInfo, {
    dominantFreq: dominantFreq.toFixed(2),
    meanFreq: meanFreq.toFixed(2),
    bandwidth: bandwidth.toFixed(1),
    peakAmplitude: maxAmp.toFixed(4),
    centroid: meanFreq.toFixed(2),
    concentration: totalEnergy > 0 ? (mainBandEnergy / totalEnergy * 100).toFixed(1) : '0'
  })
}

function updateResponseInfo(resp) {
  const saMax = Math.max(...resp.sa)
  const saIdx = resp.sa.indexOf(saMax)
  const sdMax = Math.max(...resp.sd)
  const sdIdx = resp.sd.indexOf(sdMax)
  
  // 平台段：Sa > 0.8 * saMax 的周期范围
  const plateau80 = resp.periods.filter((_, i) => resp.sa[i] > 0.8 * saMax)
  
  Object.assign(responseInfo, {
    saMax: saMax.toFixed(3),
    saPeakPeriod: resp.periods[saIdx].toFixed(2),
    sdMax: sdMax.toFixed(4),
    sdPeakPeriod: resp.periods[sdIdx].toFixed(2),
    plateauRange: plateau80.length > 0
      ? `${plateau80[0].toFixed(2)} - ${plateau80[plateau80.length - 1].toFixed(2)}`
      : 'N/A'
  })
}

function updateAriasInfo(ia, time) {
  const total = ia[ia.length - 1]
  let t5 = 0, t75 = 0, t95 = 0
  
  for (let i = 0; i < ia.length; i++) {
    if (ia[i] >= total * 0.05 && t5 === 0) t5 = time[i]
    if (ia[i] >= total * 0.75 && t75 === 0) t75 = time[i]
    if (ia[i] >= total * 0.95 && t95 === 0) t95 = time[i]
  }
  
  Object.assign(ariasInfo, {
    total: total.toFixed(3),
    t5: t5.toFixed(2),
    t75: t75.toFixed(2),
    t95: t95.toFixed(2),
    duration: (t95 - t5).toFixed(2)
  })
}

function addToHistory() {
  const now = new Date()
  analysisHistory.unshift({
    time: now.toLocaleString(),
    slopeName: currentSlopeName.value,
    conditionDesc: currentConditionDesc.value,
    indicator: indicatorLabel.value,
    peak: stats.max,
    amplification: amplificationFactor.value,
    params: { ...waveParams },
    slopeId: selectedSlope.value,
    conditionId: selectedCondition.value,
    indicatorType: indicatorType.value
  })
  if (analysisHistory.length > 20) analysisHistory.pop()
}

function loadHistory(h) {
  selectedSlope.value = h.slopeId
  selectedCondition.value = h.conditionId
  indicatorType.value = h.indicatorType
  Object.assign(waveParams, h.params)
  runAnalysis()
}

function removeHistory(index) {
  analysisHistory.splice(index, 1)
}

function clearHistory() {
  analysisHistory.splice(0, analysisHistory.length)
}

function toggleComparePoint(id) {
  const idx = compareVisiblePoints.value.indexOf(id)
  if (idx > -1) {
    compareVisiblePoints.value.splice(idx, 1)
  } else {
    compareVisiblePoints.value.push(id)
  }
  renderCompareChart()
}

function exportData() {
  if (!analysisComplete.value) return
  const data = currentDisplayData.value
  let csv = '时间(s),' + indicatorLabel.value + '(' + unitLabel.value + ')\n'
  data.forEach((v, i) => {
    csv += (i * waveParams.dt).toFixed(3) + ',' + v.toFixed(4) + '\n'
  })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `动力响应_${currentSlopeName.value}_${currentConditionDesc.value}_${indicatorLabel.value}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 图表渲染 ====================
function renderAllCharts() {
  renderTimeseriesChart()
  renderSpectrumChart()
  renderPsdChart()
  renderResponseCharts()
  renderAriasChart()
  renderPhaseCharts()
  renderCompareChart()
  renderAmpProfileChart()
}

function getCommonChartOption() {
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

function renderTimeseriesChart() {
  const chart = initChart(dynamicChartRef.value, 'dynamic')
  if (!chart) return
  
  const data = downsample(currentDisplayData.value, analysisSettings.displayPoints)
  const timeLabels = downsample(analysisData.time, analysisSettings.displayPoints).map(t => t.toFixed(2) + 's')
  
  chart.setOption({
    ...getCommonChartOption(),
    legend: { data: [indicatorLabel.value], textStyle: { color: '#b0d0ff' } },
    xAxis: { type: 'category', data: timeLabels, ...getAxisStyle(), axisLabel: { color: '#b0d0ff', interval: Math.floor(timeLabels.length / 10) } },
    yAxis: { type: 'value', name: unitLabel.value, nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 20, bottom: 5, borderColor: '#1b5b9e', fillerColor: 'rgba(0,234,255,0.1)', handleStyle: { color: '#00eaff' }, textStyle: { color: '#b0d0ff' } }
    ],
    series: [{
      name: indicatorLabel.value,
      type: 'line', data: data.map(v => parseFloat(v.toFixed(3))),
      showSymbol: false,
      lineStyle: { width: 1, shadowColor: 'rgba(0,234,255,0.3)', shadowBlur: 6 },
      itemStyle: { color: '#00eaff' },
      areaStyle: { color: 'rgba(0,234,255,0.05)' }
    }]
  })
}

function renderSpectrumChart() {
  const chart = initChart(spectrumChartRef.value, 'spectrum')
  if (!chart) return
  
  chart.setOption({
    ...getCommonChartOption(),
    xAxis: { type: 'category', data: analysisData.fftFreq.map(f => f.toFixed(1)), name: '频率 (Hz)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle(), axisLabel: { color: '#b0d0ff', interval: Math.floor(analysisData.fftFreq.length / 15) } },
    yAxis: { type: 'value', name: '幅值', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [{
      type: 'line', data: analysisData.fftAmp, showSymbol: false,
      itemStyle: { color: '#00ff88' },
      areaStyle: { color: 'rgba(0,255,136,0.08)' },
      smooth: true, lineStyle: { width: 1.5 }
    }]
  })
}

function renderPsdChart() {
  const chart = initChart(psdChartRef.value, 'psd')
  if (!chart) return
  
  const psd = analysisData.fftAmp.map(a => parseFloat((a * a).toFixed(6)))
  chart.setOption({
    ...getCommonChartOption(),
    xAxis: { type: 'category', data: analysisData.fftFreq.map(f => f.toFixed(1)), name: '频率 (Hz)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle(), axisLabel: { color: '#b0d0ff', interval: Math.floor(analysisData.fftFreq.length / 15) } },
    yAxis: { type: 'value', name: 'PSD', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [{
      type: 'bar', data: psd, barWidth: '60%',
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#00eaff' }, { offset: 1, color: 'rgba(0,234,255,0.1)' }
      ]) }
    }]
  })
}

function renderResponseCharts() {
  // Sa
  const saChart = initChart(responseSaRef.value, 'responseSa')
  if (saChart) {
    const periods = downsample(analysisData.responsePeriods, 200)
    const sa = downsample(analysisData.responseSa, 200)
    saChart.setOption({
      ...getCommonChartOption(),
      xAxis: { type: 'category', data: periods.map(p => p.toFixed(2)), name: '周期 T (s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      yAxis: { type: 'value', name: 'Sa (m/s²)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      series: [{
        type: 'line', data: sa.map(v => parseFloat(v.toFixed(3))), showSymbol: false, smooth: true,
        itemStyle: { color: '#f24e4e' },
        areaStyle: { color: 'rgba(242,78,78,0.08)' },
        lineStyle: { width: 2, shadowColor: 'rgba(242,78,78,0.4)', shadowBlur: 8 }
      }]
    })
  }
  
  // Sd
  const sdChart = initChart(responseSdRef.value, 'responseSd')
  if (sdChart) {
    const periods = downsample(analysisData.responsePeriods, 200)
    const sd = downsample(analysisData.responseSd, 200)
    sdChart.setOption({
      ...getCommonChartOption(),
      xAxis: { type: 'category', data: periods.map(p => p.toFixed(2)), name: '周期 T (s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      yAxis: { type: 'value', name: 'Sd (m)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      series: [{
        type: 'line', data: sd.map(v => parseFloat(v.toFixed(5))), showSymbol: false, smooth: true,
        itemStyle: { color: '#a78bfa' },
        areaStyle: { color: 'rgba(167,139,250,0.08)' },
        lineStyle: { width: 2, shadowColor: 'rgba(167,139,250,0.4)', shadowBlur: 8 }
      }]
    })
  }
}

function renderAriasChart() {
  const chart = initChart(ariasChartRef.value, 'arias')
  if (!chart) return
  
  const ia = downsample(analysisData.ariasIntensity, 300)
  const time = downsample(analysisData.time, 300).map(t => t.toFixed(2) + 's')
  
  chart.setOption({
    ...getCommonChartOption(),
    xAxis: { type: 'category', data: time, name: '时间 (s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle(), axisLabel: { color: '#b0d0ff', interval: Math.floor(time.length / 10) } },
    yAxis: { type: 'value', name: 'Ia (m/s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [{
      type: 'line', data: ia.map(v => parseFloat(v.toFixed(4))), showSymbol: false, smooth: true,
      itemStyle: { color: '#ffa500' },
      areaStyle: { color: 'rgba(255,165,0,0.08)' },
      lineStyle: { width: 2, shadowColor: 'rgba(255,165,0,0.4)', shadowBlur: 8 },
      markLine: {
        silent: true,
        data: [
          { yAxis: parseFloat(ariasInfo.total) * 0.05, label: { formatter: '5%', color: '#8ab4f8' }, lineStyle: { color: 'rgba(0,234,255,0.4)', type: 'dashed' } },
          { yAxis: parseFloat(ariasInfo.total) * 0.95, label: { formatter: '95%', color: '#8ab4f8' }, lineStyle: { color: 'rgba(0,234,255,0.4)', type: 'dashed' } }
        ]
      }
    }]
  })
}

function renderPhaseCharts() {
  // 加速度-速度相平面
  const chart1 = initChart(phaseChartRef.value, 'phase1')
  if (chart1) {
    const acc = downsample(analysisData.acc, 500)
    const vel = downsample(analysisData.vel, 500)
    const phaseData = acc.map((a, i) => [parseFloat(vel[i]?.toFixed(4) || 0), parseFloat(a.toFixed(4))])
    
    chart1.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, formatter: p => `速度: ${p.data[0]} m/s<br>加速度: ${p.data[1]} m/s²` },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '速度 (m/s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      yAxis: { type: 'value', name: '加速度 (m/s²)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      series: [{
        type: 'line', data: phaseData, showSymbol: false,
        lineStyle: { width: 0.8, color: '#00eaff', opacity: 0.6 }
      }]
    })
  }
  
  // 速度-位移相平面
  const chart2 = initChart(phaseChart2Ref.value, 'phase2')
  if (chart2) {
    const vel = downsample(analysisData.vel, 500)
    const disp = downsample(analysisData.disp, 500)
    const phaseData2 = vel.map((v, i) => [parseFloat((disp[i] * 1000)?.toFixed(3) || 0), parseFloat(v.toFixed(4))])
    
    chart2.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, formatter: p => `位移: ${p.data[0]} mm<br>速度: ${p.data[1]} m/s` },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '位移 (mm)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      yAxis: { type: 'value', name: '速度 (m/s)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
      series: [{
        type: 'line', data: phaseData2, showSymbol: false,
        lineStyle: { width: 0.8, color: '#00ff88', opacity: 0.6 }
      }]
    })
  }
}

function renderCompareChart() {
  const chart = initChart(compareChartRef.value, 'compare')
  if (!chart) return
  
  const time = downsample(analysisData.time, 400).map(t => t.toFixed(2) + 's')
  const series = monitorPoints.filter(p => compareVisiblePoints.value.includes(p.id)).map(p => {
    const data = downsample(analysisData.pointData[p.id] || [], 400)
    return {
      name: `${p.id} ${p.name}`,
      type: 'line', data: data.map(v => parseFloat(v.toFixed(3))),
      showSymbol: false,
      lineStyle: { width: 1, color: p.color },
      itemStyle: { color: p.color }
    }
  })
  
  chart.setOption({
    ...getCommonChartOption(),
    legend: { data: series.map(s => s.name), textStyle: { color: '#b0d0ff' }, top: 5 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: 35, containLabel: true },
    xAxis: { type: 'category', data: time, ...getAxisStyle(), axisLabel: { color: '#b0d0ff', interval: Math.floor(time.length / 10) } },
    yAxis: { type: 'value', name: unitLabel.value, nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 5, borderColor: '#1b5b9e', fillerColor: 'rgba(0,234,255,0.1)', textStyle: { color: '#b0d0ff' } }],
    series
  })
}

function renderAmpProfileChart() {
  const chart = initChart(ampProfileRef.value, 'ampProfile')
  if (!chart) return
  
  const data = pointCompareData.value.map(p => ({
    name: p.id + ' ' + p.name,
    height: p.height,
    amp: parseFloat(p.amplification)
  })).sort((a, b) => a.height - b.height)
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, formatter: p => `${p.data[2]}<br>高程: ${p.data[1]}m<br>放大系数: ${p.data[0]}` },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', name: '放大系数', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    yAxis: { type: 'value', name: '高程 (m)', nameTextStyle: { color: '#b0d0ff' }, ...getAxisStyle() },
    series: [{
      type: 'line', data: data.map(d => [d.amp, d.height, d.name]),
      smooth: true, showSymbol: true, symbolSize: 8,
      lineStyle: { width: 2, color: '#00eaff' },
      itemStyle: { color: '#00eaff', borderColor: '#fff', borderWidth: 1 },
      label: { show: true, formatter: p => p.data[2], position: 'right', color: '#b0d0ff', fontSize: 11 }
    }]
  })
}

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ==================== 生命周期 ====================
onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 自动运行一次分析
  runAnalysis()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
  charts = {}
})

// 监听Tab切换重新渲染
watch(activeTab, async () => {
  await nextTick()
  handleResize()
})
</script>

<style scoped>
.param-config-panel {
  margin-bottom: 20px;
}
.param-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.param-section {
  padding: 10px;
  border: 1px solid rgba(27, 91, 158, 0.2);
  background: rgba(0,0,0,0.15);
}
.param-section-title {
  font-size: 14px;
  color: var(--text-highlight);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 234, 255, 0.15);
}
.param-section-title i { margin-right: 6px; }
.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
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
