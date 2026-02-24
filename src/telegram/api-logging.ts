import { danger } from "../globals.js";
import { formatErrorMessage, formatUncaughtError } from "../infra/errors.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import type { RuntimeEnv } from "../runtime.js";

export type TelegramApiLogger = (message: string) => void;

type TelegramApiLoggingParams<T> = {
  operation: string;
  fn: () => Promise<T>;
  runtime?: RuntimeEnv;
  logger?: TelegramApiLogger;
  shouldLog?: (err: unknown) => boolean;
};

const fallbackLogger = createSubsystemLogger("telegram/api");

function isTelegramHttpError(err: unknown): err is { error?: unknown } {
  if (!err || typeof err !== "object") {
    return false;
  }
  const ctorName = (err as { constructor?: { name?: unknown } }).constructor?.name;
  return ctorName === "HttpError" && "error" in (err as Record<string, unknown>);
}

function resolveTelegramApiLogger(runtime?: RuntimeEnv, logger?: TelegramApiLogger) {
  if (logger) {
    return logger;
  }
  if (runtime?.error) {
    return runtime.error;
  }
  return (message: string) => fallbackLogger.error(message);
}

export async function withTelegramApiErrorLogging<T>({
  operation,
  fn,
  runtime,
  logger,
  shouldLog,
}: TelegramApiLoggingParams<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!shouldLog || shouldLog(err)) {
      const errText = formatErrorMessage(err);
      const detail = isTelegramHttpError(err)
        ? ` (detail: ${formatUncaughtError(err.error ?? err)})`
        : "";
      const log = resolveTelegramApiLogger(runtime, logger);
      log(danger(`telegram ${operation} failed: ${errText}${detail}`));
    }
    throw err;
  }
}
