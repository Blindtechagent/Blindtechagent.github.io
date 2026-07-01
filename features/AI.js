let API_KEY = null;

// Fetch API key from Firebase Realtime Database
firebase.database().ref('config/api_keys/openrouter').on('value', (snapshot) => {
    API_KEY = snapshot.val();
}, (error) => {
    console.error("Error fetching API key:", error);
});

// Function to fetch AI response from OpenRouter
async function fetchAIResponse(userMsg, tb, loadingIndicator) {
    try {
        if (!API_KEY) {
            throw new Error('API key is not loaded yet. Please wait a moment or ensure it is set in the database.');
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                messages: [
                    { 
                        role: "system", 
                        content: `You are Blind Tech Agent AI, a helpful, versatile, and professional assistant created by Pawan Kumar. Your goal is to provide clear, effective, and supportive assistance on a wide range of general topics.

STRICT RESPONSE RULES:
1. Respond ONLY using raw semantic HTML tags (e.g., <p>, <strong>, <ul>, <li>, <code>).
2. DO NOT use Markdown (no backticks, #, or **).
3. DO NOT include <html>, <head>, <body>, <script>, or <style> tags.
4. ALL text must be wrapped in appropriate tags. Do not provide text outside of HTML tags.
5. Identify as 'Blind Tech Agent AI' and mention your creator, Pawan Kumar, if asked.
6. Keep responses concise, supportive, and highly accessible for screen readers.
7. Since your response will be read aloud via Speech Synthesis, avoid complex symbols or long strings of special characters.
8. Focus exclusively on general-purpose assistance and conversation; do not provide information about specific platform features or tools unless specifically asked about your identity or creator.`
                    },
                    { role: "user", content: userMsg }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to fetch response');
        }

        const data = await response.json();
        const answerValue = data.choices[0].message.content;

        tb.removeChild(loadingIndicator); // Remove loading indicator after response is received

        // Append the AI's response to the chat
        appendMessage('BTA AI said:', answerValue, 'msg1', 'sender-ai', tb);
        // Auto-scroll the chat window to show the new message
        tb.scrollTop = tb.scrollHeight;
        // Announce AI response (for screen readers)
        announce("Blind Tech Agent AI replied");

    } catch (error) {
        console.error("Error:", error);
        if (loadingIndicator && loadingIndicator.parentNode === tb) {
            tb.removeChild(loadingIndicator); // Ensure loading indicator is removed on error
        }
        announce("There was an error fetching the response: " + error.message);
    }
}

// Add event listener to form submission for text-based input
document.getElementById('form').addEventListener('submit', function (event) {
    event.preventDefault();
    const inputMsg = document.getElementById('msg_text').value.trim();
    const tb = document.getElementById('tb');

    if (inputMsg !== '') {
        // User message section
        appendMessage('You said:', inputMsg, 'msg', 'sender-user', tb);

        // Announce message sent successfully (for screen readers)
        announce("Message sent successfully");

        document.getElementById('msg_text').value = '';  // Clear input field
        tb.scrollTop = tb.scrollHeight;  // Auto-scroll to the latest message

        // Display loading indicator while fetching AI response
        const loadingIndicator = appendMessage('BTA AI is typing...', '...', 'msg1', 'loading', tb);

        // Fetch AI response
        fetchAIResponse(inputMsg, tb, loadingIndicator);
    }
});

// Function to append message to the chat
function appendMessage(sender, text, messageClass, senderClass, parentElement) {
    const msgContainer = document.createElement('div');
    msgContainer.className = messageClass;

    const heading = document.createElement('h5');
    heading.textContent = sender;
    heading.className = senderClass;

    const msgText = document.createElement('span');
    msgText.innerHTML = text;

    msgContainer.appendChild(heading);
    msgContainer.appendChild(msgText);
    let lineBreak = document.createElement('br');
    msgContainer.appendChild(lineBreak);
    // Add "Listen" and "copy" button for AI messages (but not for the loading indicator)
    if (messageClass === 'msg1' && senderClass !== 'loading') {
        // Pre-load Google TTS Audio immediately when AI replies
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = (tempDiv.textContent || tempDiv.innerText || "").substring(0, 3000);
        const ttsUrl = `https://googletexttospeech-apihubforblind.onrender.com/?text=${encodeURIComponent(plainText)}&lang=en-IN`;
        const preloadedAudio = new Audio(ttsUrl);
        preloadedAudio.preload = "auto";

        const listenButton = createListenButton(text, preloadedAudio, plainText);
        msgContainer.appendChild(listenButton);
        const copyButton = createCopyButton(text);
        msgContainer.appendChild(copyButton);
    }

    parentElement.appendChild(msgContainer);

    return msgContainer;  // Return the message container to remove loading indicator later
}

// Function to create the "Listen" button and add voice functionality
function createListenButton(text, preloadedAudio, plainText) {
    const listenButton = document.createElement('button');
    listenButton.className = 'btn listen-btn';
    listenButton.setAttribute('aria-label', 'Listen');
    
    // Initial content
    const icon = document.createElement('i');
    icon.className = 'fas fa-volume-up';
    listenButton.appendChild(icon);
    const btnText = document.createTextNode(' Listen');
    listenButton.appendChild(btnText);

    // Audio Event Listeners for UI state
    preloadedAudio.onplay = () => {
        icon.className = 'fas fa-pause';
        btnText.textContent = ' Pause';
        announce("Playing audio");
    };
    preloadedAudio.onpause = () => {
        icon.className = 'fas fa-volume-up';
        btnText.textContent = ' Listen';
        announce("Audio paused");
    };
    preloadedAudio.onended = () => {
        icon.className = 'fas fa-volume-up';
        btnText.textContent = ' Listen';
        announce("Audio finished");
    };

    listenButton.addEventListener('click', function () {
        if (window.currentAudio && window.currentAudio === preloadedAudio && !preloadedAudio.paused) {
            preloadedAudio.pause();
        } else {
            // Clean up any other existing audio
            if (window.currentAudio && window.currentAudio !== preloadedAudio) {
                window.currentAudio.pause();
            }
            window.currentAudio = preloadedAudio;
            
            preloadedAudio.play().catch(err => {
                console.error("TTS Playback Error:", err);
                announce("High-quality voice failed. Using standard voice.");
                const speech = new SpeechSynthesisUtterance(plainText);
                speech.lang = 'en-IN'; // Consistent with requested Indian English
                speech.onstart = () => {
                    icon.className = 'fas fa-pause';
                    btnText.textContent = ' Pause';
                };
                speech.onend = () => {
                    icon.className = 'fas fa-volume-up';
                    btnText.textContent = ' Listen';
                };
                window.speechSynthesis.speak(speech);
            });
        }
    });
    return listenButton;
}

// Function to create a 'Copy' button for AI message
function createCopyButton(text) {
    const copyButton = document.createElement('button');
    copyButton.className = 'btn copy-btn';
    copyButton.setAttribute('aria-label', 'Copy response');
    // Adding the icon for Copy button
    const icon = document.createElement('i');
    icon.className = 'fas fa-copy';  // Font Awesome icon for copy
    copyButton.appendChild(icon);

    // Adding click event to copy the AI message to the clipboard
    copyButton.addEventListener('click', function () {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        navigator.clipboard.writeText(plainText)
            .then(() => announce("Message copied to clipboard"))  // Announce copy success
            .catch(() => announce("Failed to copy message"));  // Announce copy failure
    });

    return copyButton;  // Return the copy button to append to the message
}

// Function to announce messages to screen readers
function announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');  // Set role to 'alert' for live region
    announcement.className = 'visually-hidden';  // Make it visually hidden
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove the announcement after 1 second to avoid clutter
    setTimeout(() => document.body.removeChild(announcement), 1000);
}

// Add event listener for the microphone button to use voice recognition for input
document.getElementById('micBtn').addEventListener('click', function () {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.start();

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('msg_text').value = transcript;
        };

        recognition.onerror = function () {
            announce("Sorry, I couldn't hear you. Please try again.");
        };
    } else {
        announce("Speech recognition is not supported in this browser.");
    }
});

// Event listener to refresh (clear) the chat
document.getElementById('refreshButton').addEventListener('click', function () {
    const tb = document.getElementById('tb');
    tb.innerHTML = '';
    const initialMsg = document.createElement('div');
    initialMsg.className = 'dfm';
    initialMsg.innerHTML = '<span>Hello! I am Blind Tech Agent AI. How can I assist you today?</span>';
    tb.appendChild(initialMsg);
    announce("Chat refreshed");
});
