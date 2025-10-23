import { LanguageModel } from "ai";
interface VariantsConfig {
    input: string;
    count: number;
    model: LanguageModel;
    style?: string;
    constraints?: string[];
}
export declare function generateVariants(config: VariantsConfig): Promise<{
    variants: string[];
    allVariants: Array<{
        text: string;
        score: number;
        reasoning: string;
    }>;
    cost: any;
    duration: string;
}>;
export {};
