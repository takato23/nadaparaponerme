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
