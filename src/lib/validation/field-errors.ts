/**
 * Flattens a Zod error into the shape the admin forms render.
 *
 * The first message per field is kept: a control can only show one, and the
 * first is the one the schema considers most fundamental.
 */
export function fieldErrorsFrom(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
