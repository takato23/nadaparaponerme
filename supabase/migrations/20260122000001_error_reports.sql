-- Error Reports Table
-- Stores user-submitted error reports for debugging and monitoring

CREATE TABLE IF NOT EXISTS public.error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_name TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_stack TEXT,
    url TEXT,
    user_agent TEXT,
    user_comment TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_error_reports_created_at ON public.error_reports(created_at DESC);
CREATE INDEX idx_error_reports_user_id ON public.error_reports(user_id);

-- RLS Policies
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own error reports
CREATE POLICY "Users can insert error reports"
    ON public.error_reports
    FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can view their own reports (optional, for "my reports" feature)
CREATE POLICY "Users can view their own reports"
    ON public.error_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT INSERT ON public.error_reports TO authenticated;
GRANT INSERT ON public.error_reports TO anon;
GRANT SELECT ON public.error_reports TO authenticated;

COMMENT ON TABLE public.error_reports IS 'User-submitted error reports for debugging';
