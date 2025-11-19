/**
 * XSS Protection Utility
 *
 * Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks.
 * Uses DOMPurify to strip all HTML tags while preserving text content.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes user input by removing all HTML tags and dangerous content.
 *
 * @param input - The raw user input string to sanitize
 * @returns Sanitized string with HTML tags removed but text content preserved
 *
 * @example
 * sanitizeUserInput('<script>alert("xss")</script>Hello')
 * // Returns: 'Hello'
 *
 * sanitizeUserInput('Normal text with <b>bold</b>')
 * // Returns: 'Normal text with bold'
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content only
  });
};

/**
 * Sanitizes HTML content while allowing safe formatting tags.
 * Use this for rich text content where basic formatting is acceptable.
 *
 * @param input - The HTML content to sanitize
 * @returns Sanitized HTML with only safe tags preserved
 *
 * @example
 * sanitizeHtmlContent('<p>Hello <script>alert("xss")</script></p>')
 * // Returns: '<p>Hello </p>'
 */
export const sanitizeHtmlContent = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
};

/**
 * Sanitizes an array of strings (useful for tags, lists, etc.)
 *
 * @param items - Array of strings to sanitize
 * @returns Array of sanitized strings
 */
export const sanitizeArray = (items: string[]): string[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(item => typeof item === 'string')
    .map(item => sanitizeUserInput(item))
    .filter(item => item.length > 0);
};
