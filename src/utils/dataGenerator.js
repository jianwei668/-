/**
 * 数据生成工具 — 模拟岩性边坡动力响应数据
 */

// 生成地震波时程数据
export function generateSeismicWave(type, duration = 20, dt = 0.02, pga = 0.2) {
  const n = Math.floor(duration / dt)
  const time = []
  const acc = []
  
  for (let i = 0; i < n; i++) {
    const t = i * dt
    time.push(t)
    let a = 0
    
    switch (type) {
      case 'wenchuan': // 汶川波
        a = pga * 9.81 * (
          1.2 * Math.sin(2 * Math.PI * 1.8 * t) * Math.exp(-0.12 * t) +
          0.7 * Math.sin(2 * Math.PI * 4.2 * t) * Math.exp(-0.18 * t) +
          0.4 * Math.sin(2 * Math.PI * 7.5 * t) * Math.exp(-0.25 * t) +
          0.3 * Math.sin(2 * Math.PI * 12 * t) * Math.exp(-0.35 * t)
        ) * envelopeFunction(t, duration)
        break
      case 'elcentro': // EL Centro波
        a = pga * 9.81 * (
          1.0 * Math.sin(2 * Math.PI * 2.5 * t) * Math.exp(-0.1 * t) +
          0.8 * Math.sin(2 * Math.PI * 5.8 * t) * Math.exp(-0.15 * t) +
          0.5 * Math.sin(2 * Math.PI * 9.3 * t) * Math.exp(-0.22 * t) +
          0.25 * Math.sin(2 * Math.PI * 15 * t) * Math.exp(-0.3 * t)
        ) * envelopeFunction(t, duration)
        break
      case 'artificial': // 人工波
        a = pga * 9.81 * (
          0.9 * Math.sin(2 * Math.PI * 3.0 * t + 0.5) * Math.exp(-0.08 * t) +
          0.6 * Math.sin(2 * Math.PI * 6.5 * t + 1.2) * Math.exp(-0.12 * t) +
          0.4 * Math.sin(2 * Math.PI * 10 * t + 2.0) * Math.exp(-0.2 * t) +
          0.3 * Math.sin(2 * Math.PI * 18 * t + 0.8) * Math.exp(-0.28 * t)
        ) * envelopeFunction(t, duration)
        break
      default:
        a = pga * 9.81 * Math.sin(2 * Math.PI * 2 * t) * Math.exp(-0.15 * t)
    }
    
    // 添加随机噪声
    a += (Math.random() - 0.5) * pga * 9.81 * 0.08
    acc.push(parseFloat(a.toFixed(4)))
  }
  
  return { time, acc }
}

// 包络函数（模拟地震波的上升-平稳-衰减过程）
function envelopeFunction(t, duration) {
  const t1 = duration * 0.1
  const t2 = duration * 0.4
  if (t < t1) return (t / t1) ** 2
  if (t < t2) return 1.0
  return Math.exp(-2.5 * (t - t2) / (duration - t2))
}

// 从加速度积分得到速度
export function integrateToVelocity(acc, dt = 0.02) {
  const vel = [0]
  for (let i = 1; i < acc.length; i++) {
    vel.push(vel[i - 1] + (acc[i - 1] + acc[i]) * dt / 2)
  }
  return vel
}

// 从速度积分得到位移
export function integrateToDisplacement(vel, dt = 0.02) {
  const disp = [0]
  for (let i = 1; i < vel.length; i++) {
    disp.push(disp[i - 1] + (vel[i - 1] + vel[i]) * dt / 2)
  }
  return disp
}

// FFT频谱分析（简化实现）
export function computeFFT(signal, dt = 0.02) {
  const N = signal.length
  const freq = []
  const amplitude = []
  const maxFreq = 1 / (2 * dt) // Nyquist频率
  const df = 1 / (N * dt)
  
  for (let k = 0; k < N / 2; k++) {
    const f = k * df
    if (f > maxFreq) break
    
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N
      re += signal[n] * Math.cos(angle)
      im += signal[n] * Math.sin(angle)
    }
    
    const amp = Math.sqrt(re * re + im * im) / N * 2
    freq.push(parseFloat(f.toFixed(2)))
    amplitude.push(parseFloat(amp.toFixed(4)))
  }
  
  return { freq, amplitude }
}

// 计算反应谱
export function computeResponseSpectrum(acc, dt = 0.02, damping = 0.05) {
  const periods = []
  const sa = [] // 谱加速度
  const sv = [] // 谱速度
  const sd = [] // 谱位移
  
  for (let T = 0.02; T <= 6.0; T += 0.02) {
    periods.push(parseFloat(T.toFixed(2)))
    const omega = 2 * Math.PI / T
    const omegaD = omega * Math.sqrt(1 - damping * damping)
    
    let u = 0, uDot = 0
    let maxU = 0, maxUDot = 0, maxUDDot = 0
    
    const expTerm = Math.exp(-damping * omega * dt)
    const sinTerm = Math.sin(omegaD * dt)
    const cosTerm = Math.cos(omegaD * dt)
    
    for (let i = 0; i < acc.length; i++) {
      const uNew = expTerm * (u * cosTerm + (uDot + damping * omega * u) / omegaD * sinTerm) -
                   acc[i] / (omega * omega) * (1 - expTerm * cosTerm)
      const uDotNew = -expTerm * (u * omegaD * sinTerm - (uDot + damping * omega * u) * cosTerm) +
                      acc[i] / (omega * omega) * omegaD * expTerm * sinTerm / omega
      
      u = isNaN(uNew) ? 0 : uNew
      uDot = isNaN(uDotNew) ? 0 : uDotNew
      
      const absU = Math.abs(u)
      const absUDot = Math.abs(uDot)
      const absAcc = Math.abs(acc[i] + 2 * damping * omega * uDot + omega * omega * u)
      
      if (absU > maxU) maxU = absU
      if (absUDot > maxUDot) maxUDot = absUDot
      if (absAcc > maxUDDot) maxUDDot = absAcc
    }
    
    sd.push(parseFloat(maxU.toFixed(4)))
    sv.push(parseFloat(maxUDot.toFixed(4)))
    sa.push(parseFloat((maxU * omega * omega).toFixed(4)))
  }
  
  return { periods, sa, sv, sd }
}

// 计算Arias强度
export function computeAriasIntensity(acc, dt = 0.02) {
  const ia = []
  let cumulative = 0
  const g = 9.81
  
  for (let i = 0; i < acc.length; i++) {
    cumulative += Math.PI / (2 * g) * acc[i] * acc[i] * dt
    ia.push(parseFloat(cumulative.toFixed(4)))
  }
  
  return ia
}

// 生成监测点响应数据
export function generateMonitorPointData(baseAcc, amplification, phaseShift = 0) {
  return baseAcc.map((a, i) => {
    const shifted = i + phaseShift < baseAcc.length ? baseAcc[i + phaseShift] || 0 : 0
    return parseFloat((shifted * amplification + (Math.random() - 0.5) * 0.1).toFixed(4))
  })
}

// 能量计算相关
export function computeInputEnergy(acc, vel, mass = 1.0, dt = 0.02) {
  const energy = [0]
  for (let i = 1; i < acc.length; i++) {
    const de = -mass * acc[i] * (vel[i] - vel[i - 1])
    energy.push(energy[i - 1] + Math.abs(de))
  }
  return energy.map(e => parseFloat(e.toFixed(2)))
}

export function computeKineticEnergy(vel, mass = 1.0) {
  return vel.map(v => parseFloat((0.5 * mass * v * v).toFixed(4)))
}

export function computeDampingEnergy(vel, damping = 0.05, omega = 6.28, mass = 1.0, dt = 0.02) {
  const energy = [0]
  const c = 2 * damping * omega * mass
  for (let i = 1; i < vel.length; i++) {
    const de = c * vel[i] * vel[i] * dt
    energy.push(energy[i - 1] + Math.abs(de))
  }
  return energy.map(e => parseFloat(e.toFixed(2)))
}

export function computeStrainEnergy(disp, stiffness = 100) {
  return disp.map(d => parseFloat((0.5 * stiffness * d * d).toFixed(4)))
}

// 统计指标
export function computeStatistics(data) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const rms = Math.sqrt(data.reduce((a, b) => a + b * b, 0) / data.length)
  const maxIndex = data.indexOf(max)
  const minIndex = data.indexOf(min)
  const std = Math.sqrt(data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length)
  
  return {
    max: parseFloat(max.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    absMax: parseFloat(Math.max(Math.abs(max), Math.abs(min)).toFixed(4)),
    mean: parseFloat(mean.toFixed(4)),
    rms: parseFloat(rms.toFixed(4)),
    std: parseFloat(std.toFixed(4)),
    maxIndex,
    minIndex,
    range: parseFloat((max - min).toFixed(4))
  }
}

// 生成边坡信息数据
export function getSlopeData() {
  return [
    { id: 'BP-001', name: '龙潭边坡', location: '四川省宜宾市', height: 85, angle: 62, rockType: '砂岩-泥岩互层', level: '高', status: '监测中' },
    { id: 'BP-002', name: '青山边坡', location: '重庆市万州区', height: 120, angle: 55, rockType: '灰岩-页岩', level: '中', status: '监测中' },
    { id: 'BP-003', name: '翠峰边坡', location: '云南省昭通市', height: 65, angle: 70, rockType: '花岗岩-片麻岩', level: '高', status: '预警' },
    { id: 'BP-004', name: '金沙江边坡', location: '四川省攀枝花市', height: 200, angle: 45, rockType: '玄武岩-凝灰岩', level: '极高', status: '监测中' },
    { id: 'BP-005', name: '通江边坡', location: '四川省巴中市', height: 90, angle: 58, rockType: '泥灰岩-砂岩', level: '中', status: '正常' }
  ]
}

// 生成工况数据
export function getWorkConditions() {
  return [
    { id: 'GK-001', wave: '汶川波', pga: 0.20, duration: 20, desc: '汶川波 0.20g' },
    { id: 'GK-002', wave: 'EL Centro波', pga: 0.15, duration: 25, desc: 'EL Centro波 0.15g' },
    { id: 'GK-003', wave: '人工波', pga: 0.30, duration: 15, desc: '人工波 0.30g' },
    { id: 'GK-004', wave: '汶川波', pga: 0.40, duration: 20, desc: '汶川波 0.40g (罕遇)' },
    { id: 'GK-005', wave: 'Kobe波', pga: 0.25, duration: 18, desc: 'Kobe波 0.25g' },
    { id: 'GK-006', wave: '人工波', pga: 0.10, duration: 30, desc: '人工波 0.10g (多遇)' }
  ]
}

// 监测点配置
export function getMonitorPoints() {
  return [
    { id: 'P1', name: '坡脚', height: 0, amplification: 1.0, color: '#00eaff' },
    { id: 'P2', name: '坡体下部', height: 20, amplification: 1.15, color: '#00ff88' },
    { id: 'P3', name: '坡体中部', height: 45, amplification: 1.30, color: '#ffa500' },
    { id: 'P4', name: '坡体上部', height: 65, amplification: 1.50, color: '#f24e4e' },
    { id: 'P5', name: '坡顶', height: 85, amplification: 1.65, color: '#ff6ec7' },
    { id: 'P6', name: '坡后缘', height: 80, amplification: 1.42, color: '#a78bfa' }
  ]
}

// 格式化时间
export function formatTime(seconds) {
  return seconds.toFixed(2) + 's'
}

// 下采样函数（用于图表优化）
export function downsample(data, maxPoints = 500) {
  if (data.length <= maxPoints) return data
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, i) => i % step === 0)
}
