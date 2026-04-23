import axios from 'axios';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'mistral';

console.log('Using Ollama at:', OLLAMA_URL);

const SYSTEM_PROMPT = `You are Margदर्शन AI, a logistics expert specializing in Indian supply chains.
You help users understand shipment status, risk scores, route disruptions, and supply chain optimization.

Risk Scale Guide:
- LOW (0-39): Safe to proceed, normal operations
- MEDIUM (40-59): Monitor closely, prepare contingency plans
- HIGH (60-79): Increase vigilance, consider rerouting
- CRITICAL (80-100): Reroute immediately, high danger zone

Keep responses concise, actionable, and focused on logistics operations. Use bullet points for clarity.`;

export async function sendMessage(conversationHistory) {
  try {
    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts[0].text,
    }));

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.message.content;
  } catch (error) {
    console.error('❌ Ollama API Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama server not running. Start it with: ollama serve');
    }
    throw new Error('Failed to get response from AI. Please try again.');
  }
}
