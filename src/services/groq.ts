
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const getGroqResponse = async (prompt: string): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("VITE_GROQ_API_KEY is not defined in the environment variables.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "You are Trinity AI, an advanced trading intelligence system. Provide structured market analysis with entry points, take profit levels (TP1, TP2, TP3), stop loss, confidence score, and reasoning. Format responses clearly and concisely."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response from AI.";
};
