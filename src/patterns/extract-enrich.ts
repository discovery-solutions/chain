import { LanguageModel } from "ai";
import { Chain } from "../core/chain.js";
import { z } from "zod";

interface ExtractEnrichConfig<T extends z.ZodType<any>> {
  input: string
  baseSchema: z.ZodType<any> // Schema básico (step 1)
  enrichmentRules?: string[] // O que enriquecer
  finalSchema: T // Schema final (step 3)
  model: LanguageModel
}

export async function extractEnrichStructure<T extends z.ZodType<any>>(
  config: ExtractEnrichConfig<T>
): Promise<{
  final: z.infer<T>
  extracted: any
  enriched: any
  cost: any
  duration: string
}> {
  const enrichmentText = config.enrichmentRules?.length
    ? `\nEnrichment rules:\n${config.enrichmentRules.map(r => `- ${r}`).join("\n")}`
    : ""

  const chain = Chain.create({
    model: config.model,
    steps: [
      // Step 1: Extração básica
      {
        id: "extract",
        prompt: `Extract basic information from this text:

${config.input}`,
        schema: config.baseSchema,
        output: "extracted"
      },

      // Step 2: Enriquecimento
      {
        id: "enrich",
        prompt: `Enrich this data with additional context and inferences:

Data:
{{extracted}}
${enrichmentText}

Add missing information through logical inference.`,
        output: "enriched"
      },

      // Step 3: Estruturação final
      {
        id: "structure",
        prompt: `Structure this into final format:

Extracted:
{{extracted}}

Enriched:
{{enriched}}

Create final structured output.`,
        schema: config.finalSchema,
        output: "final"
      }
    ]
  })

  const result = await chain.run({})

  return {
    final: result.state.final,
    extracted: result.state.extracted,
    enriched: result.state.enriched,
    cost: result.cost,
    duration: result.duration
  }
}