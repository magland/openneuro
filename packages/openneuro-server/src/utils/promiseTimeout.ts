import { PromiseTimeoutError } from "../types/promiseTimeoutError.ts"

/**
 * Add a timeout to a promise and return null if timeout occurs before the promise resolves
 * @param promise Promise to timeout
 * @param timeout Timeout in milliseconds
 */
export async function promiseTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new PromiseTimeoutError("Operation timed out")),
          timeout,
        )
      ),
    ])

    return result
  } catch (error) {
    if (error instanceof PromiseTimeoutError) {
      return null
    } else {
      throw error // Re-throw other errors
    }
  }
}
