import DOMPurify from 'dompurify';

/**
 * Sanitizes a string to prevent XSS attacks.
 * @param dirty The dirty string to sanitize
 * @returns The sanitized string
 */
export const sanitize = (dirty: string): string => {
    return DOMPurify.sanitize(dirty);
};

/**
 * Sanitizes an object recursively.
 * @param obj The object to sanitize
 * @returns The sanitized object
 */
export const sanitizeObject = <T>(obj: T): T => {
    if (typeof obj === 'string') {
        return sanitize(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }

    if (typeof obj === 'object' && obj !== null) {
        const result = {} as any;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = sanitizeObject((obj as any)[key]);
            }
        }
        return result;
    }

    return obj;
};
