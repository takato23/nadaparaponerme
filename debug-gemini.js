
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ VITE_GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName, prompt) {
    console.log(`\nTesting model: ${modelName}`);
    console.log(`Prompt: "${prompt}"`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log('Sending prompt to generateContent...');
        const result = await model.generateContent(prompt);
        const response = await result.response;

        console.log('✅ Response received!');

        // Detailed part inspection (The Fix Verification)
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            console.log(`Received ${candidates.length} candidates.`);

            let imageFound = false;

            parts.forEach((part, index) => {
                if (part.text) {
                    console.log(`Part ${index} [TEXT]: ${part.text.substring(0, 100)}...`);
                }
                if (part.inlineData) {
                    console.log(`Part ${index} [IMAGE]: Mime: ${part.inlineData.mimeType}, Length: ${part.inlineData.data.length}`);
                    imageFound = true;
                }
            });

            if (imageFound) {
                console.log('🎉 SUCCESS: Image found in response parts!');
            } else {
                console.error('❌ FAILURE: No image found in any part.');
            }

        } else {
            console.log('No candidates returned.');
            console.log(JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error(`❌ Failed with ${modelName}:`);
        console.error(error.message);
    }
}

// Test with the prompt that failed for the user
const FAILING_PROMPT = "remera gris oscuro manga larga";

// Test the model we want to use (that was failing before)
await testModel('models/gemini-2.5-flash-image', FAILING_PROMPT);
