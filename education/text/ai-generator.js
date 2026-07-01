let API_KEY = null;

// Fetch API key from Firebase Realtime Database
firebase.database().ref('config/api_keys/openrouter').on('value', (snapshot) => {
    API_KEY = snapshot.val();
}, (error) => {
    console.error("Error fetching API key:", error);
});

async function fetchAiChapter(topic) {
    if (!API_KEY) {
        alert('API key is not loaded yet. Please wait a moment.');
        return;
    }
    const aiStatus = document.getElementById('aiStatus');
    const generateAiBtn = document.getElementById('generateAiBtn');
    aiStatus.textContent = 'Architecting curriculum and gathering context...';
    if (typeof window.announce === 'function') window.announce('Analyzing curriculum and gathering context.');
    generateAiBtn.disabled = true;

    // 1. Context Gathering: Full Curriculum Hierarchy
    const urlParams = new URLSearchParams(window.location.search);
    const subjectKey = urlParams.get('subjectKey');
    const unitKey = urlParams.get('unitKey');
    const chapterName = urlParams.get('chapterName') ? decodeURIComponent(urlParams.get('chapterName')) : 'Unknown';

    let contextData = { subjectName: subjectKey, unitName: 'Unknown', unitChapters: [], allUnits: [] };

    try {
        const db = firebase.database();
        const subjectSnap = await db.ref(`education/${subjectKey}`).once('value');
        if (subjectSnap.exists()) {
            const data = subjectSnap.val();
            contextData.subjectName = data.subjectName || subjectKey;
            
            // Get all units
            if (data.units) {
                contextData.allUnits = Object.values(data.units).map(u => u.name).filter(Boolean);
                const currentUnit = data.units[unitKey];
                if (currentUnit) {
                    contextData.unitName = currentUnit.name || 'Unknown Unit';
                    if (currentUnit.chapters) {
                        contextData.unitChapters = Object.values(currentUnit.chapters).map(c => c.name).filter(Boolean);
                    }
                }
            }
        }
    } catch (e) { console.error("Context fetch error:", e); }

    // 2. Build Intelligent Prompt
    const systemPrompt = `You are a educative textbook writer for students (grades 5-10). 
Write informative, educational, and high-quality textbook chapters.

WRITING RULES:
- Tone: Academic, informative and slight conversational. 
- Language: Simple, clear, and easy to understand.
- never use tipical, high quality, not common and difficult to understand words.
- Do NOT use: AI filler (In today's world, delve into, etc.), conversational filler, or rhetorical questions.
- Bridge knowledge: Connect this chapter to previous ones only and only in the beginning if available, if current chapter is first chapter of first unit, then there is no previous content, so treet current as first chapter.
- if current chapter is first chapter of first unit, only and only then in the beginning explain the broader welcome of whole journey of the subject along with overview of the current chapter, otherwise if current chapter is first chapter but not of the first unit, then in the beginning explain broader welcome of the current unit along with overview of the current chapter. also if the current chapter is not the first chapter then do not welcome, just connect to previous chapter along with overview of the current chapter.

STRUCTURE RULES (MUST FOLLOW EXACTLY):
1. ALWAYS start with <h2>Overview</h2> (A soft connecct to previous chapter or chapters if available and a brief overview of the core principle).
2. ALWAYS follow with <h2>Learning Path</h2> (A concise bulleted list of what we will learn throughout the chapter).
3. Then start  the main content using dynamic <h3> and <h4> headings, more if needed.
4. ALWAYS end with <h2>Summary</h2> (A clear recap of core knowledge).
- NEVER generate a heading that is the Chapter Name itself.

FORMATTING (HTML ONLY):
- Wrap in <div id="chapterCode">.
- Use <p> for body text, <ul>/<li> for lists.
- Suggest next chapter title at the end: [SUGGESTED NEXT CHAPTER: Title].
- Do not add meta-tags, markdown, or explanations.`;

    const userPrompt = `
Generate a textbook chapter for:
Subject: ${contextData.subjectName}
Unit: ${contextData.unitName}
Current Chapter: ${chapterName}
Topic Focus: ${topic}

CURRICULUM CONTEXT:
- All Units in Subject: ${contextData.allUnits.join(', ')}
- Other Chapters in Current Unit: ${contextData.unitChapters.filter(c => c !== chapterName).join(', ')}

INSTRUCTIONS:
- If "Other Chapters in Current Unit" is empty, this is the FIRST chapter. Focus on foundational concepts.
- If other chapters exist, explicitly sequence this chapter and build upon previous knowledge.
- Teach in detail, step-by-step and gradually, providing high-quality defth knowledge.
- keep the flow maintain from starting to end, to engage the readers and do not feel bored.`;

    // 3. API Request
    try {
        aiStatus.textContent = 'Architecting textbook content...';
        if (typeof window.announce === 'function') window.announce('Writing textbook content.');
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                temperature: 0.5, // Lower temperature for more formal/precise output
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `API Error: ${response.status}`);

        let aiResponse = data.choices[0].message.content;
        const suggestMatch = aiResponse.match(/\[SUGGESTED NEXT CHAPTER: (.*?)\]/);
        const suggestedChapter = suggestMatch ? suggestMatch[1] : null;
        let aiHtml = aiResponse.replace(/\[SUGGESTED NEXT CHAPTER: .*?\]/g, '').replace(/```html/g, '').replace(/```/g, '').trim();

        // 4. Load into editor
        const parser = new DOMParser();
        const doc = parser.parseFromString(aiHtml, 'text/html');
        const contentRoot = doc.getElementById('chapterCode') || doc.body;
        
        if (contentRoot.children.length > 0) {
            Array.from(contentRoot.children).forEach(el => {
                if (typeof window.addElementToOutput === 'function') window.addElementToOutput(el);
            });
            const statusMsg = suggestedChapter ? 'Content added. Suggested next: ' + suggestedChapter : 'Content added successfully.';
            if (typeof window.announce === 'function') window.announce(statusMsg);
            aiStatus.textContent = statusMsg;
        } else {
            if (typeof window.announce === 'function') window.announce('Error: AI returned empty content.');
            aiStatus.textContent = 'AI returned empty content.';
        }
    } catch (error) {
        console.error(error);
        alert('Generation Error: ' + error.message);
        if (typeof window.announce === 'function') window.announce('Error occurred.');
        aiStatus.textContent = 'Error occurred.';
    } finally {
        generateAiBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const generateAiBtn = document.getElementById('generateAiBtn');
    const aiTopicInput = document.getElementById('aiTopic');
    const toggleAiModeBtn = document.getElementById('toggleAiMode');
    const aiInputArea = document.getElementById('aiInputArea');

    if (toggleAiModeBtn && aiInputArea) {
        toggleAiModeBtn.addEventListener('click', () => {
            const isHidden = aiInputArea.style.display === 'none';
            aiInputArea.style.display = isHidden ? 'block' : 'none';
            toggleAiModeBtn.textContent = isHidden ? 'Switch to Manual Mode' : 'Switch to AI Mode';
        });
    }

    if (generateAiBtn) {
        generateAiBtn.addEventListener('click', () => {
            const topic = aiTopicInput.value.trim();
            if (!topic) return alert('Enter a topic.');
            fetchAiChapter(topic);
        });
    }
});