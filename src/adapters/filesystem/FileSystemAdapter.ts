/**
 * File system adapter interface (Port)
 * Abstraction for file system operations, following hexagonal architecture
 */
export abstract class FileSystemAdapter {
  /**
   * Read file contents as string
   */
  abstract readFile(path: string): Promise<string>;

  /**
   * Write file contents
   */
  abstract writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if a file exists
   */
  abstract exists(path: string): Promise<boolean>;

  /**
   * Create a directory (recursive)
   */
  abstract mkdir(path: string): Promise<void>;

  /**
   * Remove a file or directory
   */
  abstract remove(path: string): Promise<void>;

  /**
   * Create a symlink
   */
  abstract symlink(target: string, path: string): Promise<void>;

  /**
   * Check if a path is a symlink
   */
  abstract isSymlink(path: string): Promise<boolean>;

  /**
   * Read symlink target
   */
  abstract readSymlink(path: string): Promise<string>;

  /**
   * List directory contents
   */
  abstract readdir(path: string): Promise<string[]>;

  /**
   * Get file stats
   */
  abstract stat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
}
