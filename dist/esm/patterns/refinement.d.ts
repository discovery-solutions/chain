import { LanguageModel } from "ai";
import { z } from "zod";
interface RefinementConfig<T extends z.ZodType<any>> {
    prompt: string;
    schema: T;
    model: LanguageModel;
    iterations?: number;
    critiqueFocus?: string[];
}
export declare function iterativeRefinement<T extends z.ZodType<any>>(config: RefinementConfig<T>): Promise<{
    final: z.infer<T>;
    iterations: Array<{
        output: z.infer<T>;
        critique: string;
    }>;
    cost: any;
    duration: string;
}>;
export {};
