export class StateManager {
  private state: Record<string, any> = {}
  private stepCount = 0
  private totalCost = 0
  private totalDuration = 0

  set(key: string, value: any) {
    this.state[key] = value
    this.stepCount++
  }

  get(key: string) {
    return this.state[key]
  }

  getAll() {
    return { ...this.state }
  }

  getLastOutput() {
    const keys = Object.keys(this.state)
    return this.state[keys[keys.length - 1]]
  }

  getStepCount() {
    return this.stepCount
  }

  addCost(usage: { promptTokens: number; completionTokens: number }) {
    // Preços aproximados (ajustar conforme modelo)
    const inputCost = (usage.promptTokens / 1000) * 0.003
    const outputCost = (usage.completionTokens / 1000) * 0.015
    this.totalCost += inputCost + outputCost
  }

  getCost() {
    return {
      usd: this.totalCost,
      tokens: this.stepCount * 1000 // Aproximação
    }
  }

  addDuration(ms: number) {
    this.totalDuration += ms
  }

  getDuration() {
    return `${(this.totalDuration / 1000).toFixed(1)}s`
  }
}