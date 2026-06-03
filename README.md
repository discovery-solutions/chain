# @discovery-solutions/chain

**AI orchestration for product builders.**

Chain is a TypeScript library that simplifies building complex LLM workflows with smart prompt chaining. Built on top of the [Vercel AI SDK](https://sdk.vercel.ai), it provides ready-to-use patterns and abstractions to speed up AI-powered product development.

## Why Chain?

**Use AI SDK directly when:**
- You need a single LLM call
- There is no shared context between calls
- You only need simple structured output

**Use Chain when:**
- You need multiple sequential or dependency-based steps with shared context
- You want iterative refinement (generate → critique → improve)
- You need multi-aspect analysis (analyze A, B, C → synthesize)
- You want progressive enrichment (extract → enrich → structure)

## Installation

```bash
npm install github:discovery-solutions/chain
```

You also need to install the model providers you want to use:

```bash
npm install @ai-sdk/anthropic
npm install @ai-sdk/openai
```

## Quick Start

```typescript
import { Chain } from '@discovery-solutions/chain'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const chain = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'),
  steps: [
    {
      prompt: 'Analyze this product: {{input}}',
      schema: z.object({
        problem: z.string(),
        solution: z.string(),
        market: z.string()
      }),
      output: 'analysis'
    },
    {
      prompt: 'Based on this analysis: {{analysis}}\n\nGenerate strategic recommendations',
      output: 'recommendations'
    }
  ]
})

const result = await chain.run({
  input: 'An AI meditation app'
})

console.log(result.state.recommendations)
console.log(`Cost: $${result.cost.usd}`)
```

## Core Concepts

### Chain

A `Chain` orchestrates multiple LLM steps with shared state.

```typescript
const chain = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'),
  steps: [
    'First step: {{input}}',
    {
      id: 'step2',
      model: openai('gpt-4o'),
      prompt: 'Second step: {{step1}}',
      schema: z.object({ ... }),
      output: 'result'
    }
  ],
  streaming: false,
  onStream: (chunk, stepId) => { ... }
})
```

### Variable Interpolation

Use `{{variable}}` to reference prior step outputs:

```typescript
steps: [
  {
    prompt: 'Analyze: {{input}}',
    output: 'analysis'
  },
  {
    prompt: 'Based on {{analysis}}, recommend actions',
    output: 'actions'
  }
]
```

### Structured Outputs with Zod

When a `schema` is provided, Chain automatically uses `generateObject`.

```typescript
{
  prompt: 'Extract information from: {{text}}',
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
    skills: z.array(z.string())
  }),
  output: 'data'
}
```

### Dependency-Based Parallel Execution

You can control execution order with `after`:

- Omit `after` for default sequential behavior
- Use `after: []` to mark a step as independent and eligible for parallel execution
- Use `after: ['step-id']` or `after: ['a', 'b']` to declare dependencies

```typescript
steps: [
  { id: 'market', prompt: 'Analyze market', output: 'market', after: [] },
  { id: 'competitors', prompt: 'Analyze competitors', output: 'competitors', after: [] },
  {
    id: 'synthesis',
    prompt: 'Synthesize {{market}} and {{competitors}}',
    output: 'synthesis',
    after: ['market', 'competitors']
  }
]
```

## Built-in Patterns

Chain ships with 4 patterns for common use cases.

### 1. Iterative Refinement

Generate initial output → critique → refine.

```typescript
import { Patterns } from '@discovery-solutions/chain'

const result = await Patterns.iterativeRefinement({
  prompt: 'Write a landing page headline for a meditation app',
  schema: z.object({
    headline: z.string().max(60),
    subheadline: z.string().max(120),
    cta: z.string().max(30)
  }),
  model: anthropic('claude-sonnet-4-20250514'),
  iterations: 2,
  critiqueFocus: ['clarity', 'impact']
})
```

### 2. Research Synthesis

Analyze multiple aspects in parallel and then synthesize.

```typescript
const result = await Patterns.researchSynthesis({
  input: 'An email marketing automation SaaS',
  aspects: ['market', 'competition', 'technology', 'risks'],
  model: anthropic('claude-sonnet-4-20250514'),
  synthesisSchema: z.object({
    viability: z.number().min(0).max(100),
    insights: z.array(z.string()).min(3),
    biggestRisk: z.string(),
    biggestOpportunity: z.string()
  })
})
```

### 3. Extract Enrich Structure

Extract baseline data → enrich with inference → produce final structure.

```typescript
const result = await Patterns.extractEnrichStructure({
  input: 'John Doe, 5 years React experience, wants remote work',
  baseSchema: z.object({
    name: z.string(),
    experienceYears: z.number(),
    skills: z.array(z.string())
  }),
  enrichmentRules: [
    'Infer seniority based on years of experience',
    'Suggest related skills',
    'Estimate salary range'
  ],
  finalSchema: z.object({
    name: z.string(),
    experienceYears: z.number(),
    seniority: z.enum(['junior', 'mid', 'senior']),
    skills: z.array(z.string()),
    relatedSkills: z.array(z.string()),
    estimatedSalary: z.object({
      min: z.number(),
      max: z.number()
    })
  }),
  model: anthropic('claude-sonnet-4-20250514')
})
```

### 4. Generate Variants

Generate multiple variants → evaluate → refine top options.

```typescript
const result = await Patterns.generateVariants({
  input: 'Your product just launched successfully!',
  count: 5,
  model: openai('gpt-4o'),
  style: 'casual, excited, urgent',
  constraints: ['max 50 characters', 'include emoji', 'create urgency']
})
```

## Skills

This repository includes a `skills/` folder with English Markdown guides for core classes and patterns:

- `skills/chain-class.md`
- `skills/pattern-iterative-refinement.md`
- `skills/pattern-research-synthesis.md`
- `skills/pattern-extract-enrich-structure.md`
- `skills/pattern-generate-variants.md`

Each file documents purpose, parameters, return shape, and example usage.

## Multiple Models

Chain supports any Vercel AI SDK-compatible model.

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai, createOpenAI } from '@ai-sdk/openai'

model: anthropic('claude-sonnet-4-20250514')
model: openai('gpt-4o')
model: openai('gpt-4o-mini')

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY
})
model: groq('llama-3.1-70b-versatile')
```

## Streaming

```typescript
const chain = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'),
  steps: ['Write an article about {{topic}}'],
  streaming: true,
  onStream: chunk => {
    process.stdout.write(chunk)
  }
})

await chain.run({ topic: 'AI' })
```

## Cost Tracking

```typescript
const result = await chain.run({ input: '...' })

console.log(result.cost)
console.log(result.duration)
```

## API Reference

### `Chain.create(config)`

- `model?: LanguageModel`
- `steps: (Step | string)[]`
- `streaming?: boolean`
- `onStream?: (chunk: string, stepId: string) => void`

### `Step`

- `id?: string`
- `model?: LanguageModel`
- `prompt: string`
- `schema?: z.ZodType`
- `output?: string`
- `after?: string | string[]`

### `chain.run(input)`

Returns:

```typescript
{
  output: any,
  state: Record<string, any>,
  cost: {
    usd: number,
    tokens: number
  },
  duration: string
}
```

## Development

```bash
git clone https://github.com/discovery-solutions/chain.git
cd chain
npm install
npm run build
npm test
```

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## Roadmap

- [ ] Conditional branching (if/else in chains)
- [ ] Sub-chains (chains inside chains)
- [ ] Custom retry strategies
- [ ] Smart caching
- [ ] More built-in patterns

## License

MIT © [Discovery Solutions](https://github.com/discovery-solutions)

## Credits

Built on top of:
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Zod](https://zod.dev)