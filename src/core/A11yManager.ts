/**
 * A11yManager - Handles screen reader announcements for the game.
 * Uses an offscreen aria-live region to read dialogue, messages, and UI prompts.
 */

class A11yManager {
  private announcer: HTMLElement | null = null;
  private currentTimeout: ReturnType<typeof globalThis.setTimeout> | null = null;

  constructor() {
    this.announcer = this.getAnnouncer();
  }

  /**
   * Announces text to screen readers.
   * @param text The text to announce.
   * @param assertive If true, uses aria-live="assertive" to interrupt current speech.
   */
  announce(text: string, assertive: boolean = false): void {
    if (!this.announcer) {
      this.announcer = this.getAnnouncer();
      if (!this.announcer) return;
    }

    // Set assertiveness
    this.announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');

    // Force a DOM update by clearing and resetting the text slightly later
    // This ensures that identical consecutive messages are still announced.
    this.announcer.textContent = '';

    if (this.currentTimeout !== null) {
      globalThis.clearTimeout(this.currentTimeout);
    }

    this.currentTimeout = globalThis.setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = text;
      }
      this.currentTimeout = null;
    }, 50);
  }

  /**
   * Clears the current announcement.
   */
  clear(): void {
    if (this.announcer) {
      this.announcer.textContent = '';
    }
  }

  private getAnnouncer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.getElementById('a11y-announcer');
  }
}

export const a11yManager = new A11yManager();
