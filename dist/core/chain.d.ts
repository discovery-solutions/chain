import { LanguageModel } from "ai";
import { z } from "zod";
export interface Step {
    id?: string;
    model?: LanguageModel;
    prompt: string;
    output?: string;
    schema?: z.ZodType<any>;
    after?: string | string[];
}
export interface ChainConfig {
    model?: LanguageModel;
    steps: (Step | string)[];
    streaming?: boolean;
    onStream?: (chunk: string, stepId: string) => void;
}
export declare class Chain {
    private config;
    private state;
    constructor(config: ChainConfig);
    static create(config: ChainConfig): Chain;
    run(input: Record<string, any>): Promise<{
        output: any;
        state: {
            [x: string]: any;
        };
        cost: {
            usd: number;
            tokens: number;
        };
        duration: string;
    }>;
    private executeStep;
    private interpolate;
    private resolvePath;
    private normalizeSteps;
    private resolveExecutionOrder;
}
