import { LanguageModel } from "ai";
import { z } from "zod";
interface ResearchConfig<T extends z.ZodType<any>> {
    input: string;
    aspects: string[];
    model: LanguageModel;
    synthesisSchema: T;
}
export declare function researchSynthesis<T extends z.ZodType<any>>(config: ResearchConfig<T>): Promise<{
    synthesis: z.infer<T>;
    aspectAnalysis: Record<string, string>;
    cost: any;
    duration: string;
}>;
export {};
