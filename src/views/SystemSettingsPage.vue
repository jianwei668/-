<template>
  <div class="page-container system-settings-page">
    <div class="page-title"><i class="ri-settings-3-line" style="color:var(--text-highlight);"></i> 系统设置</div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-item" v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i :class="tab.icon"></i> {{ tab.label }}
      </div>
    </div>

    <!-- ========== Tab 1: 分析参数 ========== -->
    <div v-if="activeTab === 'analysis'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-tools-line"></i> 基本分析参数</div>
          <div class="setting-group">
            <div class="setting-row" v-for="p in basicParams" :key="p.key">
              <span class="setting-label"><i :class="p.icon"></i> {{ p.label }}</span>
              <div class="setting-control">
                <input type="number" class="form-input" v-model.number="p.value" :step="p.step" style="width:120px;">
                <span class="setting-unit">{{ p.unit }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-settings-4-line"></i> 高级计算参数</div>
          <div class="setting-group">
            <div class="setting-row" v-for="p in advancedParams" :key="p.key">
              <span class="setting-label"><i :class="p.icon"></i> {{ p.label }}</span>
              <div class="setting-control">
                <input type="number" class="form-input" v-model.number="p.value" :step="p.step" style="width:120px;">
                <span class="setting-unit">{{ p.unit }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AHP配置 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-scales-3-line"></i> AHP 权重计算参数</div>
        <div class="content-grid" style="padding:15px;">
          <div>
            <div class="setting-row" v-for="(w, idx) in ahpWeights" :key="idx">
              <span class="setting-label">{{ w.name }}</span>
              <div class="setting-control">
                <input type="number" class="form-input" v-model.number="w.weight" step="0.01" style="width:80px;" min="0" max="1">
                <div class="weight-bar">
                  <div class="weight-fill" :style="{ width: (w.weight * 100) + '%' }"></div>
                </div>
                <span class="setting-unit">{{ (w.weight * 100).toFixed(0) }}%</span>
              </div>
            </div>
            <div class="setting-row" style="border-top: 2px solid rgba(27,91,158,0.3); font-weight:600;">
              <span class="setting-label" style="color:var(--text-highlight);">权重总和</span>
              <span :style="{ color: weightSum === 1 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 'bold' }">
                {{ weightSum.toFixed(3) }} {{ weightSum === 1 ? '✓' : '(需等于1.000)' }}
              </span>
            </div>
          </div>
          <div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-error-warning-line"></i> 一致性比率阈值 (CR)</span>
              <input type="number" class="form-input" v-model.number="crThreshold" step="0.01" style="width:80px;">
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-function-line"></i> 判断矩阵标度范围</span>
              <select class="form-select" v-model="ahpScale" style="width:120px;">
                <option>1-9标度</option>
                <option>1-5标度</option>
                <option>指数标度</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-checkbox-line"></i> 自动归一化</span>
              <label class="toggle">
                <input type="checkbox" v-model="autoNormalize">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 2: 评价阈值 ========== -->
    <div v-if="activeTab === 'thresholds'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-shield-star-line"></i> 稳定性等级阈值</div>
          <div class="setting-group">
            <div class="setting-row" v-for="(t, idx) in stabilityThresholds" :key="idx">
              <span class="setting-label">
                <span class="status-tag" :class="t.class">{{ t.level }}</span>
              </span>
              <div class="threshold-range">
                <span class="threshold-tag" :class="t.class">{{ t.min }}</span>
                <span style="color:#6a8bb5;"> ~ </span>
                <input v-if="idx < stabilityThresholds.length - 1" type="number" class="form-input" v-model.number="t.max" style="width:60px;">
                <span v-else class="threshold-tag" :class="t.class">{{ t.max }}</span>
              </div>
            </div>
          </div>

          <div class="panel-title" style="margin-top:12px;"><i class="ri-bar-chart-box-line"></i> 阈值可视化</div>
          <div ref="thresholdChartRef" class="chart-container" style="min-height:200px;"></div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-alarm-warning-line"></i> 预警参数配置</div>
          <div class="setting-group">
            <div class="setting-row" v-for="a in alertParams" :key="a.key">
              <span class="setting-label"><i :class="a.icon"></i> {{ a.label }}</span>
              <div class="setting-control">
                <input type="number" class="form-input" v-model.number="a.value" :step="a.step" style="width:120px;">
                <span class="setting-unit">{{ a.unit }}</span>
              </div>
            </div>
          </div>

          <div class="panel-title" style="margin-top:12px;"><i class="ri-notification-3-line"></i> 告警通知配置</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label"><i class="ri-mail-send-line"></i> 邮件通知</span>
              <label class="toggle"><input type="checkbox" v-model="emailNotify"><span class="toggle-slider"></span></label>
            </div>
            <div class="setting-row" v-if="emailNotify">
              <span class="setting-label">通知邮箱</span>
              <input class="form-input" v-model="notifyEmail" placeholder="admin@example.com" style="width:200px;">
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-smartphone-line"></i> 短信通知</span>
              <label class="toggle"><input type="checkbox" v-model="smsNotify"><span class="toggle-slider"></span></label>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-volume-up-line"></i> 声音告警</span>
              <label class="toggle"><input type="checkbox" v-model="soundAlert"><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>
      </div>

      <!-- 安全系数配置 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-shield-check-line"></i> 安全系数标准配置</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>工况类型</th>
              <th>最低安全系数</th>
              <th>建议安全系数</th>
              <th>规范依据</th>
              <th>适用场景</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sf, idx) in safetyFactorStandards" :key="idx">
              <td style="font-weight:600; color:var(--text-highlight);">{{ sf.type }}</td>
              <td><input type="number" class="form-input" v-model.number="sf.min" step="0.05" style="width:70px;"></td>
              <td><input type="number" class="form-input" v-model.number="sf.recommended" step="0.05" style="width:70px;"></td>
              <td>{{ sf.standard }}</td>
              <td style="font-size:11px; color:#8ab4f8;">{{ sf.scene }}</td>
              <td><button class="table-btn" @click="resetSfRow(idx)"><i class="ri-refresh-line"></i> 恢复</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========== Tab 3: 显示与界面 ========== -->
    <div v-if="activeTab === 'display'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-palette-line"></i> 外观设置</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label"><i class="ri-brush-line"></i> 主题模式</span>
              <select class="form-select" v-model="displaySettings.theme" style="width:150px;">
                <option v-for="t in themeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-text"></i> 字体大小</span>
              <select class="form-select" v-model="displaySettings.fontSize" style="width:120px;">
                <option>小</option>
                <option>标准</option>
                <option>大</option>
                <option>超大</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-translate"></i> 界面语言</span>
              <select class="form-select" v-model="displaySettings.language" style="width:120px;">
                <option>中文</option>
                <option>English</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-sidebar-fold-line"></i> 侧栏位置</span>
              <select class="form-select" v-model="displaySettings.sidebarPos" style="width:120px;">
                <option>左侧</option>
                <option>右侧</option>
                <option>隐藏</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-bar-chart-2-line"></i> 图表设置</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label"><i class="ri-play-line"></i> 图表动画</span>
              <label class="toggle"><input type="checkbox" v-model="chartSettings.animation"><span class="toggle-slider"></span></label>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-speed-line"></i> 动画时长 (ms)</span>
              <input type="number" class="form-input" v-model.number="chartSettings.animDuration" step="100" style="width:100px;">
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-image-line"></i> 图表分辨率</span>
              <select class="form-select" v-model="chartSettings.dpi" style="width:120px;">
                <option :value="1">标准 (1x)</option>
                <option :value="2">高清 (2x)</option>
                <option :value="3">超清 (3x)</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-cursor-line"></i> 工具提示</span>
              <label class="toggle"><input type="checkbox" v-model="chartSettings.tooltip"><span class="toggle-slider"></span></label>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-download-line"></i> 默认导出格式</span>
              <select class="form-select" v-model="chartSettings.exportFormat" style="width:120px;">
                <option>PNG</option>
                <option>SVG</option>
                <option>JPEG</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据显示 -->
      <div class="content-grid" style="margin-top:15px;">
        <div class="panel">
          <div class="panel-title"><i class="ri-table-2"></i> 数据表格设置</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label"><i class="ri-list-ordered"></i> 每页显示记录数</span>
              <select class="form-select" v-model.number="tableSettings.pageSize" style="width:100px;">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-hashtag"></i> 小数位数</span>
              <select class="form-select" v-model.number="tableSettings.decimals" style="width:100px;">
                <option :value="1">1位</option>
                <option :value="2">2位</option>
                <option :value="3">3位</option>
                <option :value="4">4位</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-sort-asc"></i> 默认排序方式</span>
              <select class="form-select" v-model="tableSettings.sortOrder" style="width:120px;">
                <option>按时间降序</option>
                <option>按时间升序</option>
                <option>按得分降序</option>
                <option>按名称</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-eye-line"></i> 显示行号</span>
              <label class="toggle"><input type="checkbox" v-model="tableSettings.showRowNo"><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-refresh-line"></i> 自动刷新设置</div>
          <div class="setting-group">
            <div class="setting-row">
              <span class="setting-label"><i class="ri-timer-2-line"></i> 自动刷新</span>
              <label class="toggle"><input type="checkbox" v-model="refreshSettings.enabled"><span class="toggle-slider"></span></label>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-time-line"></i> 刷新间隔 (秒)</span>
              <input type="number" class="form-input" v-model.number="refreshSettings.interval" step="5" min="5" max="300" style="width:100px;">
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-notification-line"></i> 刷新时通知</span>
              <label class="toggle"><input type="checkbox" v-model="refreshSettings.notify"><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 4: 用户与权限 ========== -->
    <div v-if="activeTab === 'users'">
      <div class="filter-bar">
        <span class="form-label">角色筛选</span>
        <select class="form-select" v-model="userRoleFilter" style="width:120px;">
          <option value="">全部</option>
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
        <button class="form-btn" style="margin-left:auto;" @click="showUserModal = true; editingUserIdx = -1; resetUserForm()">
          <i class="ri-user-add-line"></i> 新增用户
        </button>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span><i class="ri-team-line"></i> 用户管理</span>
          <span style="font-size:12px; color:#8ab4f8;">共 {{ filteredUsers.length }} 位用户</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>邮箱</th>
              <th>最后登录</th>
              <th>状态</th>
              <th style="width:150px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in filteredUsers" :key="u.username">
              <td style="color:var(--text-highlight); font-weight:600;">{{ u.username }}</td>
              <td>{{ u.name }}</td>
              <td><span class="role-badge" :class="'role-' + u.role">{{ u.role }}</span></td>
              <td>{{ u.email }}</td>
              <td>{{ u.lastLogin }}</td>
              <td><span class="status-tag" :class="u.active ? 'success' : 'info'">{{ u.active ? '启用' : '停用' }}</span></td>
              <td>
                <button class="table-btn" @click="editUser(idx)"><i class="ri-edit-line"></i> 编辑</button>
                <button class="table-btn" @click="toggleUserActive(idx)">{{ u.active ? '停用' : '启用' }}</button>
                <button class="table-btn table-btn-danger" v-if="u.role !== '管理员'" @click="deleteUser(idx)"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 权限矩阵 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-shield-keyhole-line"></i> 权限矩阵</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>功能模块</th>
              <th v-for="r in roles" :key="r">{{ r }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in permissionMatrix" :key="perm.module">
              <td style="font-weight:600;">{{ perm.module }}</td>
              <td v-for="r in roles" :key="r">
                <i
                  :class="perm.perms[r] ? 'ri-check-line' : 'ri-close-line'"
                  :style="{ color: perm.perms[r] ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '16px', cursor: 'pointer' }"
                  @click="perm.perms[r] = !perm.perms[r]"
                ></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 用户弹窗 -->
      <div class="modal-overlay" v-if="showUserModal" @click.self="showUserModal = false">
        <div class="modal-box" style="max-width:500px;">
          <div class="modal-title"><i class="ri-user-settings-line"></i> {{ editingUserIdx >= 0 ? '编辑用户' : '新增用户' }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input class="form-input" v-model="userForm.username" :disabled="editingUserIdx >= 0">
            </div>
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input class="form-input" v-model="userForm.name">
            </div>
            <div class="form-group">
              <label class="form-label">角色</label>
              <select class="form-select" v-model="userForm.role">
                <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input class="form-input" v-model="userForm.email" type="email">
            </div>
          </div>
          <div class="modal-footer">
            <button class="form-btn" @click="showUserModal = false">取 消</button>
            <button class="form-btn form-btn-primary" @click="saveUserForm">保 存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 5: 系统信息 ========== -->
    <div v-if="activeTab === 'sysinfo'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-information-line"></i> 系统基本信息</div>
          <div class="setting-group">
            <div class="setting-row" v-for="info in sysInfoBasic" :key="info.label">
              <span class="setting-label">{{ info.label }}</span>
              <span class="setting-value" :style="{ color: info.color || '#8ab4f8' }">{{ info.value }}</span>
            </div>
          </div>
          <div class="alert-box info" style="margin:10px 15px;">
            <i class="ri-copyright-line"></i> 本系统由黑龙江科技大学团队开发，用于复杂岩性边坡动力响应分析与稳定性综合评价。
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-cpu-line"></i> 运行状态</div>
          <div class="setting-group">
            <div class="setting-row" v-for="s in runtimeStatus" :key="s.label">
              <span class="setting-label"><i :class="s.icon"></i> {{ s.label }}</span>
              <div class="status-bar-wrapper">
                <div class="status-bar-track">
                  <div class="status-bar-fill" :style="{ width: s.percent + '%', background: s.percent > 80 ? 'var(--accent-red)' : s.percent > 60 ? '#ffa500' : 'var(--accent-green)' }"></div>
                </div>
                <span class="status-bar-text">{{ s.percent }}%</span>
              </div>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-time-line"></i> 系统运行时间</span>
              <span class="setting-value" style="color:var(--text-highlight);">{{ uptime }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label"><i class="ri-links-line"></i> 数据库连接</span>
              <span class="status-tag success">正常</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作日志 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title">
          <span><i class="ri-file-list-3-line"></i> 操作日志</span>
          <span style="font-size:12px; color:#8ab4f8;">最近 {{ operationLogs.length }} 条</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>操作类型</th>
              <th>描述</th>
              <th>IP地址</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, idx) in operationLogs" :key="idx">
              <td>{{ log.time }}</td>
              <td style="color:var(--text-highlight);">{{ log.user }}</td>
              <td><span class="log-type-badge" :class="'lt-' + log.type">{{ log.typeLabel }}</span></td>
              <td>{{ log.desc }}</td>
              <td style="font-family:monospace;">{{ log.ip }}</td>
              <td><span class="status-tag" :class="log.result === '成功' ? 'success' : 'danger'">{{ log.result }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 第三方组件版本 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-stack-line"></i> 技术组件版本</div>
        <div class="component-grid">
          <div class="comp-card" v-for="c in componentVersions" :key="c.name">
            <i :class="c.icon" class="comp-icon" :style="{ color: c.color }"></i>
            <div class="comp-name">{{ c.name }}</div>
            <div class="comp-version">{{ c.version }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 6: 配置管理 ========== -->
    <div v-if="activeTab === 'config'">
      <div class="content-grid">
        <div class="panel">
          <div class="panel-title"><i class="ri-download-line"></i> 导出配置</div>
          <div style="padding:15px;">
            <p style="font-size:13px; color:#8ab4f8; margin-bottom:12px;">将当前系统所有设置导出为 JSON 配置文件，方便备份和迁移。</p>
            <div class="config-options">
              <label><input type="checkbox" v-model="exportConfig.analysis"> 分析参数</label>
              <label><input type="checkbox" v-model="exportConfig.thresholds"> 评价阈值</label>
              <label><input type="checkbox" v-model="exportConfig.display"> 显示设置</label>
              <label><input type="checkbox" v-model="exportConfig.users"> 用户权限</label>
            </div>
            <button class="form-btn form-btn-primary" style="margin-top:12px;" @click="handleExportConfig">
              <i class="ri-download-line"></i> 导出配置文件
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title"><i class="ri-upload-line"></i> 导入配置</div>
          <div style="padding:15px;">
            <p style="font-size:13px; color:#8ab4f8; margin-bottom:12px;">从 JSON 配置文件恢复系统设置。导入后当前设置将被覆盖。</p>
            <div class="alert-box warning" style="margin-bottom:12px;">
              <i class="ri-error-warning-line"></i> 导入操作将覆盖当前配置，建议先导出当前配置作为备份。
            </div>
            <input type="file" ref="configFileInput" accept=".json" @change="handleImportConfig" style="display:none;">
            <button class="form-btn" @click="$refs.configFileInput?.click()">
              <i class="ri-upload-line"></i> 选择配置文件
            </button>
          </div>
        </div>
      </div>

      <!-- 配置历史 -->
      <div class="panel" style="margin-top:15px;">
        <div class="panel-title"><i class="ri-history-line"></i> 配置变更记录</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>变更时间</th>
              <th>操作</th>
              <th>变更内容</th>
              <th>操作人</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ch, idx) in configHistory" :key="idx">
              <td>{{ ch.time }}</td>
              <td><span class="log-type-badge" :class="'lt-' + ch.type">{{ ch.action }}</span></td>
              <td>{{ ch.desc }}</td>
              <td style="color:var(--text-highlight);">{{ ch.user }}</td>
              <td><span class="status-tag success">{{ ch.result }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 操作按钮栏 -->
    <div class="action-footer">
      <button class="form-btn form-btn-primary" style="padding:10px 30px;" @click="saveSettings"><i class="ri-save-line"></i> 保存设置</button>
      <button class="form-btn" style="padding:10px 30px;" @click="restoreDefaults"><i class="ri-refresh-line"></i> 恢复默认</button>
      <span class="save-hint" v-if="saveMsg">{{ saveMsg }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { techTooltip } from '../utils/chartConfig'

// ========== Tabs ==========
const tabs = [
  { key: 'analysis', label: '分析参数', icon: 'ri-tools-line' },
  { key: 'thresholds', label: '评价阈值', icon: 'ri-shield-star-line' },
  { key: 'display', label: '显示与界面', icon: 'ri-palette-line' },
  { key: 'users', label: '用户与权限', icon: 'ri-team-line' },
  { key: 'sysinfo', label: '系统信息', icon: 'ri-information-line' },
  { key: 'config', label: '配置管理', icon: 'ri-settings-4-line' }
]
const activeTab = ref('analysis')
const saveMsg = ref('')

// ========== 分析参数 ==========
const basicParams = reactive([
  { key: 'dt', label: '时间步长', icon: 'ri-time-line', value: 0.01, step: 0.001, unit: 's' },
  { key: 'grid', label: '网格精度', icon: 'ri-ruler-line', value: 0.5, step: 0.1, unit: 'm' },
  { key: 'damping', label: '阻尼比', icon: 'ri-drag-move-line', value: 0.05, step: 0.01, unit: '' },
  { key: 'iterations', label: '迭代次数上限', icon: 'ri-function-line', value: 1000, step: 100, unit: '' },
  { key: 'convergence', label: '收敛精度', icon: 'ri-error-warning-line', value: 0.001, step: 0.0001, unit: '' },
  { key: 'layers', label: '岩层分层数', icon: 'ri-stack-line', value: 5, step: 1, unit: '' }
])

const advancedParams = reactive([
  { key: 'newmarkBeta', label: 'Newmark-β参数', icon: 'ri-settings-4-line', value: 0.25, step: 0.05, unit: '' },
  { key: 'newmarkGamma', label: 'Newmark-γ参数', icon: 'ri-settings-4-line', value: 0.50, step: 0.05, unit: '' },
  { key: 'freqRange', label: '频率分析范围', icon: 'ri-radio-2-line', value: 25, step: 1, unit: 'Hz' },
  { key: 'fftPoints', label: 'FFT采样点数', icon: 'ri-bar-chart-box-line', value: 4096, step: 1024, unit: '' },
  { key: 'responseT', label: '反应谱周期上限', icon: 'ri-line-chart-line', value: 6.0, step: 0.5, unit: 's' },
  { key: 'dampingRatio', label: '反应谱阻尼比', icon: 'ri-percent-line', value: 0.05, step: 0.01, unit: '' }
])

// AHP 权重
const ahpWeights = reactive([
  { name: '峰值加速度放大系数', weight: 0.22 },
  { name: '频谱特征变化', weight: 0.18 },
  { name: '持时参数影响', weight: 0.12 },
  { name: '能量耗散比', weight: 0.20 },
  { name: '阻尼比变化率', weight: 0.15 },
  { name: '安全系数折减', weight: 0.13 }
])

const weightSum = computed(() => ahpWeights.reduce((s, w) => s + w.weight, 0))
const crThreshold = ref(0.10)
const ahpScale = ref('1-9标度')
const autoNormalize = ref(true)

// ========== 评价阈值 ==========
const stabilityThresholds = reactive([
  { level: '稳定', class: 'success', min: 0, max: 25 },
  { level: '较稳定', class: 'info', min: 26, max: 45 },
  { level: '基本稳定', class: 'warning', min: 46, max: 65 },
  { level: '欠稳定', class: 'danger', min: 66, max: 80 },
  { level: '不稳定', class: 'danger', min: 81, max: 100 }
])

const alertParams = reactive([
  { key: 'energyAnomaly', label: '能量异常系数阈值', icon: 'ri-alarm-warning-line', value: 0.30, step: 0.05, unit: '' },
  { key: 'dissipationRatio', label: '耗散比预警阈值', icon: 'ri-percent-line', value: 100, step: 5, unit: '%' },
  { key: 'accThreshold', label: '加速度预警阈值', icon: 'ri-speed-line', value: 0.15, step: 0.01, unit: 'g' },
  { key: 'dispThreshold', label: '位移预警阈值', icon: 'ri-drag-move-line', value: 5.0, step: 0.5, unit: 'mm' },
  { key: 'sfThreshold', label: '安全系数预警线', icon: 'ri-shield-check-line', value: 1.05, step: 0.05, unit: '' }
])

const emailNotify = ref(true)
const notifyEmail = ref('admin@hust-slope.edu.cn')
const smsNotify = ref(false)
const soundAlert = ref(true)

const safetyFactorStandards = reactive([
  { type: '静力工况', min: 1.30, recommended: 1.50, standard: 'GB 50330-2013', scene: '常规静力稳定性分析' },
  { type: '地震工况(设防)', min: 1.05, recommended: 1.15, standard: 'GB 50011-2010', scene: '设防地震动力分析' },
  { type: '地震工况(罕遇)', min: 0.95, recommended: 1.05, standard: 'GB 50011-2010', scene: '罕遇地震极限分析' },
  { type: '暴雨工况', min: 1.15, recommended: 1.30, standard: 'GB 50330-2013', scene: '降雨入渗 + 水位升高' },
  { type: '联合工况', min: 1.00, recommended: 1.10, standard: '综合规范', scene: '地震 + 降雨多因素耦合' }
])

const sfDefaults = safetyFactorStandards.map(s => ({ ...s }))
function resetSfRow(idx) { Object.assign(safetyFactorStandards[idx], sfDefaults[idx]) }

const thresholdChartRef = ref(null)
const charts = {}

function initChart(el, key) {
  if (!el) return null
  if (charts[key]) charts[key].dispose()
  charts[key] = echarts.init(el)
  return charts[key]
}

function initThresholdChart() {
  const c = initChart(thresholdChartRef.value, 'threshold')
  if (!c) return
  const levels = stabilityThresholds.map(t => t.level)
  const data = stabilityThresholds.map(t => t.max - t.min + 1)
  const colors = ['#00ff88', '#8ab4f8', '#ffa500', '#f24e4e', '#ff4444']
  c.setOption({
    backgroundColor: 'transparent',
    tooltip: { ...techTooltip, trigger: 'axis', formatter: p => { const t = stabilityThresholds[p[0].dataIndex]; return `${t.level}: ${t.min} ~ ${t.max}` } },
    grid: { left: 60, right: 15, top: 10, bottom: 25 },
    xAxis: { type: 'value', max: 100, axisLabel: { color: '#b0d0ff' }, splitLine: { lineStyle: { color: 'rgba(27,91,158,0.2)' } } },
    yAxis: { type: 'category', data: levels, axisLabel: { color: '#b0d0ff' } },
    series: [{ type: 'bar', data: data.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })), barWidth: '55%', label: { show: true, position: 'inside', color: '#fff', fontSize: 11 } }]
  })
}

// ========== 显示与界面 ==========
const themeOptions = ['深蓝科技风', '暗黑模式', '专业模式', '浅色模式']
const displaySettings = reactive({ theme: '深蓝科技风', fontSize: '标准', language: '中文', sidebarPos: '左侧' })
const chartSettings = reactive({ animation: true, animDuration: 800, dpi: 2, tooltip: true, exportFormat: 'PNG' })
const tableSettings = reactive({ pageSize: 20, decimals: 2, sortOrder: '按时间降序', showRowNo: true })
const refreshSettings = reactive({ enabled: true, interval: 30, notify: false })

// ========== 用户与权限 ==========
const roles = ['管理员', '分析员', '操作员', '访客']
const userRoleFilter = ref('')
const showUserModal = ref(false)
const editingUserIdx = ref(-1)

const users = reactive([
  { username: 'admin', name: '系统管理员', role: '管理员', email: 'admin@hust.edu.cn', lastLogin: '2026-03-11 08:30', active: true },
  { username: 'zhang_san', name: '张三', role: '分析员', email: 'zhangsan@hust.edu.cn', lastLogin: '2026-03-10 14:20', active: true },
  { username: 'li_si', name: '李四', role: '分析员', email: 'lisi@hust.edu.cn', lastLogin: '2026-03-09 09:15', active: true },
  { username: 'wang_wu', name: '王五', role: '操作员', email: 'wangwu@hust.edu.cn', lastLogin: '2026-03-08 16:40', active: true },
  { username: 'zhao_liu', name: '赵六', role: '操作员', email: 'zhaoliu@hust.edu.cn', lastLogin: '2026-03-05 11:00', active: false },
  { username: 'visitor01', name: '访客A', role: '访客', email: 'visitor@test.com', lastLogin: '2026-03-03 10:00', active: true }
])

const userForm = reactive({ username: '', name: '', role: '操作员', email: '' })

const filteredUsers = computed(() => {
  if (!userRoleFilter.value) return users
  return users.filter(u => u.role === userRoleFilter.value)
})

function resetUserForm() { Object.assign(userForm, { username: '', name: '', role: '操作员', email: '' }) }
function editUser(idx) {
  const u = filteredUsers.value[idx]
  editingUserIdx.value = users.indexOf(u)
  Object.assign(userForm, { username: u.username, name: u.name, role: u.role, email: u.email })
  showUserModal.value = true
}
function saveUserForm() {
  if (!userForm.username || !userForm.name) return
  if (editingUserIdx.value >= 0) {
    Object.assign(users[editingUserIdx.value], { name: userForm.name, role: userForm.role, email: userForm.email })
  } else {
    users.push({ ...userForm, lastLogin: '-', active: true })
  }
  showUserModal.value = false
}
function deleteUser(idx) {
  const u = filteredUsers.value[idx]
  const realIdx = users.indexOf(u)
  if (realIdx >= 0) users.splice(realIdx, 1)
}
function toggleUserActive(idx) {
  const u = filteredUsers.value[idx]
  const realIdx = users.indexOf(u)
  if (realIdx >= 0) users[realIdx].active = !users[realIdx].active
}

const permissionMatrix = reactive([
  { module: '首页总览', perms: { '管理员': true, '分析员': true, '操作员': true, '访客': true } },
  { module: '基础数据管理', perms: { '管理员': true, '分析员': true, '操作员': true, '访客': false } },
  { module: '动力响应分析', perms: { '管理员': true, '分析员': true, '操作员': false, '访客': false } },
  { module: '能量演化分析', perms: { '管理员': true, '分析员': true, '操作员': false, '访客': false } },
  { module: '稳定性评价', perms: { '管理员': true, '分析员': true, '操作员': false, '访客': false } },
  { module: '实时监测', perms: { '管理员': true, '分析员': true, '操作员': true, '访客': true } },
  { module: '结果导出', perms: { '管理员': true, '分析员': true, '操作员': true, '访客': false } },
  { module: '系统设置', perms: { '管理员': true, '分析员': false, '操作员': false, '访客': false } }
])

// ========== 系统信息 ==========
const sysInfoBasic = reactive([
  { label: '系统名称', value: '复杂岩性边坡动力响应与稳定性评价系统' },
  { label: '版本号', value: 'V 2.0.0', color: 'var(--text-highlight)' },
  { label: '开发团队', value: '黑龙江科技大学' },
  { label: '技术框架', value: 'Vue 3 + ECharts + Vite' },
  { label: '数据库', value: 'SQLite / MySQL' },
  { label: '最后更新', value: '2026-03-11' },
  { label: '许可证', value: '教育科研专用' }
])

const runtimeStatus = reactive([
  { label: 'CPU 使用率', icon: 'ri-cpu-line', percent: 32 },
  { label: '内存使用率', icon: 'ri-ram-line', percent: 58 },
  { label: '磁盘使用率', icon: 'ri-hard-drive-2-line', percent: 45 },
  { label: '数据库负载', icon: 'ri-database-2-line', percent: 22 }
])

const uptime = ref('12天 05时 32分')
let uptimeTimer = null

const operationLogs = reactive([
  { time: '2026-03-11 08:30', user: 'admin', type: 'login', typeLabel: '登录', desc: '系统登录', ip: '192.168.1.100', result: '成功' },
  { time: '2026-03-11 08:35', user: 'admin', type: 'config', typeLabel: '配置', desc: '修改分析参数 - 时间步长', ip: '192.168.1.100', result: '成功' },
  { time: '2026-03-10 14:20', user: 'zhang_san', type: 'analyze', typeLabel: '分析', desc: '执行龙潭边坡动力响应分析', ip: '192.168.1.102', result: '成功' },
  { time: '2026-03-10 15:00', user: 'zhang_san', type: 'export', typeLabel: '导出', desc: '导出龙潭边坡评价报告 PDF', ip: '192.168.1.102', result: '成功' },
  { time: '2026-03-09 09:15', user: 'li_si', type: 'import', typeLabel: '导入', desc: '导入青山边坡监测数据', ip: '192.168.1.105', result: '成功' },
  { time: '2026-03-08 16:40', user: 'wang_wu', type: 'analyze', typeLabel: '分析', desc: '执行翠峰边坡稳定性评价', ip: '192.168.1.108', result: '成功' },
  { time: '2026-03-08 10:00', user: 'admin', type: 'backup', typeLabel: '备份', desc: '执行数据库完整备份', ip: '192.168.1.100', result: '成功' },
  { time: '2026-03-07 11:30', user: 'zhao_liu', type: 'login', typeLabel: '登录', desc: '系统登录尝试', ip: '192.168.1.112', result: '失败' }
])

const componentVersions = reactive([
  { name: 'Vue.js', version: 'v3.5.30', icon: 'ri-vuejs-line', color: '#42b883' },
  { name: 'ECharts', version: 'v6.0.0', icon: 'ri-bar-chart-box-line', color: '#00eaff' },
  { name: 'Vite', version: 'v7.3.1', icon: 'ri-flashlight-line', color: '#a78bfa' },
  { name: 'Vue Router', version: 'v5.0.3', icon: 'ri-route-line', color: '#42b883' },
  { name: 'Remixicon', version: 'v4.6.0', icon: 'ri-remixicon-line', color: '#ffa500' },
  { name: 'Node.js', version: 'v22.x', icon: 'ri-nodejs-line', color: '#00ff88' }
])

// ========== 配置管理 ==========
const exportConfig = reactive({ analysis: true, thresholds: true, display: true, users: false })
const configFileInput = ref(null)

const configHistory = reactive([
  { time: '2026-03-11 08:35', type: 'config', action: '修改配置', desc: '更新时间步长为0.01s', user: 'admin', result: '成功' },
  { time: '2026-03-08 14:00', type: 'import', action: '导入配置', desc: '从config_backup.json恢复', user: 'admin', result: '成功' },
  { time: '2026-03-05 10:20', type: 'export', action: '导出配置', desc: '全量配置备份', user: 'admin', result: '成功' },
  { time: '2026-03-01 09:00', type: 'config', action: '恢复默认', desc: '恢复所有参数为默认值', user: 'admin', result: '成功' }
])

function handleExportConfig() {
  configHistory.unshift({
    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    type: 'export', action: '导出配置', desc: '导出所选配置项', user: 'admin', result: '成功'
  })
  saveMsg.value = '配置已导出'
  setTimeout(() => { saveMsg.value = '' }, 2000)
}

function handleImportConfig() {
  configHistory.unshift({
    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    type: 'import', action: '导入配置', desc: '从文件导入配置', user: 'admin', result: '成功'
  })
  saveMsg.value = '配置已导入'
  setTimeout(() => { saveMsg.value = '' }, 2000)
}

function saveSettings() {
  saveMsg.value = '✓ 设置已保存'
  configHistory.unshift({
    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    type: 'config', action: '保存设置', desc: '保存当前所有配置', user: 'admin', result: '成功'
  })
  setTimeout(() => { saveMsg.value = '' }, 2500)
}

function restoreDefaults() {
  basicParams.forEach((p, i) => {
    const defs = [0.01, 0.5, 0.05, 1000, 0.001, 5]
    p.value = defs[i]
  })
  saveMsg.value = '已恢复默认设置'
  setTimeout(() => { saveMsg.value = '' }, 2500)
}

// ========== 生命周期 ==========
watch(activeTab, (val) => {
  if (val === 'thresholds') nextTick(initThresholdChart)
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
  uptimeTimer = setInterval(() => {
    runtimeStatus.forEach(s => {
      s.percent = Math.min(100, Math.max(10, s.percent + Math.floor(Math.random() * 5 - 2)))
    })
  }, 5000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
  if (uptimeTimer) clearInterval(uptimeTimer)
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

/* 设置组 */
.setting-group { display: flex; flex-direction: column; gap: 2px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(27,91,158,0.15); transition: all 0.3s; }
.setting-row:hover { background: rgba(0,234,255,0.04); }
.setting-label { font-size: 13px; color: var(--text-main); }
.setting-label i { margin-right: 6px; color: var(--text-highlight); opacity: 0.7; }
.setting-value { font-size: 13px; color: #8ab4f8; }
.setting-control { display: flex; align-items: center; gap: 8px; }
.setting-unit { font-size: 11px; color: #6a8bb5; min-width: 30px; }

/* 权重条 */
.weight-bar { width: 80px; height: 5px; background: rgba(27,91,158,0.2); border-radius: 3px; overflow: hidden; }
.weight-fill { height: 100%; background: var(--text-highlight); border-radius: 3px; transition: width 0.3s; }

/* 阈值 */
.threshold-range { display: flex; align-items: center; gap: 8px; }
.threshold-tag { padding: 2px 8px; border-radius: 3px; font-size: 12px; font-family: 'Orbitron', 'Consolas', monospace; }
.threshold-tag.success { background: rgba(0,255,136,0.15); color: var(--accent-green); }
.threshold-tag.info { background: rgba(0,234,255,0.15); color: var(--text-highlight); }
.threshold-tag.warning { background: rgba(255,165,0,0.15); color: #ffa500; }
.threshold-tag.danger { background: rgba(242,78,78,0.15); color: var(--accent-red); }

/* Toggle 开关 */
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(27,91,158,0.3); border-radius: 22px; transition: 0.3s;
}
.toggle-slider::before {
  content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px;
  background: #b0d0ff; border-radius: 50%; transition: 0.3s;
}
.toggle input:checked + .toggle-slider { background: rgba(0,234,255,0.3); }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); background: var(--text-highlight); }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-box { background: var(--bg-dark, #0a1929); border: 1px solid rgba(27,91,158,0.4); border-radius: 12px; padding: 20px; min-width: 400px; max-height: 85vh; overflow-y: auto; box-shadow: 0 0 40px rgba(0,234,255,0.1); }
.modal-title { font-size: 16px; color: var(--text-highlight); font-weight: 600; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid rgba(27,91,158,0.2); }
.modal-title i { margin-right: 6px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(27,91,158,0.15); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group .form-label { font-size: 12px; color: #6a8bb5; }

/* 角色标签 */
.role-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.role-管理员 { color: #f24e4e; background: rgba(242,78,78,0.12); }
.role-分析员 { color: #00eaff; background: rgba(0,234,255,0.1); }
.role-操作员 { color: #00ff88; background: rgba(0,255,136,0.1); }
.role-访客 { color: #8ab4f8; background: rgba(138,180,248,0.1); }

/* 状态条 */
.status-bar-wrapper { display: flex; align-items: center; gap: 8px; min-width: 180px; }
.status-bar-track { flex: 1; height: 6px; background: rgba(27,91,158,0.2); border-radius: 3px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.status-bar-text { font-size: 12px; font-weight: 600; color: var(--text-main); min-width: 35px; text-align: right; }

/* 日志类型标签 */
.log-type-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.lt-login { color: #00eaff; background: rgba(0,234,255,0.1); }
.lt-config { color: #ffa500; background: rgba(255,165,0,0.1); }
.lt-analyze { color: #00ff88; background: rgba(0,255,136,0.1); }
.lt-export { color: #a78bfa; background: rgba(167,139,250,0.1); }
.lt-import { color: #8ab4f8; background: rgba(138,180,248,0.1); }
.lt-backup { color: #f24e4e; background: rgba(242,78,78,0.1); }

/* 组件版本 */
.component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; padding: 15px; }
.comp-card { text-align: center; padding: 15px; background: rgba(27,91,158,0.06); border: 1px solid rgba(27,91,158,0.15); border-radius: 8px; transition: all 0.3s; }
.comp-card:hover { border-color: rgba(0,234,255,0.3); box-shadow: 0 0 10px rgba(0,234,255,0.08); }
.comp-icon { font-size: 28px; margin-bottom: 6px; display: block; }
.comp-name { font-size: 12px; color: var(--text-main); font-weight: 600; }
.comp-version { font-size: 11px; color: #6a8bb5; margin-top: 2px; }

/* 配置选项 */
.config-options { display: flex; flex-wrap: wrap; gap: 12px; }
.config-options label { font-size: 12px; color: var(--text-main); display: flex; align-items: center; gap: 4px; }

/* 操作底栏 */
.action-footer { display: flex; align-items: center; gap: 15px; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(27,91,158,0.15); }
.save-hint { font-size: 13px; color: var(--accent-green); font-weight: 600; animation: fadeIn 0.3s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
