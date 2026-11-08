/** What went wrong, in words: the message of an error, a DOMException included, or the thing itself. */
export function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return String(error);
}
