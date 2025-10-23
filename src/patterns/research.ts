import { LanguageModel } from "ai";
import { Chain } from "../core/chain.js";
import { z } from "zod";

interface ResearchConfig<T extends z.ZodType<any>> {
  input: string
  aspects: string[] // ["market", "competitors", "technology", "risks"]
  model: LanguageModel
  synthesisSchema: T
}

export async function researchSynthesis<T extends z.ZodType<any>>(
  config: ResearchConfig<T>
): Promise<{
  synthesis: z.infer<T>
  aspectAnalysis: Record<string, string>
  cost: any
  duration: string
}> {
  const steps = []

  // Step por aspecto
  config.aspects.forEach((aspect, i) => {
    steps.push({
      id: `analyze-${aspect}`,
      prompt: `Analyze the ${aspect} aspect of this:

${config.input}

Provide detailed analysis focusing specifically on ${aspect}.`,
      output: aspect
    })
  })

  // Synthesis step
  const aspectsContext = config.aspects.map(a => `${a}: {{${a}}}`).join("\n\n")

  steps.push({
    id: "synthesize",
    prompt: `Synthesize all analyses into a comprehensive output:

${aspectsContext}

Create a unified, structured analysis.`,
    schema: config.synthesisSchema,
    output: "synthesis"
  })

  const chain = Chain.create({
    model: config.model,
    steps
  })

  const result = await chain.run({})

  const aspectAnalysis: Record<string, string> = {}
  config.aspects.forEach(aspect => {
    aspectAnalysis[aspect] = result.state[aspect]
  })

  return {
    synthesis: result.state.synthesis,
    aspectAnalysis,
    cost: result.cost,
    duration: result.duration
  }
}