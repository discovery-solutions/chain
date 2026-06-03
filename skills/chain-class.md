# Chain Class Skill

## Purpose
Use `Chain` to orchestrate multi-step LLM workflows with shared state, interpolation, and dependency-based execution.

## Import
```typescript
import { Chain } from '@discovery-solutions/chain'
```

## API

### `Chain.create(config: ChainConfig): Chain`
Creates a new chain instance.

### `chain.run(input: Record<string, any>)`
Executes the configured steps and returns:
- `output: any`
- `state: Record<string, any>`
- `cost: { usd: number; tokens: number }`
- `duration: string`

## `ChainConfig` Parameters
- `model?: LanguageModel` default model used by steps
- `steps: (Step | string)[]` workflow steps
- `streaming?: boolean` enables streaming in text generation steps
- `onStream?: (chunk: string, stepId: string) => void` stream callback

## `Step` Parameters
- `id?: string` unique step id
- `model?: LanguageModel` step-specific model
- `prompt: string` prompt template
- `output?: string` output key in shared state
- `schema?: z.ZodType<any>` structured output schema
- `after?: string | string[]` explicit dependencies

## Execution Rules
- Missing `after` means default sequential dependency on previous step
- `after: []` marks a step as independent and eligible for parallel execution
- `after: ['a', 'b']` waits for both dependencies
- Circular or unknown dependencies throw errors

## Interpolation
- Use `{{key}}` to inject `state[key]`
- Use dotted paths like `{{analysis.summary}}` for nested objects

## Minimal Example
```typescript
const chain = Chain.create({
  model,
  steps: [
    { id: 'a', prompt: 'Analyze market', output: 'market', after: [] },
    { id: 'b', prompt: 'Analyze competitors', output: 'competitors', after: [] },
    {
      id: 'c',
      prompt: 'Synthesize {{market}} and {{competitors}}',
      output: 'synthesis',
      after: ['a', 'b']
    }
  ]
})

const result = await chain.run({})
```