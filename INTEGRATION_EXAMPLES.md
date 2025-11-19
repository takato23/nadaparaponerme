# 🔌 Integration Examples - Copy-Paste Ready Code

**Quick integration examples for enhanced outfit generation**

---

## 📦 1. Basic Setup (Required for All Versions)

### Step 1: Export helpers from geminiService.ts

Add to `services/geminiService.ts`:

```typescript
// Export these functions for enhanced generators
export { getAIClient, retryWithBackoff };
```

### Step 2: Import in your component

```typescript
// In App.tsx or wherever you handle outfit generation
import {
  generateOutfitEnhancedV1,
  generateOutfitEnhancedV2,
  generateOutfitEnhancedV3,
  type EnhancedFitResult
} from './services/generateOutfit-enhanced';

import { getAIClient, retryWithBackoff } from './services/geminiService';
```

---

## 🚀 2. Drop-in Replacement (v1)

**Replace your existing handler with this:**

```typescript
// BEFORE
async function handleGenerateFit(userPrompt: string) {
  setLoading(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    const result = await generateOutfit(userPrompt, uniqueInventory);

    setFitResult(result);
    setCurrentView('result');
  } catch (error) {
    console.error("Error generating outfit:", error);
    setError(error.message || "No se pudo generar un outfit.");
  } finally {
    setLoading(false);
  }
}

// AFTER (Enhanced v1)
async function handleGenerateFit(userPrompt: string) {
  setLoading(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    // ✨ Enhanced generation
    const result = await generateOutfitEnhancedV1(
      userPrompt,
      uniqueInventory,
      getAIClient,
      retryWithBackoff
    );

    setFitResult(result);
    setCurrentView('result');

    // 🆕 NEW: Log enhanced data
    console.log('Confidence Score:', result.confidence_score);
    console.log('Reasoning:', result.reasoning);

  } catch (error) {
    console.error("Error generating outfit:", error);
    setError(error.message || "No se pudo generar un outfit.");
  } finally {
    setLoading(false);
  }
}
```

**That's it!** v1 is backward compatible. Your existing UI will work, but you now have access to:
- `result.confidence_score`
- `result.reasoning.color_harmony`
- `result.reasoning.style_coherence`
- `result.reasoning.occasion_fit`
- `result.alternative_items`

---

## 🎯 3. Enhanced UI Components

### Display Confidence Score

```typescript
// In your result view component
{fitResult && (
  <div className="outfit-result">
    {/* Existing outfit display */}
    <OutfitDisplay outfit={fitResult} />

    {/* 🆕 NEW: Confidence indicator */}
    <div className="confidence-section">
      <h4>Confidence Score</h4>
      <div className="confidence-bar-container">
        <div
          className="confidence-bar"
          style={{
            width: `${fitResult.confidence_score}%`,
            backgroundColor:
              fitResult.confidence_score >= 90 ? '#10b981' :
              fitResult.confidence_score >= 70 ? '#fbbf24' :
              '#ef4444'
          }}
        />
      </div>
      <span className="confidence-label">
        {fitResult.confidence_score >= 90 && '🔥 Perfect Match!'}
        {fitResult.confidence_score >= 70 && fitResult.confidence_score < 90 && '✅ Great Choice'}
        {fitResult.confidence_score < 70 && '⚠️ Acceptable'}
      </span>
    </div>

    {/* 🆕 NEW: Detailed reasoning */}
    {fitResult.reasoning && (
      <div className="reasoning-section">
        <h4>Why This Works</h4>
        <div className="reasoning-item">
          <strong>🎨 Color Harmony:</strong>
          <p>{fitResult.reasoning.color_harmony}</p>
        </div>
        <div className="reasoning-item">
          <strong>👔 Style:</strong>
          <p>{fitResult.reasoning.style_coherence}</p>
        </div>
        <div className="reasoning-item">
          <strong>📅 Occasion Fit:</strong>
          <p>{fitResult.reasoning.occasion_fit}</p>
        </div>
      </div>
    )}

    {/* 🆕 NEW: Alternative suggestions */}
    {fitResult.alternative_items && (
      <button
        className="btn-alternative"
        onClick={() => useAlternativeOutfit(fitResult)}
      >
        ✨ Try Alternative Version
      </button>
    )}
  </div>
)}
```

### CSS for Confidence Bar

```css
.confidence-section {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.confidence-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.confidence-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.confidence-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.reasoning-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.reasoning-item {
  margin: 0.75rem 0;
}

.reasoning-item strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #fbbf24;
}

.reasoning-item p {
  margin: 0;
  line-height: 1.5;
}

.btn-alternative {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
}

.btn-alternative:hover {
  transform: translateY(-2px);
}
```

### Alternative Outfit Handler

```typescript
function useAlternativeOutfit(currentResult: EnhancedFitResult) {
  if (!currentResult.alternative_items) return;

  // Create new outfit with alternatives
  const altOutfit: EnhancedFitResult = {
    ...currentResult,
    // Swap to alternatives if available
    top_id: currentResult.alternative_items.alternative_top_id || currentResult.top_id,
    bottom_id: currentResult.alternative_items.alternative_bottom_id || currentResult.bottom_id,
    shoes_id: currentResult.alternative_items.alternative_shoes_id || currentResult.shoes_id,
    explanation: `Alternative version: ${currentResult.alternative_items.why_alternative}`
  };

  setFitResult(altOutfit);
}
```

---

## 🌟 4. Premium Feature: Multi-Stage (v2)

**Add a "Premium Generate" button:**

```typescript
// State
const [isPremiumGenerating, setIsPremiumGenerating] = useState(false);
const [outfitCandidates, setOutfitCandidates] = useState<MultiStageCandidate[]>([]);
const [selectedCandidate, setSelectedCandidate] = useState<number>(1);

// Handler
async function handleGeneratePremiumFit(userPrompt: string) {
  setIsPremiumGenerating(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    // ✨ Multi-stage generation
    const multiStageResult = await generateOutfitEnhancedV2(
      userPrompt,
      uniqueInventory,
      getAIClient,
      retryWithBackoff
    );

    // Store all candidates
    setOutfitCandidates(multiStageResult.candidates);
    setSelectedCandidate(multiStageResult.selected_outfit);

    // Show selected outfit
    setFitResult(multiStageResult.selected_outfit);
    setCurrentView('premium-result');

  } catch (error) {
    console.error("Error generating premium outfit:", error);
    setError(error.message || "No se pudo generar un outfit premium.");
  } finally {
    setIsPremiumGenerating(false);
  }
}
```

**Premium Result View:**

```typescript
// Premium result view with candidate selection
{currentView === 'premium-result' && fitResult && (
  <div className="premium-result-view">
    {/* Main selected outfit */}
    <div className="selected-outfit">
      <h2>Selected Outfit</h2>
      <OutfitDisplay outfit={fitResult} />

      {/* Reasoning */}
      <div className="reasoning">
        <h4>Why This is the Best Choice:</h4>
        <p>{fitResult.reasoning.occasion_fit}</p>
      </div>
    </div>

    {/* Alternative candidates */}
    <div className="candidates-section">
      <h3>Alternative Options</h3>
      <div className="candidates-grid">
        {outfitCandidates.map(candidate => (
          <div
            key={candidate.outfit_id}
            className={`candidate-card ${
              selectedCandidate === candidate.outfit_id ? 'active' : ''
            }`}
            onClick={() => switchToCandidate(candidate)}
          >
            <span className="candidate-label">Option {candidate.outfit_id}</span>
            <div className="candidate-score">
              Score: {candidate.score}%
            </div>
            <p className="candidate-reasoning">{candidate.reasoning}</p>

            {/* Preview items */}
            <div className="candidate-preview">
              {/* Show mini outfit preview */}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

**Switch Candidate Handler:**

```typescript
function switchToCandidate(candidate: MultiStageCandidate) {
  setSelectedCandidate(candidate.outfit_id);

  // Convert to EnhancedFitResult
  const newResult: EnhancedFitResult = {
    top_id: candidate.top_id,
    bottom_id: candidate.bottom_id,
    shoes_id: candidate.shoes_id,
    explanation: candidate.reasoning,
    reasoning: {
      color_harmony: "Alternative candidate",
      style_coherence: candidate.reasoning,
      occasion_fit: "User-selected alternative"
    },
    confidence_score: candidate.score
  };

  setFitResult(newResult);
}
```

---

## 🎨 5. Smart Occasion Detection (v3)

**Add quick-action buttons for specific occasions:**

```typescript
// Home view or generate view
<div className="occasion-quick-actions">
  <h3>Quick Outfits</h3>
  <div className="occasion-buttons">
    <button onClick={() => generateForOccasion('casual-date', 'Primera cita casual')}>
      💕 Date Night
    </button>
    <button onClick={() => generateForOccasion('work-meeting', 'Reunión de trabajo')}>
      💼 Work Meeting
    </button>
    <button onClick={() => generateForOccasion('weekend-hangout', 'Salir con amigos')}>
      🎉 Weekend Hangout
    </button>
    <button onClick={() => generateForOccasion('formal-event', 'Evento formal')}>
      🎩 Formal Event
    </button>
  </div>
</div>
```

**Handler:**

```typescript
async function generateForOccasion(
  occasionType: OccasionType,
  description: string
) {
  setLoading(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    // ✨ Template-based generation
    const result = await generateOutfitEnhancedV3(
      description,
      uniqueInventory,
      getAIClient,
      retryWithBackoff,
      occasionType  // Force specific template
    );

    setFitResult(result);
    setCurrentView('result');

    // Track occasion-specific analytics
    analytics.track('quick_occasion_used', {
      occasion_type: occasionType,
      confidence_score: result.confidence_score
    });

  } catch (error) {
    console.error("Error generating occasion outfit:", error);
    setError(error.message || "No se pudo generar un outfit.");
  } finally {
    setLoading(false);
  }
}
```

**CSS for Quick Actions:**

```css
.occasion-quick-actions {
  margin: 2rem 0;
}

.occasion-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.occasion-buttons button {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.occasion-buttons button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #667eea;
  transform: translateY(-2px);
}
```

---

## 📊 6. Analytics Tracking

**Track enhanced metrics:**

```typescript
// After generating outfit
analytics.track('outfit_generated', {
  version: 'v1',  // or 'v2', 'v3'
  confidence_score: result.confidence_score,
  has_alternatives: !!result.alternative_items,
  occasion_detected: occasionType,
  user_prompt: userPrompt,
  inventory_size: closet.length
});

// When user uses alternative
analytics.track('alternative_used', {
  original_confidence: originalResult.confidence_score,
  alternative_reason: result.alternative_items?.why_alternative
});

// When user saves outfit
analytics.track('outfit_saved', {
  confidence_score: result.confidence_score,
  generation_version: 'v1'
});
```

---

## 🧪 7. A/B Testing Setup

**Split traffic between v1 and v3:**

```typescript
// At the top of your component
const [generationVersion] = useState<'v1' | 'v3'>(() => {
  // Randomly assign on first load
  return Math.random() > 0.5 ? 'v1' : 'v3';
});

// In your handler
async function handleGenerateFit(userPrompt: string) {
  setLoading(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    let result: EnhancedFitResult;

    // A/B test
    if (generationVersion === 'v1') {
      result = await generateOutfitEnhancedV1(
        userPrompt,
        uniqueInventory,
        getAIClient,
        retryWithBackoff
      );
    } else {
      result = await generateOutfitEnhancedV3(
        userPrompt,
        uniqueInventory,
        getAIClient,
        retryWithBackoff
      );
    }

    setFitResult(result);
    setCurrentView('result');

    // Track which version was used
    analytics.track('outfit_generated', {
      ab_test_version: generationVersion,
      confidence_score: result.confidence_score
    });

  } catch (error) {
    console.error("Error generating outfit:", error);
    setError(error.message || "No se pudo generar un outfit.");
  } finally {
    setLoading(false);
  }
}

// Later, when user rates the outfit
function handleUserRating(rating: number) {
  analytics.track('outfit_rated', {
    ab_test_version: generationVersion,
    confidence_score: fitResult.confidence_score,
    user_rating: rating
  });
}
```

**Analyze results:**

```typescript
// After 1000+ generations, analyze:
const v1Stats = {
  avg_confidence: 82,
  avg_user_rating: 4.2,
  satisfaction_rate: 0.85
};

const v3Stats = {
  avg_confidence: 85,
  avg_user_rating: 4.5,
  satisfaction_rate: 0.89
};

// Decide which version to use for all users
```

---

## 🎁 8. Bonus: Hybrid Approach

**Use different versions for different scenarios:**

```typescript
async function smartGenerateOutfit(userPrompt: string) {
  setLoading(true);
  setError(null);

  try {
    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    let result: EnhancedFitResult;

    // Decision logic
    const isPremiumUser = user.subscription === 'premium';
    const isComplexPrompt = userPrompt.length > 50;
    const isSpecialOccasion = ['boda', 'gala', 'evento importante'].some(
      keyword => userPrompt.toLowerCase().includes(keyword)
    );

    if (isPremiumUser && (isComplexPrompt || isSpecialOccasion)) {
      // Use v2 for premium + complex scenarios
      console.log('Using v2: Premium multi-stage');
      const multiStage = await generateOutfitEnhancedV2(
        userPrompt,
        uniqueInventory,
        getAIClient,
        retryWithBackoff
      );
      result = multiStage.selected_outfit;

    } else if (detectOccasionKeywords(userPrompt).length > 0) {
      // Use v3 if occasion is detected
      console.log('Using v3: Template-based');
      result = await generateOutfitEnhancedV3(
        userPrompt,
        uniqueInventory,
        getAIClient,
        retryWithBackoff
      );

    } else {
      // Use v1 for everything else
      console.log('Using v1: Enhanced basic');
      result = await generateOutfitEnhancedV1(
        userPrompt,
        uniqueInventory,
        getAIClient,
        retryWithBackoff
      );
    }

    setFitResult(result);
    setCurrentView('result');

  } catch (error) {
    console.error("Error generating outfit:", error);
    setError(error.message || "No se pudo generar un outfit.");
  } finally {
    setLoading(false);
  }
}

function detectOccasionKeywords(prompt: string): string[] {
  const keywords = ['cita', 'trabajo', 'fiesta', 'casual', 'formal', 'gym'];
  return keywords.filter(kw => prompt.toLowerCase().includes(kw));
}
```

---

## 🚦 9. Error Handling

**Enhanced error handling:**

```typescript
async function handleGenerateFit(userPrompt: string) {
  setLoading(true);
  setError(null);

  try {
    // Validation
    if (!userPrompt.trim()) {
      throw new Error("Por favor describe qué tipo de outfit querés.");
    }

    if (closet.length < 3) {
      throw new Error("Necesitás al menos 3 prendas en tu armario para generar un outfit.");
    }

    const mergedInventory = [...closet, ...borrowedItems];
    const uniqueInventory = Array.from(
      new Map(mergedInventory.map(item => [item.id, item])).values()
    );

    const result = await generateOutfitEnhancedV1(
      userPrompt,
      uniqueInventory,
      getAIClient,
      retryWithBackoff
    );

    // Post-generation validation
    if (result.confidence_score < 50) {
      console.warn('Low confidence outfit generated');
      // Show warning to user
      setWarning('Este outfit tiene baja confianza. Considera agregar más prendas a tu armario.');
    }

    setFitResult(result);
    setCurrentView('result');

  } catch (error) {
    console.error("Error generating outfit:", error);

    // User-friendly error messages
    if (error.message.includes('503') || error.message.includes('overloaded')) {
      setError("El servicio está temporalmente sobrecargado. Intentá en unos segundos.");
    } else if (error.message.includes('No hay suficientes')) {
      setError("Necesitás más prendas en tu armario para generar outfits.");
    } else {
      setError(error.message || "No se pudo generar un outfit. Intentá de nuevo.");
    }
  } finally {
    setLoading(false);
  }
}
```

---

## ✅ 10. Testing Checklist

**Before deploying:**

```typescript
// Quick test function
async function testEnhancedGeneration() {
  console.log('🧪 Testing Enhanced Outfit Generation...');

  const testPrompts = [
    'Primera cita casual',
    'Reunión de trabajo importante',
    'Salir con amigos el fin de semana',
    'Evento formal de noche'
  ];

  for (const prompt of testPrompts) {
    try {
      console.log(`\nTesting: "${prompt}"`);

      const result = await generateOutfitEnhancedV1(
        prompt,
        closet,
        getAIClient,
        retryWithBackoff
      );

      console.log('✅ Generated successfully');
      console.log('   Confidence:', result.confidence_score);
      console.log('   Has alternatives:', !!result.alternative_items);
      console.log('   Reasoning:', result.reasoning.occasion_fit);

    } catch (error) {
      console.error('❌ Failed:', error.message);
    }
  }

  console.log('\n🎉 Testing complete!');
}

// Run in console
testEnhancedGeneration();
```

---

**That's it!** You now have everything you need to integrate and test the enhanced outfit generation system. Start with v1, measure results, and iterate from there. 🚀
