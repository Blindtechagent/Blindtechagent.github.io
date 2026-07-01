const form = document.getElementById('form');
const outputBox = document.getElementById('output');
const topicElement = document.getElementById('msg_text');
let API_KEY = null;

// Fetch API key from Firebase Realtime Database
firebase.database().ref('config/api_keys/openrouter').on('value', (snapshot) => {
    API_KEY = snapshot.val();
}, (error) => {
    console.error("Error fetching API key:", error);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const topic = topicElement.value;

    if (!topic) {
        outputBox.innerHTML = 'Please enter a topic.';
        return;
    }

    if (!API_KEY) {
        outputBox.innerHTML = '<p style="color: red;">API key is not loaded yet. Please ensure it is set in the database or wait a moment.</p>';
        return;
    }

    outputBox.innerHTML = '<div class="msg1"><h5>article is being generated...</h5><span>...</span></div>';

    try {
        const promptText = `Work as a team of 12 people, each with a special role to create one great article:
1. Researcher: Gathers detailed, up-to-date, and relevant information and data on the topic to support the article.
2. Idea Generator: Provides creative ideas, angles, and fresh perspectives to enrich the article content.
3. Writer: Writes the main article clearly, using input from the researcher and idea generator.
4. Content Developer: Expands on key points with additional examples, explanations, and supporting details.
5. Fact-checker: Ensures all information is factually correct, based on current data.
6. Language Expert: Fixes grammatical errors and writes effectively.
7. Simplifier: Explains difficult ideas in simple words so everyone can easily understand.
8. Audience Expert: Helps make the article easy to understand for readers.
9. Engagement Expert: Adds stories or examples to make it interesting and keep readers engaged until the end.
10. Human Editor: Removes anything that sounds robotic or AI-generated, so it feels natural and alive like written by a human.
11. HTML Expert: Handles the article’s HTML structure and formatting.
12. Final Reviewer: Checks everything to make sure it’s good and ready for publishing.
 
Task:
Your team must write a well-organized article about this topic: ${topic}
 
Instructions for creating the article (must be followed exactly):
Step 1: Writing style and tone
• Use only simple, easy-to-understand words. Avoid hard words, slang, or robotic language.
• Longer paragraphs are allowed if they help explain ideas better, but keep language simple.
• Use connecting phrases to smoothly transition between sections.
• The article should be detailed, elaborated, informative, and easy to read.
Step 2: Introduction
• Begin with a strong and interesting opening—a surprising fact or an amazing question.
• make the introduction section in 200 words..
• Clearly explain what readers will learn throughout the article.
Step 3: HTML structure and formatting
• Wrap the entire article inside one <div> tag with id="articleCode".
• Start the article with <h2>Introduction</h2>.
• Wrap all paragraphs in <p> tags.
• Break main sections into smaller parts using <h3> and <h4> headings.
• End the article with <h2>Conclusion</h2>.
• Use <ul> and <li> tags for bullet lists if needed.
• Use <strong> or <em> tags sparingly to highlight very important words or phrases.
• Do not add any other HTML tags such as <html> or <body>.
Step 4: Team member guidelines
• Do not show these instructions or any explanation in the final response.
• Output only the article content as per instructions above.
• Each team member must perform their role fully and contribute their best work.
• Do not invent statistics, quotes, studies, or historical facts unless they are widely known and verifiable.
Step5: Extra things: 
After closing the <div id="articleCode">, add a single <hr> tag, then one <p> tag that contains the following three items not related to article, separated by <br> tags:
• Title: Title of the article
• Description: Description for social media sharing
• Keywords: Keywords (comma separated)
Writing Restrictions:
• Do not use hard words, long difficult sentences, repeated sentence patterns, too many transition words, filler text, or overly formal writing. Write in a natural, simple, clear, and human way with varied sentence styles and easy-to-understand wording.
• Avoid commonly overused AI-style words and phrases such as: In today’s fast-paced world, ever-evolving, delve into, game-changer, unlock the potential, without further ado, needless to say, it is important to note, when it comes to, in conclusion, overall, moreover, furthermore, however, additionally, seamless, robust, cutting-edge, revolutionary, transformative, take it to the next level, enhance productivity, unlock possibilities, comprehensive guide, dive deep, journey, future-proof, think of, imagine, navigate, empower, dynamic landscape, treasure trove, rich tapestry, and other repetitive, robotic, generic, or overly polished AI-style wording.
`;

        console.log('Sending request to OpenRouter...');
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                messages: [
                    { role: "user", content: promptText }
                ]
            })
        });

        const responseData = await response.json();
        console.log('OpenRouter Response:', responseData);

        if (!response.ok) {
            throw new Error(responseData.error?.message || `API Error: ${response.status}`);
        }

        const text = responseData.choices[0].message.content;
        
        // Wrap output in the same structure as before to keep styling and add copy button
        outputBox.innerHTML = `
            <div class="msg1">
                <h5>Article generated:</h5>
                <span>${text}</span>
                <br>
                <div>
                    <button class='btn' onclick="navigator.clipboard.writeText(document.getElementById('articleCode').innerHTML)">copy article code</button>
                </div>
            </div>
        `;
        
        // Clear input field
        topicElement.value = '';
        
    } catch (error) {
        outputBox.innerHTML = `Error: ${error.message}. Please check your connection and API key.`;
        console.error('Detailed Error:', error);
    }
});

// Add back the microphone functionality
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
            console.error("Speech recognition error");
        };
    } else {
        console.error("Speech recognition not supported");
    }
});
