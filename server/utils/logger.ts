/* eslint-disable no-console */
export function logInfo(message: string, meta?: unknown) {
  if (meta) {
    console.log(`[info] ${message}`, meta);
  } else {
    console.log(`[info] ${message}`);
  }
}

export function logError(message: string, error: unknown) {
  console.error(`[error] ${message}`, error);
}
