# Pattern Skill: researchSynthesis

## Purpose
Analyze multiple aspects in parallel and then synthesize a unified structured conclusion.

## Import
```typescript
import { Patterns } from '@discovery-solutions/chain'
```

## Function
`Patterns.researchSynthesis(config)`

## Parameters
- `input: string` subject to analyze
- `aspects: string[]` analysis dimensions, for example `['market', 'competition', 'risks']`
- `model: LanguageModel` model used across steps
- `synthesisSchema: z.ZodType` schema for final synthesis output

## Returns
- `synthesis` structured final output
- `aspectAnalysis` map from aspect to generated analysis text
- `cost`
- `duration`

## Execution Details
- Aspect analysis steps are independent and run in parallel
- Final synthesis depends on all analysis steps

## Best For
- Product discovery memos
- Competitive intelligence summaries
- Opportunity and risk reports

## Example
```typescript
const result = await Patterns.researchSynthesis({
  input: 'AI note-taking app',
  aspects: ['market', 'competition', 'technology', 'risks'],
  model,
  synthesisSchema
})
```