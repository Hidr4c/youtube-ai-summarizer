/**
 * Value Object representing a single timed segment of video subtitles
 */
export class TranscriptSegment {
  /**
   * @param {number} startMs - Start time in milliseconds
   * @param {number} durationMs - Duration in milliseconds
   * @param {string} text - Cleaned text content
   */
  constructor(startMs = 0, durationMs = 0, text = '') {
    this.startMs = Number(startMs) || 0;
    this.durationMs = Number(durationMs) || 0;
    this.text = String(text || '').trim();
    this.timestamp = this.formatTime();
  }

  /**
   * Formats start time into m:ss or h:mm:ss format
   * @returns {string}
   */
  formatTime() {
    const totalSeconds = Math.floor(this.startMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
  }
}

export default TranscriptSegment;
