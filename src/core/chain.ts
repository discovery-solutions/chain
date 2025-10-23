import { generateText, streamText, generateObject, LanguageModel } from "ai"
import { StateManager } from "./state.js"
import { z } from "zod"

interface Step {
  id?: string
  model?: LanguageModel
  prompt: string
  output?: string
  schema?: z.ZodType<any> // Se tiver schema, usa generateObject
  after?: string | string[]
}

interface ChainConfig {
  model?: LanguageModel
  steps: (Step | string)[]
  streaming?: boolean
  onStream?: (chunk: string, stepId: string) => void
}

export class Chain {
  private config: ChainConfig
  private state: StateManager

  constructor(config: ChainConfig) {
    this.config = config
    this.state = new StateManager()
  }

  static create(config: ChainConfig) {
    return new Chain(config)
  }

  async run(input: Record<string, any>) {
    this.state.set("input", input)

    const steps = this.normalizeSteps(this.config.steps)
    const executionOrder = this.resolveExecutionOrder(steps)

    for (const step of executionOrder) {
      await this.executeStep(step)
    }

    return {
      output: this.state.get("output") || this.state.getLastOutput(),
      state: this.state.getAll(),
      cost: this.state.getCost(),
      duration: this.state.getDuration()
    }
  }

  private async executeStep(step: Step) {
    const startTime = Date.now()
    const prompt = this.interpolate(step.prompt)
    const model = step.model || this.config.model

    if (!model) {
      throw new Error(`No model specified for step ${step.id}`)
    }

    const outputKey = step.output || `step${this.state.getStepCount()}`

    // Se tem schema, usa generateObject
    if (step.schema) {
      console.log(`Retorne **somente JSON válido**, sem texto explicativo. Siga exatamente o schema abaixo, incluindo todos os campos obrigatórios. ${prompt}`);
      const { object, usage } = await generateObject({
        schema: step.schema,
        output: "object",
        mode: "json",
        prompt: `Retorne **somente JSON válido**, sem texto explicativo. Siga exatamente o schema abaixo, incluindo todos os campos obrigatórios. ${prompt}`,
        model,
      })

      this.state.set(outputKey, object)
      this.state.addCost({
        promptTokens: usage.inputTokens as number,
        completionTokens: usage.outputTokens as number
      })
    }
    // Senão, usa generateText (comportamento original)
    else {
      if (this.config.streaming) {
        const { textStream } = await streamText({ model, prompt })

        let fullText = ""
        for await (const chunk of textStream) {
          fullText += chunk
          this.config.onStream?.(chunk, step.id || "unknown")
        }

        this.state.set(outputKey, fullText)
      } else {
        const { text, usage } = await generateText({ model, prompt })

        this.state.set(outputKey, text)
        this.state.addCost({
          promptTokens: usage.inputTokens as number,
          completionTokens: usage.outputTokens as number
        })
      }
    }

    this.state.addDuration(Date.now() - startTime)
  }

  private interpolate(prompt: string): string {
    return prompt.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
      const value = this.resolvePath(path)

      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2)
      }

      return value ?? `{{${path}}}`
    })
  }

  private resolvePath(path: string): any {
    const keys = path.split(".")
    let value: any = this.state.get(keys.shift()!)

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value
  }

  private normalizeSteps(steps: (Step | string)[]): Step[] {
    return steps.map((step, index) => {
      if (typeof step === "string") {
        return {
          id: `step${index + 1}`,
          prompt: step,
          output: `step${index + 1}`
        }
      }
      return {
        id: step.id || `step${index + 1}`,
        ...step
      }
    })
  }

  private resolveExecutionOrder(steps: Step[]): Step[] {
    const hasAfter = steps.some(s => s.after)
    if (!hasAfter) return steps

    // TODO: Topological sort real
    return steps
  }
}