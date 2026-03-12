<template>
  <div class="page-container result-export-page">
    <div class="page-title"><i class="ri-file-chart-line" style="color:var(--text-highlight);"></i> 结果导出</div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stats-card" v-for="s in statsCards" :key="s.label">
        <i :class="s.icon" :style="{ color: s.color }"></i>
        <div class="label">{{ s.label }}</div>
        <div class="value" :style="{ color: s.color }">{{ s.value }}</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-item" v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i :class="tab.icon"></i> {{ tab.label }}
      </div>
    </div>

    <!-- ========== Tab 1: 评价结果列表 ========== -->
    <div v-if="activeTab === 'results'">
      <div class="filter-bar">
        <span class="form-label">边坡选择</span>
        <select class="form-select" v-model="filterSlope" style="width:140px;">
          <option value="">全部</option>
          <option v-for="s in slopeNames" :key="s" :value="s">{{ s }}</option>
        </select>
        <span class="form-label">工况选择</span>
        <select class="form-select" v-model="filterWave" style="width:130px;">
          <option value="">全部</option>
          <option v-for="w in waveTypes" :key="w" :value="w">{{ w }}</option>
        </select>
        <span class="form-label">稳定等级</span>
        <select class="form-select" v-model="filterLevel" style="width:110px;">
          <option value="">全部</option>
          <option v-for="l in levelOptions" :key="l" :value="l">{{ l }}</option>
        </select>
        <span class="form-label">日期</span>
        <input type="date" class="form-input" v-model="filterDateStart" style="width:140px;">
        <span class="form-label">至</span>
        <input type="date" class="form-input" v-model="filterDateEnd" style="width:140px;">
        <button class="form-btn form-btn-primary" @click="filterResults"><i class="ri-search-line"></i> 查询</button>
        <button class="form-btn" @click="resetFilter"><i class="ri-refresh-line"></i> 重置</button>
      </div>

      <!-- 批量操作栏 -->
      <div class="action-bar">
        <button class="form-btn form-btn-primary" @click="exportSelectedExcel" :disabled="selectedCount === 0">
          <i class="ri-file-excel-2-line"></i> 导出 Excel ({{ selectedCount }})
        </button>
        <button class="form-btn" style="border-color:#f24e4e; color:#f24e4e;" @click="exportSelectedPDF" :disabled="selectedCount === 0">
          <i class="ri-file-pdf-line"></i> 导出 PDF ({{ selectedCount }})
        </button>
        <button class="form-btn" @click="printSelected" :disabled="selectedCount === 0">
          <i class="ri-printer-line"></i> 打印报告
        </button>
        <button class="form-btn" @click="batchGenerate" :disabled="selectedCount === 0">
          <i class="ri-magic-line"></i> 批量生成报告
        </button>
        <span style="margin-left:auto; font-size:13px; color:#8ab4f8;">
          已选中 {{ selectedCount }} 条 / 共 {{ filteredResults.length }} 条记录
        </span>
      </div>

      <!-- 导出进度条 -->
      <div class="panel" v-if="exporting" style="margin-bottom:10px;">
        <div class="export-progress">
          <div class="ep-info">
            <i class="ri-loader-4-line ri-spin"></i>
            <span>{{ exportMsg }}</span>
          </div>
          <div class="ep-bar">
            <div class="ep-fill" :style="{ width: exportProgress + '%' }"></div>
          </div>
          <span class="ep-pct">{{ exportProgress }}%</span>
        </div>
      </div>

      <!-- 结果表格 -->
      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-list-check-2"></i> 历史评价结果列表</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredResults.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px;"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll"></th>
              <th style="width:50px;">序号</th>
              <th>边坡名称</th>
              <th>工况名称</th>
              <th>评价模型</th>
              <th>综合得分</th>
              <th>安全系数</th>
              <th>稳定等级</th>
              <th>评价时间</th>
              <th>导出次数</th>
              <th style="width:200px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in paginatedResults" :key="r.id" :class="{ 'row-selected': r.selected }">
              <td><input type="checkbox" v-model="r.selected"></td>
              <td>{{ (resultPage - 1) * resultPageSize + idx + 1 }}</td>
              <td style="font-weight:600; color:var(--text-highlight);">{{ r.slope }}</td>
              <td>{{ r.wave }}</td>
              <td>{{ r.model }}</td>
              <td :style="{ color: scoreColor(r.score), fontWeight: 'bold' }">{{ r.score.toFixed(1) }}</td>
              <td :style="{ color: r.safetyFactor >= 1.0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold' }">{{ r.safetyFactor.toFixed(2) }}</td>
              <td>
                <span class="status-tag" :class="levelClass(r.level)">{{ r.level }}</span>
              </td>
              <td>{{ r.time }}</td>
              <td>{{ r.exportCount }}</td>
              <td>
                <button class="table-btn" @click="previewResult(r)"><i class="ri-eye-line"></i> 预览</button>
                <button class="table-btn" @click="exportSingle(r, 'excel')"><i class="ri-file-excel-2-line"></i></button>
                <button class="table-btn" @click="exportSingle(r, 'pdf')"><i class="ri-file-pdf-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination-bar">
          <span class="page-info">第 {{ resultPage }} / {{ resultTotalPages }} 页</span>
          <div class="page-btns">
            <button class="form-btn" :disabled="resultPage <= 1" @click="resultPage--"><i class="ri-arrow-left-s-line"></i></button>
            <button class="form-btn" v-for="p in resultPageNumbers" :key="p" :class="{ 'form-btn-primary': p === resultPage }" @click="resultPage = p">{{ p }}</button>
            <button class="form-btn" :disabled="resultPage >= resultTotalPages" @click="resultPage++"><i class="ri-arrow-right-s-line"></i></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 2: 报告预览 ========== -->
    <div v-if="activeTab === 'preview'">
      <div class="filter-bar">
        <span class="form-label">选择记录</span>
        <select class="form-select" v-model="previewIdx" style="width:250px;">
          <option v-for="(r, idx) in results" :key="r.id" :value="idx">{{ r.slope }} - {{ r.wave }} ({{ r.time }})</option>
        </select>
        <button class="form-btn form-btn-primary" @click="generatePreview"><i class="ri-magic-line"></i> 生成预览</button>
      </div>

      <div class="content-grid">
        <div class="panel report-preview">
          <div class="panel-title"><i class="ri-article-line"></i> 报告内容预览</div>
          <div class="rp-chapters">
            <div class="rp-chapter" v-for="ch in reportChapters" :key="ch.num" :class="{ active: ch.active }" @click="ch.active = !ch.active">
              <div class="rp-header">
                <i :class="ch.icon"></i>
                <span>{{ ch.num }}、{{ ch.title }}</span>
                <i :class="ch.active ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'" style="margin-left:auto;"></i>
              </div>
              <div class="rp-body" v-if="ch.active">
                <div class="rp-section" v-for="s in ch.sections" :key="s">
                  <i class="ri-checkbox-circle-line"></i> {{ s }}
                </div>
              </div>
            </div>
          </div>
          <div class="alert-box info" style="margin:10px;">
            报告将自动包含以上六个章节内容，支持自定义勾选内容模块。格式支持 Excel / PDF / Word。
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-information-line"></i> 报告基本信息</div>
          <div class="report-info-grid">
            <div class="ri-item">
              <span class="ri-label">边坡名称</span>
              <span class="ri-value">{{ previewData.slope }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">工况条件</span>
              <span class="ri-value">{{ previewData.wave }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">评价模型</span>
              <span class="ri-value">{{ previewData.model }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">综合得分</span>
              <span class="ri-value" :style="{ color: scoreColor(previewData.score) }">{{ previewData.score?.toFixed(1) }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">安全系数</span>
              <span class="ri-value">{{ previewData.safetyFactor?.toFixed(2) }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">稳定等级</span>
              <span class="ri-value"><span class="status-tag" :class="levelClass(previewData.level)">{{ previewData.level }}</span></span>
            </div>
            <div class="ri-item">
              <span class="ri-label">评价时间</span>
              <span class="ri-value">{{ previewData.time }}</span>
            </div>
            <div class="ri-item">
              <span class="ri-label">评价结论</span>
              <span class="ri-value" style="font-size:11px;">{{ previewData.conclusion }}</span>
            </div>
          </div>

          <div class="panel-title" style="margin-top:12px;"><i class="ri-tools-line"></i> 导出设置</div>
          <div class="export-settings">
            <div class="es-row">
              <span class="form-label">导出格式</span>
              <div class="radio-group">
                <label v-for="f in exportFormats" :key="f"><input type="radio" v-model="exportFormat" :value="f"> {{ f }}</label>
              </div>
            </div>
            <div class="es-row">
              <span class="form-label">图片分辨率</span>
              <select class="form-select" v-model="exportDpi" style="width:130px;">
                <option :value="150">150 DPI</option>
                <option :value="300">300 DPI</option>
                <option :value="600">600 DPI (高清)</option>
              </select>
            </div>
            <div class="es-row">
              <span class="form-label">包含附录</span>
              <label><input type="checkbox" v-model="includeAppendix"> 原始数据表</label>
            </div>
            <div class="es-row">
              <span class="form-label">水印设置</span>
              <label><input type="checkbox" v-model="watermark"> 添加系统水印</label>
            </div>
          </div>

          <div style="display:flex; gap:10px; padding:0 15px 15px; margin-top:8px;">
            <button class="form-btn form-btn-primary" @click="exportPreview"><i class="ri-download-2-line"></i> 导出报告</button>
            <button class="form-btn" @click="printPreview"><i class="ri-printer-line"></i> 打印预览</button>
          </div>
        </div>
      </div>

      <!-- 评价结果分析图表 -->
      <div class="content-grid" style="margin-top:15px;">
        <div class="panel">
          <div class="panel-title"><i class="ri-bar-chart-box-line"></i> 得分对比分析</div>
          <div ref="scoreCompareRef" class="chart-container" style="min-height:280px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-radar-line"></i> 多指标雷达图</div>
          <div ref="radarRef" class="chart-container" style="min-height:280px;"></div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 3: 导出模板 ========== -->
    <div v-if="activeTab === 'templates'">
      <div class="filter-bar">
        <span class="form-label">模板类型</span>
        <select class="form-select" v-model="templateTypeFilter" style="width:150px;">
          <option value="">全部</option>
          <option>完整报告</option>
          <option>简要报告</option>
          <option>数据表格</option>
          <option>图表汇总</option>
        </select>
        <button class="form-btn" style="margin-left:auto;" @click="showTemplateModal = true; editingTplIdx = -1; resetTplForm()">
          <i class="ri-add-line"></i> 新建模板
        </button>
      </div>

      <div class="template-grid">
        <div class="template-card" v-for="(t, idx) in filteredTemplates" :key="t.id" :class="{ default: t.isDefault }">
          <div class="tc-header">
            <i :class="t.icon" class="tc-icon"></i>
            <div class="tc-info">
              <div class="tc-name">{{ t.name }} <span v-if="t.isDefault" class="default-badge">默认</span></div>
              <div class="tc-type">{{ t.type }}</div>
            </div>
          </div>
          <div class="tc-desc">{{ t.desc }}</div>
          <div class="tc-meta">
            <span><i class="ri-time-line"></i> {{ t.updated }}</span>
            <span><i class="ri-download-line"></i> {{ t.useCount }} 次使用</span>
          </div>
          <div class="tc-chapters">
            <span class="tc-ch" v-for="ch in t.chapters" :key="ch">{{ ch }}</span>
          </div>
          <div class="tc-actions">
            <button class="form-btn form-btn-primary" @click="useTemplate(t)"><i class="ri-check-line"></i> 使用</button>
            <button class="form-btn" @click="editTemplate(idx)"><i class="ri-edit-line"></i> 编辑</button>
            <button class="form-btn" v-if="!t.isDefault" @click="setDefaultTemplate(idx)"><i class="ri-star-line"></i> 设为默认</button>
            <button class="table-btn table-btn-danger" v-if="!t.isDefault" @click="deleteTemplate(idx)"><i class="ri-delete-bin-line"></i></button>
          </div>
        </div>
      </div>

      <!-- 新建/编辑模板弹窗 -->
      <div class="modal-overlay" v-if="showTemplateModal" @click.self="showTemplateModal = false">
        <div class="modal-box" style="max-width:600px;">
          <div class="modal-title"><i class="ri-file-settings-line"></i> {{ editingTplIdx >= 0 ? '编辑模板' : '新建模板' }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">模板名称</label>
              <input class="form-input" v-model="tplForm.name">
            </div>
            <div class="form-group">
              <label class="form-label">模板类型</label>
              <select class="form-select" v-model="tplForm.type">
                <option>完整报告</option>
                <option>简要报告</option>
                <option>数据表格</option>
                <option>图表汇总</option>
              </select>
            </div>
            <div class="form-group" style="grid-column:span 2;">
              <label class="form-label">模板描述</label>
              <input class="form-input" v-model="tplForm.desc">
            </div>
            <div class="form-group" style="grid-column:span 2;">
              <label class="form-label">包含章节</label>
              <div class="checkbox-group">
                <label v-for="ch in allChapterNames" :key="ch">
                  <input type="checkbox" :value="ch" v-model="tplForm.chapters"> {{ ch }}
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn" @click="showTemplateModal = false">取 消</button>
            <button class="form-btn form-btn-primary" @click="saveTplForm">保 存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 4: 导出历史 ========== -->
    <div v-if="activeTab === 'history'">
      <div class="filter-bar">
        <span class="form-label">格式筛选</span>
        <select class="form-select" v-model="historyFormatFilter" style="width:100px;">
          <option value="">全部</option>
          <option>Excel</option>
          <option>PDF</option>
          <option>Word</option>
        </select>
        <span class="form-label">状态</span>
        <select class="form-select" v-model="historyStatusFilter" style="width:100px;">
          <option value="">全部</option>
          <option>已完成</option>
          <option>生成中</option>
          <option>失败</option>
        </select>
        <button class="form-btn form-btn-primary"><i class="ri-search-line"></i> 筛选</button>
        <button class="form-btn" @click="historyFormatFilter = ''; historyStatusFilter = ''"><i class="ri-refresh-line"></i> 重置</button>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-history-line"></i> 导出历史记录</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredHistory.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>导出时间</th>
              <th>文件名</th>
              <th>格式</th>
              <th>文件大小</th>
              <th>包含记录</th>
              <th>导出类型</th>
              <th>状态</th>
              <th style="width:150px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, idx) in filteredHistory" :key="idx">
              <td>{{ h.time }}</td>
              <td style="color:var(--text-highlight);">{{ h.fileName }}</td>
              <td><span class="format-badge" :class="'fmt-' + h.format.toLowerCase()">{{ h.format }}</span></td>
              <td>{{ h.size }}</td>
              <td>{{ h.records }}</td>
              <td>{{ h.exportType }}</td>
              <td><span class="status-tag" :class="h.status === '已完成' ? 'success' : h.status === '生成中' ? 'warning' : 'danger'">{{ h.status }}</span></td>
              <td>
                <button class="table-btn" @click="downloadExport(idx)"><i class="ri-download-line"></i> 下载</button>
                <button class="table-btn table-btn-danger" @click="deleteExportHistory(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 导出统计 -->
      <div class="content-grid" style="margin-top:15px;">
        <div class="panel">
          <div class="panel-title"><i class="ri-pie-chart-line"></i> 格式分布统计</div>
          <div ref="formatChartRef" class="chart-container" style="min-height:260px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-line-chart-line"></i> 导出趋势统计</div>
          <div ref="trendChartRef" class="chart-container" style="min-height:260px;"></div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 5: 得分趋势分析 ========== -->
    <div v-if="activeTab === 'analysis'">
      <div class="filter-bar">
        <span class="form-label">边坡选择</span>
        <select class="form-select" v-model="analysisSlope" style="width:140px;">
          <option v-for="s in slopeNames" :key="s" :value="s">{{ s }}</option>
        </select>
        <span class="form-label">评价模型</span>
        <select class="form-select" v-model="analysisModel" style="width:160px;">
          <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-line-chart-line"></i> 各边坡综合得分趋势</div>
          <div ref="scoreTrendRef" class="chart-container" style="min-height:320px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-shield-check-line"></i> 安全系数变化趋势</div>
          <div ref="safetyTrendRef" class="chart-container" style="min-height:320px;"></div>
        </div>
      </div>

      <div class="content-grid" style="margin-top:15px;">
        <div class="panel">
          <div class="panel-title"><i class="ri-bar-chart-horizontal-line"></i> 各边坡稳定等级分布</div>
          <div ref="levelDistRef" class="chart-container" style="min-height:300px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-bubble-chart-line"></i> 得分 vs 安全系数散点图</div>
          <div ref="scatterRef" class="chart-container" style="min-height:300px;"></div>
        </div>
      </div>
    </div>

    <!-- 报告预览弹窗 -->
    <div class="modal-overlay" v-if="showPreviewModal" @click.self="showPreviewModal = false">
      <div class="modal-box" style="max-width:800px; max-height:85vh; overflow-y:auto;">
        <div class="modal-title"><i class="ri-eye-line"></i> 评价报告预览 — {{ previewRecord.slope }}</div>
        <div class="preview-content">
          <div class="preview-section">
            <h4><i class="ri-clipboard-line"></i> 一、基础信息</h4>
            <div class="preview-grid">
              <div class="pv-item"><span class="pv-k">边坡名称</span><span class="pv-v">{{ previewRecord.slope }}</span></div>
              <div class="pv-item"><span class="pv-k">工况条件</span><span class="pv-v">{{ previewRecord.wave }}</span></div>
              <div class="pv-item"><span class="pv-k">评价模型</span><span class="pv-v">{{ previewRecord.model }}</span></div>
              <div class="pv-item"><span class="pv-k">评价时间</span><span class="pv-v">{{ previewRecord.time }}</span></div>
            </div>
          </div>
          <div class="preview-section">
            <h4><i class="ri-check-double-line"></i> 二、评价结论</h4>
            <div class="preview-grid">
              <div class="pv-item"><span class="pv-k">综合得分</span><span class="pv-v" :style="{ color: scoreColor(previewRecord.score) }">{{ previewRecord.score?.toFixed(1) }}</span></div>
              <div class="pv-item"><span class="pv-k">安全系数</span><span class="pv-v">{{ previewRecord.safetyFactor?.toFixed(2) }}</span></div>
              <div class="pv-item"><span class="pv-k">稳定等级</span><span class="pv-v"><span class="status-tag" :class="levelClass(previewRecord.level)">{{ previewRecord.level }}</span></span></div>
              <div class="pv-item"><span class="pv-k">风险描述</span><span class="pv-v" style="font-size:11px;">{{ previewRecord.conclusion }}</span></div>
            </div>
          </div>
          <div class="preview-section">
            <h4><i class="ri-bar-chart-box-line"></i> 三、各指标详情</h4>
            <table class="data-table" style="margin:0;">
              <thead>
                <tr>
                  <th>指标名称</th><th>原始值</th><th>归一化值</th><th>权重</th><th>加权得分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ind in previewRecord.indicators" :key="ind.name">
                  <td>{{ ind.name }}</td><td>{{ ind.raw }}</td><td>{{ ind.norm }}</td><td>{{ ind.weight }}</td><td style="font-weight:600; color:var(--text-highlight);">{{ ind.weighted }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="preview-section">
            <h4><i class="ri-lightbulb-line"></i> 四、处置建议</h4>
            <div class="suggestion-list">
              <div class="sug-item" v-for="(sg, idx) in previewRecord.suggestions" :key="idx">
                <i class="ri-arrow-right-circle-line"></i> {{ sg }}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="form-btn" @click="showPreviewModal = false">关 闭</button>
          <button class="form-btn form-btn-primary" @click="exportSingle(previewRecord, 'pdf')"><i class="ri-download-2-line"></i> 导出 PDF</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'

// ========== Tabs ==========
const tabs = [
  { key: 'results', label: '评价结果', icon: 'ri-list-check-2' },
  { key: 'preview', label: '报告预览', icon: 'ri-article-line' },
  { key: 'templates', label: '导出模板', icon: 'ri-file-settings-line' },
  { key: 'history', label: '导出历史', icon: 'ri-history-line' },
  { key: 'analysis', label: '得分分析', icon: 'ri-line-chart-line' }
]
const activeTab = ref('results')

// ========== 统计卡片 ==========
const statsCards = reactive([
  { label: '评价记录', value: 24, icon: 'ri-file-list-3-line', color: '#00eaff' },
  { label: '已导出', value: 18, icon: 'ri-download-2-line', color: '#00ff88' },
  { label: '待导出', value: 6, icon: 'ri-time-line', color: '#ffa500' },
  { label: '报告模板', value: 5, icon: 'ri-file-settings-line', color: '#a78bfa' }
])

// ========== 评价结果 ==========
const slopeNames = ['龙潭边坡', '青山边坡', '翠峰边坡', '金沙江边坡', '通江边坡', '望江边坡', '云台边坡', '丹霞边坡', '岷江边坡']
const waveTypes = ['汶川波', 'EL Centro波', '人工波', 'Kobe波', '唐山波']
const modelOptions = ['能量演化综合评价法', '动力响应加权评分法', '多指标模糊综合评判', '灰色关联分析法']
const levelOptions = ['稳定', '较稳定', '基本稳定', '欠稳定', '不稳定']

const filterSlope = ref('')
const filterWave = ref('')
const filterLevel = ref('')
const filterDateStart = ref('2026-01-01')
const filterDateEnd = ref('2026-03-15')
const resultPage = ref(1)
const resultPageSize = 8

const exporting = ref(false)
const exportProgress = ref(0)
const exportMsg = ref('')

function makeResults() {
  const data = []
  const combos = [
    { slope: '龙潭边坡', wave: '汶川波 0.20g', model: '能量演化综合评价法', score: 62, sf: 0.88, level: '欠稳定', time: '2026-03-10' },
    { slope: '龙潭边坡', wave: 'EL Centro波 0.15g', model: '能量演化综合评价法', score: 48.5, sf: 1.05, level: '基本稳定', time: '2026-03-08' },
    { slope: '青山边坡', wave: '汶川波 0.20g', model: '动力响应加权评分法', score: 35.2, sf: 1.22, level: '较稳定', time: '2026-03-05' },
    { slope: '青山边坡', wave: '人工波 0.30g', model: '能量演化综合评价法', score: 71.8, sf: 0.72, level: '欠稳定', time: '2026-03-04' },
    { slope: '通江边坡', wave: '汶川波 0.20g', model: '多指标模糊综合评判', score: 22.4, sf: 1.55, level: '稳定', time: '2026-02-28' },
    { slope: '望江边坡', wave: 'EL Centro波 0.15g', model: '能量演化综合评价法', score: 18.6, sf: 1.65, level: '稳定', time: '2026-02-25' },
    { slope: '翠峰边坡', wave: 'Kobe波 0.25g', model: '动力响应加权评分法', score: 82.3, sf: 0.58, level: '不稳定', time: '2026-02-20' },
    { slope: '金沙江边坡', wave: '汶川波 0.20g', model: '能量演化综合评价法', score: 55, sf: 0.92, level: '欠稳定', time: '2026-02-18' },
    { slope: '云台边坡', wave: '汶川波 0.20g', model: '灰色关联分析法', score: 41.5, sf: 1.15, level: '基本稳定', time: '2026-02-15' },
    { slope: '丹霞边坡', wave: 'EL Centro波 0.15g', model: '多指标模糊综合评判', score: 15.2, sf: 1.78, level: '稳定', time: '2026-02-10' },
    { slope: '龙潭边坡', wave: '人工波 0.40g', model: '能量演化综合评价法', score: 88.5, sf: 0.45, level: '不稳定', time: '2026-02-08' },
    { slope: '翠峰边坡', wave: '汶川波 0.30g', model: '能量演化综合评价法', score: 75.2, sf: 0.65, level: '欠稳定', time: '2026-02-05' },
    { slope: '岷江边坡', wave: '汶川波 0.20g', model: '动力响应加权评分法', score: 68.0, sf: 0.82, level: '欠稳定', time: '2026-02-02' },
    { slope: '通江边坡', wave: 'EL Centro波 0.15g', model: '灰色关联分析法', score: 28.6, sf: 1.42, level: '较稳定', time: '2026-01-28' },
    { slope: '望江边坡', wave: '汶川波 0.20g', model: '动力响应加权评分法', score: 32.5, sf: 1.30, level: '较稳定', time: '2026-01-25' },
    { slope: '青山边坡', wave: 'EL Centro波 0.15g', model: '多指标模糊综合评判', score: 25.0, sf: 1.48, level: '较稳定', time: '2026-01-20' },
    { slope: '龙潭边坡', wave: 'Kobe波 0.25g', model: '灰色关联分析法', score: 58.5, sf: 0.90, level: '欠稳定', time: '2026-01-18' },
    { slope: '金沙江边坡', wave: '人工波 0.30g', model: '能量演化综合评价法', score: 78.8, sf: 0.60, level: '欠稳定', time: '2026-01-15' },
    { slope: '云台边坡', wave: 'EL Centro波 0.15g', model: '能量演化综合评价法', score: 38.2, sf: 1.18, level: '基本稳定', time: '2026-01-12' },
    { slope: '丹霞边坡', wave: '汶川波 0.20g', model: '动力响应加权评分法', score: 20.0, sf: 1.60, level: '稳定', time: '2026-01-10' },
    { slope: '翠峰边坡', wave: 'EL Centro波 0.15g', model: '多指标模糊综合评判', score: 52.0, sf: 0.95, level: '基本稳定', time: '2026-01-08' },
    { slope: '岷江边坡', wave: '人工波 0.30g', model: '能量演化综合评价法', score: 85.5, sf: 0.50, level: '不稳定', time: '2026-01-05' },
    { slope: '望江边坡', wave: '人工波 0.30g', model: '灰色关联分析法', score: 45.0, sf: 1.08, level: '基本稳定', time: '2026-01-03' },
    { slope: '通江边坡', wave: '人工波 0.30g', model: '能量演化综合评价法', score: 42.0, sf: 1.12, level: '基本稳定', time: '2026-01-01' }
  ]
  combos.forEach((c, i) => {
    data.push({
      id: i + 1, slope: c.slope, wave: c.wave, model: c.model, score: c.score, safetyFactor: c.sf,
      level: c.level, time: c.time, exportCount: Math.floor(Math.random() * 5), selected: false,
      conclusion: getConclusionText(c.level, c.slope),
      indicators: getIndicators(c.score),
      suggestions: getSuggestions(c.level)
    })
  })
  return data
}

function getConclusionText(level, slope) {
  const map = {
    '稳定': `${slope}在所选工况下整体稳定性良好，各项指标均处于安全范围内。`,
    '较稳定': `${slope}整体较稳定，部分指标接近预警阈值，建议加强监测。`,
    '基本稳定': `${slope}基本稳定，但存在潜在风险因素，需要持续关注并制定应急预案。`,
    '欠稳定': `${slope}稳定性不足，多项指标超过预警阈值，需采取工程加固措施。`,
    '不稳定': `${slope}处于不稳定状态，风险等级高，需立即采取紧急处置措施。`
  }
  return map[level] || ''
}

function getIndicators(baseScore) {
  const names = ['峰值加速度', '频谱特征', '持时参数', '能量耗散比', '阻尼比变化', '安全系数变化']
  return names.map(n => {
    const raw = (Math.random() * 0.5 + 0.3).toFixed(3)
    const norm = (Math.random() * 0.8 + 0.1).toFixed(3)
    const weight = (1 / names.length).toFixed(3)
    const weighted = (parseFloat(norm) * parseFloat(weight) * 100).toFixed(2)
    return { name: n, raw, norm, weight, weighted }
  })
}

function getSuggestions(level) {
  const base = ['持续关注监测数据变化趋势', '定期检查边坡排水系统']
  if (level === '欠稳定' || level === '不稳定') {
    base.push('建议增设锚杆锚索等抗滑结构', '加强变形监测频率至每日一次', '制定应急撤离预案')
  }
  if (level === '不稳定') {
    base.push('立即对危险区域设置警戒标识', '启动应急响应机制并上报主管部门')
  }
  if (level === '基本稳定') {
    base.push('适当增加监测频率', '评估是否需要补充加固措施')
  }
  return base
}

const results = reactive(makeResults())

const filteredResults = computed(() => {
  return results.filter(r => {
    if (filterSlope.value && r.slope !== filterSlope.value) return false
    if (filterWave.value && !r.wave.includes(filterWave.value)) return false
    if (filterLevel.value && r.level !== filterLevel.value) return false
    if (filterDateStart.value && r.time < filterDateStart.value) return false
    if (filterDateEnd.value && r.time > filterDateEnd.value) return false
    return true
  })
})

const selectedCount = computed(() => results.filter(r => r.selected).length)
const allSelected = computed(() => filteredResults.value.length > 0 && filteredResults.value.every(r => r.selected))
const resultTotalPages = computed(() => Math.max(1, Math.ceil(filteredResults.value.length / resultPageSize)))
const resultPageNumbers = computed(() => { const p = []; for (let i = 1; i <= resultTotalPages.value; i++) p.push(i); return p })
const paginatedResults = computed(() => {
  const start = (resultPage.value - 1) * resultPageSize
  return filteredResults.value.slice(start, start + resultPageSize)
})

function filterResults() { resultPage.value = 1 }
function resetFilter() { filterSlope.value = ''; filterWave.value = ''; filterLevel.value = ''; filterDateStart.value = '2026-01-01'; filterDateEnd.value = '2026-03-15'; resultPage.value = 1 }
function toggleSelectAll(e) { filteredResults.value.forEach(r => r.selected = e.target.checked) }

function scoreColor(score) {
  if (score == null) return '#b0d0ff'
  if (score >= 70) return '#f24e4e'
  if (score >= 50) return '#ffa500'
  return '#00ff88'
}

function levelClass(level) {
  if (level === '不稳定') return 'danger'
  if (level === '欠稳定') return 'danger'
  if (level === '基本稳定') return 'warning'
  if (level === '较稳定') return 'success'
  if (level === '稳定') return 'success'
  return 'info'
}

// 导出操作
function simulateExport(msg) {
  exporting.value = true
  exportProgress.value = 0
  exportMsg.value = msg
  const timer = setInterval(() => {
    exportProgress.value = Math.min(100, exportProgress.value + Math.floor(Math.random() * 12 + 5))
    if (exportProgress.value >= 100) {
      clearInterval(timer)
      setTimeout(() => { exporting.value = false }, 800)
    }
  }, 200)
}

function exportSelectedExcel() { simulateExport('正在生成 Excel 报告...'); addHistory('Excel', selectedCount.value) }
function exportSelectedPDF() { simulateExport('正在生成 PDF 报告...'); addHistory('PDF', selectedCount.value) }
function printSelected() { simulateExport('正在准备打印内容...') }
function batchGenerate() { simulateExport('正在批量生成报告...'); addHistory('PDF', selectedCount.value) }
function exportSingle(r, fmt) {
  r.exportCount++
  simulateExport(`正在导出 ${r.slope} ${fmt.toUpperCase()} 报告...`)
  addHistory(fmt === 'excel' ? 'Excel' : 'PDF', 1, r.slope + '_' + r.wave.split(' ')[0])
}

function addHistory(fmt, count, namePrefix = '批量导出') {
  exportHistory.unshift({
    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    fileName: namePrefix + '_评价报告',
    format: fmt, size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB',
    records: count, exportType: count > 1 ? '批量' : '单条', status: '已完成'
  })
  statsCards[1].value++
  statsCards[2].value = Math.max(0, statsCards[2].value - 1)
}

// 预览弹窗
const showPreviewModal = ref(false)
const previewRecord = ref({})
function previewResult(r) { previewRecord.value = r; showPreviewModal.value = true }

// ========== 报告预览 Tab ==========
const previewIdx = ref(0)
const exportFormats = ['PDF', 'Excel', 'Word']
const exportFormat = ref('PDF')
const exportDpi = ref(300)
const includeAppendix = ref(true)
const watermark = ref(false)

const previewData = computed(() => results[previewIdx.value] || {})

const reportChapters = reactive([
  { num: '一', title: '基础信息', icon: 'ri-clipboard-line', active: true, sections: ['边坡基本参数', '工况条件设置', '评价模型选择', '监测点布置'] },
  { num: '二', title: '动力响应分析', icon: 'ri-line-chart-line', active: false, sections: ['加速度时程曲线', '速度时程曲线', '位移时程曲线', '傅里叶频谱', '反应谱'] },
  { num: '三', title: '能量演化分析', icon: 'ri-flashlight-line', active: false, sections: ['输入能量演化', '动能演化', '阻尼耗能', '应变能', '能量比值分析'] },
  { num: '四', title: '稳定性评价', icon: 'ri-shield-check-line', active: true, sections: ['指标评分表', '权重分配', '综合得分计算', '等级判定', 'AHP一致性检验'] },
  { num: '五', title: '评价结论与建议', icon: 'ri-lightbulb-line', active: true, sections: ['稳定性结论', '风险等级说明', '处置建议', '复核建议'] },
  { num: '六', title: '附录', icon: 'ri-bar-chart-box-line', active: false, sections: ['原始数据表', '图表汇总', '参数配置记录', '算法说明'] }
])

const allChapterNames = ['基础信息', '动力响应分析', '能量演化分析', '稳定性评价', '评价结论与建议', '附录']

function generatePreview() {} // visual refresh
function exportPreview() { exportSingle(previewData.value, exportFormat.value.toLowerCase()) }
function printPreview() { simulateExport('正在准备打印预览...') }

// ========== 导出模板 ==========
const templateTypeFilter = ref('')
const showTemplateModal = ref(false)
const editingTplIdx = ref(-1)

const templates = reactive([
  { id: 1, name: '完整评价报告', type: '完整报告', icon: 'ri-file-text-line', desc: '包含全部六个章节的完整评价报告模板', isDefault: true, updated: '2026-03-10', useCount: 42, chapters: allChapterNames.slice() },
  { id: 2, name: '简要评价报告', type: '简要报告', icon: 'ri-file-reduce-line', desc: '仅包含基础信息和评价结论的简要报告', isDefault: false, updated: '2026-03-08', useCount: 18, chapters: ['基础信息', '稳定性评价', '评价结论与建议'] },
  { id: 3, name: '数据导出表格', type: '数据表格', icon: 'ri-file-excel-2-line', desc: '以表格形式输出分析数据和评价指标', isDefault: false, updated: '2026-03-05', useCount: 26, chapters: ['基础信息', '稳定性评价', '附录'] },
  { id: 4, name: '图表汇总报告', type: '图表汇总', icon: 'ri-image-line', desc: '汇总所有分析图表的视觉化报告', isDefault: false, updated: '2026-02-28', useCount: 12, chapters: ['动力响应分析', '能量演化分析', '附录'] },
  { id: 5, name: '风险评估专报', type: '完整报告', icon: 'ri-alarm-warning-line', desc: '侧重风险评估和处置建议的专项报告', isDefault: false, updated: '2026-02-20', useCount: 8, chapters: ['基础信息', '稳定性评价', '评价结论与建议'] }
])

const tplForm = reactive({ name: '', type: '完整报告', desc: '', chapters: [] })

const filteredTemplates = computed(() => {
  if (!templateTypeFilter.value) return templates
  return templates.filter(t => t.type === templateTypeFilter.value)
})

function resetTplForm() { Object.assign(tplForm, { name: '', type: '完整报告', desc: '', chapters: [] }) }
function editTemplate(idx) {
  const t = filteredTemplates.value[idx]
  editingTplIdx.value = templates.indexOf(t)
  Object.assign(tplForm, { name: t.name, type: t.type, desc: t.desc, chapters: [...t.chapters] })
  showTemplateModal.value = true
}
function saveTplForm() {
  if (!tplForm.name) return
  if (editingTplIdx.value >= 0) {
    Object.assign(templates[editingTplIdx.value], { name: tplForm.name, type: tplForm.type, desc: tplForm.desc, chapters: [...tplForm.chapters], updated: new Date().toISOString().slice(0, 10) })
  } else {
    templates.push({ id: templates.length + 1, name: tplForm.name, type: tplForm.type, icon: 'ri-file-text-line', desc: tplForm.desc, isDefault: false, updated: new Date().toISOString().slice(0, 10), useCount: 0, chapters: [...tplForm.chapters] })
    statsCards[3].value = templates.length
  }
  showTemplateModal.value = false
}
function deleteTemplate(idx) {
  const t = filteredTemplates.value[idx]
  const realIdx = templates.indexOf(t)
  if (realIdx >= 0) { templates.splice(realIdx, 1); statsCards[3].value = templates.length }
}
function setDefaultTemplate(idx) {
  templates.forEach(t => t.isDefault = false)
  const t = filteredTemplates.value[idx]
  const realIdx = templates.indexOf(t)
  if (realIdx >= 0) templates[realIdx].isDefault = true
}
function useTemplate(t) { t.useCount++; activeTab.value = 'preview' }

// ========== 导出历史 ==========
const historyFormatFilter = ref('')
const historyStatusFilter = ref('')

const exportHistory = reactive([
  { time: '2026-03-10 16:20', fileName: '龙潭边坡_汶川波_评价报告', format: 'PDF', size: '3.2 MB', records: 1, exportType: '单条', status: '已完成' },
  { time: '2026-03-08 14:15', fileName: '龙潭边坡_ELCentro_评价报告', format: 'PDF', size: '2.8 MB', records: 1, exportType: '单条', status: '已完成' },
  { time: '2026-03-05 10:30', fileName: '青山边坡_汶川波_评价报告', format: 'Excel', size: '1.5 MB', records: 1, exportType: '单条', status: '已完成' },
  { time: '2026-03-04 09:00', fileName: '批量导出_3条_评价报告', format: 'PDF', size: '8.5 MB', records: 3, exportType: '批量', status: '已完成' },
  { time: '2026-02-28 15:45', fileName: '通江边坡_汶川波_评价报告', format: 'PDF', size: '2.5 MB', records: 1, exportType: '单条', status: '已完成' },
  { time: '2026-02-25 11:20', fileName: '望江边坡_ELCentro_评价报告', format: 'Excel', size: '1.2 MB', records: 1, exportType: '单条', status: '已完成' },
  { time: '2026-02-20 16:00', fileName: '批量导出_5条_评价报告', format: 'Word', size: '12.3 MB', records: 5, exportType: '批量', status: '已完成' },
  { time: '2026-02-18 13:30', fileName: '金沙江边坡_汶川波_评价报告', format: 'PDF', size: '3.0 MB', records: 1, exportType: '单条', status: '已完成' }
])

const filteredHistory = computed(() => {
  return exportHistory.filter(h => {
    if (historyFormatFilter.value && h.format !== historyFormatFilter.value) return false
    if (historyStatusFilter.value && h.status !== historyStatusFilter.value) return false
    return true
  })
})

function downloadExport(idx) { /* placeholder */ }
function deleteExportHistory(idx) { exportHistory.splice(idx, 1) }

// ========== 得分分析 ==========
const analysisSlope = ref('龙潭边坡')
const analysisModel = ref('能量演化综合评价法')

// ========== 图表 ==========
const scoreCompareRef = ref(null)
const radarRef = ref(null)
const formatChartRef = ref(null)
const trendChartRef = ref(null)
const scoreTrendRef = ref(null)
const safetyTrendRef = ref(null)
const levelDistRef = ref(null)
const scatterRef = ref(null)
const charts = {}

function initChart(el, key) {
  if (!el) return null
  if (charts[key]) charts[key].dispose()
  charts[key] = echarts.init(el)
  return charts[key]
}

function initPreviewCharts() {
  const c1 = initChart(scoreCompareRef.value, 'scoreCompare')
  if (c1) {
    const sNames = [...new Set(results.map(r => r.slope))].slice(0, 6)
    const avgScores = sNames.map(s => { const rs = results.filter(r => r.slope === s); return +(rs.reduce((a, r) => a + r.score, 0) / rs.length).toFixed(1) })
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 55, right: 15, top: 15, bottom: 48 },
      xAxis: { type: 'category', data: sNames.map(s => s.replace('边坡', '')), axisLabel: { color: '#b0d0ff', fontSize: 10 }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', name: '平均得分', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series: [{
        type: 'bar', barWidth: '50%',
        data: avgScores.map(v => ({
          value: v,
          itemStyle: { color: v >= 70 ? '#f24e4e' : v >= 50 ? '#ffa500' : '#00ff88', borderRadius: [4, 4, 0, 0] }
        })),
        label: { show: true, position: 'top', color: '#b0d0ff', fontSize: 10 },
        markLine: { data: [{ yAxis: 60, label: { formatter: '预警线', color: '#f24e4e' }, lineStyle: { color: '#f24e4e', type: 'dashed' } }], silent: true }
      }]
    })
  }

  const c2 = initChart(radarRef.value, 'radar')
  if (c2) {
    const indicators = ['峰值加速度', '频谱特征', '持时参数', '能量耗散比', '阻尼比变化', '安全系数'].map(n => ({ name: n, max: 100 }))
    const rd = results[previewIdx.value]
    c2.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip },
      radar: { indicator: indicators, shape: 'polygon', axisName: { color: '#b0d0ff' }, splitArea: { areaStyle: { color: ['rgba(0,234,255,0.02)', 'rgba(0,234,255,0.05)'] } }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.3)' } }, axisLine: { lineStyle: { color: 'rgba(27,91,158,0.3)' } } },
      series: [{ type: 'radar', data: [{ name: rd?.slope || '当前记录', value: rd?.indicators?.map(() => Math.floor(Math.random() * 60 + 30)) || [50, 60, 45, 70, 55, 40], areaStyle: { color: 'rgba(0,234,255,0.15)' }, lineStyle: { color: '#00eaff' }, itemStyle: { color: '#00eaff' } }] }]
    })
  }
}

function initHistoryCharts() {
  const c1 = initChart(formatChartRef.value, 'formatChart')
  if (c1) {
    const pdfCount = exportHistory.filter(h => h.format === 'PDF').length
    const excelCount = exportHistory.filter(h => h.format === 'Excel').length
    const wordCount = exportHistory.filter(h => h.format === 'Word').length
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'item' },
      legend: { bottom: 5, textStyle: { color: '#b0d0ff' } },
      series: [{ type: 'pie', radius: ['35%', '60%'], center: ['50%', '43%'], label: { color: '#b0d0ff', formatter: '{b}\n{d}%' }, data: [
        { name: 'PDF', value: pdfCount, itemStyle: { color: '#f24e4e' } },
        { name: 'Excel', value: excelCount, itemStyle: { color: '#00ff88' } },
        { name: 'Word', value: wordCount, itemStyle: { color: '#00eaff' } }
      ] }]
    })
  }

  const c2 = initChart(trendChartRef.value, 'trendChart')
  if (c2) {
    const months = ['2026-01', '2026-02', '2026-03']
    c2.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis' },
      grid: { left: 50, right: 15, top: 15, bottom: 25 },
      xAxis: { type: 'category', data: months, axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series: [{ type: 'bar', barWidth: '40%', data: [5, 8, 12], itemStyle: { color: '#00eaff', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: '#b0d0ff' } }]
    })
  }
}

function initAnalysisCharts() {
  // 得分趋势
  const c1 = initChart(scoreTrendRef.value, 'scoreTrend')
  if (c1) {
    const sNames = ['龙潭', '青山', '翠峰', '通江', '望江']
    const colors = ['#00eaff', '#00ff88', '#f24e4e', '#ffa500', '#a78bfa']
    const series = sNames.map((s, i) => {
      const sr = results.filter(r => r.slope.includes(s)).sort((a, b) => a.time.localeCompare(b.time))
      return { name: s + '边坡', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i] }, data: sr.map(r => [r.time, r.score]) }
    })
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis' },
      legend: { top: 0, textStyle: { color: '#b0d0ff', fontSize: 10 } },
      grid: { left: 50, right: 15, top: 35, bottom: 25 },
      xAxis: { type: 'time', axisLabel: { color: '#b0d0ff', fontSize: 10 }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', name: '得分', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series
    })
  }

  // 安全系数趋势
  const c2 = initChart(safetyTrendRef.value, 'safetyTrend')
  if (c2) {
    const sNames = ['龙潭', '青山', '翠峰', '通江', '望江']
    const colors = ['#00eaff', '#00ff88', '#f24e4e', '#ffa500', '#a78bfa']
    const series = sNames.map((s, i) => {
      const sr = results.filter(r => r.slope.includes(s)).sort((a, b) => a.time.localeCompare(b.time))
      return { name: s + '边坡', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i] }, data: sr.map(r => [r.time, r.safetyFactor]) }
    })
    c2.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis' },
      legend: { top: 0, textStyle: { color: '#b0d0ff', fontSize: 10 } },
      grid: { left: 50, right: 15, top: 35, bottom: 25 },
      xAxis: { type: 'time', axisLabel: { color: '#b0d0ff', fontSize: 10 }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', name: '安全系数', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series,
      visualMap: { show: false, pieces: [{ gt: 0, lte: 1.0, color: '#f24e4e' }, { gt: 1.0, color: '#00ff88' }] }
    })
  }

  // 稳定等级分布
  const c3 = initChart(levelDistRef.value, 'levelDist')
  if (c3) {
    const levels = ['稳定', '较稳定', '基本稳定', '欠稳定', '不稳定']
    const counts = levels.map(l => results.filter(r => r.level === l).length)
    const lColors = ['#00ff88', '#8ab4f8', '#ffa500', '#f24e4e', '#ff4444']
    c3.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis' },
      grid: { left: 80, right: 15, top: 10, bottom: 15 },
      xAxis: { type: 'value', axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      yAxis: { type: 'category', data: levels, axisLabel: { color: '#b0d0ff' } },
      series: [{ type: 'bar', data: counts.map((v, i) => ({ value: v, itemStyle: { color: lColors[i], borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: '#b0d0ff' } }]
    })
  }

  // 散点图
  const c4 = initChart(scatterRef.value, 'scatter')
  if (c4) {
    const lColors = { '稳定': '#00ff88', '较稳定': '#8ab4f8', '基本稳定': '#ffa500', '欠稳定': '#f24e4e', '不稳定': '#ff4444' }
    const seriesMap = {}
    results.forEach(r => {
      if (!seriesMap[r.level]) seriesMap[r.level] = []
      seriesMap[r.level].push([r.score, r.safetyFactor])
    })
    const series = Object.keys(seriesMap).map(level => ({
      name: level, type: 'scatter', data: seriesMap[level], symbolSize: 10, itemStyle: { color: lColors[level] || '#00eaff' }
    }))
    c4.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'item', formatter: p => `${p.seriesName}<br>得分: ${p.value[0]}<br>安全系数: ${p.value[1]}` },
      legend: { top: 0, textStyle: { color: '#b0d0ff', fontSize: 10 } },
      grid: { left: 55, right: 15, top: 35, bottom: 30 },
      xAxis: { name: '综合得分', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.15)' } } },
      yAxis: { name: '安全系数', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series,
      markLine: { data: [{ yAxis: 1.0, label: { formatter: 'Fs=1.0', color: '#f24e4e' }, lineStyle: { color: '#f24e4e', type: 'dashed' } }] }
    })
  }
}

// ========== 生命周期 ==========
watch(activeTab, (val) => {
  nextTick(() => {
    if (val === 'preview') initPreviewCharts()
    if (val === 'history') initHistoryCharts()
    if (val === 'analysis') initAnalysisCharts()
  })
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
})
function handleResize() { Object.values(charts).forEach(c => c?.resize()) }
</script>

<style scoped>
/* Tab 栏 */
.tab-bar { display: flex; gap: 2px; background: rgba(27,91,158,0.1); border-radius: 8px; padding: 3px; margin-bottom: 15px; }
.tab-item { flex: 1; text-align: center; padding: 8px 12px; font-size: 13px; color: #6a8bb5; cursor: pointer; border-radius: 6px; transition: all 0.3s; white-space: nowrap; }
.tab-item:hover { color: var(--text-main); background: rgba(0,234,255,0.05); }
.tab-item.active { color: var(--text-highlight); background: rgba(0,234,255,0.12); font-weight: 600; box-shadow: 0 0 10px rgba(0,234,255,0.15); }
.tab-item i { margin-right: 4px; }

/* 操作栏 */
.action-bar { display: flex; align-items: center; gap: 10px; padding: 10px 15px; margin-bottom: 10px; background: rgba(27,91,158,0.06); border: 1px solid rgba(27,91,158,0.15); border-radius: 8px; }

/* 导出进度 */
.export-progress { display: flex; align-items: center; gap: 12px; padding: 12px 15px; }
.ep-info { display: flex; align-items: center; gap: 6px; color: var(--text-highlight); font-size: 13px; min-width: 200px; }
.ep-bar { flex: 1; height: 6px; background: rgba(27,91,158,0.2); border-radius: 3px; overflow: hidden; }
.ep-fill { height: 100%; background: var(--text-highlight); border-radius: 3px; transition: width 0.3s; }
.ep-pct { font-size: 13px; color: var(--text-highlight); font-weight: 600; min-width: 40px; text-align: right; }
@keyframes spin { to { transform: rotate(360deg); } }
.ri-spin { animation: spin 1s linear infinite; }

/* 分页 */
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-top: 1px solid rgba(27,91,158,0.15); }
.page-info { font-size: 12px; color: #6a8bb5; }
.page-btns { display: flex; gap: 4px; }
.page-btns .form-btn { padding: 4px 10px; font-size: 12px; min-width: 32px; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-box { background: var(--bg-dark, #0a1929); border: 1px solid rgba(27,91,158,0.4); border-radius: 12px; padding: 20px; min-width: 500px; max-width: 700px; max-height: 85vh; overflow-y: auto; box-shadow: 0 0 40px rgba(0,234,255,0.1); }
.modal-title { font-size: 16px; color: var(--text-highlight); font-weight: 600; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid rgba(27,91,158,0.2); }
.modal-title i { margin-right: 6px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(27,91,158,0.15); }

/* 表单网格 */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group .form-label { font-size: 12px; color: #6a8bb5; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-group label { font-size: 12px; color: var(--text-main); display: flex; align-items: center; gap: 4px; }

/* 选中行 */
.row-selected { background: rgba(0,234,255,0.05); }

/* 报告预览 */
.rp-chapters { padding: 10px; }
.rp-chapter { border: 1px solid rgba(27,91,158,0.15); border-radius: 8px; margin-bottom: 6px; overflow: hidden; }
.rp-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; transition: background 0.2s; }
.rp-header:hover { background: rgba(0,234,255,0.05); }
.rp-header i:first-child { color: var(--text-highlight); }
.rp-header span { color: var(--text-main); font-size: 13px; font-weight: 600; }
.rp-body { padding: 6px 12px 10px 32px; border-top: 1px solid rgba(27,91,158,0.1); }
.rp-section { font-size: 12px; color: #8ab4f8; padding: 3px 0; display: flex; align-items: center; gap: 6px; }
.rp-section i { color: var(--accent-green); font-size: 11px; }
.rp-chapter.active { border-color: rgba(0,234,255,0.25); }

/* 报告信息 */
.report-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px; }
.ri-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(27,91,158,0.06); border-radius: 5px; }
.ri-label { font-size: 11px; color: #6a8bb5; }
.ri-value { font-size: 12px; color: var(--text-main); font-weight: 600; }

/* 导出设置 */
.export-settings { padding: 0 15px; }
.es-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(27,91,158,0.08); }
.es-row .form-label { min-width: 80px; font-size: 12px; }
.radio-group { display: flex; gap: 12px; }
.radio-group label { font-size: 12px; color: var(--text-main); display: flex; align-items: center; gap: 4px; }

/* 模板卡片 */
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.template-card { background: rgba(7,14,26,0.5); border: 1px solid rgba(27,91,158,0.2); border-radius: 10px; padding: 15px; transition: all 0.3s; }
.template-card:hover { border-color: rgba(0,234,255,0.3); box-shadow: 0 0 15px rgba(0,234,255,0.08); }
.template-card.default { border-color: rgba(0,234,255,0.4); background: rgba(0,234,255,0.03); }
.tc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.tc-icon { font-size: 24px; color: var(--text-highlight); }
.tc-name { font-size: 14px; color: var(--text-main); font-weight: 600; }
.default-badge { font-size: 10px; color: var(--text-highlight); border: 1px solid rgba(0,234,255,0.4); padding: 1px 6px; border-radius: 10px; margin-left: 6px; }
.tc-type { font-size: 11px; color: #6a8bb5; }
.tc-desc { font-size: 12px; color: #8ab4f8; margin-bottom: 8px; line-height: 1.4; }
.tc-meta { display: flex; gap: 15px; font-size: 11px; color: #6a8bb5; margin-bottom: 8px; }
.tc-meta i { margin-right: 3px; }
.tc-chapters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.tc-ch { font-size: 10px; padding: 2px 8px; background: rgba(0,234,255,0.08); color: #8ab4f8; border-radius: 10px; border: 1px solid rgba(27,91,158,0.2); }
.tc-actions { display: flex; gap: 6px; }

/* 格式标签 */
.format-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.fmt-pdf { color: #f24e4e; background: rgba(242,78,78,0.12); }
.fmt-excel { color: #00ff88; background: rgba(0,255,136,0.1); }
.fmt-word { color: #00eaff; background: rgba(0,234,255,0.1); }

/* 预览弹窗内容 */
.preview-content { padding: 0 5px; }
.preview-section { margin-bottom: 15px; }
.preview-section h4 { color: var(--text-highlight); font-size: 14px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(27,91,158,0.2); }
.preview-section h4 i { margin-right: 6px; }
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.pv-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(27,91,158,0.06); border-radius: 5px; }
.pv-k { font-size: 12px; color: #6a8bb5; }
.pv-v { font-size: 12px; color: var(--text-main); font-weight: 600; }
.suggestion-list { padding: 5px 0; }
.sug-item { font-size: 12px; color: var(--text-main); padding: 4px 0; display: flex; align-items: center; gap: 6px; }
.sug-item i { color: var(--text-highlight); }
</style>
