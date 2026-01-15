---
description: Verify the project health by running lint, tests, and build.
---
# Verification Workflow

This workflow ensures the project is in a good state by running all necessary checks.

1.  **Linting**: Check for code style and quality issues.
    ```bash
    npx eslint .
    ```

2.  **Type Checking**: Ensure there are no TypeScript errors.
    ```bash
    npx tsc --noEmit
    ```

3.  **Tests**: Run the test suite.
    ```bash
    npm run test
    ```

4.  **Build**: Verify the app builds correctly.
    ```bash
    npm run build
    ```
