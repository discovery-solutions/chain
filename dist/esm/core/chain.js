import { generateText, streamText, generateObject } from "ai";
import { StateManager } from "./state.js";
import { z } from "zod";
export class Chain {
    constructor(config) {
        this.config = config;
        this.state = new StateManager();
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
            const { object, usage } = await generateObject({
                schema: z.object({ result: step.schema }),
                output: "object",
                mode: "json",
                prompt: `Retorne **somente JSON válido**, sem texto explicativo. Siga exatamente o schema abaixo, incluindo todos os campos obrigatórios. ${prompt}`,
                model,
            });
            this.state.set(outputKey, object.result);
            this.state.addCost({
                promptTokens: usage.inputTokens,
                completionTokens: usage.outputTokens
            });
        }
        // Senão, usa generateText
        else {
            if (this.config.streaming) {
                const { textStream } = await streamText({ model, prompt });
                let fullText = "";
                for await (const chunk of textStream) {
                    fullText += chunk;
                    this.config.onStream?.(chunk, step.id || "unknown");
                }
                this.state.set(outputKey, fullText);
            }
            else {
                const { text, usage } = await generateText({ model, prompt });
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
        const dependenciesByStep = new Map();
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const currentStepId = step.id;
            let dependencies;
            if (step.after !== undefined) {
                dependencies = Array.isArray(step.after) ? step.after : [step.after];
            }
            else if (i === 0) {
                dependencies = [];
            }
            else {
                dependencies = [steps[i - 1].id];
            }
            dependenciesByStep.set(currentStepId, dependencies);
        }
        for (const [stepId, dependencies] of dependenciesByStep.entries()) {
            for (const dependencyId of dependencies) {
                if (!dependenciesByStep.has(dependencyId)) {
                    throw new Error(`Step \"${stepId}\" depends on unknown step \"${dependencyId}\"`);
                }
            }
        }
        const completed = new Set();
        const batches = [];
        while (completed.size < steps.length) {
            const readySteps = steps.filter(step => {
                if (completed.has(step.id)) {
                    return false;
                }
                const dependencies = dependenciesByStep.get(step.id) || [];
                return dependencies.every(dependencyId => completed.has(dependencyId));
            });
            if (readySteps.length === 0) {
                const remaining = steps.filter(step => !completed.has(step.id));
                throw new Error(`Circular dependency detected. Remaining steps: ${remaining.map(step => step.id).join(", ")}`);
            }
            batches.push(readySteps);
            readySteps.forEach(step => completed.add(step.id));
        }
        return batches;
    }
}
