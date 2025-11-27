import { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';

export const useFeatureAccess = (user: User | null) => {
    const hasAccess = useMemo(() => {
        // For now, all authenticated users have access
        // In the future, this could check for subscription status, roles, etc.
        return !!user;
    }, [user]);

    const checkAccess = (feature: string): boolean => {
        if (!user) return false;
        // Add specific feature checks here if needed
        return true;
    };

    return { hasAccess, checkAccess };
};
