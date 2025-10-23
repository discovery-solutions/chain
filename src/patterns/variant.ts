import { LanguageModel } from "ai";
import { Chain } from "../core/chain.js";
import { z } from "zod";

interface VariantsConfig {
  input: string
  count: number
  model: LanguageModel
  style?: string
  constraints?: string[]
}

export async function generateVariants(config: VariantsConfig): Promise<{
  variants: string[]
  allVariants: Array<{ text: string; score: number; reasoning: string }>
  cost: any
  duration: string
}> {
  const constraintsText = config.constraints?.length
    ? `\nConstraints:\n${config.constraints.map(c => `- ${c}`).join("\n")}`
    : ""

  const styleText = config.style ? `\nStyle: ${config.style}` : ""

  // Gera 2x pra ter mais opções pra avaliar
  const initialCount = Math.max(config.count * 2, 10)

  const chain = Chain.create({
    model: config.model,
    steps: [
      // Step 1: Gera batch inicial (mais variantes)
      {
        id: "generate-initial",
        prompt: `Generate ${initialCount} diverse variants of this:

Original:
${config.input}
${styleText}
${constraintsText}

Focus on creating variety - try different angles, tones, and approaches.`,
        schema: z.object({
          variants: z.array(z.string())
            .min(initialCount - 2) // ← Flexível: aceita 8-12 se pediu 10
            .max(initialCount + 2)
        }),
        output: "initial"
      },

      // Step 2: Avalia e ranqueia
      {
        id: "evaluate",
        prompt: `Evaluate these variants and score each one:

Original: ${config.input}
${styleText}
${constraintsText}

Variants:
{{initial.variants}}

Score each variant (0-100) based on:
- How well it matches the style
- Whether it meets constraints
- Creativity and appeal
- Clarity

Return evaluation for each variant.`,
        schema: z.object({
          evaluations: z.array(
            z.object({
              variant: z.string(),
              score: z.number().min(0).max(100),
              reasoning: z.string()
            })
          )
            .min(initialCount - 2) // ← Flexível: aceita 8-12 se pediu 10
            .max(initialCount + 2)
        }),
        output: "evaluated"
      },

      // Step 3: Gera versões refinadas baseadas nas top performers
      {
        id: "refine",
        prompt: `Based on the evaluation, generate ${config.count} final variants.

Top performing variants (use as inspiration):
{{evaluated.evaluations}}

Generate ${config.count} refined variants that:
- Take the best elements from top-scoring variants
- Maintain the style and constraints
- Push quality even higher`,
        schema: z.object({
          variants: z.array(z.string())
            .min(initialCount - 2) // ← Flexível: aceita 8-12 se pediu 10
            .max(initialCount + 2)
        }),
        output: "final"
      }
    ]
  })

  const result = await chain.run({})

  return {
    variants: result.state.final.variants,
    allVariants: result.state.evaluated.evaluations,
    cost: result.cost,
    duration: result.duration
  }
}