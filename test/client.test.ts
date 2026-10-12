import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APIConnectionError,
  AuthenticationError,
  InsufficientCreditsError,
  InvalidRequestError,
  NotFoundError,
  ParserBee,
} from "../src/index.js";

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function client(status = 200, body: unknown = {}) {
  const { fn, calls } = fakeFetch(status, body);
  return { pb: new ParserBee({ apiKey: "pk_test", fetch: fn }), calls };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ParserBee", () => {
  it("reads the API key from the environment", () => {
    vi.stubEnv("PARSERBEE_API_KEY", "pk_env");
    expect(() => new ParserBee({ fetch: fakeFetch(200, {}).fn })).not.toThrow();
  });

  it("throws without an API key", () => {
    vi.stubEnv("PARSERBEE_API_KEY", "");
    expect(() => new ParserBee()).toThrow(/API key/);
  });

  it("sends the x-api-key header", async () => {
    const { pb, calls } = client(200, { credits_remaining: 5 });
    await pb.getCredits();
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("pk_test");
    expect(headers["User-Agent"]).toMatch(/^parserbee-node\//);
  });

  it("uploads a file from a path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pb-"));
    const path = join(dir, "invoice.pdf");
    await writeFile(path, "%PDF-1.4");
    const { pb, calls } = client(200, { success: true, data: { invoice_number: "INV-001" } });

    const result = await pb.extract("tpl_123", { file: path });

    expect(calls[0].url).toBe("https://app.parserbee.com/api/v1/extract");
    const form = calls[0].init.body as FormData;
    expect(form.get("template_id")).toBe("tpl_123");
    const file = form.get("file") as File;
    expect(file.name).toBe("invoice.pdf");
    expect(file.type).toBe("application/pdf");
    expect(result.data.invoice_number).toBe("INV-001");
  });

  it("uploads a buffer with a file name", async () => {
    const { pb, calls } = client(200, { success: true });
    await pb.extract("tpl_123", { file: Buffer.from("png"), fileName: "receipt.png" });
    const file = (calls[0].init.body as FormData).get("file") as File;
    expect(file.name).toBe("receipt.png");
    expect(file.type).toBe("image/png");
  });

  it("sends JSON for a file URL", async () => {
    const { pb, calls } = client(200, { success: true });
    await pb.extract("tpl_123", { fileUrl: "https://example.com/invoice.pdf" });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      template_id: "tpl_123",
      file_url: "https://example.com/invoice.pdf",
    });
    expect((calls[0].init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("lists templates and escapes ids", async () => {
    const { pb, calls } = client(200, { items: [{ id: "tpl_1" }], total: 1 });
    expect(await pb.listTemplates()).toEqual([{ id: "tpl_1" }]);
    await pb.getTemplate("a/b");
    expect(calls[1].url).toBe("https://app.parserbee.com/api/v1/templates/a%2Fb");
  });

  it("reads activity", async () => {
    const { pb, calls } = client(200, { items: [], total: 0 });
    expect(await pb.listActivity()).toEqual([]);
    await pb.getActivity("req_1");
    expect(calls[1].url).toBe("https://app.parserbee.com/api/v1/activity/req_1");
  });

  it.each([
    [400, InvalidRequestError],
    [401, AuthenticationError],
    [402, InsufficientCreditsError],
    [404, NotFoundError],
  ])("maps HTTP %i to the right error", async (status, ErrorClass) => {
    const { pb } = client(status, { error: "nope", code: "SOME_CODE" });
    const error = await pb.getCredits().catch((e) => e);
    expect(error).toBeInstanceOf(ErrorClass);
    expect(error.code).toBe("SOME_CODE");
    expect(error.status).toBe(status);
  });

  it("exposes the credit balance on a 402", async () => {
    const { pb } = client(402, { error: "Insufficient page credits", code: "INSUFFICIENT_CREDITS", credits_remaining: 0 });
    const error = await pb.extract("tpl_123", { fileUrl: "https://example.com/a.pdf" }).catch((e) => e);
    expect(error).toBeInstanceOf(InsufficientCreditsError);
    expect(error.creditsRemaining).toBe(0);
  });

  it("wraps network errors", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const pb = new ParserBee({ apiKey: "pk_test", fetch: failing });
    await expect(pb.getCredits()).rejects.toBeInstanceOf(APIConnectionError);
  });
});
