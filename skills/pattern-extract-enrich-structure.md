# Pattern Skill: extractEnrichStructure

## Purpose
Convert raw text into structured output through three stages: extraction, enrichment, and final structuring.

## Import
```typescript
import { Patterns } from '@discovery-solutions/chain'
```

## Function
`Patterns.extractEnrichStructure(config)`

## Parameters
- `input: string` raw source text
- `baseSchema: z.ZodType<any>` schema for extraction step
- `enrichmentRules?: string[]` optional enrichment instructions
- `finalSchema: z.ZodType` schema for final output
- `model: LanguageModel` model used in all steps

## Returns
- `final` structured final object
- `extracted` extracted base object
- `enriched` enrichment output
- `cost`
- `duration`

## Best For
- Resume parsing
- CRM/contact normalization
- Lead enrichment workflows

## Example
```typescript
const result = await Patterns.extractEnrichStructure({
  input: resumeText,
  baseSchema,
  enrichmentRules: ['Infer seniority', 'Suggest related skills'],
  finalSchema,
  model
})
```