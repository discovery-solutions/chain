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
        for (const batch of executionBatches) {
            await Promise.all(batch.map(step => this.executeStep(step)));
        }
        return {
            output: this.state.get("output") || this.state.getLastOutput(),
            state: this.state.getAll(),
            cost: this.state.getCost(),
            duration: this.state.getDuration(),
        };
    }
    async executeStep(step) {
        const startTime = Date.now();
        const prompt = this.interpolate(step.prompt);
        const model = step.model || this.config.model;
        if (!model) {
            throw new Error(`No model specified for step "${step.id}"`);
        }
        const outputKey = step.output || `step${this.state.getStepCount()}`;
        if (step.schema) {
            // generateObject is deprecated in AI SDK v5+ in favour of
            // generateText + Output.object(). Import Output from "ai".
            const { output, usage } = await (0, ai_1.generateText)({
                model,
                prompt,
                output: ai_1.Output.object({ schema: step.schema }),
            });
            this.state.set(outputKey, output);
            this.state.addCost({
                promptTokens: usage.inputTokens ?? 0,
                completionTokens: usage.outputTokens ?? 0,
            });
        }
        else if (this.config.streaming) {
            const { textStream, usage: usagePromise } = (0, ai_1.streamText)({ model, prompt });
            let fullText = "";
            for await (const chunk of textStream) {
                fullText += chunk;
                this.config.onStream?.(chunk, step.id ?? "unknown");
            }
            // usage resolves after the stream is fully consumed
            const usage = await usagePromise;
            this.state.set(outputKey, fullText);
            this.state.addCost({
                promptTokens: usage.inputTokens ?? 0,
                completionTokens: usage.outputTokens ?? 0,
            });
        }
        else {
            const { text, usage } = await (0, ai_1.generateText)({ model, prompt });
            this.state.set(outputKey, text);
            this.state.addCost({
                promptTokens: usage.inputTokens ?? 0,
                completionTokens: usage.outputTokens ?? 0,
            });
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
                    output: `step${index + 1}`,
                };
            }
            return {
                id: step.id || `step${index + 1}`,
                ...step,
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
                    throw new Error(`Step "${stepId}" depends on unknown step "${dependencyId}"`);
                }
            }
        }
        const completed = new Set();
        const batches = [];
        while (completed.size < steps.length) {
            const readySteps = steps.filter(step => {
                if (completed.has(step.id))
                    return false;
                const dependencies = dependenciesByStep.get(step.id) ?? [];
                return dependencies.every(dep => completed.has(dep));
            });
            if (readySteps.length === 0) {
                const remaining = steps
                    .filter(step => !completed.has(step.id))
                    .map(step => step.id)
                    .join(", ");
                throw new Error(`Circular dependency detected. Remaining steps: ${remaining}`);
            }
            batches.push(readySteps);
            readySteps.forEach(step => completed.add(step.id));
        }
        return batches;
    }
}
exports.Chain = Chain;
