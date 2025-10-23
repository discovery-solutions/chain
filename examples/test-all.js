import "dotenv/config";
import { Patterns } from "../dist/esm/index.js";
import { openai } from "@ai-sdk/openai";
import path from "path";
import fs from "fs";
import z from "zod";

const outputDir = path.join(process.cwd(), "examples", "outputs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function saveOutput(filename, data) {
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filename}`);
}

function log(message) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 ${message}`);
  console.log("=".repeat(60));
}

async function testIterativeRefinement() {
  log("Testing: Iterative Refinement");

  try {
    const result = await Patterns.iterativeRefinement({
      prompt: "Escreva uma headline convincente para landing page de um app de meditação que usa IA para personalizar sessões",
      schema: z.object({
        headline: z.string().max(60).describe("Headline principal"),
        subheadline: z.string().max(120).describe("Subheadline de apoio"),
        cta: z.string().max(30).describe("Texto do botão de call to action")
      }),
      model: openai("gpt-4o-mini"),
      iterations: 2,
      critiqueFocus: ["clareza", "apelo_emocional", "concisao", "originalidade"]
    });

    saveOutput("iterative-refinement.json", {
      pattern: "iterativeRefinement",
      config: {
        iterations: 2,
        critiqueFocus: ["clarity", "emotional appeal", "conciseness", "uniqueness"]
      },
      result: {
        final: result.final,
        iterations: result.iterations,
        cost: result.cost,
        duration: result.duration
      }
    });

    console.log("\n📊 Final Output:");
    console.log(JSON.stringify(result.final, null, 2));
    console.log(`\n💰 Cost: $${result.cost.usd.toFixed(4)}`);
    console.log(`⏱️  Duration: ${result.duration}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    saveOutput("iterative-refinement-error.json", {
      error: error.message,
      stack: error.stack
    });
  }
}

async function testResearchSynthesis() {
  log("Testing: Research Synthesis");

  try {
    const result = await Patterns.researchSynthesis({
      input: "Uma plataforma SaaS que usa IA para automatizar campanhas de email marketing, com foco em negócios de e-commerce",
      aspects: ["market_size", "competition", "technology_stack", "go_to_market", "risks"],
      model: openai("gpt-4o-mini"),
      synthesisSchema: z.object({
        viability_score: z.number().min(0).max(100).describe("Pontuação geral de viabilidade"),
        key_insights: z.array(z.string()).min(3).max(5).describe("Insights mais importantes"),
        recommendations: z.array(z.string()).min(3).describe("Recomendações estratégicas"),
        biggest_risk: z.string().describe("Maior risco"),
        biggest_opportunity: z.string().describe("Maior oportunidade"),
        estimated_time_to_market: z.string().describe("Tempo estimado para lançar MVP")
      })
    });

    saveOutput("research-synthesis.json", {
      pattern: "researchSynthesis",
      config: {
        aspects: ["market_size", "competition", "technology_stack", "go_to_market", "risks"]
      },
      result: {
        synthesis: result.synthesis,
        aspectAnalysis: result.aspectAnalysis,
        cost: result.cost,
        duration: result.duration
      }
    });

    console.log("\n📊 Synthesis:");
    console.log(JSON.stringify(result.synthesis, null, 2));
    console.log(`\n💰 Cost: $${result.cost.usd.toFixed(4)}`);
    console.log(`⏱️  Duration: ${result.duration}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    saveOutput("research-synthesis-error.json", {
      error: error.message,
      stack: error.stack
    });
  }
}

async function testExtractEnrichStructure() {
  log("Testing: Extract Enrich Structure");

  try {
    const result = await Patterns.extractEnrichStructure({
      model: openai("gpt-4o-mini"),
      input: `
        João Silva trabalha com tecnologia há 5 anos.
        Conhece React, Node.js e Python.
        Quer trabalhar remoto e mora em São Paulo.
        Já liderou equipes pequenas de 2-3 pessoas.
      `,
      baseSchema: z.object({
        name: z.string(),
        experience_years: z.number(),
        skills: z.array(z.string()),
        location: z.string(),
        remote_preference: z.boolean()
      }),
      enrichmentRules: [
        "Inferir nível de senioridade baseado em experiência e liderança",
        "Sugerir habilidades relacionadas que provavelmente conhece",
        "Estimar faixa salarial em BRL para o perfil no Brasil",
        "Sugerir títulos de cargo e tipos de empresa compatíveis"
      ],
      finalSchema: z.object({
        name: z.string(),
        experience_years: z.number(),
        seniority: z.enum(["junior", "mid", "senior", "staff", "principal"]),
        skills: z.array(z.string()),
        related_skills: z.array(z.string()).describe("Habilidades relacionadas que provavelmente conhece"),
        location: z.string(),
        remote_preference: z.boolean(),
        estimated_salary_brl: z.object({
          min: z.number(),
          max: z.number()
        }),
        matching_roles: z.array(z.string()).min(3),
        company_types: z.array(z.string()).describe("Tipos de empresa compatíveis"),
        leadership_potential: z.boolean()
      }),
    });

    saveOutput("extract-enrich-structure.json", {
      pattern: "extractEnrichStructure",
      result: {
        final: result.final,
        extracted: result.extracted,
        enriched: result.enriched,
        cost: result.cost,
        duration: result.duration
      }
    });

    console.log("\n📊 Final Structured Output:");
    console.log(JSON.stringify(result.final, null, 2));
    console.log(`\n💰 Cost: $${result.cost.usd.toFixed(4)}`);
    console.log(`⏱️  Duration: ${result.duration}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    saveOutput("extract-enrich-structure-error.json", {
      error: error.message,
      stack: error.stack
    });
  }
}

async function testGenerateVariants() {
  log("Testing: Generate Variants");

  try {
    const result = await Patterns.generateVariants({
      model: openai("gpt-4o-mini"),
      input: "Seu produto foi lançado com sucesso!",
      count: 5,
      style: "casual, entusiasmado e urgente",
      constraints: [
        "máximo 50 caracteres",
        "deve incluir emoji",
        "criar senso de urgência",
        "evitar pontos de exclamação no final"
      ]
    });

    saveOutput("generate-variants.json", {
      pattern: "generateVariants",
      config: {
        count: 5,
        style: "casual, enthusiastic, and urgent",
        constraints: [
          "max 50 characters",
          "must include emoji",
          "create sense of urgency"
        ]
      },
      result: {
        variants: result.variants,
        allVariants: result.allVariants,
        cost: result.cost,
        duration: result.duration
      }
    });

    console.log("\n📊 Top Variants:");
    result.variants.forEach((v, i) => {
      console.log(`${i + 1}. ${v}`);
    });

    console.log("\n📈 All Variants with Scores:");
    result.allVariants
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .forEach((item, i) => {
        console.log(`\n${i + 1}. [${item.score}] ${item.text}`);
        console.log(`   Reasoning: ${item.reasoning}`);
      });

    console.log(`\n💰 Cost: $${result.cost.usd.toFixed(4)}`);
    console.log(`⏱️  Duration: ${result.duration}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    saveOutput("generate-variants-error.json", {
      error: error.message,
      stack: error.stack
    });
  }
}

async function runAllTests() {
  console.log("\n🚀 Starting Chain Pattern Tests\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY environment variable");
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // await testIterativeRefinement();
    // await testResearchSynthesis();
    // await testExtractEnrichStructure();
    await testGenerateVariants();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed successfully!");
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`📁 Outputs saved to: ${outputDir}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();