/**
 * Base Strongly-Typed Domain Error
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {any} details
   */
  constructor(message, code = 'ERR_INTERNAL', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
