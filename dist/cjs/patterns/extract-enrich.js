"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEnrichStructure = extractEnrichStructure;
const chain_js_1 = require("../core/chain.js");
async function extractEnrichStructure(config) {
    const enrichmentText = config.enrichmentRules?.length
        ? `\nEnrichment rules:\n${config.enrichmentRules.map(r => `- ${r}`).join("\n")}`
        : "";
    const chain = chain_js_1.Chain.create({
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
    });
    const result = await chain.run({});
    return {
        final: result.state.final,
        extracted: result.state.extracted,
        enriched: result.state.enriched,
        cost: result.cost,
        duration: result.duration
    };
}
