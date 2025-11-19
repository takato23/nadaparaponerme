# Quick Reference - Refactoring Patterns

## Custom Hooks

### useChat - Chat functionality
```tsx
import { useChat } from '../hooks/useChat';

const chat = useChat({
  initialMessages: [welcomeMessage],
  onSendMessage: async (message, messages) => {
    return await aiService.chat(message, messages);
  }
});

// Use: chat.messages, chat.sendMessage, chat.isTyping, chat.messagesEndRef
```

### useModal - Modal state
```tsx
import { useModal, useModals } from '../hooks/useModal';

// Single modal
const modal = useModal();
<Modal isOpen={modal.isOpen} onClose={modal.close} />

// Multiple modals
const modals = useModals(['add', 'edit', 'delete'] as const);
modals.add.open();
```

### useAnalysis - AI operations
```tsx
import { useAnalysis } from '../hooks/useAnalysis';

const analysis = useAnalysis({
  onSuccess: (result) => console.log(result)
});

await analysis.execute(() => aiService.analyzeItem(item));
// Use: analysis.data, analysis.isLoading, analysis.error
```

### useDebounce - Debounced values
```tsx
import { useDebounce } from '../hooks/useDebounce';

const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  performSearch(debouncedSearch);
}, [debouncedSearch]);
```

### useAppModals - App.tsx modals
```tsx
import { useAppModals } from '../hooks/useAppModals';

const modals = useAppModals();
// Use: modals.showAnalytics, modals.setShowAnalytics, etc.
```

## UI Components

### Card
```tsx
import { Card } from './components/ui';

<Card variant="glass" padding="lg" rounded="2xl">
  Content
</Card>
```

### Badge
```tsx
import { Badge, PriorityBadge, QualityBadge } from './components/ui';

<Badge variant="success">Active</Badge>
<PriorityBadge priority="high" />
<QualityBadge quality={8} />
```

### EmptyState
```tsx
import { EmptyState, EmptyStates } from './components/ui';

<EmptyState
  emoji="👔"
  title="No items"
  description="Add your first item"
  actionLabel="Add Item"
  onAction={() => setShowAdd(true)}
/>

<EmptyStates.NoClosetItems />
```

### LoadingButton
```tsx
import { LoadingButton } from './components/ui';

<LoadingButton
  onClick={handleSave}
  isLoading={isSaving}
  variant="primary"
  icon="save"
>
  Guardar
</LoadingButton>
```

### ProductCard
```tsx
import { ProductCard, ProductGrid } from './components/ui';

<ProductCard
  product={{
    name: "Camisa",
    price: 5000,
    brand: "Zara",
    image: "...",
    url: "..."
  }}
  showBrand
/>

<ProductGrid products={products} />
```

## Migration Examples

### Before/After: Chat View
```tsx
// BEFORE (254 lines)
const [messages, setMessages] = useState([]);
const [inputValue, setInputValue] = useState('');
const [isTyping, setIsTyping] = useState(false);
const messagesEndRef = useRef(null);
// ... 50 more lines of chat logic

// AFTER (using useChat)
const chat = useChat({
  initialMessages: [welcomeMsg],
  onSendMessage: async (msg, msgs) => await aiService.chat(msg, msgs)
});
```

### Before/After: UI Components
```tsx
// BEFORE
<div className="liquid-glass p-6 rounded-2xl">
  <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
    Active
  </div>
</div>

// AFTER
<Card variant="glass" padding="lg" rounded="2xl">
  <Badge variant="success">Active</Badge>
</Card>
```

### Before/After: Modal State
```tsx
// BEFORE (App.tsx)
const [showAnalytics, setShowAnalytics] = useState(false);
const [showChat, setShowChat] = useState(false);
const [showWeather, setShowWeather] = useState(false);
// ... 20 more modals

// AFTER
const modals = useAppModals();
modals.showAnalytics, modals.setShowAnalytics
```

## Import Patterns

```tsx
// Hooks
import { useChat } from '../hooks/useChat';
import { useModal } from '../hooks/useModal';
import { useAnalysis } from '../hooks/useAnalysis';

// UI Components (centralized)
import { Card, Badge, EmptyState, LoadingButton } from './components/ui';

// Or individual
import { Card } from './components/ui/Card';
```

## Common Patterns

### Chat Feature
```tsx
const chat = useChat({
  initialMessages: [welcomeMessage],
  onSendMessage: async (message, messages) => {
    return await aiService.chat(message, closet, messages);
  }
});

return (
  <Card variant="default" padding="none">
    <div className="messages">
      {chat.messages.map(msg => (
        <Card key={msg.id} variant={msg.role === 'user' ? 'primary' : 'glass'}>
          {msg.content}
        </Card>
      ))}
      <div ref={chat.messagesEndRef} />
    </div>
    <input
      value={chat.inputValue}
      onChange={e => chat.setInputValue(e.target.value)}
    />
    <LoadingButton
      onClick={() => chat.sendMessage(chat.inputValue)}
      isLoading={chat.isTyping}
    >
      Send
    </LoadingButton>
  </Card>
);
```

### AI Analysis Feature
```tsx
const analysis = useAnalysis({
  onSuccess: (result) => setData(result)
});

return (
  <div>
    <LoadingButton
      onClick={() => analysis.execute(() => aiService.analyze(item))}
      isLoading={analysis.isLoading}
    >
      Analyze
    </LoadingButton>

    {analysis.error && <Badge variant="error">{analysis.error.message}</Badge>}
    {analysis.data && <ResultDisplay data={analysis.data} />}
  </div>
);
```

### Empty State Pattern
```tsx
return (
  <div>
    {items.length === 0 ? (
      <EmptyStates.NoClosetItems />
    ) : (
      <Grid items={items} />
    )}
  </div>
);
```

## File Structure

```
/hooks/
  ├── useChat.ts          - Chat logic
  ├── useModal.ts         - Modal state
  ├── useAnalysis.ts      - AI operations
  ├── useDebounce.ts      - Debounce values
  └── useAppModals.ts     - App.tsx modals

/components/ui/
  ├── Card.tsx            - Container component
  ├── Badge.tsx           - Status badges
  ├── EmptyState.tsx      - Empty states
  ├── LoadingButton.tsx   - Loading buttons
  ├── ProductCard.tsx     - Product display
  └── index.ts            - Exports

/docs/
  ├── REFACTORING_GUIDE.md    - Complete guide
  ├── REFACTORING_SUMMARY.md  - Executive summary
  └── QUICK_REFERENCE.md      - This file
```

## Next Steps

1. **Start with low-risk**: Add useDebounce to search
2. **Adopt components**: Use Card, Badge, EmptyState in new features
3. **Refactor views**: Update FashionChatView with useChat
4. **Refactor App.tsx**: Integrate useAppModals

See **REFACTORING_GUIDE.md** for complete migration strategy.
