
// L'Oréal Beauty Advisor
// Frontend chat and image upload

const workerUrl =
  "https://loreal-beauty-assistant.vharri26.workers.dev/";

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

const uploadButton = document.getElementById("uploadButton");
const photoInput = document.getElementById("photoInput");
const uploadPreview = document.getElementById("uploadPreview");
const previewImage = document.getElementById("previewImage");
const previewName = document.getElementById("previewName");
const removePhoto = document.getElementById("removePhoto");
const vanityScene = document.getElementById("vanityScene");
const searchButton = document.getElementById("searchButton");
const menuButtons = document.querySelectorAll("[data-topic]");

let selectedPhoto = null;
let previewUrl = null;
let isSending = false;

// AI behavior
const systemPrompt = `
You are a knowledgeable, warm, and personal L'Oréal
beauty advisor.

Your purpose is to help customers feel confident
about their existing products, routines, skincare,
haircare, makeup, and beauty choices.

You provide a thoughtful white-glove consultation,
not an aggressive sales experience.

BEHAVIOR:
- Give concise, natural, conversational answers.
- Never overwhelm the customer with long product lists.
- Recommend a maximum of 1 or 2 products at a time.
- Ask one useful follow-up question at a time.
- When enough information is available, answer directly.
- Never repeatedly ask questions the customer answered.
- Prioritize helping customers use products they own.
- Explain why a suggestion fits their needs.
- Offer additional options only when requested.
- Avoid excessive emojis and sales language.
- Prefer plain text and short paragraphs.

PERSONALIZATION:
When relevant, learn about:
- Skin type or whether the person is unsure of it
- Main skin concerns
- Climate and general location
- Daily sun exposure
- Whether they work indoors or outdoors
- Products they currently own
- Available time for a routine
- Desired results and preferences

Do not ask all these questions at once.
Ask only what is useful for the current conversation.

ROUTINES:
Help create realistic 2-minute, 5-minute,
and longer routines based on the person's needs.
Recommend routines that fit real daily life.

PHOTOS:
Customers may upload images of beauty products
or visible skin concerns.

For product photos:
- Identify products only when sufficiently clear.
- Ask for a clearer photo if necessary.
- Never invent an ingredient list.
- Ask for the product name if uncertain.
- Help explain compatibility and usage order.

For skin photos:
- Discuss visible cosmetic concerns cautiously.
- Never make medical diagnoses from photographs.
- Acknowledge limitations of lighting and image quality.
- Recommend medical evaluation for concerning skin changes.
- Do not promise specific results.

BRAND:
Keep the conversation focused on L'Oréal-related
beauty assistance, skincare, makeup, haircare,
fragrance, and product routines.

Favor relevant L'Oréal recommendations, but help
customers understand products they already own,
including other brands.

For unrelated questions, politely explain your
beauty-focused role.

Never invent product availability, pricing,
ingredients, or clinical claims.
`;

// Store conversation during this page session
let history = [];

function addMessage(role, text, imageUrl = null) {
  const bubble = document.createElement("div");

  bubble.className =
    role === "user" ? "msg user" : "msg ai";

  bubble.textContent = text;

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "Photo shared in conversation";
    bubble.appendChild(image);
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return bubble;
}

// Open the photo picker
uploadButton.addEventListener("click", () => {
  if (!isSending) photoInput.click();
});

// Menu choices give beginners a useful starting point for the conversation.
menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;

    if (topic === "Beauty chatbot") {
      userInput.value = "Help me find the right beauty advice for me.";
    } else if (topic === "Discover") {
      userInput.value = "What new beauty routine could I try?";
    } else {
      userInput.value = `Help me with my ${topic.toLowerCase()} routine.`;
    }

    userInput.focus();
    vanityScene.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

searchButton.addEventListener("click", () => {
  userInput.focus();
  vanityScene.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Photo preview
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please select a JPG, PNG, or WebP image.");
    photoInput.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    alert("Please choose an image smaller than 8 MB.");
    photoInput.value = "";
    return;
  }

  clearPhoto();

  selectedPhoto = file;
  previewUrl = URL.createObjectURL(file);

  previewImage.src = previewUrl;
  previewName.textContent = file.name;
  uploadPreview.classList.add("visible");
});

// Remove photo
function clearPhoto() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = null;
  selectedPhoto = null;
  photoInput.value = "";
  previewImage.removeAttribute("src");
  previewName.textContent = "";
  uploadPreview.classList.remove("visible");
}

removePhoto.addEventListener("click", clearPhoto);

// Compress images before sending them
function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const temporaryUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const maxDimension = 1400;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to process the image.");
        }

        // White background for transparent images
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image, 0, 0, canvas.width, canvas.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.78));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(temporaryUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(temporaryUrl);
      reject(new Error("Could not open that photo."));
    };

    image.src = temporaryUrl;
  });
}

// Enter sends; Shift+Enter creates a new line
userInput.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Send question and optional image
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSending) return;

  const question = userInput.value.trim();
  const file = selectedPhoto;

  if (!question && !file) return;

  // Let the mirror greeting fade once the conversation begins.
  vanityScene.classList.add("has-started");

  isSending = true;
  sendBtn.disabled = true;
  uploadButton.disabled = true;

  let displayPhotoUrl = null;

  try {
    let userContent;
    const messageText = question ||
      "Please look at this photo and help me understand it.";

    if (file) {
      const imageData = await prepareImage(file);
      displayPhotoUrl = imageData;

      // Chat Completions vision format
      userContent = [
        {
          type: "text",
          text: messageText
        },
        {
          type: "image_url",
          image_url: {
            url: imageData,
            detail: "auto"
          }
        }
      ];
    } else {
      userContent = messageText;
    }

    addMessage("user", messageText, displayPhotoUrl);

    const thinking = addMessage(
      "assistant",
      "Let me take a look..."
    );
    thinking.classList.add("status");

    const userMessage = {
      role: "user",
      content: userContent
    };

    // Include recent exchanges for context
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-12),
      userMessage
    ];

    try {
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error?.message || "The service is unavailable."
        );
      }

      const answer = data.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("No answer was returned.");
      }

      thinking.classList.remove("status");
      thinking.textContent = answer;

      history.push(userMessage);
      history.push({
        role: "assistant",
        content: answer
      });

      // Keep session history at a manageable size
      history = history.slice(-12);

      userInput.value = "";
      clearPhoto();

      chatWindow.scrollTop = chatWindow.scrollHeight;

    } catch (error) {
      thinking.classList.remove("status");
      thinking.textContent =
        "I couldn't complete that request. " +
        "Please try again. " + error.message;

      console.error("Chat request failed:", error);
    }

  } catch (error) {
    addMessage(
      "assistant",
      "I couldn't process that photo. " + error.message
    );
    console.error("Image processing failed:", error);

  } finally {
    isSending = false;
    sendBtn.disabled = false;
    uploadButton.disabled = false;
    userInput.focus();
  }
});
