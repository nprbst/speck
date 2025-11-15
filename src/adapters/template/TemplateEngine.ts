/**
 * Template engine interface (Port)
 * Abstraction for template rendering (Handlebars, Mustache, etc.)
 * Following hexagonal architecture
 */
export abstract class TemplateEngine {
  /**
   * Render a template from a string
   */
  abstract renderString(template: string, context: Record<string, unknown>): Promise<string>;

  /**
   * Render a template from a file
   */
  abstract renderFile(templatePath: string, context: Record<string, unknown>): Promise<string>;

  /**
   * Register a custom helper function
   */
  abstract registerHelper(name: string, helper: (...args: unknown[]) => unknown): void;

  /**
   * Register a partial template
   */
  abstract registerPartial(name: string, template: string): void;

  /**
   * Compile a template for reuse
   */
  abstract compile(template: string): (context: Record<string, unknown>) => string;
}
