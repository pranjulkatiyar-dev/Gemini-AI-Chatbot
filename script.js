const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion-list .suggestion");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatbutton = document.querySelector("#delete-chat-button");

let userMessage = null;
let isResponseGenerating = false;

// API configuration.

const API_URL = "/.netlify/functions/gemini";

const loadLocalStorageData = () => {
  const savedChats = localStorage.getItem("savedChats");
  const isLightMode = localStorage.getItem("themeColor") === "light_mode";

  // apply the stored theme
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  chatList.innerHTML = savedChats || ""; // Load saved chats or set to empty if not found
  document.body.classList.toggle("hide-header", savedChats);
  // scroll while typing
  chatList.scrollTop = chatList.scrollHeight;
};
loadLocalStorageData();

// create a new message element and return it .
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  if (!text || typeof text !== "string") {
    textElement.innerText = "Error: No response text found.";
    return;
  }
  textElement.innerText = "";
  const words = text.split(" ");
  let currentWordindex = 0;

  const typingIntervel = setInterval(() => {
    // Append each word to the text element with a space
    textElement.innerText +=
      (currentWordindex === 0 ? "" : " ") + words[currentWordindex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    // if all words are displayed
    if (currentWordindex === words.length) {
      clearInterval(typingIntervel);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("savedChats", chatList.innerHTML); //save the chats to local storage.
      // scroll while typing
      chatList.scrollTop = chatList.scrollHeight;
    }
  }, 75);
};

// fetch response from the api based on user message

const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text"); // get text element to update it later with the API response
  // .
  // .
  // send a POST request to the Google Gemini API with the user's message
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed (${response.status}): ${text}`);
    }
    const data = await response.json();
    console.log(data);

    const apiResponse = data?.candidates[0]?.content?.parts[0]?.text.replace(
      /\*\*(.*?)\*\*/g,
      "$1",
    ); // Remove ** from the response text if present

    showTypingEffect(apiResponse, textElement, incomingMessageDiv);

    // textElement.innerText = apiResponse;
  } catch (error) {
    isResponseGenerating = false;
    console.error("generateAPIResponse error:", error);
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
};

// show loading animation while waiting for the response from the API.
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                <img src="./images/gemini.svg" alt="Gemini Image" class="avatar">
                <p class="text"></p>
                <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                </div>
            </div>
            <span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span> `;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatList.appendChild(incomingMessageDiv);

  // scroll while typing
  chatList.scrollTop = chatList.scrollHeight;

  generateAPIResponse(incomingMessageDiv); // Call the function to generate API response and pass the message div for updating it later
};
// add click event listener to each suggestion to set its text as the user message and trigger the chat response
suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});
// copy message content to clipboard when the copy icon is clicked

const copyMessage = (copyIcon) => {
  const messageText = copyIcon.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyIcon.innerText = "Done"; // show tick icon
  setTimeout(() => {
    copyIcon.innerText = "content_copy"; // revert back to copy icon after 1 second
  }, 1000);
};

//handle sending outgoing chat message
const handleOutgoingChat = () => {
  userMessage =
    typingForm.querySelector(".typing-input").value.trim() || userMessage;    // Get the user message from the input field or use the existing userMessage if it's already set (from suggestions)
    
  if (!userMessage || isResponseGenerating) return; // Exit if there is no msg
  isResponseGenerating = true;

  const html = ` <div class="message-content">
                <img src="./images/user.jpg" alt="User Image" class="avatar">
                <p class="text"></p>
            </div>`;
  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatList.appendChild(outgoingMessageDiv);

  typingForm.reset(); // Clear the input field after sending the message
  // scroll while typing
  chatList.scrollTop = chatList.scrollHeight;
  document.body.classList.add("hide-header"); // hide the header once the chat starts
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a short delay
};

// toggle between light and dark theme
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// delete all chats and clear local storage when button is clicked
deleteChatbutton.addEventListener("click", () => {
  if (confirm("Are you sure You want to delete the chat history?")) {
    localStorage.removeItem("savedChats");
    loadLocalStorageData();
  }
});

// prevent default `submit` event of the form and handle the outgoing chat message
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingChat();
});