export interface JsonSuccessOutput<T> {
  success: true;
  command: string;
  result: T;
}

export interface JsonErrorOutput {
  success: false;
  command: string;
  error: {
    message: string;
    code?: string;
  };
}

export type JsonOutput<T> = JsonSuccessOutput<T> | JsonErrorOutput;

export function createSuccessOutput<T>(command: string, result: T): JsonSuccessOutput<T> {
  return { success: true, command, result };
}

export function createErrorOutput(
  command: string,
  message: string,
  code?: string
): JsonErrorOutput {
  return {
    success: false,
    command,
    error: { message, ...(code ? { code } : {}) },
  };
}

export function printJson<T>(output: JsonOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}
