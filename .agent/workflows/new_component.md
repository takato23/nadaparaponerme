---
description: Create a new React component with the correct structure and imports.
---
# New Component Workflow

1.  **Ask for Component Details**: user should provide:
    *   **Name**: (e.g., `Button`)
    *   **Path**: (e.g., `components/ui/Button.tsx`)

2.  **Create Component File**:
    *   Create the file at the specified path.
    *   Use the following template:

    ```tsx
    import React from 'react';
    import { cn } from '@/utils/cn'; // Adjust path if necessary

    interface ComponentNameProps {
      className?: string;
      children?: React.ReactNode;
    }

    export const ComponentName: React.FC<ComponentNameProps> = ({ className, children }) => {
      return (
        <div className={cn('base-class', className)}>
          {children}
        </div>
      );
    };
    ```

3.  **Export Component**:
    *   If there is an `index.ts` in the directory, add the export.
