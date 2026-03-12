<template>
  <header class="header">
    <div class="header-menu header-menu-left">
      <router-link
        v-for="item in menuLeft"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ navigate, isActive }"
      >
        <div
          :class="['menu-item', { active: isActive }]"
          @click="navigate"
        ><i :class="item.icon"></i> {{ item.label }}</div>
      </router-link>
    </div>
    <div class="header-center">
      <div class="title-deco">
        <span></span><span></span><span></span>
      </div>
      <div class="title-content">
        <span class="title-main">复杂岩性边坡动力响应与稳定性评价系统</span>
      </div>
      <div class="title-deco right">
        <span></span><span></span><span></span>
      </div>
      <div class="header-clock" id="clock">{{ clock }}</div>
    </div>
    <div class="header-menu header-menu-right">
      <router-link
        v-for="item in menuRight"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ navigate, isActive }"
      >
        <div
          :class="['menu-item', { active: isActive }]"
          @click="navigate"
        ><i :class="item.icon"></i> {{ item.label }}</div>
      </router-link>
    </div>
  </header>
  <div class="page-content">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const menuLeft = [
  { path: '/', label: '首页总览', icon: 'ri-dashboard-line' },
  { path: '/data', label: '基础数据管理', icon: 'ri-database-2-line' },
  { path: '/dynamic', label: '动力响应分析', icon: 'ri-pulse-line' },
  { path: '/energy', label: '能量演化分析', icon: 'ri-flashlight-line' }
]

const menuRight = [
  { path: '/stability', label: '稳定性评价', icon: 'ri-shield-check-line' },
  { path: '/export', label: '结果导出', icon: 'ri-file-download-line' },
  { path: '/monitor', label: '实时监测', icon: 'ri-radar-line' },
  { path: '/settings', label: '系统设置', icon: 'ri-settings-3-line' }
]

const clock = ref('')
let timer = null

function updateClock() {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  clock.value = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0') + ' ' +
    days[now.getDay()]
}

onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>
