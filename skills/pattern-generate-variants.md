# Pattern Skill: generateVariants

## Purpose
Generate many candidates, evaluate and score them, then output refined final variants.

## Import
```typescript
import { Patterns } from '@discovery-solutions/chain'
```

## Function
`Patterns.generateVariants(config)`

## Parameters
- `input: string` base text or concept
- `count: number` number of final variants requested
- `model: LanguageModel` model used in all stages
- `style?: string` style guidance
- `constraints?: string[]` hard or soft constraints

## Returns
- `variants: string[]` final selected/refined variants
- `allVariants: Array<{ text: string; score: number; reasoning: string }>` evaluation output
- `cost`
- `duration`

## Best For
- A/B messaging options
- CTA experiments
- Notification and headline ideation

## Example
```typescript
const result = await Patterns.generateVariants({
  input: 'Your feature is live',
  count: 5,
  model,
  style: 'short and urgent',
  constraints: ['max 50 chars']
})
```