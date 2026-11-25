// L'Oréal Beauty Advisor
// Frontend chat and image upload

const workerUrl = "https://loreal-beauty-assistant.vharri26.workers.dev/";

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

  bubble.className = role === "user" ? "msg user" : "msg ai";

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

// Photo preview
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

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
          maxDimension / Math.max(image.width, image.height),
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
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

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
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
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
    const messageText =
      question || "Please look at this photo and help me understand it.";

    if (file) {
      const imageData = await prepareImage(file);
      displayPhotoUrl = imageData;

      // Chat Completions vision format
      userContent = [
        {
          type: "text",
          text: messageText,
        },
        {
          type: "image_url",
          image_url: {
            url: imageData,
            detail: "auto",
          },
        },
      ];
    } else {
      userContent = messageText;
    }

    addMessage("user", messageText, displayPhotoUrl);

    const thinking = addMessage("assistant", "Let me take a look...");
    thinking.classList.add("status");

    const userMessage = {
      role: "user",
      content: userContent,
    };

    // Include recent exchanges for context
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-12),
      userMessage,
    ];

    try {
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || "The service is unavailable.");
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
        content: answer,
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
        "Please try again. " +
        error.message;

      console.error("Chat request failed:", error);
    }
  } catch (error) {
    addMessage("assistant", "I couldn't process that photo. " + error.message);
    console.error("Image processing failed:", error);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    uploadButton.disabled = false;
    userInput.focus();
  }
});

/* ==========================================
   L'ORÉAL BEAUTY SHELF — PROJECT PART 2
   Add this at the END of script.js.
   Uses the existing chat and Cloudflare Worker.
   ========================================== */

(() => {
  const PRODUCTS = [
    {
      id: "ha-serum",
      name: "RevitaLift 1.5% Pure Hyaluronic Acid Serum",
      category: "Skincare",
      description:
        "A hydrating facial serum. Apply after cleansing and before moisturizer.",
      url: "https://www.lorealparisusa.com/skin-care/face-serums/revitalift-derm-intensives-pure-hyaluronic-acid-serum",
    },
    {
      id: "triple-moisturizer",
      name: "RevitaLift Triple Power Moisturizer",
      category: "Skincare",
      description:
        "A facial moisturizer designed to hydrate and address visible signs of aging.",
      url: "https://www.lorealparisusa.com/skin-care/facial-moisturizers/revitalift-triple-power-anti-aging-moisturizer",
    },
    {
      id: "spf-moisturizer",
      name: "RevitaLift Triple Power SPF 30 Moisturizer",
      category: "Skincare",
      description:
        "A daytime moisturizer with broad-spectrum SPF 30 sunscreen.",
      url: "https://www.lorealparisusa.com/skin-care/facial-moisturizers/revitalift-triple-power-moisturizer-spf-30",
    },
    {
      id: "hyaluron-shampoo",
      name: "Elvive Hyaluron + Plump Shampoo",
      category: "Haircare",
      description: "A hydrating shampoo for dry or dehydrated hair.",
      url: "https://www.lorealparisusa.com/hair-care-hair-style/shampoo/elvive-hyaluron-plump-hyaluro-shampoo-26-5oz",
    },
    {
      id: "hyaluron-conditioner",
      name: "Elvive Hyaluron + Plump Conditioner",
      category: "Haircare",
      description:
        "A hydrating conditioner intended to follow shampoo and help detangle dry hair.",
      url: "https://www.lorealparisusa.com/hyaluron-hair-care",
    },
    {
      id: "dream-lengths",
      name: "Elvive Dream Lengths No Haircut Cream",
      category: "Haircare",
      description:
        "A leave-in conditioner for lengths and ends, especially hair prone to damage.",
      url: "https://www.lorealparisusa.com/hair-care-hair-style/hair-treatments/elvive-dream-lengths-no-haircut-cream-leave-in-conditioner",
    },
    {
      id: "true-match",
      name: "True Match Super-Blendable Foundation",
      category: "Makeup",
      description:
        "A blendable liquid foundation with buildable medium coverage. Shade selection matters.",
      url: "https://www.lorealparisusa.com/makeup/face/foundation-makeup/true-match-super-blendable-makeup",
    },
    {
      id: "voluminous",
      name: "Voluminous Original Washable Mascara",
      category: "Makeup",
      description: "A mascara designed to build visible lash volume.",
      url: "https://www.lorealparisusa.com/makeup/eye/mascara/voluminous-carbon-black-mascara",
    },
    {
      id: "colour-riche",
      name: "Colour Riche Satin Lipstick",
      category: "Makeup",
      description:
        "A creamy, satin-finish lipstick available in different shades.",
      url: "https://www.lorealparisusa.com/makeup/lip-color/lipstick/colour-riche-lipcolour",
    },
  ];

  const STORAGE_KEY = "loreal-selected-products-v1";

  // ------------------------------
  // STYLING
  // ------------------------------
  const shelfStyle = document.createElement("style");

  shelfStyle.textContent = `
    .bs-shelf {
      width: min(1080px, calc(100% - 32px));
      margin: 24px auto 55px;
      padding: clamp(22px, 4vw, 45px);
      background: #fdfbf7;
      border: 1px solid #d9cab8;
      border-radius: 16px;
      box-shadow: 0 12px 35px rgba(50, 35, 20, .06);
      color: #292522;
      text-align: left;
      font-family: "DM Sans", Arial, sans-serif;
    }

    .bs-shelf * {
      box-sizing: border-box;
    }

    .bs-heading {
      text-align: center;
      margin-bottom: 28px;
    }

    .bs-eyebrow {
      color: #896b4e;
      font-size: 11px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
    }

    .bs-heading h2 {
      font: 400 clamp(28px, 4vw, 40px)
        "Playfair Display", Georgia, serif;
      margin: 10px 0;
    }

    .bs-heading p {
      color: #746b63;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }

    .bs-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 22px;
    }

    .bs-search {
      flex: 1 1 240px;
      min-height: 44px;
      padding: 12px 16px;
      border: 1px solid #cbbbaa;
      border-radius: 8px;
      background: white;
      color: #292522;
      font: inherit;
      font-size: 14px;
    }

    .bs-search:focus-visible {
      outline: 2px solid #8d6c48;
      outline-offset: 2px;
    }

    .bs-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .bs-filter {
      border: 1px solid #cbbbaa;
      border-radius: 50px;
      background: transparent;
      color: #51483f;
      padding: 10px 13px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
    }

    .bs-filter[aria-pressed="true"] {
      background: #292522;
      color: white;
      border-color: #292522;
    }

    .bs-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(205px, 1fr));
      gap: 14px;
    }

    .bs-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      min-height: 230px;
      padding: 20px;
      background: white;
      border: 1px solid #ded6cc;
      border-radius: 12px;
      transition: border-color .2s, box-shadow .2s;
    }

    .bs-card.is-selected {
      border: 2px solid #92704b;
      padding: 19px;
      box-shadow: 0 4px 15px rgba(100, 75, 50, .1);
    }

    .bs-category {
      color: #8a7053;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      margin: 0;
    }

    .bs-icon {
      display: grid;
      place-items: center;
      width: 45px;
      height: 45px;
      border: 1px solid #d9c7ae;
      border-radius: 50%;
      background: #f8f3ed;
      color: #8b6f4e;
      font: 25px "Playfair Display", Georgia, serif;
    }

    .bs-card h3 {
      font-size: 15px;
      line-height: 1.45;
      font-weight: 600;
      margin: 0;
    }

    .bs-card details {
      color: #5a5149;
      font-size: 12px;
      line-height: 1.6;
    }

    .bs-card summary {
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .bs-card details p {
      margin: 9px 0;
    }

    .bs-card details a {
      color: #765333;
    }

    .bs-pick {
      width: 100%;
      margin-top: auto;
      padding: 11px;
      background: #f7f2eb;
      color: #302924;
      border: 1px solid #c6b49e;
      border-radius: 7px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .bs-pick[aria-pressed="true"] {
      background: #292522;
      color: white;
      border-color: #292522;
    }

    .bs-shelf button:focus-visible,
    .bs-shelf a:focus-visible,
    .bs-shelf summary:focus-visible {
      outline: 2px solid #8d6c48;
      outline-offset: 3px;
    }

    .bs-selected-area {
      margin-top: 28px;
      padding-top: 24px;
      border-top: 1px solid #ded5c9;
    }

    .bs-selected-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .bs-selected-header h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .bs-clear {
      border: 0;
      background: transparent;
      color: #785737;
      font: inherit;
      font-size: 12px;
      text-decoration: underline;
      cursor: pointer;
    }

    .bs-selected-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }

    .bs-chip {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      border: 1px solid #d3c4b2;
      border-radius: 50px;
      background: #f6f0e8;
      color: #352c25;
      padding: 9px 12px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .bs-empty {
      color: #82766a;
      font-size: 13px;
    }

    .bs-generate {
      display: block;
      width: min(350px, 100%);
      margin: 20px auto 0;
      padding: 15px 25px;
      border: 1px solid #292522;
      border-radius: 8px;
      background: #292522;
      color: white;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
    }

    .bs-generate:hover {
      background: #6c5137;
    }

    .bs-generate:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .bs-note {
      margin: 12px 0 0;
      text-align: center;
      color: #80766c;
      font-size: 11px;
      line-height: 1.5;
    }

    @media (max-width: 600px) {
      .bs-shelf {
        margin-top: 15px;
      }

      .bs-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .bs-card {
        padding: 12px;
        min-height: 245px;
      }

      .bs-card.is-selected {
        padding: 11px;
      }

      .bs-card h3 {
        font-size: 13px;
      }
    }

    @media (max-width: 380px) {
      .bs-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(shelfStyle);

  // ------------------------------
  // CREATE THE BEAUTY SHELF
  // ------------------------------
  const shelf = document.createElement("section");
  shelf.className = "bs-shelf";
  shelf.id = "beautyShelf";
  shelf.setAttribute("aria-label", "My Beauty Shelf");

  shelf.innerHTML = `
    <div class="bs-heading">
      <div class="bs-eyebrow">YOUR PERSONAL COLLECTION</div>
      <h2>My Beauty Shelf</h2>
      <p>
        Select the L'Oréal products you own,
        and I'll help you build a routine around them.
      </p>
    </div>

    <div class="bs-toolbar">
      <input
        id="bsSearch"
        class="bs-search"
        type="search"
        placeholder="Search products..."
        aria-label="Search beauty products"
      >

      <div class="bs-filters"
           role="group"
           aria-label="Filter by category">
        <button class="bs-filter" data-category="All"
                aria-pressed="true">All</button>
        <button class="bs-filter" data-category="Skincare"
                aria-pressed="false">Skincare</button>
        <button class="bs-filter" data-category="Makeup"
                aria-pressed="false">Makeup</button>
        <button class="bs-filter" data-category="Haircare"
                aria-pressed="false">Haircare</button>
      </div>
    </div>

    <div id="bsGrid" class="bs-grid"></div>

    <div class="bs-selected-area">
      <div class="bs-selected-header">
        <h3 id="bsCount">Selected products (0)</h3>
        <button id="bsClear" class="bs-clear" type="button">
          Clear all
        </button>
      </div>

      <div id="bsSelected"
           class="bs-selected-list"
           aria-live="polite"></div>

      <button
        id="bsGenerate"
        class="bs-generate"
        type="button"
        disabled
      >
        Generate My Routine ✦
      </button>

      <p class="bs-note">
        Your selections are saved in this browser.
        Your routine will appear in the mirror above.
      </p>
    </div>
  `;

  const scene = document.getElementById("vanityScene");

  if (!scene) {
    console.error("Beauty Shelf: vanityScene not found.");
    return;
  }

  scene.insertAdjacentElement("afterend", shelf);

  const grid = shelf.querySelector("#bsGrid");
  const selectedList = shelf.querySelector("#bsSelected");
  const countLabel = shelf.querySelector("#bsCount");
  const generateButton = shelf.querySelector("#bsGenerate");
  const clearButton = shelf.querySelector("#bsClear");
  const searchInput = shelf.querySelector("#bsSearch");

  // ------------------------------
  // LOAD SAVED PRODUCTS
  // ------------------------------
  let selected = new Set();
  let category = "All";
  let searchTerm = "";

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (Array.isArray(saved)) {
      const validIds = PRODUCTS.map((p) => p.id);
      selected = new Set(saved.filter((id) => validIds.includes(id)));
    }
  } catch (error) {
    console.warn("Could not load saved products:", error);
  }

  function saveSelections() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch (error) {
      console.warn("Could not save products:", error);
    }
  }

  function getSelectedProducts() {
    return PRODUCTS.filter((p) => selected.has(p.id));
  }

  // ------------------------------
  // PRODUCT SELECTION
  // ------------------------------
  function toggleProduct(id) {
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }

    saveSelections();
    renderProducts();
    renderSelected();
  }

  // ------------------------------
  // PRODUCT CARDS
  // ------------------------------
  function renderProducts() {
    grid.replaceChildren();

    const matching = PRODUCTS.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const searchable = (
        product.name +
        " " +
        product.category +
        " " +
        product.description
      ).toLowerCase();

      return matchesCategory && searchable.includes(searchTerm);
    });

    if (matching.length === 0) {
      const empty = document.createElement("p");
      empty.className = "bs-empty";
      empty.textContent = "No matching products found.";
      grid.appendChild(empty);
      return;
    }

    matching.forEach((product) => {
      const isSelected = selected.has(product.id);

      const card = document.createElement("article");
      card.className = "bs-card" + (isSelected ? " is-selected" : "");

      const icon = document.createElement("div");
      icon.className = "bs-icon";
      icon.setAttribute("aria-hidden", "true");

      icon.textContent =
        product.category === "Skincare"
          ? "S"
          : product.category === "Makeup"
            ? "M"
            : "H";

      const cat = document.createElement("p");
      cat.className = "bs-category";
      cat.textContent = product.category;

      const name = document.createElement("h3");
      name.textContent = product.name;

      const details = document.createElement("details");

      const summary = document.createElement("summary");
      summary.textContent = "View description";

      const description = document.createElement("p");
      description.textContent = product.description;

      const link = document.createElement("a");
      link.href = product.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Official product details";

      details.append(summary, description, link);

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "bs-pick";
      selectButton.setAttribute("aria-pressed", String(isSelected));
      selectButton.setAttribute(
        "aria-label",
        (isSelected ? "Remove " : "Select ") + product.name,
      );

      selectButton.textContent = isSelected ? "✓ Selected" : "+ Add to shelf";

      selectButton.addEventListener("click", () => {
        toggleProduct(product.id);
      });

      card.append(icon, cat, name, details, selectButton);

      grid.appendChild(card);
    });
  }

  // ------------------------------
  // SELECTED PRODUCT LIST
  // ------------------------------
  function renderSelected() {
    selectedList.replaceChildren();

    const current = getSelectedProducts();

    countLabel.textContent = `Selected products (${current.length})`;

    generateButton.disabled = current.length === 0;
    clearButton.disabled = current.length === 0;

    if (current.length === 0) {
      const empty = document.createElement("p");
      empty.className = "bs-empty";
      empty.textContent = "No products selected yet.";
      selectedList.appendChild(empty);
      return;
    }

    current.forEach((product) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "bs-chip";
      chip.textContent = product.name + "  ×";

      chip.setAttribute("aria-label", "Remove " + product.name);

      chip.addEventListener("click", () => {
        toggleProduct(product.id);
      });

      selectedList.appendChild(chip);
    });
  }

  // ------------------------------
  // SEARCH AND CATEGORY FILTERS
  // ------------------------------
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderProducts();
  });

  shelf.querySelectorAll(".bs-filter").forEach((button) => {
    button.addEventListener("click", () => {
      category = button.dataset.category;

      shelf.querySelectorAll(".bs-filter").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
      });

      renderProducts();
    });
  });

  clearButton.addEventListener("click", () => {
    selected.clear();
    saveSelections();
    renderProducts();
    renderSelected();
  });

  // ------------------------------
  // GENERATE ROUTINE USING EXISTING AI
  // ------------------------------
  generateButton.addEventListener("click", () => {
    const current = getSelectedProducts();

    if (current.length === 0 || isSending) return;

    const productDetails = current
      .map(
        (product) =>
          `- ${product.name} (${product.category}): ` + product.description,
      )
      .join("\n");

    const routineRequest =
      "Please create a personalized beauty routine " +
      "using the L'Oréal products I selected:\n\n" +
      productDetails +
      "\n\nUse these specific products in a sensible " +
      "order. Separate skincare, haircare, and makeup " +
      "steps when needed. Explain when to use each " +
      "product, keep the routine realistic, and don't " +
      "assume I own other products. If you need more " +
      "information to personalize it, ask me just " +
      "one follow-up question.";

    // Reuse the existing chat system.
    // This keeps photo upload, AI history and Worker intact.
    userInput.value = routineRequest;
    chatForm.requestSubmit();

    // Bring the user back to the conversation.
    chatWindow.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  // Initial display
  renderProducts();
  renderSelected();
})();

/* ============================================
   L'ORÉAL TOP NAVIGATION + ROUTINE PANEL
   Paste at the BOTTOM of script.js,
   after the Beauty Shelf code.
   ============================================ */

(() => {
  const shelf = document.getElementById("beautyShelf");

  if (!shelf) {
    console.error("Beauty Shelf not found. Add the Part 2 code first.");
    return;
  }

  // SVG icons — no extra library needed.
  const icons = {
    search: `<svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-4-4"/>
    </svg>`,

    account: `<svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4.5 21c0-4.2 3.2-7 7.5-7s7.5 2.8 7.5 7"/>
    </svg>`,

    bag: `<svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M4 8h16l-1.3 13H5.3L4 8Z"/>
      <path d="M9 9V6a3 3 0 0 1 6 0v3"/>
    </svg>`,

    close: `<svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" aria-hidden="true">
      <path d="M5 5 19 19M19 5 5 19"/>
    </svg>`,
  };

  // ------------------------------------------
  // STYLING
  // ------------------------------------------
  const css = document.createElement("style");

  css.textContent = `
    .l-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
      background: rgba(253, 250, 245, .97);
      border-bottom: 1px solid #e4d9cc;
      backdrop-filter: blur(14px);
      font-family: "DM Sans", Arial, sans-serif;
    }

    .l-header-inner {
      max-width: 1500px;
      min-height: 72px;
      margin: auto;
      padding: 0 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .l-logo {
      display: flex;
      align-items: center;
      color: #211e1b;
      text-decoration: none;
      flex-shrink: 0;
    }

    .l-logo img {
      width: 135px;
      max-height: 40px;
      object-fit: contain;
    }

    .l-logo-fallback {
      font-family: Georgia, serif;
      font-size: 23px;
      font-weight: bold;
      letter-spacing: -.7px;
    }

    .l-middle {
      display: flex;
      align-items: center;
      gap: 22px;
    }

    .l-nav-link,
    .l-menu-button {
      background: transparent;
      border: 0;
      color: #2f2924;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      padding: 12px 6px;
    }

    .l-nav-link:hover,
    .l-menu-button:hover {
      color: #9c7651;
    }

    .l-menu-wrap {
      position: relative;
    }

    .l-dropdown {
      position: absolute;
      top: calc(100% + 13px);
      left: 50%;
      transform: translateX(-50%);
      width: 245px;
      padding: 10px;
      background: #fffdfa;
      border: 1px solid #ded0c1;
      border-radius: 12px;
      box-shadow: 0 18px 45px rgba(39, 29, 20, .14);
      z-index: 1100;
    }

    .l-dropdown[hidden],
    .l-backdrop[hidden],
    .l-drawer[hidden],
    .l-account-view[hidden] {
      display: none !important;
    }

    .l-dropdown button {
      display: block;
      width: 100%;
      padding: 13px 14px;
      text-align: left;
      font: inherit;
      font-size: 13px;
      color: #302924;
      background: transparent;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
    }

    .l-dropdown button:hover {
      background: #f5efe7;
    }

    .l-actions {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .l-icon-button {
      position: relative;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      padding: 9px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: #302924;
      cursor: pointer;
    }

    .l-icon-button:hover {
      background: #f0e8df;
    }

    .l-icon-button svg {
      width: 23px;
      height: 23px;
    }

    .l-bag-count {
      position: absolute;
      right: 0;
      top: 0;
      min-width: 17px;
      height: 17px;
      padding: 0 3px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #a78260;
      color: white;
      font-size: 10px;
    }

    .l-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(29, 24, 20, .45);
    }

    .l-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 1201;
      width: min(620px, 100vw);
      background: #fdfbf7;
      box-shadow: -15px 0 55px rgba(0, 0, 0, .13);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: "DM Sans", Arial, sans-serif;
    }

    .l-drawer-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid #e4d9cc;
      background: #fdfbf7;
      flex-shrink: 0;
    }

    .l-drawer-top h2 {
      margin: 0;
      color: #302924;
      font: 400 25px "Playfair Display", Georgia, serif;
    }

    .l-drawer-content {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 20px;
    }

    /* Move existing shelf into the drawer */
    .l-drawer .bs-shelf {
      width: 100%;
      margin: 0;
      padding: 10px;
      background: transparent;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }

    .l-drawer .bs-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .l-account-view {
      padding: 25px 12px;
      color: #342c25;
      line-height: 1.7;
    }

    .l-account-view h3 {
      font: 400 28px "Playfair Display", Georgia, serif;
      margin: 0 0 15px;
    }

    .l-account-view p {
      font-size: 14px;
      color: #64584e;
    }

    .l-account-shelf {
      background: #302924;
      color: white;
      border: 0;
      border-radius: 8px;
      padding: 13px 20px;
      margin-top: 15px;
      font: inherit;
      cursor: pointer;
    }

    body.l-drawer-open {
      overflow: hidden;
    }

    .l-header button:focus-visible,
    .l-header a:focus-visible,
    .l-drawer button:focus-visible {
      outline: 2px solid #9c7651;
      outline-offset: 3px;
    }

    @media (max-width: 650px) {
      .l-header-inner {
        min-height: 60px;
        padding: 0 10px;
        gap: 7px;
      }

      .l-logo img {
        width: 95px;
      }

      .l-logo-fallback {
        font-size: 17px;
      }

      .l-middle {
        gap: 0;
      }

      .l-nav-link {
        display: none;
      }

      .l-menu-button {
        font-size: 12px;
        padding: 10px 2px;
      }

      .l-icon-button {
        width: 34px;
        height: 38px;
        padding: 6px;
      }

      .l-icon-button svg {
        width: 20px;
        height: 20px;
      }

      .l-dropdown {
        left: auto;
        right: -80px;
        transform: none;
        width: min(270px, 90vw);
      }

      .l-drawer-content {
        padding: 12px;
      }

      .l-drawer .bs-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .l-drawer-top h2 {
        font-size: 21px;
      }
    }

    @media (max-width: 360px) {
      .l-drawer .bs-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(css);

  // ------------------------------------------
  // TOP NAVIGATION
  // ------------------------------------------
  const header = document.createElement("header");
  header.className = "l-header";

  header.innerHTML = `
    <div class="l-header-inner">

      <a href="#vanityScene"
         class="l-logo"
         id="lHome"
         aria-label="L'Oréal Beauty Advisor home">

        <img src="img/loreal-logo.png"
             alt="L'Oréal Paris">

        <span class="l-logo-fallback" hidden>
          L'ORÉAL
        </span>
      </a>

      <nav class="l-middle"
           aria-label="Main navigation">

        <button type="button"
                class="l-nav-link"
                data-open="home">
          Beauty Advisor
        </button>

        <div class="l-menu-wrap">
          <button type="button"
                  id="lExplore"
                  class="l-menu-button"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-controls="lDropdown">
            Explore &#8964;
          </button>

          <div id="lDropdown"
               class="l-dropdown"
               hidden>
            <button data-open="home">
              Beauty Advisor
            </button>

            <button data-open="all">
              Build My Routine
            </button>

            <button data-open="Skincare">
              Skincare
            </button>

            <button data-open="Haircare">
              Haircare
            </button>

            <button data-open="Makeup">
              Makeup
            </button>

            <button data-open="selected">
              My Selected Products
            </button>
          </div>
        </div>

        <button type="button"
                class="l-nav-link"
                data-open="all">
          My Routine
        </button>
      </nav>

      <div class="l-actions">

        <button type="button"
                id="lSearch"
                class="l-icon-button"
                aria-label="Search products"
                title="Search products">
          ${icons.search}
        </button>

        <button type="button"
                id="lAccount"
                class="l-icon-button"
                aria-label="My account"
                title="My account">
          ${icons.account}
        </button>

        <button type="button"
                id="lBag"
                class="l-icon-button"
                aria-label="My selected products"
                title="My selected products">
          ${icons.bag}
          <span class="l-bag-count"
                id="lBagCount">0</span>
        </button>

      </div>
    </div>
  `;

  document.body.prepend(header);

  // Logo fallback if image is unavailable.
  const logoImage = header.querySelector(".l-logo img");
  const logoFallback = header.querySelector(".l-logo-fallback");

  logoImage.addEventListener("error", () => {
    logoImage.hidden = true;
    logoFallback.hidden = false;
  });

  if (logoImage.complete && !logoImage.naturalWidth) {
    logoImage.hidden = true;
    logoFallback.hidden = false;
  }

  // ------------------------------------------
  // SLIDE-OUT PANEL
  // ------------------------------------------
  const backdrop = document.createElement("div");
  backdrop.className = "l-backdrop";
  backdrop.hidden = true;

  const drawer = document.createElement("aside");
  drawer.className = "l-drawer";
  drawer.hidden = true;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "lDrawerTitle");

  drawer.innerHTML = `
    <div class="l-drawer-top">
      <h2 id="lDrawerTitle">My Beauty Shelf</h2>

      <button type="button"
              id="lClose"
              class="l-icon-button"
              aria-label="Close panel">
        ${icons.close}
      </button>
    </div>

    <div class="l-drawer-content"
         id="lDrawerContent">

      <div class="l-account-view"
           id="lAccountView"
           hidden>
        <h3>My Account</h3>
        <p>
          Welcome to your personal beauty experience.
        </p>
        <p>
          Account sign-in is not connected yet.
          Your selected products are currently
          saved in this browser.
        </p>
        <button type="button"
                class="l-account-shelf"
                id="lAccountShelf">
          View My Beauty Shelf
        </button>
      </div>

    </div>
  `;

  document.body.append(backdrop, drawer);

  const drawerContent = drawer.querySelector("#lDrawerContent");

  const accountView = drawer.querySelector("#lAccountView");

  const drawerTitle = drawer.querySelector("#lDrawerTitle");

  const explore = header.querySelector("#lExplore");

  const dropdown = header.querySelector("#lDropdown");

  const bagCount = header.querySelector("#lBagCount");

  // Move the REAL existing product shelf.
  // This preserves its buttons, search, saved
  // selections and routine-generation logic.
  drawerContent.appendChild(shelf);

  // Hide account content by default.
  accountView.hidden = true;

  // ------------------------------------------
  // OPEN AND CLOSE
  // ------------------------------------------
  let previousFocus = null;

  function closeDropdown() {
    dropdown.hidden = true;
    explore.setAttribute("aria-expanded", "false");
  }

  function closeDrawer() {
    drawer.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove("l-drawer-open");

    if (previousFocus && previousFocus.isConnected) {
      previousFocus.focus();
    }
  }

  function openDrawer(mode = "all") {
    previousFocus = document.activeElement;
    closeDropdown();

    backdrop.hidden = false;
    drawer.hidden = false;
    document.body.classList.add("l-drawer-open");

    const isAccount = mode === "account";

    shelf.hidden = isAccount;
    accountView.hidden = !isAccount;

    if (isAccount) {
      drawerTitle.textContent = "My Account";
    } else {
      drawerTitle.textContent =
        mode === "selected"
          ? "My Selected Products"
          : mode === "search"
            ? "Search Products"
            : mode === "all"
              ? "Build My Routine"
              : mode;
    }

    const scrollArea = drawer.querySelector(".l-drawer-content");

    scrollArea.scrollTop = 0;

    // Use existing category filters.
    if (
      mode === "all" ||
      mode === "Skincare" ||
      mode === "Haircare" ||
      mode === "Makeup"
    ) {
      const category = mode === "all" ? "All" : mode;

      const button = [...shelf.querySelectorAll(".bs-filter")].find(
        (b) => b.dataset.category === category,
      );

      if (button) button.click();
    }

    if (mode === "search") {
      const input = shelf.querySelector("#bsSearch");
      requestAnimationFrame(() => input?.focus());
    }

    if (mode === "selected") {
      requestAnimationFrame(() => {
        shelf.querySelector(".bs-selected-area")?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      });
    }

    requestAnimationFrame(() => {
      drawer.querySelector("#lClose")?.focus({
        preventScroll: true,
      });
      if (mode === "search") {
        shelf.querySelector("#bsSearch")?.focus();
      }
    });
  }

  function goHome() {
    closeDrawer();
    closeDropdown();

    document.getElementById("vanityScene")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // ------------------------------------------
  // NAVIGATION EVENTS
  // ------------------------------------------
  explore.addEventListener("click", () => {
    dropdown.hidden = !dropdown.hidden;

    explore.setAttribute("aria-expanded", String(!dropdown.hidden));
  });

  header.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.open;

      if (mode === "home") {
        goHome();
      } else {
        openDrawer(mode);
      }
    });
  });

  header.querySelector("#lHome").addEventListener("click", (event) => {
    event.preventDefault();
    goHome();
  });

  header.querySelector("#lSearch").addEventListener("click", () => {
    openDrawer("search");
  });

  header.querySelector("#lAccount").addEventListener("click", () => {
    openDrawer("account");
  });

  header.querySelector("#lBag").addEventListener("click", () => {
    openDrawer("selected");
  });

  drawer.querySelector("#lClose").addEventListener("click", closeDrawer);

  backdrop.addEventListener("click", closeDrawer);

  drawer.querySelector("#lAccountShelf").addEventListener("click", () => {
    openDrawer("all");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".l-menu-wrap")) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!drawer.hidden) {
        closeDrawer();
      } else {
        closeDropdown();
      }
    }

    // Keep keyboard focus inside the open panel.
    if (event.key === "Tab" && !drawer.hidden) {
      const focusable = [
        ...drawer.querySelectorAll(
          "button:not([disabled]), a[href], input:not([disabled]), summary",
        ),
      ].filter(
        (el) => !el.closest("[hidden]") && el.getClientRects().length > 0,
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // ------------------------------------------
  // UPDATE SHOPPING BAG COUNT
  // ------------------------------------------
  const originalCount = shelf.querySelector("#bsCount");

  function updateBagCount() {
    if (!originalCount) return;

    const number = originalCount.textContent.match(/\d+/)?.[0] || "0";

    bagCount.textContent = number;
  }

  if (originalCount) {
    new MutationObserver(updateBagCount).observe(originalCount, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  updateBagCount();

  // After generating a routine, close the panel.
  // Existing code still sends the request to OpenAI.
  const generateButton = shelf.querySelector("#bsGenerate");

  if (generateButton) {
    generateButton.addEventListener("click", () => {
      if (!generateButton.disabled && !isSending) {
        closeDrawer();
      }
    });
  }

  console.log("L'Oréal navigation loaded.");
})();
