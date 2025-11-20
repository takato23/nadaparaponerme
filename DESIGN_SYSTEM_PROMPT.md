# Liquid Glass Design System - Prompt Guide

Use this guide to request new features or components that match the "Liquid Glass" aesthetic.

## 1. The "System Prompt" (Copy & Paste this)

When asking for a new feature, start with this context:

> "I need a new component [Component Name] that follows our **'Liquid Glass' Design System**.
>
> **Key Aesthetic Rules:**
> 1.  **Glassmorphism**: Use the global CSS variables for all glass effects:
>     *   `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation))`
>     *   `background-color: rgba(255, 255, 255, var(--glass-opacity))` (or dark mode equivalent)
>     *   `border-radius: var(--glass-radius)`
>     *   Use the `.liquid-glass` or `.glass-card` utility classes.
> 2.  **Typography**: Use `Playfair Display` for headings (serif, elegant) and `Inter`/Sans for UI text.
> 3.  **Colors**: Use our semantic palette: `primary` (Emerald/Teal), `secondary` (Purple/Indigo), `accent` (Pink/Coral).
> 4.  **Animations**: Everything must feel 'alive'. Use `framer-motion` for:
>     *   `whileHover={{ scale: 1.02 }}`
>     *   `whileTap={{ scale: 0.95 }}`
>     *   Smooth page transitions with `layoutId`.
>     *   Spring physics (e.g., `type: "spring", stiffness: 300, damping: 30`).
> 5.  **Depth**: Use subtle shadows (`shadow-soft-lg`), noise textures (`noise-overlay`), and floating background orbs.
>
> **Specific Requirements for [Component Name]:**
> [Describe what the component should do...]"

---

## 2. Technical Reference (For Developers/AI)

### Core CSS Classes
Ensure these classes are used to maintain consistency:

```css
/* The Master Glass Class */
.liquid-glass {
  @apply relative overflow-hidden;
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  background-color: rgba(255, 255, 255, var(--glass-opacity));
  border-radius: var(--glass-radius);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

/* Dark Mode Variant */
.dark .liquid-glass {
  background-color: rgba(15, 23, 42, var(--glass-opacity));
  border-color: rgba(255, 255, 255, 0.1);
}
```

### Animation Standards (Framer Motion)

**Standard Card Hover:**
```jsx
<motion.div
  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)" }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
```

**Page/Modal Transition:**
```jsx
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 20, scale: 0.95 }}
  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} // "Quint" ease
>
```

---

## 3. "Vibe Check" Keywords

Use these words to describe the feeling you want:
*   **"Premium"**: Expensive, polished, high-end fashion.
*   **"Organic"**: Rounded corners, fluid motion, nothing sharp or abrupt.
*   **"Reactive"**: The UI responds to every cursor movement (parallax, glow).
*   **"Translucent"**: Layers should be visible behind other layers (depth).
*   **"Vibrant"**: High saturation in blurs and gradients, but clean backgrounds.
