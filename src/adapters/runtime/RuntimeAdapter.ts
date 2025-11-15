/**
 * Command execution result
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Runtime adapter interface (Port)
 * Abstraction for runtime operations (shell execution, process management)
 * Following hexagonal architecture
 */
export abstract class RuntimeAdapter {
  /**
   * Execute a shell command
   */
  abstract exec(command: string, options?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult>;

  /**
   * Execute a shell command and stream output
   */
  abstract spawn(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> }
  ): Promise<ExecResult>;

  /**
   * Get current working directory
   */
  abstract getCwd(): Promise<string>;

  /**
   * Change current working directory
   */
  abstract chdir(path: string): Promise<void>;

  /**
   * Get environment variable
   */
  abstract getEnv(key: string): string | undefined;

  /**
   * Set environment variable
   */
  abstract setEnv(key: string, value: string): void;
}
