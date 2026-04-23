import axios from 'axios';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const BASE_SYSTEM_PROMPT = `You are Margदर्शन AI, a logistics assistant for Indian supply chains. Keep answers short and clear. Risk: LOW=safe, MEDIUM=monitor, HIGH=alert, CRITICAL=reroute.`;

export async function sendMessage(conversationHistory, shipmentContext = null) {
  try {
    let systemContent = BASE_SYSTEM_PROMPT;

    if (shipmentContext) {
      systemContent += `\n\nCurrent shipment data:\n${shipmentContext}\n\nUse this data to answer questions about shipments accurately.`;
    }

    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts[0].text,
    }));

    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemContent },
          ...messages,
        ],
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Groq API Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);

    if (!GROQ_API_KEY) {
      throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.');
    }
    if (error.response?.status === 401) {
      throw new Error('Invalid Groq API key. Check your VITE_GROQ_API_KEY in .env');
    }
    throw new Error('Failed to get response from AI. Please try again.');
  }
}
