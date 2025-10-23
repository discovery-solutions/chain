import { LanguageModel } from "ai";
import { z } from "zod";
interface ExtractEnrichConfig<T extends z.ZodType<any>> {
    input: string;
    baseSchema: z.ZodType<any>;
    enrichmentRules?: string[];
    finalSchema: T;
    model: LanguageModel;
}
export declare function extractEnrichStructure<T extends z.ZodType<any>>(config: ExtractEnrichConfig<T>): Promise<{
    final: z.infer<T>;
    extracted: any;
    enriched: any;
    cost: any;
    duration: string;
}>;
export {};
