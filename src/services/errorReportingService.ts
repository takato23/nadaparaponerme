/**
 * Error Reporting Service
 * Sends error reports to Supabase for monitoring and debugging
 */

import { supabase } from '../lib/supabase';

export interface ErrorReport {
    error_name: string;
    error_message: string;
    error_stack?: string;
    component_stack?: string;
    url: string;
    user_agent: string;
    user_comment?: string;
    app_version?: string;
}

type AutomaticErrorSource = 'window_error' | 'unhandled_rejection' | 'react_error_boundary';

interface AutomaticErrorPayload {
    source: AutomaticErrorSource;
    errorName?: string;
    message: string;
    stack?: string;
    componentStack?: string;
    userComment?: string;
}

const AUTO_REPORT_DEDUPE_WINDOW_MS = 30_000;
const recentAutomaticReports = new Map<string, number>();
let globalErrorHandlersInstalled = false;

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function cleanupOldAutomaticReportKeys(now: number): void {
    recentAutomaticReports.forEach((timestamp, key) => {
        if (now - timestamp > AUTO_REPORT_DEDUPE_WINDOW_MS) {
            recentAutomaticReports.delete(key);
        }
    });
}

function buildAutomaticReportKey(payload: AutomaticErrorPayload): string {
    const stackPrefix = (payload.stack || '').slice(0, 240);
    return [
        payload.source,
        payload.errorName || 'UnknownError',
        payload.message,
        stackPrefix,
    ].join('::');
}

/**
 * Submit an error report to Supabase
 */
export async function submitErrorReport(report: ErrorReport): Promise<{ success: boolean; error?: string }> {
    try {
        // Get current user if authenticated
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('error_reports')
            .insert({
                user_id: user?.id ?? null,
                error_name: report.error_name,
                error_message: report.error_message,
                error_stack: report.error_stack ?? null,
                component_stack: report.component_stack ?? null,
                url: report.url,
                user_agent: report.user_agent,
                user_comment: report.user_comment ?? null,
                app_version: report.app_version ?? import.meta.env.VITE_APP_VERSION ?? '1.0.0',
            });

        if (error) {
            console.error('Failed to submit error report:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (e) {
        console.error('Error submitting report:', e);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Submit automatic client error report with deduplication.
 */
export async function submitAutomaticErrorReport(payload: AutomaticErrorPayload): Promise<void> {
    if (!isBrowser()) return;

    const now = Date.now();
    cleanupOldAutomaticReportKeys(now);

    const dedupeKey = buildAutomaticReportKey(payload);
    const lastSentAt = recentAutomaticReports.get(dedupeKey);
    if (lastSentAt && (now - lastSentAt) < AUTO_REPORT_DEDUPE_WINDOW_MS) {
        return;
    }
    recentAutomaticReports.set(dedupeKey, now);

    const result = await submitErrorReport({
        error_name: payload.errorName || 'ClientRuntimeError',
        error_message: payload.message,
        error_stack: payload.stack,
        component_stack: payload.componentStack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        user_comment: payload.userComment
            ? `[${payload.source}] ${payload.userComment}`
            : `[${payload.source}] automatic capture`,
    });

    if (!result.success) {
        console.error('Automatic error report failed:', result.error);
    }
}

/**
 * Install global listeners for uncaught errors and unhandled promise rejections.
 * Safe to call multiple times.
 */
export function initializeGlobalErrorCapture(): void {
    if (!isBrowser() || globalErrorHandlersInstalled) return;

    const onWindowError = (event: ErrorEvent): void => {
        const capturedError = event.error;
        const message = (event.message || capturedError?.message || 'Unhandled runtime error').toString();
        const errorName =
            capturedError instanceof Error
                ? capturedError.name
                : event.error && typeof event.error === 'object' && 'name' in event.error
                    ? String((event.error as { name?: unknown }).name || 'WindowError')
                    : 'WindowError';
        const stack =
            capturedError instanceof Error
                ? capturedError.stack
                : undefined;

        void submitAutomaticErrorReport({
            source: 'window_error',
            errorName,
            message,
            stack,
            userComment: `filename=${event.filename || 'unknown'} line=${event.lineno || 0} col=${event.colno || 0}`,
        });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
        const reason = event.reason;
        let message = 'Unhandled promise rejection';
        let errorName = 'UnhandledPromiseRejection';
        let stack: string | undefined;

        if (reason instanceof Error) {
            message = reason.message || message;
            errorName = reason.name || errorName;
            stack = reason.stack;
        } else if (typeof reason === 'string') {
            message = reason;
        } else if (reason !== undefined) {
            try {
                message = JSON.stringify(reason);
            } catch {
                message = String(reason);
            }
        }

        void submitAutomaticErrorReport({
            source: 'unhandled_rejection',
            errorName,
            message,
            stack,
        });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    globalErrorHandlersInstalled = true;
}

/**
 * Generate a mailto link for fallback error reporting
 */
export function generateErrorMailto(report: ErrorReport): string {
    const subject = encodeURIComponent(`[Bug Report] ${report.error_name}: ${report.error_message.slice(0, 50)}`);
    const body = encodeURIComponent(`
Error: ${report.error_name}
Message: ${report.error_message}
URL: ${report.url}
Time: ${new Date().toISOString()}

${report.user_comment ? `User Comment: ${report.user_comment}` : ''}

--- Technical Details ---
${report.error_stack || 'No stack trace available'}
  `.trim());

    return `mailto:soporte@ojodeloca.app?subject=${subject}&body=${body}`;
}
