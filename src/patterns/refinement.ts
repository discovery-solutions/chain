import { LanguageModel } from "ai";
import { Chain } from "../core/chain.js";
import { z } from "zod";

interface RefinementConfig<T extends z.ZodType<any>> {
  prompt: string
  schema: T
  model: LanguageModel
  iterations?: number // default 1 (2 steps total)
  critiqueFocus?: string[] // Aspectos específicos pra criticar
}

export async function iterativeRefinement<T extends z.ZodType<any>>(
  config: RefinementConfig<T>
): Promise<{
  final: z.infer<T>
  iterations: Array<{
    output: z.infer<T>
    critique: string
  }>
  cost: any
  duration: string
}> {
  const iterations = config.iterations || 1
  const focusText = config.critiqueFocus?.length
    ? `\nFocus critique on: ${config.critiqueFocus.join(", ")}`
    : ""

  const steps = []

  // Step 1: Geração inicial
  steps.push({
    id: "generate-v1",
    prompt: config.prompt,
    schema: config.schema,
    output: "v1"
  })

  // Steps 2+: Iterações de refinamento
  for (let i = 0; i < iterations; i++) {
    const version = i + 1
    const prevVersion = `v${version}`
    const nextVersion = `v${version + 1}`

    // Critique step
    steps.push({
      id: `critique-v${version}`,
      prompt: `Critically analyze this output and identify specific improvements:

Output:
{{${prevVersion}}}
${focusText}

Provide specific, actionable feedback.`,
      output: `critique${version}`
    })

    // Refinement step
    steps.push({
      id: `refine-v${version}`,
      prompt: `Improve this output based on the critique:

Original:
{{${prevVersion}}}

Critique:
{{critique${version}}}

Generate improved version.`,
      schema: config.schema,
      output: nextVersion
    })
  }

  const chain = Chain.create({
    model: config.model,
    steps
  })

  const result = await chain.run({})

  // Extrai histórico de iterações
  const iterationsHistory = []
  for (let i = 1; i <= iterations + 1; i++) {
    const output = result.state[`v${i}`]
    const critique = i <= iterations ? result.state[`critique${i}`] : null

    if (output) {
      iterationsHistory.push({
        output,
        critique: critique || "Final version"
      })
    }
  }

  return {
    final: result.state[`v${iterations + 1}`],
    iterations: iterationsHistory,
    cost: result.cost,
    duration: result.duration
  }
}