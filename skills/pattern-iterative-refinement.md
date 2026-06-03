# Pattern Skill: iterativeRefinement

## Purpose
Generate a first draft, critique it, and iteratively improve output quality.

## Import
```typescript
import { Patterns } from '@discovery-solutions/chain'
```

## Function
`Patterns.iterativeRefinement(config)`

## Parameters
- `prompt: string` initial generation task
- `schema: z.ZodType` output schema for each generated version
- `model: LanguageModel` model used in all steps
- `iterations?: number` number of critique/refine loops, default `1`
- `critiqueFocus?: string[]` optional quality dimensions for critique

## Returns
- `final` final refined structured output
- `iterations` history with version output and critique text
- `cost`
- `duration`

## Best For
- Landing page copy refinement
- Product messaging quality improvements
- Structured output polishing with strict schemas

## Example
```typescript
const result = await Patterns.iterativeRefinement({
  prompt: 'Write a product headline',
  schema,
  model,
  iterations: 2,
  critiqueFocus: ['clarity', 'specificity']
})
```