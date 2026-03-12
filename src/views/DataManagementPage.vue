<template>
  <div class="page-container data-mgmt-page">
    <div class="page-title"><i class="ri-database-2-line" style="color:var(--text-highlight);"></i> 基础数据管理</div>

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

    <!-- ========== Tab 1: 边坡信息管理 ========== -->
    <div v-if="activeTab === 'slopes'">
      <div class="filter-bar">
        <span class="form-label">名称搜索</span>
        <input type="text" class="form-input" v-model="slopeSearch" placeholder="请输入边坡名称" style="width:150px;">
        <span class="form-label">岩性类型</span>
        <select class="form-select" v-model="slopeRockFilter" style="width:140px;">
          <option value="">全部</option>
          <option v-for="r in rockTypes" :key="r" :value="r">{{ r }}</option>
        </select>
        <span class="form-label">状态</span>
        <select class="form-select" v-model="slopeStatusFilter" style="width:110px;">
          <option value="">全部</option>
          <option>已分析</option>
          <option>分析中</option>
          <option>待分析</option>
        </select>
        <button class="form-btn form-btn-primary" @click="filterSlopes"><i class="ri-search-line"></i> 查询</button>
        <button class="form-btn" @click="resetSlopeFilter"><i class="ri-refresh-line"></i> 重置</button>
        <button class="form-btn" style="margin-left:auto;" @click="showSlopeModal = true; editingSlopeIdx = -1; resetSlopeForm()">
          <i class="ri-add-line"></i> 新增边坡
        </button>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-table-line"></i> 边坡基础信息列表</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredSlopes.length }} 条记录</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:60px;">编号</th>
              <th>边坡名称</th>
              <th>岩性类型</th>
              <th>坡高(m)</th>
              <th>坡角(°)</th>
              <th>内聚力(kPa)</th>
              <th>内摩擦角(°)</th>
              <th>容重(kN/m³)</th>
              <th>位置</th>
              <th>状态</th>
              <th style="width:180px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in paginatedSlopes" :key="s.id">
              <td>{{ s.id }}</td>
              <td style="font-weight:600; color:var(--text-highlight);">{{ s.name }}</td>
              <td>{{ s.rockType }}</td>
              <td>{{ s.height }}</td>
              <td>{{ s.angle }}</td>
              <td>{{ s.cohesion }}</td>
              <td>{{ s.friction }}</td>
              <td>{{ s.unitWeight }}</td>
              <td>{{ s.location }}</td>
              <td>
                <span class="status-tag" :class="s.status === '已分析' ? 'success' : s.status === '分析中' ? 'warning' : 'info'">{{ s.status }}</span>
              </td>
              <td>
                <button class="table-btn" @click="viewSlope(idx)"><i class="ri-eye-line"></i> 查看</button>
                <button class="table-btn" @click="editSlope(idx)"><i class="ri-edit-line"></i> 编辑</button>
                <button class="table-btn table-btn-danger" @click="deleteSlope(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination-bar">
          <span class="page-info">第 {{ slopePage }} / {{ slopeTotalPages }} 页，共 {{ filteredSlopes.length }} 条</span>
          <div class="page-btns">
            <button class="form-btn" :disabled="slopePage <= 1" @click="slopePage--"><i class="ri-arrow-left-s-line"></i></button>
            <button class="form-btn" v-for="p in slopePageNumbers" :key="p" :class="{ 'form-btn-primary': p === slopePage }" @click="slopePage = p">{{ p }}</button>
            <button class="form-btn" :disabled="slopePage >= slopeTotalPages" @click="slopePage++"><i class="ri-arrow-right-s-line"></i></button>
          </div>
        </div>
      </div>

      <!-- 边坡详情弹窗 -->
      <div class="modal-overlay" v-if="showSlopeDetail" @click.self="showSlopeDetail = false">
        <div class="modal-box" style="max-width:700px;">
          <div class="modal-title"><i class="ri-information-line"></i> 边坡详情 — {{ detailSlope.name }}</div>
          <div class="detail-grid">
            <div class="detail-item" v-for="d in slopeDetailFields" :key="d.label">
              <span class="detail-label">{{ d.label }}</span>
              <span class="detail-value">{{ d.value }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn form-btn-primary" @click="showSlopeDetail = false">关 闭</button>
          </div>
        </div>
      </div>

      <!-- 新增/编辑弹窗 -->
      <div class="modal-overlay" v-if="showSlopeModal" @click.self="showSlopeModal = false">
        <div class="modal-box">
          <div class="modal-title"><i class="ri-edit-2-line"></i> {{ editingSlopeIdx >= 0 ? '编辑边坡' : '新增边坡' }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">边坡名称</label>
              <input class="form-input" v-model="slopeForm.name" placeholder="请输入">
            </div>
            <div class="form-group">
              <label class="form-label">岩性类型</label>
              <select class="form-select" v-model="slopeForm.rockType">
                <option v-for="r in rockTypes" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">坡高 (m)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.height">
            </div>
            <div class="form-group">
              <label class="form-label">坡角 (°)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.angle">
            </div>
            <div class="form-group">
              <label class="form-label">内聚力 (kPa)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.cohesion">
            </div>
            <div class="form-group">
              <label class="form-label">内摩擦角 (°)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.friction">
            </div>
            <div class="form-group">
              <label class="form-label">容重 (kN/m³)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.unitWeight">
            </div>
            <div class="form-group">
              <label class="form-label">水位 (m)</label>
              <input type="number" class="form-input" v-model.number="slopeForm.waterLevel">
            </div>
            <div class="form-group">
              <label class="form-label">位置</label>
              <input class="form-input" v-model="slopeForm.location" placeholder="省份/城市">
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select class="form-select" v-model="slopeForm.status">
                <option>待分析</option>
                <option>分析中</option>
                <option>已分析</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn" @click="showSlopeModal = false">取 消</button>
            <button class="form-btn form-btn-primary" @click="saveSlopeForm">保 存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 2: 工况管理 ========== -->
    <div v-if="activeTab === 'conditions'">
      <div class="filter-bar">
        <span class="form-label">所属边坡</span>
        <select class="form-select" v-model="condSlopeFilter" style="width:140px;">
          <option value="">全部</option>
          <option v-for="s in slopes" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
        <span class="form-label">地震波类型</span>
        <select class="form-select" v-model="condWaveFilter" style="width:130px;">
          <option value="">全部</option>
          <option v-for="w in waveTypes" :key="w" :value="w">{{ w }}</option>
        </select>
        <button class="form-btn form-btn-primary" @click="filterConditions"><i class="ri-search-line"></i> 查询</button>
        <button class="form-btn" @click="condSlopeFilter=''; condWaveFilter=''"><i class="ri-refresh-line"></i> 重置</button>
        <button class="form-btn" style="margin-left:auto;" @click="showCondModal = true; editingCondIdx = -1; resetCondForm()">
          <i class="ri-add-line"></i> 新增工况
        </button>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-settings-3-line"></i> 工况信息列表</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredConditions.length }} 条记录</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>工况编号</th>
              <th>所属边坡</th>
              <th>地震波类型</th>
              <th>加速度峰值(g)</th>
              <th>持续时间(s)</th>
              <th>描述</th>
              <th>创建时间</th>
              <th style="width:150px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in filteredConditions" :key="c.id">
              <td>{{ c.id }}</td>
              <td style="color:var(--text-highlight);">{{ c.slope }}</td>
              <td>{{ c.wave }}</td>
              <td>{{ c.pga }}</td>
              <td>{{ c.duration }}</td>
              <td>{{ c.desc }}</td>
              <td>{{ c.created }}</td>
              <td>
                <button class="table-btn" @click="editCond(idx)"><i class="ri-edit-line"></i> 编辑</button>
                <button class="table-btn table-btn-danger" @click="deleteCond(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 工况弹窗 -->
      <div class="modal-overlay" v-if="showCondModal" @click.self="showCondModal = false">
        <div class="modal-box">
          <div class="modal-title"><i class="ri-settings-3-line"></i> {{ editingCondIdx >= 0 ? '编辑工况' : '新增工况' }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">所属边坡</label>
              <select class="form-select" v-model="condForm.slope">
                <option v-for="s in slopes" :key="s.id" :value="s.name">{{ s.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">地震波类型</label>
              <select class="form-select" v-model="condForm.wave">
                <option v-for="w in waveTypes" :key="w" :value="w">{{ w }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">加速度峰值 (g)</label>
              <input type="number" class="form-input" v-model.number="condForm.pga" step="0.05">
            </div>
            <div class="form-group">
              <label class="form-label">持续时间 (s)</label>
              <input type="number" class="form-input" v-model.number="condForm.duration">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">工况描述</label>
              <input class="form-input" v-model="condForm.desc" placeholder="简要描述">
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn" @click="showCondModal = false">取 消</button>
            <button class="form-btn form-btn-primary" @click="saveCondForm">保 存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 3: 数据导入 ========== -->
    <div v-if="activeTab === 'import'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-upload-cloud-line"></i> 数据导入</div>
          <div class="import-area">
            <div class="drop-zone" :class="{ dragover: isDragging }" @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleDrop">
              <i class="ri-upload-cloud-2-line" style="font-size:48px; color:var(--text-highlight); opacity:0.5;"></i>
              <div class="drop-text">将文件拖放到此处，或点击选择文件</div>
              <div class="drop-hint">支持 CSV / Excel / JSON 格式，最大 50MB</div>
              <input type="file" ref="fileInput" @change="handleFileSelect" accept=".csv,.xlsx,.xls,.json" multiple style="display:none;">
              <button class="form-btn form-btn-primary" @click="$refs.fileInput.click()" style="margin-top:12px;">
                <i class="ri-folder-open-line"></i> 选择文件
              </button>
            </div>

            <div v-if="uploadFiles.length > 0" class="upload-list">
              <div class="upload-item" v-for="(f, idx) in uploadFiles" :key="idx">
                <div class="upload-info">
                  <i class="ri-file-line" style="color:var(--text-highlight);"></i>
                  <span class="upload-name">{{ f.name }}</span>
                  <span class="upload-size">{{ formatSize(f.size) }}</span>
                </div>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: f.progress + '%', background: f.progress === 100 ? 'var(--accent-green)' : 'var(--text-highlight)' }"></div>
                </div>
                <div class="upload-status">
                  <span v-if="f.progress < 100" style="color:#8ab4f8;">{{ f.progress }}%</span>
                  <span v-else style="color:var(--accent-green);"><i class="ri-check-line"></i> 完成</span>
                  <button class="table-btn table-btn-danger" @click="removeUpload(idx)" style="margin-left:8px;"><i class="ri-close-line"></i></button>
                </div>
              </div>
            </div>

            <div class="import-actions" v-if="uploadFiles.length > 0">
              <select class="form-select" v-model="importTarget" style="width:160px;">
                <option value="">选择目标边坡</option>
                <option v-for="s in slopes" :key="s.id" :value="s.name">{{ s.name }}</option>
              </select>
              <select class="form-select" v-model="importDataType" style="width:140px;">
                <option value="monitor">监测数据</option>
                <option value="seismic">地震波数据</option>
                <option value="material">材料参数</option>
                <option value="profile">剖面数据</option>
              </select>
              <button class="form-btn form-btn-primary" @click="startImport" :disabled="!importTarget || importing">
                <i class="ri-upload-2-line"></i> {{ importing ? '导入中...' : '开始导入' }}
              </button>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-check-double-line"></i> 数据验证结果</div>
          <div v-if="validationResults.length === 0" class="empty-state">
            <i class="ri-file-search-line"></i>
            <p>暂无验证结果，请先导入数据</p>
          </div>
          <div v-else class="validation-list">
            <div class="validation-item" v-for="(v, idx) in validationResults" :key="idx" :class="'vr-' + v.level">
              <i :class="v.level === 'error' ? 'ri-close-circle-fill' : v.level === 'warning' ? 'ri-alert-fill' : 'ri-check-line'"></i>
              <div class="validation-msg">
                <div>{{ v.message }}</div>
                <div class="validation-meta">{{ v.field }} · 行 {{ v.row }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 导入历史 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title">
          <span><i class="ri-history-line"></i> 导入历史记录</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ importHistory.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>导入时间</th>
              <th>文件名</th>
              <th>数据类型</th>
              <th>目标边坡</th>
              <th>记录数</th>
              <th>文件大小</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, idx) in importHistory" :key="idx">
              <td>{{ h.time }}</td>
              <td style="color:var(--text-highlight);">{{ h.fileName }}</td>
              <td>{{ h.dataType }}</td>
              <td>{{ h.slope }}</td>
              <td>{{ h.records }}</td>
              <td>{{ h.size }}</td>
              <td>
                <span class="status-tag" :class="h.status === '成功' ? 'success' : h.status === '导入中' ? 'warning' : 'danger'">{{ h.status }}</span>
              </td>
              <td>
                <button class="table-btn" @click="reImport(idx)"><i class="ri-refresh-line"></i> 重新导入</button>
                <button class="table-btn table-btn-danger" @click="deleteImportHistory(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========== Tab 4: 材料参数库 ========== -->
    <div v-if="activeTab === 'materials'">
      <div class="filter-bar">
        <span class="form-label">岩性类型</span>
        <select class="form-select" v-model="materialFilter" style="width:160px;">
          <option value="">全部</option>
          <option v-for="m in materialCategories" :key="m" :value="m">{{ m }}</option>
        </select>
        <button class="form-btn form-btn-primary"><i class="ri-search-line"></i> 筛选</button>
        <button class="form-btn" @click="materialFilter = ''"><i class="ri-refresh-line"></i> 重置</button>
        <button class="form-btn" style="margin-left:auto;" @click="showMaterialModal = true; editingMaterialIdx = -1; resetMaterialForm()">
          <i class="ri-add-line"></i> 新增材料
        </button>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-flask-line"></i> 岩石材料参数库</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredMaterials.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>岩性名称</th>
              <th>类别</th>
              <th>密度(kg/m³)</th>
              <th>弹性模量(GPa)</th>
              <th>泊松比</th>
              <th>内聚力(kPa)</th>
              <th>内摩擦角(°)</th>
              <th>抗压强度(MPa)</th>
              <th>抗拉强度(MPa)</th>
              <th style="width:130px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in filteredMaterials" :key="m.id">
              <td>{{ m.id }}</td>
              <td style="color:var(--text-highlight); font-weight:600;">{{ m.name }}</td>
              <td>{{ m.category }}</td>
              <td>{{ m.density }}</td>
              <td>{{ m.elasticModulus }}</td>
              <td>{{ m.poisson }}</td>
              <td>{{ m.cohesion }}</td>
              <td>{{ m.friction }}</td>
              <td>{{ m.compressiveStrength }}</td>
              <td>{{ m.tensileStrength }}</td>
              <td>
                <button class="table-btn" @click="editMaterial(idx)"><i class="ri-edit-line"></i></button>
                <button class="table-btn table-btn-danger" @click="deleteMaterial(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 材料参数弹窗 -->
      <div class="modal-overlay" v-if="showMaterialModal" @click.self="showMaterialModal = false">
        <div class="modal-box" style="max-width:600px;">
          <div class="modal-title"><i class="ri-flask-line"></i> {{ editingMaterialIdx >= 0 ? '编辑材料' : '新增材料' }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">岩性名称</label>
              <input class="form-input" v-model="materialForm.name">
            </div>
            <div class="form-group">
              <label class="form-label">类别</label>
              <select class="form-select" v-model="materialForm.category">
                <option v-for="c in materialCategories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">密度 (kg/m³)</label>
              <input type="number" class="form-input" v-model.number="materialForm.density">
            </div>
            <div class="form-group">
              <label class="form-label">弹性模量 (GPa)</label>
              <input type="number" class="form-input" v-model.number="materialForm.elasticModulus" step="0.1">
            </div>
            <div class="form-group">
              <label class="form-label">泊松比</label>
              <input type="number" class="form-input" v-model.number="materialForm.poisson" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">内聚力 (kPa)</label>
              <input type="number" class="form-input" v-model.number="materialForm.cohesion">
            </div>
            <div class="form-group">
              <label class="form-label">内摩擦角 (°)</label>
              <input type="number" class="form-input" v-model.number="materialForm.friction">
            </div>
            <div class="form-group">
              <label class="form-label">抗压强度 (MPa)</label>
              <input type="number" class="form-input" v-model.number="materialForm.compressiveStrength">
            </div>
            <div class="form-group">
              <label class="form-label">抗拉强度 (MPa)</label>
              <input type="number" class="form-input" v-model.number="materialForm.tensileStrength">
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn" @click="showMaterialModal = false">取 消</button>
            <button class="form-btn form-btn-primary" @click="saveMaterialForm">保 存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 5: 数据统计 ========== -->
    <div v-if="activeTab === 'statistics'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-bar-chart-box-line"></i> 各边坡数据量统计</div>
          <div ref="dataCountChartRef" class="chart-container" style="min-height:300px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-pie-chart-line"></i> 数据类型分布</div>
          <div ref="dataTypeChartRef" class="chart-container" style="min-height:300px;"></div>
        </div>
      </div>
      <div class="content-grid" style="margin-top:15px;">
        <div class="panel">
          <div class="panel-title"><i class="ri-line-chart-line"></i> 数据导入趋势</div>
          <div ref="importTrendChartRef" class="chart-container" style="min-height:260px;"></div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="ri-pie-chart-2-line"></i> 分析状态分布</div>
          <div ref="statusChartRef" class="chart-container" style="min-height:260px;"></div>
        </div>
      </div>

      <!-- 数据完整性表 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-checkbox-multiple-line"></i> 数据完整性检查</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>边坡名称</th>
              <th>基础参数</th>
              <th>地震波数据</th>
              <th>监测数据</th>
              <th>材料参数</th>
              <th>分析结果</th>
              <th>完整度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in dataCompleteness" :key="d.slope">
              <td style="font-weight:600; color:var(--text-highlight);">{{ d.slope }}</td>
              <td v-for="f in ['basic','seismic','monitor','material','result']" :key="f">
                <i :class="d[f] ? 'ri-check-line' : 'ri-close-line'" :style="{ color: d[f] ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '16px' }"></i>
              </td>
              <td>
                <div class="completeness-bar">
                  <div class="completeness-fill" :style="{ width: d.percent + '%', background: d.percent >= 80 ? 'var(--accent-green)' : d.percent >= 50 ? '#ffa500' : 'var(--accent-red)' }"></div>
                  <span class="completeness-text">{{ d.percent }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========== Tab 6: 数据备份 ========== -->
    <div v-if="activeTab === 'backup'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-hard-drive-2-line"></i> 数据备份</div>
          <div class="backup-info">
            <div class="backup-stat">
              <div class="bs-label">数据库大小</div>
              <div class="bs-value" style="color:var(--text-highlight);">{{ dbSize }}</div>
            </div>
            <div class="backup-stat">
              <div class="bs-label">上次备份</div>
              <div class="bs-value">{{ lastBackup }}</div>
            </div>
            <div class="backup-stat">
              <div class="bs-label">备份文件数</div>
              <div class="bs-value" style="color:var(--accent-green);">{{ backupRecords.length }}</div>
            </div>
            <div class="backup-stat">
              <div class="bs-label">自动备份</div>
              <div class="bs-value">
                <span class="status-tag" :class="autoBackup ? 'success' : 'info'">{{ autoBackup ? '已开启' : '已关闭' }}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px; padding:0 15px 15px;">
            <button class="form-btn form-btn-primary" @click="createBackup"><i class="ri-save-line"></i> 立即备份</button>
            <button class="form-btn" @click="autoBackup = !autoBackup"><i class="ri-timer-line"></i> {{ autoBackup ? '关闭自动备份' : '开启自动备份' }}</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-arrow-go-back-line"></i> 数据恢复</div>
          <div class="restore-info">
            <div class="alert-box warning" style="margin:15px;">
              <i class="ri-error-warning-line"></i> 恢复操作将覆盖当前数据库中的全部数据，请谨慎操作。建议先创建当前数据的备份。
            </div>
            <div style="padding:0 15px 15px;">
              <span class="form-label">选择备份文件</span>
              <select class="form-select" v-model="restoreTarget" style="width:280px; margin:0 10px;">
                <option value="">请选择...</option>
                <option v-for="b in backupRecords" :key="b.id" :value="b.id">{{ b.time }} ({{ b.size }})</option>
              </select>
              <button class="form-btn" style="border-color:var(--accent-red); color:var(--accent-red);" :disabled="!restoreTarget" @click="restoreBackup">
                <i class="ri-arrow-go-back-line"></i> 执行恢复
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 备份记录列表 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title">
          <span><i class="ri-history-line"></i> 备份历史记录</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ backupRecords.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>备份时间</th>
              <th>备份类型</th>
              <th>文件大小</th>
              <th>包含记录</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in backupRecords" :key="b.id">
              <td>{{ b.time }}</td>
              <td><span class="status-tag" :class="b.type === '自动' ? 'info' : 'success'">{{ b.type }}</span></td>
              <td>{{ b.size }}</td>
              <td>{{ b.records }}</td>
              <td>{{ b.note }}</td>
              <td>
                <button class="table-btn" @click="downloadBackup(idx)"><i class="ri-download-line"></i> 下载</button>
                <button class="table-btn table-btn-danger" @click="deleteBackup(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'

// ========== Tab 管理 ==========
const tabs = [
  { key: 'slopes', label: '边坡管理', icon: 'ri-landscape-line' },
  { key: 'conditions', label: '工况管理', icon: 'ri-settings-3-line' },
  { key: 'import', label: '数据导入', icon: 'ri-upload-cloud-line' },
  { key: 'materials', label: '材料参数库', icon: 'ri-flask-line' },
  { key: 'statistics', label: '数据统计', icon: 'ri-bar-chart-box-line' },
  { key: 'backup', label: '数据备份', icon: 'ri-hard-drive-2-line' }
]
const activeTab = ref('slopes')

// ========== 统计卡片 ==========
const statsCards = reactive([
  { label: '边坡总数', value: 12, icon: 'ri-landscape-line', color: '#00eaff' },
  { label: '工况总数', value: 36, icon: 'ri-list-settings-line', color: '#00ff88' },
  { label: '数据记录数', value: '5,248', icon: 'ri-database-2-line', color: '#a78bfa' },
  { label: '已完成分析', value: 28, icon: 'ri-check-double-line', color: '#ffa500' }
])

// ========== 边坡管理 ==========
const rockTypes = ['砂岩-泥岩互层', '花岗岩-页岩', '灰岩-砂岩', '片麻岩-大理岩', '砂岩-泥岩', '灰岩-页岩互层', '花岗岩-片麻岩', '石英砂岩']
const slopeSearch = ref('')
const slopeRockFilter = ref('')
const slopeStatusFilter = ref('')
const slopePage = ref(1)
const slopePageSize = 6
const showSlopeModal = ref(false)
const showSlopeDetail = ref(false)
const editingSlopeIdx = ref(-1)
const detailSlope = ref({})

const slopes = reactive([
  { id: 'BT-001', name: '龙潭边坡', rockType: '砂岩-泥岩互层', height: 45, angle: 55, cohesion: 35, friction: 32, unitWeight: 24.5, waterLevel: 8, location: '贵州遵义', status: '已分析' },
  { id: 'BT-002', name: '青山边坡', rockType: '花岗岩-页岩', height: 38, angle: 48, cohesion: 42, friction: 35, unitWeight: 26.0, waterLevel: 5, location: '四川绵阳', status: '已分析' },
  { id: 'BT-003', name: '翠峰边坡', rockType: '灰岩-砂岩', height: 52, angle: 62, cohesion: 28, friction: 28, unitWeight: 25.5, waterLevel: 12, location: '云南昆明', status: '分析中' },
  { id: 'BT-004', name: '金沙江边坡', rockType: '片麻岩-大理岩', height: 68, angle: 58, cohesion: 22, friction: 30, unitWeight: 27.0, waterLevel: 15, location: '四川攀枝花', status: '待分析' },
  { id: 'BT-005', name: '通江边坡', rockType: '砂岩-泥岩', height: 33, angle: 45, cohesion: 48, friction: 38, unitWeight: 23.5, waterLevel: 3, location: '重庆万州', status: '已分析' },
  { id: 'BT-006', name: '望江边坡', rockType: '灰岩-页岩互层', height: 41, angle: 50, cohesion: 38, friction: 34, unitWeight: 25.0, waterLevel: 6, location: '湖南湘西', status: '已分析' },
  { id: 'BT-007', name: '云台边坡', rockType: '花岗岩-片麻岩', height: 56, angle: 60, cohesion: 30, friction: 29, unitWeight: 26.5, waterLevel: 10, location: '贵州毕节', status: '已分析' },
  { id: 'BT-008', name: '丹霞边坡', rockType: '砂岩-泥岩互层', height: 29, angle: 42, cohesion: 55, friction: 40, unitWeight: 22.8, waterLevel: 2, location: '广东韶关', status: '已分析' },
  { id: 'BT-009', name: '岷江边坡', rockType: '灰岩-砂岩', height: 74, angle: 65, cohesion: 18, friction: 25, unitWeight: 27.5, waterLevel: 18, location: '四川阿坝', status: '分析中' },
  { id: 'BT-010', name: '嘉陵边坡', rockType: '石英砂岩', height: 36, angle: 47, cohesion: 45, friction: 36, unitWeight: 24.0, waterLevel: 4, location: '四川南充', status: '待分析' },
  { id: 'BT-011', name: '乌江边坡', rockType: '灰岩-页岩互层', height: 48, angle: 53, cohesion: 32, friction: 31, unitWeight: 25.2, waterLevel: 9, location: '贵州铜仁', status: '已分析' },
  { id: 'BT-012', name: '赤水边坡', rockType: '砂岩-泥岩', height: 31, angle: 44, cohesion: 50, friction: 37, unitWeight: 23.0, waterLevel: 3, location: '贵州遵义', status: '待分析' }
])

const slopeForm = reactive({ name: '', rockType: '砂岩-泥岩互层', height: 40, angle: 50, cohesion: 30, friction: 30, unitWeight: 25, waterLevel: 5, location: '', status: '待分析' })

const filteredSlopes = computed(() => {
  return slopes.filter(s => {
    if (slopeSearch.value && !s.name.includes(slopeSearch.value)) return false
    if (slopeRockFilter.value && s.rockType !== slopeRockFilter.value) return false
    if (slopeStatusFilter.value && s.status !== slopeStatusFilter.value) return false
    return true
  })
})

const slopeTotalPages = computed(() => Math.max(1, Math.ceil(filteredSlopes.value.length / slopePageSize)))
const slopePageNumbers = computed(() => {
  const pages = []
  for (let i = 1; i <= slopeTotalPages.value; i++) pages.push(i)
  return pages
})
const paginatedSlopes = computed(() => {
  const start = (slopePage.value - 1) * slopePageSize
  return filteredSlopes.value.slice(start, start + slopePageSize)
})

const slopeDetailFields = computed(() => {
  const s = detailSlope.value
  if (!s.name) return []
  return [
    { label: '编号', value: s.id }, { label: '名称', value: s.name },
    { label: '岩性类型', value: s.rockType }, { label: '坡高', value: s.height + ' m' },
    { label: '坡角', value: s.angle + '°' }, { label: '内聚力', value: s.cohesion + ' kPa' },
    { label: '内摩擦角', value: s.friction + '°' }, { label: '容重', value: s.unitWeight + ' kN/m³' },
    { label: '水位', value: s.waterLevel + ' m' }, { label: '位置', value: s.location },
    { label: '状态', value: s.status }
  ]
})

function filterSlopes() { slopePage.value = 1 }
function resetSlopeFilter() { slopeSearch.value = ''; slopeRockFilter.value = ''; slopeStatusFilter.value = ''; slopePage.value = 1 }
function resetSlopeForm() { Object.assign(slopeForm, { name: '', rockType: '砂岩-泥岩互层', height: 40, angle: 50, cohesion: 30, friction: 30, unitWeight: 25, waterLevel: 5, location: '', status: '待分析' }) }
function viewSlope(idx) { detailSlope.value = { ...paginatedSlopes.value[idx] }; showSlopeDetail.value = true }
function editSlope(idx) {
  const realIdx = slopes.indexOf(paginatedSlopes.value[idx])
  editingSlopeIdx.value = realIdx
  Object.assign(slopeForm, slopes[realIdx])
  showSlopeModal.value = true
}
function saveSlopeForm() {
  if (!slopeForm.name) return
  if (editingSlopeIdx.value >= 0) {
    Object.assign(slopes[editingSlopeIdx.value], { ...slopeForm })
  } else {
    const nextNum = slopes.length + 1
    slopes.push({ ...slopeForm, id: 'BT-' + String(nextNum).padStart(3, '0') })
    statsCards[0].value = slopes.length
  }
  showSlopeModal.value = false
}
function deleteSlope(idx) {
  const realIdx = slopes.indexOf(paginatedSlopes.value[idx])
  if (realIdx >= 0) { slopes.splice(realIdx, 1); statsCards[0].value = slopes.length }
}

// ========== 工况管理 ==========
const waveTypes = ['汶川波', 'EL Centro波', '人工波', 'Kobe波', '唐山波', '兰州波']
const condSlopeFilter = ref('')
const condWaveFilter = ref('')
const showCondModal = ref(false)
const editingCondIdx = ref(-1)

const conditions = reactive([
  { id: 'GK-001', slope: '龙潭边坡', wave: '汶川波', pga: 0.20, duration: 20, desc: '设计烈度7度', created: '2026-01-15' },
  { id: 'GK-002', slope: '龙潭边坡', wave: 'EL Centro波', pga: 0.15, duration: 15, desc: '对比分析', created: '2026-01-18' },
  { id: 'GK-003', slope: '青山边坡', wave: '汶川波', pga: 0.20, duration: 20, desc: '设计烈度7度', created: '2026-01-20' },
  { id: 'GK-004', slope: '青山边坡', wave: '人工波', pga: 0.30, duration: 25, desc: '极端工况', created: '2026-01-22' },
  { id: 'GK-005', slope: '翠峰边坡', wave: 'Kobe波', pga: 0.25, duration: 18, desc: '罕遇地震', created: '2026-02-01' },
  { id: 'GK-006', slope: '金沙江边坡', wave: '汶川波', pga: 0.20, duration: 20, desc: '设计烈度7度', created: '2026-02-05' },
  { id: 'GK-007', slope: '通江边坡', wave: '汶川波', pga: 0.20, duration: 20, desc: '标准工况', created: '2026-02-10' },
  { id: 'GK-008', slope: '望江边坡', wave: 'EL Centro波', pga: 0.15, duration: 15, desc: '对比分析', created: '2026-02-12' },
  { id: 'GK-009', slope: '龙潭边坡', wave: '人工波', pga: 0.40, duration: 30, desc: '极端工况验证', created: '2026-02-18' },
  { id: 'GK-010', slope: '翠峰边坡', wave: '汶川波', pga: 0.30, duration: 20, desc: '高烈度工况', created: '2026-02-25' }
])

const condForm = reactive({ slope: '', wave: '汶川波', pga: 0.20, duration: 20, desc: '' })

const filteredConditions = computed(() => {
  return conditions.filter(c => {
    if (condSlopeFilter.value && c.slope !== condSlopeFilter.value) return false
    if (condWaveFilter.value && c.wave !== condWaveFilter.value) return false
    return true
  })
})

function filterConditions() {}
function resetCondForm() { Object.assign(condForm, { slope: slopes[0]?.name || '', wave: '汶川波', pga: 0.20, duration: 20, desc: '' }) }
function editCond(idx) {
  const c = filteredConditions.value[idx]
  const realIdx = conditions.indexOf(c)
  editingCondIdx.value = realIdx
  Object.assign(condForm, c)
  showCondModal.value = true
}
function saveCondForm() {
  if (!condForm.slope) return
  if (editingCondIdx.value >= 0) {
    Object.assign(conditions[editingCondIdx.value], { ...condForm })
  } else {
    const nextNum = conditions.length + 1
    conditions.push({ ...condForm, id: 'GK-' + String(nextNum).padStart(3, '0'), created: new Date().toISOString().slice(0, 10) })
    statsCards[1].value = conditions.length
  }
  showCondModal.value = false
}
function deleteCond(idx) {
  const c = filteredConditions.value[idx]
  const realIdx = conditions.indexOf(c)
  if (realIdx >= 0) { conditions.splice(realIdx, 1); statsCards[1].value = conditions.length }
}

// ========== 数据导入 ==========
const isDragging = ref(false)
const uploadFiles = reactive([])
const importTarget = ref('')
const importDataType = ref('monitor')
const importing = ref(false)
const fileInput = ref(null)

const validationResults = reactive([])
const importHistory = reactive([
  { time: '2026-03-10 14:20', fileName: '龙潭_汶川波_监测.csv', dataType: '监测数据', slope: '龙潭边坡', records: '1,024', size: '2.3 MB', status: '成功' },
  { time: '2026-03-08 09:15', fileName: '青山_ELCentro_数据.xlsx', dataType: '监测数据', slope: '青山边坡', records: '896', size: '1.8 MB', status: '成功' },
  { time: '2026-03-05 16:30', fileName: '翠峰_人工波.csv', dataType: '地震波数据', slope: '翠峰边坡', records: '768', size: '1.2 MB', status: '成功' },
  { time: '2026-03-01 11:45', fileName: '金沙江_基础参数.json', dataType: '材料参数', slope: '金沙江边坡', records: '512', size: '0.5 MB', status: '成功' },
  { time: '2026-02-25 08:30', fileName: '通江_汶川波_加速度.csv', dataType: '监测数据', slope: '通江边坡', records: '640', size: '1.1 MB', status: '成功' }
])

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}
function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  addFiles(files)
}
function addFiles(files) {
  files.forEach(f => {
    uploadFiles.push({ name: f.name, size: f.size, progress: 0 })
    simulateUpload(uploadFiles.length - 1)
  })
  // 模拟验证
  validationResults.length = 0
  validationResults.push(
    { level: 'pass', message: '数据格式检查通过', field: '全局', row: '-' },
    { level: 'pass', message: '时间序列连续性检查通过', field: '时间戳', row: '-' },
    { level: 'warning', message: '发现3条数据超出合理范围', field: '加速度', row: '128, 256, 384' },
    { level: 'pass', message: '数据完整性检查通过', field: '全局', row: '-' }
  )
}
function simulateUpload(idx) {
  const timer = setInterval(() => {
    if (uploadFiles[idx]) {
      uploadFiles[idx].progress = Math.min(100, uploadFiles[idx].progress + Math.floor(Math.random() * 15 + 5))
      if (uploadFiles[idx].progress >= 100) clearInterval(timer)
    } else { clearInterval(timer) }
  }, 200)
}
function removeUpload(idx) { uploadFiles.splice(idx, 1) }
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
function startImport() {
  importing.value = true
  setTimeout(() => {
    importing.value = false
    importHistory.unshift({
      time: new Date().toISOString().replace('T', ' ').slice(0, 16),
      fileName: uploadFiles[0]?.name || 'data.csv',
      dataType: importDataType.value === 'monitor' ? '监测数据' : importDataType.value === 'seismic' ? '地震波数据' : importDataType.value === 'material' ? '材料参数' : '剖面数据',
      slope: importTarget.value,
      records: String(Math.floor(Math.random() * 500 + 200)),
      size: (Math.random() * 3 + 0.5).toFixed(1) + ' MB',
      status: '成功'
    })
    uploadFiles.length = 0
  }, 2000)
}
function reImport(idx) { /* placeholder */ }
function deleteImportHistory(idx) { importHistory.splice(idx, 1) }

// ========== 材料参数库 ==========
const materialFilter = ref('')
const materialCategories = ['沉积岩', '变质岩', '岩浆岩', '特殊岩']
const showMaterialModal = ref(false)
const editingMaterialIdx = ref(-1)

const materials = reactive([
  { id: 'M-001', name: '中粒砂岩', category: '沉积岩', density: 2450, elasticModulus: 15.2, poisson: 0.25, cohesion: 35, friction: 32, compressiveStrength: 68, tensileStrength: 5.2 },
  { id: 'M-002', name: '泥岩', category: '沉积岩', density: 2200, elasticModulus: 8.5, poisson: 0.30, cohesion: 22, friction: 25, compressiveStrength: 32, tensileStrength: 2.8 },
  { id: 'M-003', name: '花岗岩', category: '岩浆岩', density: 2650, elasticModulus: 45.0, poisson: 0.20, cohesion: 48, friction: 42, compressiveStrength: 150, tensileStrength: 12.0 },
  { id: 'M-004', name: '页岩', category: '沉积岩', density: 2350, elasticModulus: 12.0, poisson: 0.28, cohesion: 18, friction: 22, compressiveStrength: 42, tensileStrength: 3.5 },
  { id: 'M-005', name: '灰岩', category: '沉积岩', density: 2700, elasticModulus: 35.0, poisson: 0.22, cohesion: 40, friction: 38, compressiveStrength: 110, tensileStrength: 8.5 },
  { id: 'M-006', name: '片麻岩', category: '变质岩', density: 2600, elasticModulus: 28.0, poisson: 0.23, cohesion: 32, friction: 35, compressiveStrength: 90, tensileStrength: 7.0 },
  { id: 'M-007', name: '大理岩', category: '变质岩', density: 2750, elasticModulus: 50.0, poisson: 0.18, cohesion: 45, friction: 40, compressiveStrength: 130, tensileStrength: 10.5 },
  { id: 'M-008', name: '石英砂岩', category: '沉积岩', density: 2550, elasticModulus: 22.0, poisson: 0.24, cohesion: 38, friction: 35, compressiveStrength: 85, tensileStrength: 6.5 },
  { id: 'M-009', name: '千枚岩', category: '变质岩', density: 2400, elasticModulus: 10.5, poisson: 0.29, cohesion: 15, friction: 20, compressiveStrength: 28, tensileStrength: 2.2 },
  { id: 'M-010', name: '凝灰岩', category: '岩浆岩', density: 2300, elasticModulus: 9.0, poisson: 0.27, cohesion: 25, friction: 28, compressiveStrength: 45, tensileStrength: 3.8 }
])

const materialForm = reactive({ name: '', category: '沉积岩', density: 2500, elasticModulus: 20, poisson: 0.25, cohesion: 30, friction: 30, compressiveStrength: 60, tensileStrength: 5 })

const filteredMaterials = computed(() => {
  if (!materialFilter.value) return materials
  return materials.filter(m => m.category === materialFilter.value)
})

function resetMaterialForm() { Object.assign(materialForm, { name: '', category: '沉积岩', density: 2500, elasticModulus: 20, poisson: 0.25, cohesion: 30, friction: 30, compressiveStrength: 60, tensileStrength: 5 }) }
function editMaterial(idx) {
  const m = filteredMaterials.value[idx]
  editingMaterialIdx.value = materials.indexOf(m)
  Object.assign(materialForm, m)
  showMaterialModal.value = true
}
function saveMaterialForm() {
  if (!materialForm.name) return
  if (editingMaterialIdx.value >= 0) {
    Object.assign(materials[editingMaterialIdx.value], { ...materialForm })
  } else {
    const nextNum = materials.length + 1
    materials.push({ ...materialForm, id: 'M-' + String(nextNum).padStart(3, '0') })
  }
  showMaterialModal.value = false
}
function deleteMaterial(idx) {
  const m = filteredMaterials.value[idx]
  const realIdx = materials.indexOf(m)
  if (realIdx >= 0) materials.splice(realIdx, 1)
}

// ========== 数据统计图表 ==========
const dataCountChartRef = ref(null)
const dataTypeChartRef = ref(null)
const importTrendChartRef = ref(null)
const statusChartRef = ref(null)
const charts = {}

function initChart(el, key) {
  if (!el) return null
  if (charts[key]) charts[key].dispose()
  charts[key] = echarts.init(el)
  return charts[key]
}

function initStatisticsCharts() {
  // 各边坡数据量
  const c1 = charts.dataCount
  if (c1) {
    const names = slopes.map(s => s.name.replace('边坡', ''))
    const data = slopes.map(() => Math.floor(Math.random() * 800 + 200))
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 55, right: 15, top: 15, bottom: 50 },
      xAxis: { type: 'category', data: names, axisLabel: { color: '#b0d0ff', rotate: 25, fontSize: 10 }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', name: '记录数', nameTextStyle: { color: '#b0d0ff' }, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series: [{ type: 'bar', barWidth: '55%', data: data.map(v => ({ value: v, itemStyle: { color: '#00eaff', borderRadius: [4, 4, 0, 0] } })), label: { show: true, position: 'top', color: '#b0d0ff', fontSize: 10 } }]
    })
  }
  // 数据类型分布
  const c2 = charts.dataType
  if (c2) {
    c2.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'item' },
      legend: { bottom: 5, textStyle: { color: '#b0d0ff' } },
      series: [{
        type: 'pie', radius: ['35%', '60%'], center: ['50%', '43%'],
        label: { color: '#b0d0ff', formatter: '{b}\n{d}%' },
        data: [
          { name: '监测数据', value: 3200, itemStyle: { color: '#00eaff' } },
          { name: '地震波数据', value: 1200, itemStyle: { color: '#f24e4e' } },
          { name: '材料参数', value: 500, itemStyle: { color: '#00ff88' } },
          { name: '分析结果', value: 348, itemStyle: { color: '#ffa500' } }
        ]
      }]
    })
  }
  // 导入趋势
  const c3 = charts.importTrend
  if (c3) {
    const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
    c3.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'axis' },
      grid: { left: 50, right: 15, top: 15, bottom: 25 },
      xAxis: { type: 'category', data: months, axisLabel: { color: '#b0d0ff' }, axisLine: { lineStyle: { color: '#1b5b9e' } } },
      yAxis: { type: 'value', axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
      series: [{ type: 'line', data: [120, 280, 450, 680, 920, 1100], smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#00eaff', width: 2 }, itemStyle: { color: '#00eaff' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,234,255,0.2)' }, { offset: 1, color: 'rgba(0,234,255,0)' }]) } }]
    })
  }
  // 分析状态
  const c4 = charts.statusChart
  if (c4) {
    const analyzed = slopes.filter(s => s.status === '已分析').length
    const analyzing = slopes.filter(s => s.status === '分析中').length
    const pending = slopes.filter(s => s.status === '待分析').length
    c4.setOption({
      backgroundColor: 'transparent',
      tooltip: { ...techTooltip, trigger: 'item' },
      series: [{
        type: 'pie', radius: ['40%', '65%'], center: ['50%', '50%'],
        label: { color: '#b0d0ff', formatter: '{b}: {c}个' },
        data: [
          { name: '已分析', value: analyzed, itemStyle: { color: '#00ff88' } },
          { name: '分析中', value: analyzing, itemStyle: { color: '#ffa500' } },
          { name: '待分析', value: pending, itemStyle: { color: '#8ab4f8' } }
        ]
      }]
    })
  }
}

// 数据完整性
const dataCompleteness = reactive([
  { slope: '龙潭边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '青山边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '翠峰边坡', basic: true, seismic: true, monitor: true, material: false, result: false, percent: 60 },
  { slope: '金沙江边坡', basic: true, seismic: true, monitor: false, material: false, result: false, percent: 40 },
  { slope: '通江边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '望江边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '云台边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '丹霞边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '岷江边坡', basic: true, seismic: true, monitor: true, material: false, result: false, percent: 60 },
  { slope: '嘉陵边坡', basic: true, seismic: false, monitor: false, material: false, result: false, percent: 20 },
  { slope: '乌江边坡', basic: true, seismic: true, monitor: true, material: true, result: true, percent: 100 },
  { slope: '赤水边坡', basic: true, seismic: false, monitor: false, material: true, result: false, percent: 40 }
])

// ========== 数据备份 ==========
const dbSize = ref('128.5 MB')
const lastBackup = ref('2026-03-10 02:00')
const autoBackup = ref(true)
const restoreTarget = ref('')

const backupRecords = reactive([
  { id: 1, time: '2026-03-10 02:00', type: '自动', size: '125.2 MB', records: '5,248', note: '每日自动备份' },
  { id: 2, time: '2026-03-09 02:00', type: '自动', size: '124.8 MB', records: '5,180', note: '每日自动备份' },
  { id: 3, time: '2026-03-08 14:30', type: '手动', size: '124.5 MB', records: '5,120', note: '导出前备份' },
  { id: 4, time: '2026-03-05 02:00', type: '自动', size: '118.3 MB', records: '4,800', note: '每日自动备份' },
  { id: 5, time: '2026-03-01 10:00', type: '手动', size: '110.6 MB', records: '4,200', note: '升级前完整备份' }
])

function createBackup() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16)
  backupRecords.unshift({
    id: backupRecords.length + 1, time: now, type: '手动', size: dbSize.value,
    records: statsCards[2].value, note: '用户手动备份'
  })
  lastBackup.value = now
}
function downloadBackup(idx) { /* placeholder */ }
function deleteBackup(idx) { backupRecords.splice(idx, 1) }
function restoreBackup() { restoreTarget.value = '' }

// ========== 生命周期 ==========
watch(activeTab, (val) => {
  if (val === 'statistics') {
    nextTick(() => {
      initChart(dataCountChartRef.value, 'dataCount')
      initChart(dataTypeChartRef.value, 'dataType')
      initChart(importTrendChartRef.value, 'importTrend')
      initChart(statusChartRef.value, 'statusChart')
      initStatisticsCharts()
    })
  }
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
})

function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}
</script>

<style scoped>
/* Tab 栏 */
.tab-bar {
  display: flex;
  gap: 2px;
  background: rgba(27, 91, 158, 0.1);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 15px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  font-size: 13px;
  color: #6a8bb5;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;
  white-space: nowrap;
}
.tab-item:hover { color: var(--text-main); background: rgba(0, 234, 255, 0.05); }
.tab-item.active {
  color: var(--text-highlight);
  background: rgba(0, 234, 255, 0.12);
  font-weight: 600;
  box-shadow: 0 0 10px rgba(0, 234, 255, 0.15);
}
.tab-item i { margin-right: 4px; }

/* 分页 */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-top: 1px solid rgba(27, 91, 158, 0.15);
}
.page-info { font-size: 12px; color: #6a8bb5; }
.page-btns { display: flex; gap: 4px; }
.page-btns .form-btn { padding: 4px 10px; font-size: 12px; min-width: 32px; }

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.modal-box {
  background: var(--bg-dark, #0a1929);
  border: 1px solid rgba(27, 91, 158, 0.4);
  border-radius: 12px;
  padding: 20px;
  min-width: 500px;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 234, 255, 0.1);
}
.modal-title {
  font-size: 16px;
  color: var(--text-highlight);
  font-weight: 600;
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(27, 91, 158, 0.2);
}
.modal-title i { margin-right: 6px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(27, 91, 158, 0.15);
}

/* 表单网格 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group .form-label { font-size: 12px; color: #6a8bb5; }

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(27, 91, 158, 0.08);
  border-radius: 6px;
}
.detail-label { font-size: 12px; color: #6a8bb5; }
.detail-value { font-size: 13px; color: var(--text-main); font-weight: 600; }

/* 导入区域 */
.import-area { padding: 15px; }
.drop-zone {
  border: 2px dashed rgba(27, 91, 158, 0.4);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}
.drop-zone.dragover {
  border-color: var(--text-highlight);
  background: rgba(0, 234, 255, 0.05);
}
.drop-text { font-size: 14px; color: var(--text-main); margin-top: 10px; }
.drop-hint { font-size: 11px; color: #6a8bb5; margin-top: 5px; }

.upload-list { margin-top: 15px; }
.upload-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(27, 91, 158, 0.1);
}
.upload-info { display: flex; align-items: center; gap: 6px; min-width: 200px; }
.upload-name { font-size: 12px; color: var(--text-main); }
.upload-size { font-size: 10px; color: #6a8bb5; }
.upload-progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(27, 91, 158, 0.2);
  border-radius: 2px;
  overflow: hidden;
}
.upload-progress-fill { height: 100%; transition: width 0.3s; border-radius: 2px; }
.upload-status { display: flex; align-items: center; font-size: 11px; min-width: 80px; }

.import-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(27, 91, 158, 0.15);
}

/* 验证结果 */
.empty-state {
  text-align: center;
  padding: 30px;
  color: #6a8bb5;
}
.empty-state i { font-size: 36px; opacity: 0.3; display: block; margin-bottom: 8px; }
.validation-list { padding: 10px; }
.validation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 5px;
}
.vr-pass { background: rgba(0, 255, 136, 0.05); }
.vr-pass i { color: var(--accent-green); }
.vr-warning { background: rgba(255, 165, 0, 0.05); }
.vr-warning i { color: #ffa500; }
.vr-error { background: rgba(242, 78, 78, 0.05); }
.vr-error i { color: var(--accent-red); }
.validation-msg { font-size: 12px; color: var(--text-main); }
.validation-meta { font-size: 10px; color: #6a8bb5; margin-top: 2px; }

/* 完整性条 */
.completeness-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.completeness-bar > div:first-child {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  transition: width 0.5s;
}
.completeness-fill {
  height: 100%;
  border-radius: 3px;
}
.completeness-text { font-size: 11px; font-weight: 600; min-width: 35px; }

/* 备份 */
.backup-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  padding: 15px;
}
.backup-stat {
  text-align: center;
  padding: 12px;
  background: rgba(27, 91, 158, 0.08);
  border-radius: 8px;
}
.bs-label { font-size: 11px; color: #6a8bb5; margin-bottom: 5px; }
.bs-value { font-size: 15px; font-weight: 600; color: var(--text-main); }
</style>
