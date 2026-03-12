/**
 * 稳定性评价算法库 — 多种评价方法实现
 */

// ==================== AHP层次分析法 ====================

// AHP判断矩阵求权重（特征向量法）
export function ahpWeights(matrix) {
  const n = matrix.length
  // 列归一化
  const colSums = Array(n).fill(0)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j]
    }
  }
  
  const normalized = matrix.map((row, i) =>
    row.map((val, j) => val / colSums[j])
  )
  
  // 行平均得到权重
  const weights = normalized.map(row =>
    row.reduce((a, b) => a + b, 0) / n
  )
  
  // 一致性检验
  const lambdaMax = computeLambdaMax(matrix, weights)
  const CI = (lambdaMax - n) / (n - 1)
  const RI = [0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49]
  const CR = n <= 2 ? 0 : CI / RI[n - 1]
  
  return {
    weights: weights.map(w => parseFloat(w.toFixed(4))),
    lambdaMax: parseFloat(lambdaMax.toFixed(4)),
    CI: parseFloat(CI.toFixed(4)),
    CR: parseFloat(CR.toFixed(4)),
    consistent: CR < 0.1
  }
}

function computeLambdaMax(matrix, weights) {
  const n = matrix.length
  let lambdaMax = 0
  
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * weights[j]
    }
    lambdaMax += sum / weights[i]
  }
  
  return lambdaMax / n
}

// 默认AHP判断矩阵（6个指标）
export function getDefaultAHPMatrix() {
  return [
    [1,   2,   3,   1/2, 2,   3  ],  // 最大位移
    [1/2, 1,   2,   1/3, 1,   2  ],  // 峰值加速度
    [1/3, 1/2, 1,   1/4, 1/2, 1  ],  // 最大应力
    [2,   3,   4,   1,   3,   4  ],  // 能量异常系数
    [1/2, 1,   2,   1/3, 1,   2  ],  // 耗散比
    [1/3, 1/2, 1,   1/4, 1/2, 1  ]   // 放大系数
  ]
}

// ==================== 模糊综合评判法 ====================

// 模糊隶属度函数
export function fuzzyMembership(value, thresholds) {
  // thresholds = { safe: [min, max], caution: [min, max], warning: [min, max], danger: [min, max] }
  const levels = ['safe', 'caution', 'warning', 'danger']
  const membership = {}
  
  levels.forEach(level => {
    const [lo, hi] = thresholds[level]
    if (value <= lo) {
      membership[level] = level === levels[0] ? 1 : 0
    } else if (value >= hi) {
      membership[level] = level === levels[levels.length - 1] ? 1 : 0
    } else {
      // 线性隶属度
      membership[level] = 1 - Math.abs(value - (lo + hi) / 2) / ((hi - lo) / 2)
    }
  })
  
  // 归一化
  const sum = Object.values(membership).reduce((a, b) => a + b, 0)
  if (sum > 0) {
    levels.forEach(level => { membership[level] /= sum })
  }
  
  return membership
}

// 模糊综合评判
export function fuzzyComprehensiveEvaluation(indicators, weights, thresholdSets) {
  const n = indicators.length
  const levels = ['safe', 'caution', 'warning', 'danger']
  
  // 构建模糊关系矩阵 R
  const R = indicators.map((val, i) => {
    const mem = fuzzyMembership(val, thresholdSets[i])
    return levels.map(l => mem[l] || 0)
  })
  
  // 模糊综合运算 B = W ∘ R
  const B = levels.map((_, j) => {
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += weights[i] * R[i][j]
    }
    return parseFloat(sum.toFixed(4))
  })
  
  // 归一化
  const bSum = B.reduce((a, b) => a + b, 0)
  const normalized = B.map(b => parseFloat((b / bSum).toFixed(4)))
  
  // 确定评价等级
  const maxIndex = normalized.indexOf(Math.max(...normalized))
  
  return {
    membershipMatrix: R,
    result: normalized,
    levelNames: ['安全', '基本安全', '欠稳定', '不稳定'],
    maxLevel: maxIndex,
    levelName: ['安全', '基本安全', '欠稳定', '不稳定'][maxIndex],
    confidence: normalized[maxIndex]
  }
}

// 默认阈值集
export function getDefaultThresholds() {
  return [
    { safe: [0, 5], caution: [5, 15], warning: [15, 30], danger: [30, 100] },         // 最大位移(mm)
    { safe: [0, 1.0], caution: [1.0, 2.0], warning: [2.0, 3.5], danger: [3.5, 10] },  // 峰值加速度(m/s²)
    { safe: [0, 2.0], caution: [2.0, 4.0], warning: [4.0, 6.0], danger: [6.0, 15] },  // 最大应力(MPa)
    { safe: [0, 0.1], caution: [0.1, 0.25], warning: [0.25, 0.5], danger: [0.5, 1] },  // 能量异常系数
    { safe: [0, 50], caution: [50, 80], warning: [80, 120], danger: [120, 200] },       // 耗散比(%)
    { safe: [0, 1.2], caution: [1.2, 1.5], warning: [1.5, 2.0], danger: [2.0, 5] }     // 放大系数
  ]
}

// ==================== 灰色关联分析法 ====================

export function greyRelationalAnalysis(indicators, referencePattern, resolution = 0.5) {
  const numIndicators = referencePattern.length
  
  // 合并参考与比较序列用于统一归一化
  const allRows = [referencePattern, ...indicators]
  const maxVals = Array(numIndicators).fill(0).map((_, i) => Math.max(...allRows.map(row => row[i] || 0)))
  const minVals = Array(numIndicators).fill(0).map((_, i) => Math.min(...allRows.map(row => row[i] || 0)))
  
  const normalize = (val, i) => {
    const range = maxVals[i] - minVals[i]
    return range === 0 ? 0.5 : (val - minVals[i]) / range
  }
  
  const normalizedRef = referencePattern.map((val, i) => normalize(val, i))
  
  // 计算灰色关联系数和关联度
  const results = indicators.map(row => {
    const normalizedRow = row.map((val, i) => normalize(val, i))
    
    const diffs = normalizedRow.map((v, i) => Math.abs(normalizedRef[i] - v))
    const minDiff = Math.min(...diffs)
    const maxDiff = Math.max(...diffs)
    
    const coefficients = diffs.map(d => {
      const denom = d + resolution * maxDiff
      return denom === 0 ? 1 : (minDiff + resolution * maxDiff) / denom
    })
    
    const grade = coefficients.reduce((a, b) => a + b, 0) / coefficients.length
    
    return {
      coefficients: coefficients.map(c => parseFloat(c.toFixed(4))),
      grade: parseFloat(grade.toFixed(4))
    }
  })
  
  return results
}

// ==================== 综合评分法 ====================

// 加权评分
export function weightedScore(values, weights, scoreFunctions) {
  const scores = values.map((val, i) => {
    const fn = scoreFunctions[i]
    return fn(val)
  })
  
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0)
  
  return {
    scores: scores.map(s => parseFloat(s.toFixed(1))),
    totalScore: parseFloat((weightedSum / totalWeight).toFixed(1)),
    weights,
    values
  }
}

// 默认评分函数（分段线性）
export function getDefaultScoreFunctions() {
  return [
    // 最大位移(mm) → 分数 (越小越好)
    (val) => {
      if (val <= 3) return 95
      if (val <= 8) return 95 - (val - 3) * 4
      if (val <= 15) return 75 - (val - 8) * 3
      if (val <= 30) return 54 - (val - 15) * 1.5
      return Math.max(10, 31.5 - (val - 30) * 0.5)
    },
    // 峰值加速度(m/s²) → 分数
    (val) => {
      if (val <= 0.5) return 95
      if (val <= 1.5) return 95 - (val - 0.5) * 15
      if (val <= 2.5) return 80 - (val - 1.5) * 20
      if (val <= 4.0) return 60 - (val - 2.5) * 15
      return Math.max(10, 37.5 - (val - 4.0) * 5)
    },
    // 最大应力(MPa) → 分数
    (val) => {
      if (val <= 1.5) return 95
      if (val <= 3.0) return 95 - (val - 1.5) * 10
      if (val <= 5.0) return 80 - (val - 3.0) * 10
      if (val <= 8.0) return 60 - (val - 5.0) * 8
      return Math.max(10, 36 - (val - 8.0) * 4)
    },
    // 能量异常系数 → 分数
    (val) => {
      if (val <= 0.05) return 95
      if (val <= 0.15) return 95 - (val - 0.05) * 150
      if (val <= 0.3) return 80 - (val - 0.15) * 133
      if (val <= 0.5) return 60 - (val - 0.3) * 100
      return Math.max(10, 40 - (val - 0.5) * 50)
    },
    // 耗散比(%) → 分数
    (val) => {
      if (val <= 40) return 95
      if (val <= 70) return 95 - (val - 40) * 0.5
      if (val <= 100) return 80 - (val - 70) * 0.67
      if (val <= 150) return 60 - (val - 100) * 0.4
      return Math.max(10, 40 - (val - 150) * 0.3)
    },
    // 放大系数 → 分数
    (val) => {
      if (val <= 1.1) return 95
      if (val <= 1.3) return 95 - (val - 1.1) * 50
      if (val <= 1.6) return 85 - (val - 1.3) * 33
      if (val <= 2.0) return 75 - (val - 1.6) * 37.5
      return Math.max(10, 60 - (val - 2.0) * 20)
    }
  ]
}

// 根据分数判定等级
export function getStabilityLevel(score) {
  if (score >= 85) return { level: '稳定', class: 'success', risk: '低风险', color: '#00ff88' }
  if (score >= 70) return { level: '基本稳定', class: 'info', risk: '中低风险', color: '#00eaff' }
  if (score >= 55) return { level: '欠稳定', class: 'warning', risk: '中高风险', color: '#ffa500' }
  if (score >= 40) return { level: '不稳定', class: 'danger', risk: '高风险', color: '#f24e4e' }
  return { level: '极不稳定', class: 'danger', risk: '极高风险', color: '#ff0040' }
}

// ==================== 灵敏度分析 ====================

export function sensitivityAnalysis(baseValues, weights, scoreFunctions, variationRange = 0.3) {
  const baseResult = weightedScore(baseValues, weights, scoreFunctions)
  const n = baseValues.length
  const results = []
  
  for (let i = 0; i < n; i++) {
    const variations = []
    for (let factor = 1 - variationRange; factor <= 1 + variationRange + 0.001; factor += variationRange / 5) {
      const modifiedValues = [...baseValues]
      modifiedValues[i] = baseValues[i] * factor
      const result = weightedScore(modifiedValues, weights, scoreFunctions)
      variations.push({
        factor: parseFloat(factor.toFixed(2)),
        value: parseFloat(modifiedValues[i].toFixed(4)),
        score: result.totalScore,
        change: parseFloat((result.totalScore - baseResult.totalScore).toFixed(2))
      })
    }
    results.push({
      index: i,
      variations,
      sensitivity: parseFloat(
        Math.abs(variations[variations.length - 1].score - variations[0].score).toFixed(2)
      )
    })
  }
  
  return {
    baseScore: baseResult.totalScore,
    indicators: results.sort((a, b) => b.sensitivity - a.sensitivity)
  }
}

// ==================== 安全系数计算 ====================

export function computeSafetyFactor(params) {
  const { cohesion, frictionAngle, unitWeight, height, slopeAngle, waterLevel = 0 } = params
  const alpha = slopeAngle * Math.PI / 180
  const phi = frictionAngle * Math.PI / 180
  
  // 简化Bishop方法
  const W = 0.5 * unitWeight * height * height / Math.tan(alpha)
  const waterPressure = waterLevel > 0 ? 0.5 * 9.81 * waterLevel * waterLevel : 0
  
  const resistingForce = cohesion * height / Math.sin(alpha) + (W * Math.cos(alpha) - waterPressure) * Math.tan(phi)
  const drivingForce = W * Math.sin(alpha) + waterPressure * Math.cos(alpha) * 0.3
  
  const Fs = drivingForce > 0 ? resistingForce / drivingForce : 999
  
  return {
    safetyFactor: parseFloat(Fs.toFixed(3)),
    resistingForce: parseFloat(resistingForce.toFixed(2)),
    drivingForce: parseFloat(drivingForce.toFixed(2)),
    stable: Fs >= 1.15
  }
}

// 动力安全系数（考虑地震效应）
export function computeDynamicSafetyFactor(staticParams, peakAcc, amplification = 1.0) {
  const { cohesion, frictionAngle, unitWeight, height, slopeAngle } = staticParams
  const alpha = slopeAngle * Math.PI / 180
  const phi = frictionAngle * Math.PI / 180
  const kh = peakAcc * amplification / 9.81 // 水平地震系数
  
  const W = 0.5 * unitWeight * height * height / Math.tan(alpha)
  
  const resistingForce = cohesion * height / Math.sin(alpha) + 
                         (W * Math.cos(alpha) - kh * W * Math.sin(alpha)) * Math.tan(phi)
  const drivingForce = W * Math.sin(alpha) + kh * W * Math.cos(alpha)
  
  const Fs = drivingForce > 0 ? resistingForce / drivingForce : 999
  
  return {
    safetyFactor: parseFloat(Fs.toFixed(3)),
    kh: parseFloat(kh.toFixed(4)),
    resistingForce: parseFloat(resistingForce.toFixed(2)),
    drivingForce: parseFloat(drivingForce.toFixed(2)),
    stable: Fs >= 1.0
  }
}
