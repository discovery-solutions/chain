export declare class StateManager {
    private state;
    private stepCount;
    private totalCost;
    private totalDuration;
    set(key: string, value: any): void;
    get(key: string): any;
    getAll(): {
        [x: string]: any;
    };
    getLastOutput(): any;
    getStepCount(): number;
    addCost(usage: {
        promptTokens: number;
        completionTokens: number;
    }): void;
    getCost(): {
        usd: number;
        tokens: number;
    };
    addDuration(ms: number): void;
    getDuration(): string;
}
