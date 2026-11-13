
/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker URL
const workerUrl =
  "https://loreal-beauty-assistant.vharri26.workers.dev/";

// Instructions for the AI
const systemPrompt = `
You are a friendly, knowledgeable L'Oréal beauty assistant.

Only answer questions related to L'Oréal, skincare,
makeup, haircare, fragrances, beauty products, and routines.

Help customers understand the products they already own,
including products from other brands when relevant to
their L'Oréal beauty routines.

Ask helpful questions about their preferences, lifestyle,
skin concerns, and available time before making personalized
recommendations.

Recommend L'Oréal products when appropriate, but never
pressure customers to purchase unnecessary products.

Explain ingredients, product combinations, and the order
in which products should be used. Do not invent product
details or guarantee results.

For questions unrelated to beauty or L'Oréal, politely
explain that you specialize in beauty assistance.
`;

// Maintain conversation history
const messages = [
  { role: "system", content: systemPrompt }
];

// Starting message
chatWindow.textContent =
  "👋 Welcome! I'm your L'Oréal Beauty Assistant. Ask me about products, ingredients, or your beauty routine!";

// Handle chat submission
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  // Remember the user's question
  messages.push({
    role: "user",
    content: question
  });

  // Display the latest question
  chatWindow.textContent = `You: ${question}\n\nThinking...`;

  userInput.value = "";

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();

    if (!response.ok || !data.choices?.[0]?.message?.content) {
      throw new Error(
        data.error?.message || "Unable to get a response."
      );
    }

    const answer = data.choices[0].message.content;

    // Remember the AI's response
    messages.push({
      role: "assistant",
      content: answer
    });

    // Display the conversation
    chatWindow.textContent =
      `You: ${question}\n\nL'Oréal Assistant: ${answer}`;

  } catch (error) {
    // Remove the unanswered question from history
    messages.pop();

    chatWindow.textContent =
      `Sorry, something went wrong: ${error.message}`;

    console.error("Chatbot error:", error);
  }
});
