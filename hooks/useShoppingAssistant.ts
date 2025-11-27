import { useState } from 'react';
import type { ClothingItem, ShoppingChatMessage, ShoppingGap, ShoppingRecommendation } from '../types';
import * as aiService from '../src/services/aiService';
import { useToast } from './useToast';

export const useShoppingAssistant = (closet: ClothingItem[]) => {
    const [messages, setMessages] = useState<ShoppingChatMessage[]>([]);
    const [gaps, setGaps] = useState<ShoppingGap[] | undefined>(undefined);
    const [recommendations, setRecommendations] = useState<ShoppingRecommendation[] | undefined>(undefined);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const toast = useToast();

    const analyzeShoppingGaps = async () => {
        setIsAnalyzing(true);
        try {
            const result = await aiService.analyzeShoppingGaps(closet);
            setGaps(result);

            const systemMessage: ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `✨ Analicé tu armario y encontré ${result.length} oportunidades de compra:\n\n` +
                    `• ${result.filter(g => g.priority === 'essential').length} esenciales\n` +
                    `• ${result.filter(g => g.priority === 'recommended').length} recomendados\n` +
                    `• ${result.filter(g => g.priority === 'optional').length} opcionales\n\n` +
                    `Andá a la pestaña "Gaps" para ver el análisis completo, o preguntame sobre algún gap específico!`,
                timestamp: new Date().toISOString(),
                gap_analysis: result
            };
            setMessages(prev => [...prev, systemMessage]);
        } catch (error) {
            console.error('Error analyzing shopping gaps:', error);
            const errorMessage: ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Hubo un error al analizar los gaps. Por favor intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
            toast.error('Error al analizar gaps');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateRecommendations = async () => {
        if (!gaps) {
            toast.warning('Primero tenés que analizar los gaps del armario');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await aiService.generateShoppingRecommendations(gaps, closet);
            setRecommendations(result);

            const totalProducts = result.reduce((sum, rec) => sum + rec.products.length, 0);
            const totalBudget = result.reduce((sum, rec) => sum + rec.total_budget_estimate, 0);

            const systemMessage: ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `🎯 Generé ${result.length} recomendaciones estratégicas con ${totalProducts} productos:\n\n` +
                    `💰 Presupuesto total: $${totalBudget.toLocaleString('es-AR')}\n\n` +
                    `Andá a la pestaña "Recomendaciones" para explorar los productos sugeridos!`,
                timestamp: new Date().toISOString(),
                recommendations: result
            };
            setMessages(prev => [...prev, systemMessage]);
        } catch (error) {
            console.error('Error generating shopping recommendations:', error);
            const errorMessage: ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Hubo un error al generar recomendaciones. Por favor intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
            toast.error('Error al generar recomendaciones');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const sendMessage = async (message: string) => {
        const userMessage: ShoppingChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);

        try {
            const assistantMessage = await aiService.conversationalShoppingAssistant(
                message,
                messages,
                closet,
                gaps,
                recommendations
            );
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error in shopping assistant chat:', error);
            const errorMessage: ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Ups, no pude procesar tu mensaje. Intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return {
        messages,
        gaps,
        recommendations,
        isAnalyzing,
        isTyping,
        analyzeShoppingGaps,
        generateRecommendations,
        sendMessage
    };
};
