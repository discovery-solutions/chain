"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chain = void 0;
const ai_1 = require("ai");
const state_js_1 = require("./state.js");
class Chain {
    constructor(config) {
        this.config = config;
        this.state = new state_js_1.StateManager();
    }
    static create(config) {
        return new Chain(config);
    }
    async run(input) {
        this.state.set("input", input);
        const steps = this.normalizeSteps(this.config.steps);
        const executionBatches = this.resolveExecutionOrder(steps);
        // Executa cada batch em paralelo
        for (const batch of executionBatches) {
            await Promise.all(batch.map(step => this.executeStep(step)));
        }
        return {
            output: this.state.get("output") || this.state.getLastOutput(),
            state: this.state.getAll(),
            cost: this.state.getCost(),
            duration: this.state.getDuration()
        };
    }
    async executeStep(step) {
        const startTime = Date.now();
        const prompt = this.interpolate(step.prompt);
        const model = step.model || this.config.model;
        if (!model) {
            throw new Error(`No model specified for step ${step.id}`);
        }
        const outputKey = step.output || `step${this.state.getStepCount()}`;
        // Se tem schema, usa generateObject
        if (step.schema) {
            const { object, usage } = await (0, ai_1.generateObject)({
                schema: step.schema,
                output: "object",
                mode: "json",
                prompt: `Retorne **somente JSON válido**, sem texto explicativo. Siga exatamente o schema abaixo, incluindo todos os campos obrigatórios. ${prompt}`,
                model,
            });
            this.state.set(outputKey, object);
            this.state.addCost({
                promptTokens: usage.inputTokens,
                completionTokens: usage.outputTokens
            });
        }
        // Senão, usa generateText
        else {
            if (this.config.streaming) {
                const { textStream } = await (0, ai_1.streamText)({ model, prompt });
                let fullText = "";
                for await (const chunk of textStream) {
                    fullText += chunk;
                    this.config.onStream?.(chunk, step.id || "unknown");
                }
                this.state.set(outputKey, fullText);
            }
            else {
                const { text, usage } = await (0, ai_1.generateText)({ model, prompt });
                this.state.set(outputKey, text);
                this.state.addCost({
                    promptTokens: usage.inputTokens,
                    completionTokens: usage.outputTokens
                });
            }
        }
        this.state.addDuration(Date.now() - startTime);
    }
    interpolate(prompt) {
        return prompt.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
            const value = this.resolvePath(path);
            if (typeof value === "object" && value !== null) {
                return JSON.stringify(value, null, 2);
            }
            return value ?? `{{${path}}}`;
        });
    }
    resolvePath(path) {
        const keys = path.split(".");
        let value = this.state.get(keys.shift());
        for (const key of keys) {
            if (value && typeof value === "object" && key in value) {
                value = value[key];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    normalizeSteps(steps) {
        return steps.map((step, index) => {
            if (typeof step === "string") {
                return {
                    id: `step${index + 1}`,
                    prompt: step,
                    output: `step${index + 1}`
                };
            }
            return {
                id: step.id || `step${index + 1}`,
                ...step
            };
        });
    }
    resolveExecutionOrder(steps) {
        // Se nenhum step tem dependencies, roda tudo sequencial (backward compatibility)
        const hasAfter = steps.some(s => s.after);
        if (!hasAfter) {
            return steps.map(s => [s]); // Um step por batch (sequencial)
        }
        // Topological sort com batching paralelo
        const stepsById = new Map(steps.map(s => [s.id, s]));
        const completed = new Set();
        const batches = [];
        while (completed.size < steps.length) {
            // Encontra steps que podem rodar agora (deps satisfeitas)
            const readySteps = steps.filter(step => {
                if (completed.has(step.id))
                    return false;
                const deps = Array.isArray(step.after)
                    ? step.after
                    : step.after
                        ? [step.after]
                        : [];
                return deps.every(dep => completed.has(dep));
            });
            if (readySteps.length === 0) {
                // Ciclo detectado ou erro
                const remaining = steps.filter(s => !completed.has(s.id));
                throw new Error(`Circular dependency or missing dependency detected. ` +
                    `Remaining steps: ${remaining.map(s => s.id).join(', ')}`);
            }
            // Adiciona batch e marca como completos
            batches.push(readySteps);
            readySteps.forEach(s => completed.add(s.id));
        }
        return batches;
    }
}
exports.Chain = Chain;
