# Mobile Optimization - Quick Reference

## Touch Targets

```tsx
// Minimum touch target
className="min-w-[44px] min-h-[44px]"

// Comfortable touch target (recommended)
className="w-touch h-touch"  // 44px
className="w-touch-lg h-touch-lg"  // 56px

// Always add
className="touch-manipulation"
```

## Safe Area Insets

```tsx
// For notched devices
className="pt-safe pb-safe px-safe"

// Or inline
<div className="pt-safe">  // Top notch
<nav className="pb-safe">  // Bottom home indicator
```

## Swipeable Modal

```tsx
import SwipeableModal from './components/ui/SwipeableModal';

<SwipeableModal onClose={handleClose}>
  <div data-scrollable="true">  // For scrollable content
    {children}
  </div>
</SwipeableModal>
```

## Swipe-to-Delete Grid

```tsx
import ClosetGridOptimized from './components/ClosetGridOptimized';

<ClosetGridOptimized
  items={items}
  onItemClick={handleClick}
  onItemDelete={handleDelete}  // Optional
  viewMode="list"
/>
```

## Image Optimization

```tsx
import { compressImage, lazyLoadImage } from '../utils/imageOptimization';

// Compress on upload
const dataUrl = await compressImage(file, 800, 0.8);

// Lazy load
<img
  src={imageDataUrl}
  alt="Description"
  loading="lazy"
  decoding="async"
/>
```

## Debounced Search

```tsx
import { useDebounce } from '../hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

// Use debouncedSearchTerm for filtering
```

## Responsive Design

```tsx
// Mobile first
className="text-sm sm:text-base md:text-lg"
className="p-4 sm:p-5 md:p-6"
className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

// Breakpoints
xs: 375px   // iPhone SE
sm: 640px   // Large phones
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
```

## Accessibility

```tsx
// Screen reader labels
<button aria-label="Delete item">
  <TrashIcon />
</button>

// Current page
<a aria-current="page">Home</a>

// Loading state
<div role="status" aria-live="polite">
  Loading...
</div>
```

## Performance Tips

1. **Lazy load components:**
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loader />}>
  <HeavyComponent />
</Suspense>
```

2. **Memoize expensive calculations:**
```tsx
const filteredItems = useMemo(() => {
  return items.filter(/* ... */);
}, [items, searchTerm]);
```

3. **Optimize images:**
- Max width: 800px
- Quality: 0.8 (80%)
- Format: JPEG for photos

## Testing Checklist

```bash
# Build and test
npm run build
npm run preview

# Chrome DevTools
F12 -> Toggle device toolbar (Ctrl+Shift+M)
Select: iPhone 14 Pro
Network: Slow 3G
```

## Common Issues

**Problem:** Touch targets too small
**Solution:** Add `min-w-[44px] min-h-[44px]`

**Problem:** Swipe not working
**Solution:** Check for `touch-manipulation` class

**Problem:** Modal not dismissing
**Solution:** Verify `onClose` prop is passed

**Problem:** Images loading slowly
**Solution:** Add `loading="lazy"` attribute

**Problem:** Layout shift on load
**Solution:** Set explicit width/height on images

## Quick Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Test production build
npm run preview

# Run Lighthouse
npm run build && npm run preview
# Then: Chrome DevTools -> Lighthouse -> Mobile
```

## Resources

- Full docs: `/MOBILE_OPTIMIZATION.md`
- Implementation: `/MOBILE_IMPLEMENTATION_SUMMARY.md`
- This guide: `/MOBILE_QUICK_REFERENCE.md`
