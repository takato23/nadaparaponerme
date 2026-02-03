/**
 * OUTFIT GENERATION TESTING PLAYGROUND
 *
 * Component for testing and comparing the 3 enhanced outfit generation versions
 * - v1: Enhanced Basic (1 API call)
 * - v2: Multi-Stage (2 API calls)
 * - v3: Template System (1 API call)
 *
 * Usage: Add to App.tsx navigation or access via special route
 */

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem } from '../types';
import {
  generateOutfitEnhancedV1,
  generateOutfitEnhancedV2,
  generateOutfitEnhancedV3,
  type EnhancedFitResult,
  type MultiStageFitResult
} from '../src/services/generateOutfit-enhanced';
import { generateOutfit } from '../src/services/geminiService';
import { sampleData } from '../data/sampleData';

interface TestResult {
  version: 'original' | 'v1' | 'v2' | 'v3';
  result: any;
  duration: number;
  error?: string;
}

interface OutfitGenerationTestingPlaygroundProps {
  closet: ClothingItem[];
  onClose: () => void;
}

export default function OutfitGenerationTestingPlayground({
  closet,
  onClose
}: OutfitGenerationTestingPlaygroundProps) {
  const [userPrompt, setUserPrompt] = useState('Primera cita casual en un café');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState({
    original: true,
    v1: true,
    v2: false, // Disabled by default (2x cost)
    v3: true
  });

  // Determine which closet to use (user's closet or sample data)
  const activeCloset = useMemo(() => {
    if (usingSampleData) {
      return sampleData;
    }
    return closet.length >= 3 ? closet : [];
  }, [closet, usingSampleData]);

  const testPrompts = [
    'Primera cita casual en un café',
    'Reunión de trabajo importante',
    'Salir con amigos el fin de semana',
    'Evento formal de noche',
    'Ir al gym',
    'Viaje de 3 días a la playa'
  ];

  async function runTest(version: 'original' | 'v1' | 'v2' | 'v3'): Promise<TestResult> {
    const startTime = performance.now();

    try {
      let result: any;

      switch (version) {
        case 'original':
          result = await generateOutfit(userPrompt, activeCloset);
          break;

        case 'v1':
          result = await generateOutfitEnhancedV1(
            userPrompt,
            activeCloset,
            getAIClient,
            retryWithBackoff
          );
          break;

        case 'v2':
          result = await generateOutfitEnhancedV2(
            userPrompt,
            activeCloset,
            getAIClient,
            retryWithBackoff
          );
          break;

        case 'v3':
          result = await generateOutfitEnhancedV3(
            userPrompt,
            activeCloset,
            getAIClient,
            retryWithBackoff
          );
          break;
      }

      const duration = performance.now() - startTime;

      return {
        version,
        result,
        duration
      };

    } catch (error: any) {
      const duration = performance.now() - startTime;
      return {
        version,
        result: null,
        duration,
        error: error.message
      };
    }
  }

  async function runAllTests() {
    if (activeCloset.length < 3) {
      toast.error('Necesitás al menos 3 prendas para testear. Click en "Load Sample Data" para usar datos de prueba.');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const versionsToTest: Array<'original' | 'v1' | 'v2' | 'v3'> = [];
    if (selectedVersions.original) versionsToTest.push('original');
    if (selectedVersions.v1) versionsToTest.push('v1');
    if (selectedVersions.v2) versionsToTest.push('v2');
    if (selectedVersions.v3) versionsToTest.push('v3');

    const results: TestResult[] = [];

    for (const version of versionsToTest) {
      const result = await runTest(version);
      results.push(result);
      setTestResults([...results]); // Update UI after each test
    }

    setIsRunning(false);
  }

  function getVersionLabel(version: string): string {
    switch (version) {
      case 'original': return 'Original';
      case 'v1': return 'v1: Enhanced Basic';
      case 'v2': return 'v2: Multi-Stage';
      case 'v3': return 'v3: Template System';
      default: return version;
    }
  }

  function getVersionCost(version: string): string {
    switch (version) {
      case 'original': return '~2K tokens';
      case 'v1': return '~2.5K tokens (+25%)';
      case 'v2': return '~5K tokens (+150%)';
      case 'v3': return '~2.6K tokens (+30%)';
      default: return 'Unknown';
    }
  }

  function renderResult(testResult: TestResult) {
    if (testResult.error) {
      return (
        <div className="error-result">
          <p className="error-text">❌ Error: {testResult.error}</p>
        </div>
      );
    }

    const { result, version } = testResult;

    // Handle v2 (MultiStageFitResult)
    if (version === 'v2' && result.selected_outfit) {
      const multiStage = result as MultiStageFitResult;
      return (
        <div className="v2-result">
          <div className="selected-outfit-section">
            <h5>Selected Outfit</h5>
            {renderEnhancedResult(multiStage.selected_outfit)}
          </div>

          <div className="candidates-section">
            <h5>Candidates ({multiStage.candidates.length})</h5>
            {multiStage.candidates.map(candidate => (
              <div key={candidate.outfit_id} className="candidate-card">
                <span className="candidate-label">Option {candidate.outfit_id}</span>
                <span className="candidate-score">Score: {candidate.score}%</span>
                <p className="candidate-reasoning">{candidate.reasoning}</p>
              </div>
            ))}
          </div>

          <div className="rationale-section">
            <h5>Selection Rationale</h5>
            <p>{multiStage.selection_rationale}</p>
          </div>
        </div>
      );
    }

    // Handle enhanced results (v1, v3)
    if (result.reasoning && result.confidence_score !== undefined) {
      return renderEnhancedResult(result as EnhancedFitResult);
    }

    // Handle original result
    return (
      <div className="original-result">
        <p><strong>Top:</strong> {result.top_id}</p>
        <p><strong>Bottom:</strong> {result.bottom_id}</p>
        <p><strong>Shoes:</strong> {result.shoes_id}</p>
        <p><strong>Explanation:</strong> {result.explanation}</p>
        {result.missing_piece_suggestion && (
          <p><strong>Missing Piece:</strong> {result.missing_piece_suggestion.item_name}</p>
        )}
      </div>
    );
  }

  function renderEnhancedResult(result: EnhancedFitResult) {
    return (
      <div className="enhanced-result">
        {/* Confidence Score */}
        <div className="confidence-section">
          <span className="confidence-label">Confidence:</span>
          <div className="confidence-bar-container">
            <div
              className="confidence-bar"
              style={{
                width: `${result.confidence_score}%`,
                backgroundColor:
                  result.confidence_score >= 90 ? '#10b981' :
                    result.confidence_score >= 70 ? '#fbbf24' :
                      '#ef4444'
              }}
            />
          </div>
          <span className="confidence-value">{result.confidence_score}%</span>
        </div>

        {/* Selected Items */}
        <div className="selected-items">
          <p><strong>Top:</strong> {result.top_id}</p>
          <p><strong>Bottom:</strong> {result.bottom_id}</p>
          <p><strong>Shoes:</strong> {result.shoes_id}</p>
        </div>

        {/* Explanation */}
        <div className="explanation">
          <p><strong>Explanation:</strong> {result.explanation}</p>
        </div>

        {/* Reasoning */}
        {result.reasoning && (
          <div className="reasoning">
            <h5>Reasoning</h5>
            <p><strong>🎨 Color Harmony:</strong> {result.reasoning.color_harmony}</p>
            <p><strong>👔 Style Coherence:</strong> {result.reasoning.style_coherence}</p>
            <p><strong>📅 Occasion Fit:</strong> {result.reasoning.occasion_fit}</p>
          </div>
        )}

        {/* Alternatives */}
        {result.alternative_items && (
          <div className="alternatives">
            <h5>Alternatives Available</h5>
            <p>{result.alternative_items.why_alternative}</p>
            {result.alternative_items.alternative_top_id && (
              <p>Alt Top: {result.alternative_items.alternative_top_id}</p>
            )}
            {result.alternative_items.alternative_bottom_id && (
              <p>Alt Bottom: {result.alternative_items.alternative_bottom_id}</p>
            )}
            {result.alternative_items.alternative_shoes_id && (
              <p>Alt Shoes: {result.alternative_items.alternative_shoes_id}</p>
            )}
          </div>
        )}

        {/* Missing Piece */}
        {result.missing_piece_suggestion && (
          <div className="missing-piece">
            <h5>Shopping Suggestion</h5>
            <p><strong>{result.missing_piece_suggestion.item_name}</strong></p>
            <p>{result.missing_piece_suggestion.reason}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="testing-playground-overlay">
      <div className="testing-playground-container">
        {/* Header */}
        <div className="playground-header">
          <h2>🧪 Outfit Generation Testing Playground</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {/* Controls */}
        <div className="playground-controls">
          {/* Prompt Input */}
          <div className="prompt-section">
            <label>Test Prompt:</label>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Describe el outfit que querés..."
              className="prompt-input"
            />
            <div className="quick-prompts">
              {testPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setUserPrompt(prompt)}
                  className="quick-prompt-btn"
                  disabled={isRunning}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Version Selection */}
          <div className="version-selection">
            <label>Versions to Test:</label>
            <div className="version-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedVersions.original}
                  onChange={(e) => setSelectedVersions({
                    ...selectedVersions,
                    original: e.target.checked
                  })}
                  disabled={isRunning}
                />
                <span>Original (~2K tokens)</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedVersions.v1}
                  onChange={(e) => setSelectedVersions({
                    ...selectedVersions,
                    v1: e.target.checked
                  })}
                  disabled={isRunning}
                />
                <span>v1: Enhanced Basic (~2.5K tokens)</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedVersions.v2}
                  onChange={(e) => setSelectedVersions({
                    ...selectedVersions,
                    v2: e.target.checked
                  })}
                  disabled={isRunning}
                />
                <span>v2: Multi-Stage (~5K tokens) ⚠️ 2x cost</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedVersions.v3}
                  onChange={(e) => setSelectedVersions({
                    ...selectedVersions,
                    v3: e.target.checked
                  })}
                  disabled={isRunning}
                />
                <span>v3: Template System (~2.6K tokens)</span>
              </label>
            </div>
          </div>

          {/* Data Source Info */}
          {closet.length < 3 && !usingSampleData && (
            <div className="data-source-info empty-closet">
              <p className="warning-text">
                ⚠️ Tu armario está vacío o tiene menos de 3 prendas
              </p>
              <button
                onClick={() => setUsingSampleData(true)}
                className="load-sample-btn"
                disabled={isRunning}
              >
                📦 Load Sample Data
              </button>
              <p className="info-text">
                Carga datos de prueba temporales para testear
              </p>
            </div>
          )}

          {usingSampleData && (
            <div className="data-source-info using-sample">
              <p className="success-text">
                ✅ Using Sample Data ({sampleData.length} items)
              </p>
              <button
                onClick={() => {
                  setUsingSampleData(false);
                  setTestResults([]);
                }}
                className="clear-sample-btn"
                disabled={isRunning}
              >
                🗑️ Clear Sample Data
              </button>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={runAllTests}
            disabled={isRunning || activeCloset.length < 3}
            className="run-test-btn"
          >
            {isRunning ? '⏳ Running Tests...' : '🚀 Run Tests'}
          </button>

          {!usingSampleData && closet.length >= 3 && (
            <p className="success-text">
              ✅ Using your closet ({closet.length} items)
            </p>
          )}
        </div>

        {/* Results */}
        {testResults.length > 0 && (
          <div className="test-results">
            <h3>Results</h3>
            <div className="results-grid">
              {testResults.map((testResult) => (
                <div key={testResult.version} className="result-card">
                  <div className="result-header">
                    <h4>{getVersionLabel(testResult.version)}</h4>
                    <span className="duration">{testResult.duration.toFixed(0)}ms</span>
                  </div>
                  <div className="cost-info">
                    <span className="cost-badge">{getVersionCost(testResult.version)}</span>
                  </div>
                  <div className="result-content">
                    {renderResult(testResult)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .testing-playground-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          overflow-y: auto;
        }

        .testing-playground-container {
          background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
          border-radius: 24px;
          padding: 2rem;
          max-width: 1400px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .playground-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        .playground-header h2 {
          margin: 0;
          color: white;
          font-size: 1.8rem;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }

        .playground-controls {
          background: rgba(0, 0, 0, 0.2);
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .prompt-section {
          margin-bottom: 1.5rem;
        }

        .prompt-section label {
          display: block;
          color: white;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .prompt-input {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
          color: white;
          font-size: 1rem;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .quick-prompts {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .quick-prompt-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .quick-prompt-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: #667eea;
        }

        .quick-prompt-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .version-selection {
          margin-bottom: 1.5rem;
        }

        .version-selection label {
          display: block;
          color: white;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .version-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .checkbox-label:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .checkbox-label input[type="checkbox"] {
          cursor: pointer;
        }

        .run-test-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .run-test-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .run-test-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .warning-text {
          color: #fbbf24;
          text-align: center;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .success-text {
          color: #10b981;
          text-align: center;
          margin-top: 0.5rem;
          font-weight: 600;
        }

        .info-text {
          color: #9ca3af;
          text-align: center;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .data-source-info {
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1rem;
          text-align: center;
        }

        .data-source-info.empty-closet {
          background: rgba(251, 191, 36, 0.1);
          border: 2px solid rgba(251, 191, 36, 0.3);
        }

        .data-source-info.using-sample {
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid rgba(16, 185, 129, 0.3);
        }

        .load-sample-btn,
        .clear-sample-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin: 0.5rem 0;
          font-size: 0.95rem;
        }

        .load-sample-btn {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
        }

        .load-sample-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(251, 191, 36, 0.4);
        }

        .clear-sample-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 2px solid rgba(239, 68, 68, 0.3);
        }

        .clear-sample-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }

        .load-sample-btn:disabled,
        .clear-sample-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .test-results {
          margin-top: 2rem;
        }

        .test-results h3 {
          color: white;
          margin-bottom: 1rem;
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .result-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .result-header h4 {
          margin: 0;
          color: white;
          font-size: 1.1rem;
        }

        .duration {
          color: #10b981;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .cost-info {
          margin-bottom: 1rem;
        }

        .cost-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .result-content {
          color: white;
          font-size: 0.9rem;
        }

        .error-result {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .error-text {
          color: #ef4444;
          margin: 0;
        }

        .confidence-section {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .confidence-label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .confidence-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .confidence-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .confidence-value {
          font-weight: 600;
          color: #10b981;
        }

        .selected-items,
        .explanation,
        .reasoning,
        .alternatives,
        .missing-piece {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .reasoning h5,
        .alternatives h5,
        .missing-piece h5 {
          margin: 0 0 0.5rem 0;
          color: #fbbf24;
          font-size: 0.9rem;
        }

        .reasoning p {
          margin: 0.5rem 0;
          line-height: 1.5;
        }

        .v2-result .candidates-section {
          margin: 1rem 0;
        }

        .candidate-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .candidate-label {
          font-weight: 600;
          margin-right: 0.5rem;
        }

        .candidate-score {
          color: #10b981;
          font-weight: 600;
        }

        .candidate-reasoning {
          margin: 0.5rem 0 0 0;
          font-size: 0.85rem;
          opacity: 0.9;
        }

        .rationale-section {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }

        .rationale-section h5 {
          margin: 0 0 0.5rem 0;
          color: #667eea;
        }

        .rationale-section p {
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
