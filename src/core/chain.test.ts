import { beforeEach, describe, expect, it, vi } from "vitest"
import { Chain } from "./chain.js"

const aiMockState = vi.hoisted(() => ({
  inFlight: 0,
  maxInFlight: 0,
  prompts: [] as string[]
}))

vi.mock("ai", () => ({
  generateText: vi.fn(async ({ prompt }: { prompt: string }) => {
    aiMockState.prompts.push(prompt)
    aiMockState.inFlight += 1
    aiMockState.maxInFlight = Math.max(aiMockState.maxInFlight, aiMockState.inFlight)

    const delay = prompt === "A" || prompt === "B" ? 40 : 5
    await new Promise(resolve => setTimeout(resolve, delay))

    aiMockState.inFlight -= 1

    return {
      text: `text:${prompt}`,
      usage: {
        inputTokens: 1,
        outputTokens: 1
      }
    }
  }),
  generateObject: vi.fn(async () => ({
    object: { result: { ok: true } },
    usage: {
      inputTokens: 1,
      outputTokens: 1
    }
  })),
  streamText: vi.fn(async () => ({
    textStream: (async function* () {
      yield ""
    })()
  }))
}))

describe("Chain execution order", () => {
  beforeEach(() => {
    aiMockState.inFlight = 0
    aiMockState.maxInFlight = 0
    aiMockState.prompts = []
  })

  it("runs sequentially by default when after is not provided", async () => {
    const chain = Chain.create({
      model: {} as any,
      steps: [
        { id: "first", prompt: "hello", output: "first" },
        { id: "second", prompt: "use {{first}}", output: "second" }
      ]
    })

    const result = await chain.run({})

    expect(result.state.first).toBe("text:hello")
    expect(result.state.second).toBe("text:use text:hello")
    expect(aiMockState.maxInFlight).toBe(1)
  })

  it("runs independent steps in parallel when after is empty and respects dependencies", async () => {
    const chain = Chain.create({
      model: {} as any,
      steps: [
        { id: "a", prompt: "A", output: "a", after: [] },
        { id: "b", prompt: "B", output: "b", after: [] },
        { id: "c", prompt: "C {{a}} {{b}}", output: "c", after: ["a", "b"] }
      ]
    })

    const result = await chain.run({})

    expect(result.state.a).toBe("text:A")
    expect(result.state.b).toBe("text:B")
    expect(result.state.c).toBe("text:C text:A text:B")
    expect(aiMockState.maxInFlight).toBe(2)
  })
})
