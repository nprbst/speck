/**
 * TypeScript Interfaces for asciinema Player Integration
 * Feature: 013-asciinema-player
 *
 * These interfaces define the component API contracts for the AsciinemaPlayer
 * Astro component and related entities.
 */

/**
 * Props interface for the AsciinemaPlayer Astro component
 *
 * @example
 * ```astro
 * ---
 * import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
 * import demoFile from '@/assets/demos/speck-install.cast?url';
 * ---
 *
 * <AsciinemaPlayer
 *   src={demoFile}
 *   title="Installing Speck via Claude Code"
 *   loop={true}
 *   speed={1.2}
 *   fallbackImage="/demos/fallbacks/speck-install.png"
 *   fallbackText="Installation process showing bun add command"
 * />
 * ```
 */
export interface AsciinemaPlayerProps {
  /**
   * Path to the .cast recording file (relative or absolute)
   * @required
   * @validation Must be non-empty string ending in `.cast` (VR-001)
   */
  src: string;

  /**
   * Display title shown above the player
   * @optional
   * @validation Should be provided for accessibility (VR-008)
   * @default undefined
   */
  title?: string;

  /**
   * Loop behavior for playback
   * - false: Play once
   * - true: Loop infinitely
   * - number: Loop N times
   * @optional
   * @validation Must be boolean or positive integer (VR-003)
   * @default false
   */
  loop?: boolean | number;

  /**
   * Auto-start playback when component loads
   * @optional
   * @validation Only one player per section should have autoPlay: true (VR-020)
   * @default false
   */
  autoPlay?: boolean;

  /**
   * Playback speed multiplier
   * - 0.5: Half speed
   * - 1.0: Normal speed
   * - 2.0: Double speed
   * @optional
   * @validation Must be between 0.1 and 10 (VR-002)
   * @default 1
   */
  speed?: number;

  /**
   * Theme name for player styling
   * @optional
   * @validation Must be one of the allowed themes (VR-004)
   * @default 'asciinema'
   */
  theme?: 'asciinema' | 'monokai' | 'solarized-dark' | 'solarized-light';

  /**
   * Terminal font size
   * @optional
   * @validation Must be one of: small, medium, big (VR-005)
   * @default 'medium'
   */
  terminalFontSize?: 'small' | 'medium' | 'big';

  /**
   * Path to fallback screenshot (shown on error or JS-disabled)
   * @optional
   * @validation Must be valid image path if provided (VR-006)
   * @default undefined
   */
  fallbackImage?: string;

  /**
   * Text description for fallback content (accessibility)
   * @optional
   * @validation Should be provided if fallbackImage is set (VR-007)
   * @default undefined
   */
  fallbackText?: string;
}

/**
 * Internal state for AsciinemaPlayer component
 * Not exposed as props, used for component logic
 */
export interface PlayerState {
  /**
   * True while recording is loading
   */
  loading: boolean;

  /**
   * True if recording failed to load
   */
  error: boolean;

  /**
   * Human-readable error description
   */
  errorMessage?: string;

  /**
   * Number of retry attempts made
   * @validation Max 3 retries before showing fallback
   */
  retryCount: number;

  /**
   * Current playback state
   */
  isPlaying: boolean;

  /**
   * Whether component is in viewport
   */
  isVisible: boolean;
}

/**
 * Metadata interface for .cast recording files
 * Used for documentation and asset management
 */
export interface CastRecordingMetadata {
  /**
   * Filename with .cast extension
   * @required
   * @validation Must end with .cast (VR-009)
   */
  filename: string;

  /**
   * Full path relative to assets directory
   * @required
   * @validation Must start with website/src/assets/demos/ (VR-010)
   */
  path: string;

  /**
   * Human-readable title for display
   * @required
   */
  title: string;

  /**
   * Longer description of recording content
   * @optional
   */
  description?: string;

  /**
   * Recording duration in seconds (from .cast metadata)
   * @optional
   * @validation Must be positive number if provided (VR-012)
   */
  duration?: number;

  /**
   * ISO 8601 date recording was created
   * @optional
   * @validation Must be valid ISO 8601 format if provided (VR-013)
   */
  createdDate?: string;

  /**
   * File size in bytes
   * @optional
   * @validation Must be < 2,097,152 bytes (2MB) (VR-011)
   */
  fileSize?: number;

  /**
   * Associated fallback screenshot path
   * @optional
   * @validation Must exist at specified path if provided (VR-015)
   */
  fallbackImage?: string;

  /**
   * Associated fallback text description
   * @optional
   */
  fallbackText?: string;

  /**
   * Category for organization
   * @optional
   * @validation Must be one of the allowed categories (VR-014)
   */
  category?: 'installation' | 'workflow' | 'feature-demo';
}

/**
 * Props interface for ErrorFallback component
 * Displayed when .cast file fails to load
 */
export interface ErrorFallbackProps {
  /**
   * Human-readable error description
   * @required
   * @validation Must be non-empty and user-friendly (VR-021)
   */
  errorMessage: string;

  /**
   * Whether retry button should be shown
   * @required
   */
  canRetry: boolean;

  /**
   * Callback function for retry button
   * @required if canRetry is true (VR-022)
   */
  onRetry?: () => void;

  /**
   * Path to screenshot fallback
   * @optional
   * @validation Either fallbackImage or fallbackText should be provided (VR-023)
   */
  fallbackImage?: string;

  /**
   * Text description fallback
   * @optional
   * @validation Either fallbackImage or fallbackText should be provided (VR-023)
   */
  fallbackText?: string;
}

/**
 * Error types for player failures
 */
export type PlayerErrorType =
  | 'NetworkError'      // Network connection issue
  | 'CorruptFile'       // .cast file is invalid JSON
  | 'NotFound'          // File not found (404)
  | 'TimeoutError';     // Loading timed out

/**
 * Error information for player failures
 */
export interface PlayerError {
  type: PlayerErrorType;
  message: string;
  retryAllowed: boolean;
}

/**
 * Configuration for demo section containing players
 */
export interface DemoSectionConfig {
  /**
   * Unique identifier for section
   * @required
   * @validation Must be unique within page (VR-017)
   */
  sectionId: string;

  /**
   * Section heading
   * @required
   */
  title: string;

  /**
   * Section description text
   * @optional
   */
  description?: string;

  /**
   * Array of player configurations
   * @required
   * @validation Must contain at least 1 player (VR-018)
   */
  players: AsciinemaPlayerProps[];

  /**
   * Layout style for multiple players
   * @optional
   * @validation If grid, should contain 2-4 players for best UX (VR-019)
   * @default 'single'
   */
  layout?: 'single' | 'grid';
}

/**
 * .cast file format (asciinema v2)
 * This represents the JSON structure of recording files
 */
export interface CastFileFormat {
  /**
   * Format version (always 2)
   */
  version: 2;

  /**
   * Terminal width in characters
   */
  width: number;

  /**
   * Terminal height in characters
   */
  height: number;

  /**
   * Unix timestamp when recording was created
   */
  timestamp?: number;

  /**
   * Recording title
   */
  title?: string;

  /**
   * Environment variables
   */
  env?: {
    SHELL?: string;
    TERM?: string;
    [key: string]: string | undefined;
  };

  /**
   * Terminal output events
   * Each event is [timestamp, output_text]
   */
  stdout: Array<[number, string]>;
}
