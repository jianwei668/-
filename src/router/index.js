import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/HomePage.vue') },
  { path: '/data', name: 'Data', component: () => import('../views/DataManagementPage.vue') },
  { path: '/model', name: 'Model', component: () => import('../views/ModelDisplayPage.vue') },
  { path: '/dynamic', name: 'Dynamic', component: () => import('../views/DynamicAnalysisPage.vue') },
  { path: '/energy', name: 'Energy', component: () => import('../views/EnergyEvolutionPage.vue') },
  { path: '/stability', name: 'Stability', component: () => import('../views/StabilityEvalPage.vue') },
  { path: '/export', name: 'Export', component: () => import('../views/ResultExportPage.vue') },
  { path: '/monitor', name: 'Monitor', component: () => import('../views/RealtimeMonitorPage.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/SystemSettingsPage.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
