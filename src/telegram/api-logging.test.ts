import { describe, expect, it, vi } from "vitest";
import { withTelegramApiErrorLogging } from "./api-logging.js";

function createHttpError(message: string, underlying?: Error) {
  // Avoid importing grammY HttpError in tests because other suites mock "grammy".
  const err = {
    message,
    name: "HttpError",
    error: underlying ?? new Error("socket hang up"),
  } as unknown as Error;
  // Make constructor.name === "HttpError" for the duck-typing guard.
  Object.setPrototypeOf(err, { constructor: { name: "HttpError" } });
  return err;
}

describe("withTelegramApiErrorLogging", () => {
  it("includes HttpError detail (underlying error) in the log message", async () => {
    const logger = vi.fn();
    const err = createHttpError(
      "Network request for 'sendMessage' failed!",
      new Error("ECONNRESET"),
    );

    await expect(
      withTelegramApiErrorLogging({
        operation: "sendMessage",
        fn: async () => {
          throw err;
        },
        logger,
      }),
    ).rejects.toBe(err);

    const text = String(logger.mock.calls[0]?.[0] ?? "");
    expect(text).toContain("telegram sendMessage failed:");
    expect(text).toContain("Network request");
    expect(text).toContain("detail:");
    expect(text).toContain("ECONNRESET");
  });
});
