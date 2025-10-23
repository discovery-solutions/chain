# @discovery-solutions/chain

**AI orchestration for product builders.**

Chain é uma biblioteca TypeScript que simplifica a criação de workflows complexos com LLMs através de encadeamento inteligente de prompts. Construída sobre o [Vercel AI SDK](https://sdk.vercel.ai), oferece patterns prontos e abstrações que facilitam a criação de produtos AI-powered.

## Por que Chain?

**Use AI SDK diretamente quando:**
- Precisa de uma única chamada ao LLM
- Não há compartilhamento de contexto entre chamadas
- Output estruturado simples

**Use Chain quando:**
- Múltiplos steps sequenciais com contexto compartilhado
- Refinamento iterativo (gera → critica → melhora)
- Análise multi-aspecto (analisa A, B, C → sintetiza)
- Enriquecimento progressivo (extrai → enriquece → estrutura)

## Instalação

```bash
npm install github:discovery-solutions/chain
```

Você também precisará instalar os providers que vai usar:

```bash
# Anthropic (Claude)
npm install @ai-sdk/anthropic

# OpenAI (GPT)
npm install @ai-sdk/openai

# Outros providers suportados pelo Vercel AI SDK
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
      prompt: 'Analise este produto: {{input}}',
      schema: z.object({
        problema: z.string(),
        solucao: z.string(),
        mercado: z.string()
      }),
      output: 'analise'
    },
    {
      prompt: 'Com base nesta análise: {{analise}}\n\nGere recomendações estratégicas',
      output: 'recomendacoes'
    }
  ]
})

const result = await chain.run({
  input: 'Um app de meditação com IA'
})

console.log(result.state.recomendacoes)
console.log(`Custo: $${result.cost.usd}`)
```

## Conceitos Principais

### Chain

Uma `Chain` orquestra múltiplos steps de LLM com contexto compartilhado.

```typescript
const chain = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'), // Modelo padrão (opcional)
  steps: [
    'Primeiro step: {{input}}',              // String simples
    {
      id: 'step2',
      model: openai('gpt-4o'),               // Modelo específico
      prompt: 'Segundo step: {{step1}}',
      schema: z.object({ ... }),             // Schema Zod (opcional)
      output: 'resultado'                    // Nome da variável
    }
  ],
  streaming: false,                          // Stream outputs (opcional)
  onStream: (chunk, stepId) => { ... }      // Callback de stream (opcional)
})
```

### Interpolação de Variáveis

Use `{{variavel}}` para referenciar outputs de steps anteriores:

```typescript
steps: [
  {
    prompt: 'Analise: {{input}}',
    output: 'analise'
  },
  {
    prompt: 'Baseado em {{analise}}, recomende ações', // ← Usa output do step anterior
    output: 'acoes'
  }
]
```

### Structured Outputs com Zod

Quando você adiciona um `schema`, Chain usa `generateObject` do AI SDK automaticamente:

```typescript
{
  prompt: 'Extraia informações de: {{texto}}',
  schema: z.object({
    nome: z.string(),
    email: z.string().email(),
    skills: z.array(z.string())
  }),
  output: 'dados'
}

// result.state.dados é tipado e validado automaticamente
```

## Patterns Prontos

Chain inclui 4 patterns que cobrem casos de uso comuns:

### 1. Iterative Refinement

Gera output inicial → critica → refina. Perfeito para melhorar qualidade.

```typescript
import { Patterns } from '@discovery-solutions/chain'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const result = await Patterns.iterativeRefinement({
  prompt: 'Escreva uma headline para um app de meditação',
  schema: z.object({
    headline: z.string().max(60),
    subheadline: z.string().max(120),
    cta: z.string().max(30)
  }),
  model: anthropic('claude-sonnet-4-20250514'),
  iterations: 2,                              // Quantas vezes refinar
  critiqueFocus: ['clareza', 'impacto']       // Focos da crítica
})

console.log(result.final)        // Versão final refinada
console.log(result.iterations)   // Histórico de cada iteração
```

### 2. Research Synthesis

Analisa múltiplos aspectos → sintetiza. Perfeito para análises abrangentes.

```typescript
const result = await Patterns.researchSynthesis({
  input: 'Um SaaS de automação de email marketing',
  aspects: ['mercado', 'concorrência', 'tecnologia', 'riscos'],
  model: anthropic('claude-sonnet-4-20250514'),
  synthesisSchema: z.object({
    viabilidade: z.number().min(0).max(100),
    insights: z.array(z.string()).min(3),
    maior_risco: z.string(),
    maior_oportunidade: z.string()
  })
})

console.log(result.synthesis)           // Síntese estruturada
console.log(result.aspectAnalysis)      // Análise de cada aspecto
```

### 3. Extract Enrich Structure

Extrai dados básicos → enriquece com inferências → estrutura final. Perfeito para processar dados não estruturados.

```typescript
const result = await Patterns.extractEnrichStructure({
  input: 'João Silva, 5 anos de experiência em React, quer remoto',
  baseSchema: z.object({
    name: z.string(),
    experience_years: z.number(),
    skills: z.array(z.string())
  }),
  enrichmentRules: [
    'Inferir senioridade baseado em experiência',
    'Sugerir skills relacionadas',
    'Estimar faixa salarial'
  ],
  finalSchema: z.object({
    name: z.string(),
    experience_years: z.number(),
    seniority: z.enum(['junior', 'mid', 'senior']),
    skills: z.array(z.string()),
    related_skills: z.array(z.string()),
    estimated_salary_brl: z.object({
      min: z.number(),
      max: z.number()
    })
  }),
  model: anthropic('claude-sonnet-4-20250514')
})

console.log(result.final)       // Dados enriquecidos e estruturados
console.log(result.extracted)   // Extração inicial
console.log(result.enriched)    // Enriquecimento intermediário
```

### 4. Generate Variants

Gera múltiplas variantes → avalia → refina as melhores. Perfeito para A/B testing.

```typescript
const result = await Patterns.generateVariants({
  input: 'Seu produto foi lançado com sucesso!',
  count: 5,
  model: openai('gpt-4o'),
  style: 'casual, entusiasmado e urgente',
  constraints: [
    'máximo 50 caracteres',
    'incluir emoji',
    'criar senso de urgência'
  ]
})

console.log(result.variants)      // Top 5 variantes finais
console.log(result.allVariants)   // Todas variantes com scores
// [{ text: '...', score: 85, reasoning: '...' }, ...]
```

## Múltiplos Modelos

Chain suporta qualquer modelo do Vercel AI SDK:

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'

// Claude
model: anthropic('claude-sonnet-4-20250514')

// GPT
model: openai('gpt-4o')
model: openai('gpt-4o-mini')

// Groq (barato e rápido)
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY
})
model: groq('llama-3.1-70b-versatile')

// Modelos diferentes por step
steps: [
  { model: openai('gpt-4o'), prompt: '...' },      // Criatividade
  { model: anthropic('claude-sonnet-4-20250514'), prompt: '...' }  // Análise
]
```

## Streaming

```typescript
const chain = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'),
  steps: ['Escreva um artigo sobre {{topico}}'],
  streaming: true,
  onStream: (chunk, stepId) => {
    process.stdout.write(chunk)
  }
})

await chain.run({ topico: 'IA' })
```

## Exemplos Práticos

### Análise de Produto Multi-Aspecto

```typescript
import { Chain } from '@discovery-solutions/chain'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const productAnalyzer = Chain.create({
  model: anthropic('claude-sonnet-4-20250514'),
  steps: [
    {
      prompt: 'Analise o mercado para: {{produto}}',
      output: 'mercado'
    },
    {
      prompt: 'Analise concorrentes para: {{produto}}',
      output: 'concorrentes'
    },
    {
      prompt: `Sintetize análise completa:
      
Produto: {{produto}}
Mercado: {{mercado}}
Concorrentes: {{concorrentes}}`,
      schema: z.object({
        viabilidade: z.number().min(0).max(100),
        recomendacoes: z.array(z.string()),
        proximo_passo: z.string()
      }),
      output: 'sintese'
    }
  ]
})

const result = await productAnalyzer.run({
  produto: 'App de meditação com IA'
})
```

### Processamento de Currículo

```typescript
import { Patterns } from '@discovery-solutions/chain'
import { z } from 'zod'

const processResume = async (resumeText: string) => {
  return await Patterns.extractEnrichStructure({
    input: resumeText,
    baseSchema: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
      experience_years: z.number(),
      skills: z.array(z.string())
    }),
    enrichmentRules: [
      'Inferir nível de senioridade',
      'Categorizar skills por área (frontend, backend, etc)',
      'Identificar lacunas no currículo',
      'Sugerir melhorias'
    ],
    finalSchema: z.object({
      name: z.string(),
      contact: z.object({
        email: z.string(),
        phone: z.string()
      }),
      experience_years: z.number(),
      seniority: z.enum(['junior', 'mid', 'senior', 'staff']),
      skills_by_category: z.record(z.array(z.string())),
      gaps: z.array(z.string()),
      improvement_suggestions: z.array(z.string()),
      fit_for_roles: z.array(z.string())
    }),
    model: anthropic('claude-sonnet-4-20250514')
  })
}
```

## Cost Tracking

Cada execução retorna informações de custo:

```typescript
const result = await chain.run({ input: '...' })

console.log(result.cost)
// {
//   usd: 0.0234,
//   tokens: 3456
// }

console.log(result.duration) // "5.2s"
```

## API Reference

### `Chain.create(config)`

Cria uma nova chain.

**Config:**
- `model?: LanguageModel` - Modelo padrão (opcional se cada step especificar)
- `steps: (Step | string)[]` - Array de steps
- `streaming?: boolean` - Habilita streaming
- `onStream?: (chunk: string, stepId: string) => void` - Callback de stream

**Step:**
- `id?: string` - ID único (opcional)
- `model?: LanguageModel` - Modelo específico (opcional)
- `prompt: string` - Prompt (use `{{var}}` para interpolação)
- `schema?: z.ZodType` - Schema Zod para structured output (opcional)
- `output?: string` - Nome da variável de output (opcional)
- `after?: string | string[]` - Dependencies (futuro)

### `chain.run(input)`

Executa a chain.

**Returns:**
```typescript
{
  output: any,              // Output final
  state: Record<string, any>, // Todos outputs intermediários
  cost: {
    usd: number,
    tokens: number
  },
  duration: string
}
```

## Desenvolvimento

```bash
# Clone o repo
git clone https://github.com/discovery-solutions/chain.git
cd chain

# Instala dependências
npm install

# Build
npm run build

# Roda exemplos
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
npm run test:examples
```

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repo
2. Crie uma branch (`git checkout -b feature/amazing`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push pra branch (`git push origin feature/amazing`)
5. Abra um Pull Request

## Roadmap

- [ ] Parallel execution (steps rodando em paralelo)
- [ ] Conditional branching (if/else em chains)
- [ ] Sub-chains (chains dentro de chains)
- [ ] Retry strategies customizáveis
- [ ] Caching inteligente
- [ ] Mais patterns (classification, summarization, etc)

## License

MIT © [Discovery Solutions](https://github.com/discovery-solutions)

## Créditos

Construído sobre:
- [Vercel AI SDK](https://sdk.vercel.ai) - Abstração multi-provider
- [Zod](https://zod.dev) - Schema validation