/**
 * Advanced Semantic PDF Reader with OpenRouter AI Chat
 * Developed for Blind Tech Agent
 */

// State Management
let pdfDoc = null;
let pdfPagesHtml = []; 
let rawTextPages = []; 
let currentPage = 0;
let readingSpeed = 1.0;
let OPENROUTER_KEY = null;
let synth = window.speechSynthesis;
let currentUtterance = null;
let isReading = false;
let lastFocusedElement = null;
let pageAudio = null; // High-quality audio for the current page
let isDarkMode = false;
let isContinuous = true; // Continuous reading ON by default

function toggleContinuousReading() {
    isContinuous = !isContinuous;
    const btn = document.getElementById('continuousToggle');
    btn.innerHTML = isContinuous ? '<i class="fas fa-sync"></i> ☐ Read pages continuously: ON' : '<i class="fas fa-sync"></i> ☐ Read pages continuously: OFF';
    announce(`Continuous reading ${isContinuous ? 'enabled' : 'disabled'}`);
}
 


document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const resultContainer = document.getElementById('resultContainer');
    const dashboard = document.getElementById('dashboard');
    const uploadSection = document.getElementById('upload-section');
    const fileDetails = document.getElementById('file-details');
    const pageIndicator = document.getElementById('pageIndicator');
    const status = document.getElementById('status');
    const fileNameDisplay = document.getElementById('fileName');
    const pageCountDisplay = document.getElementById('pageCount');
    const jumpInput = document.getElementById('jumpInput');
    const speedVal = document.getElementById('speedVal');
    const speedRange = document.getElementById('speedRange');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const srAnnouncer = document.getElementById('sr-announcer');
    const moreActionsDialog = document.getElementById('moreActionsDialog');
    const aiChatDialog = document.getElementById('aiChatDialog');
    const aiChatHistory = document.getElementById('aiChatHistory');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatMicBtn = document.getElementById('aiChatMicBtn');

    // Initialize pdf.js
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    // Safe Firebase Initialization
    function initFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            try {
                firebase.database().ref('config/api_keys/openrouter').on('value', (snapshot) => {
                    OPENROUTER_KEY = snapshot.val();
                    console.log("AI Engine Ready");
                }, (error) => {
                    console.error("Firebase key error:", error);
                });
            } catch (e) {
                console.error("Firebase initialization failed:", e);
            }
        } else {
            setTimeout(initFirebase, 1000); 
        }
    }
    initFirebase();

    // --- Event Listeners ---

    // Microphone Logic
    if (aiChatMicBtn) {
        aiChatMicBtn.addEventListener('click', () => {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.start();

                recognition.onstart = () => {
                    aiChatMicBtn.classList.add('w3-red');
                    announce("Listening...");
                };

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    aiChatInput.value = transcript;
                    aiChatMicBtn.classList.remove('w3-red');
                };

                recognition.onerror = () => {
                    aiChatMicBtn.classList.remove('w3-red');
                    announce("Sorry, I couldn't hear you.");
                };

                recognition.onend = () => {
                    aiChatMicBtn.classList.remove('w3-red');
                };
            } else {
                announce("Speech recognition is not supported in this browser.");
            }
        });
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                alert("Please select a valid PDF file.");
                return;
            }
            processPDF(file);
        }
    });

    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatFollowUp();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (!pdfDoc) return;
        
        const activeEl = document.activeElement;
        const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;
        const key = e.key.toLowerCase();

        // Global Esc to close any dialog
        if (e.key === 'Escape') {
            if (aiChatDialog.open) closeChat();
            if (moreActionsDialog.open) { moreActionsDialog.close(); announce("Options closed"); }
            return;
        }

        if (isInput) {
            if (e.key === 'Enter') {
                if (activeEl.id === 'jumpInput') jumpToPage();
                else if (activeEl.id === 'aiChatInput') sendChatFollowUp();
            }
            return;
        }

        switch(key) {
            case 'n': case 'arrowright': changePage(1); break;
            case 'p': case 'arrowleft': changePage(-1); break;
            case 'r': toggleRead(); break;
            case 's': stopReading(); break;
            case 'a': askAiAboutPage(); break;
            case 'o': 
                if (moreActionsDialog.open) {
                    moreActionsDialog.close();
                    announce("Options closed");
                } else {
                    moreActionsDialog.showModal();
                    announce("Options opened");
                }
                break;
        }
    });

    // Helper functions need to be exposed globally if called from HTML
    window.processPDF = processPDF;
    window.displayPage = displayPage;
    window.changePage = changePage;
    window.jumpToPage = jumpToPage;
    window.updateSpeed = updateSpeed;
    window.copyText = copyText;
    window.downloadText = downloadText;
    window.clearAll = clearAll;
    window.announce = announce;
    window.toggleRead = toggleRead;
    window.askAiAboutPage = askAiAboutPage;
    window.sendChatFollowUp = sendChatFollowUp;
    window.closeChat = closeChat;
});

// --- Core PDF Engine (2D Spatial Clustering) ---

/**
 * Manually apply transform matrix (Replaces deprecated pdfjsLib.Util.transform)
 */
function applyTransform(m1, m2) {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
}

async function processPDF(file) {
    const status = document.getElementById('status');
    const uploadSection = document.getElementById('upload-section');
    const dashboard = document.getElementById('dashboard');
    const fileDetails = document.getElementById('file-details');
    const fileNameDisplay = document.getElementById('fileName');
    const pageCountDisplay = document.getElementById('pageCount');

    console.log("ProcessPDF started for:", file.name);

    if (!window.pdfjsLib) {
        console.error("PDF.js library missing!");
        alert("PDF library not loaded. Please refresh the page.");
        return;
    }

    // Ensure worker is set even if DOMContentLoaded missed it
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        console.log("Worker source set manually in processPDF");
    }
    
    status.innerText = "Reading file...";
    announce("Reading file. Please wait.");
    uploadSection.style.display = "none";
    pdfPagesHtml = [];
    rawTextPages = [];
    
    try {
        console.log("Converting file to ArrayBuffer...");
        const arrayBuffer = await file.arrayBuffer();
        console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);

        status.innerText = "Opening document...";
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        
        loadingTask.onProgress = (progress) => {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                status.innerText = `Loading: ${percent}%`;
            }
        };

        console.log("Waiting for PDF promise...");
        pdfDoc = await loadingTask.promise;
        console.log("PDF document loaded successfully. Pages:", pdfDoc.numPages);
        
        fileNameDisplay.innerText = file.name;
        pageCountDisplay.innerText = `${pdfDoc.numPages} Pages`;

        status.innerText = "Analyzing metrics...";
        const metrics = await analyzeMetrics(pdfDoc);
        console.log("Metrics analysis complete:", metrics);

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            status.innerText = `Formatting page ${i} of ${pdfDoc.numPages}...`;
            console.log(`Processing page ${i}...`);
            const page = await pdfDoc.getPage(i);
            const content = await reconstructPage(page, metrics);
            pdfPagesHtml.push(content.html);
            rawTextPages.push(content.text);
        }

        console.log("All pages processed.");
        status.innerText = "";
        dashboard.style.display = "flex";
        fileDetails.style.display = "flex";
        displayPage(0);
        announce(`Document ready. ${file.name} loaded.`);
    } catch (err) {
        console.error("Detailed PDF Process Error:", err);
        alert("Failed to read this PDF: " + err.message);
        clearAll();
    }
}

async function analyzeMetrics(doc) {
    const freq = {};
    const limit = Math.min(doc.numPages, 15);
    for (let i = 1; i <= limit; i++) {
        const page = await doc.getPage(i);
        const text = await page.getTextContent();
        for (let it of text.items) {
            const fs = Math.round(Math.abs(it.transform[0] || it.transform[3]));
            if (fs > 0) freq[fs] = (freq[fs] || 0) + it.str.length;
        }
    }
    const sizes = Object.keys(freq).map(Number).sort((a, b) => freq[b] - freq[a]);
    const baseline = sizes[0] || 12;
    const hMap = {};
    let hl = 1;
    [...sizes].sort((a,b) => b-a).forEach(s => {
        if (s > baseline + 1.5) {
            hMap[s] = hl;
            if (hl < 4) hl++;
        }
    });
    return { baseline, hMap };
}

async function reconstructPage(page, metrics) {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    const items = textContent.items.map(it => {
        const tx = applyTransform(viewport.transform, it.transform);
        return {
            str: it.str,
            x: tx[4], y: tx[5],
            w: it.width, h: Math.abs(tx[3]),
            fs: Math.round(Math.abs(it.transform[0] || it.transform[3])),
            font: it.fontName || ''
        };
    }).filter(it => it.str.trim().length > 0);

    if (!items.length) return { html: "<p>[Empty Page]</p>", text: "" };

    const blocks = [];
    const visited = new Set();

    for (let i = 0; i < items.length; i++) {
        if (visited.has(i)) continue;
        const blockItems = [];
        const queue = [i];
        visited.add(i);
        while (queue.length) {
            const idx = queue.shift();
            const a = items[idx];
            blockItems.push(a);
            for (let j = 0; j < items.length; j++) {
                if (visited.has(j)) continue;
                const b = items[j];
                const vDist = Math.abs(a.y - b.y);
                const hDist = b.x > a.x + a.w ? b.x - (a.x + a.w) : (a.x > b.x + b.w ? a.x - (b.x + b.w) : 0);
                
                if (vDist < Math.max(a.h, b.h) * 1.0 && hDist < Math.max(a.h, b.h) * 2.5) {
                    visited.add(j);
                    queue.push(j);
                }
            }
        }
        const bFsFreq = {};
        blockItems.forEach(it => { bFsFreq[it.fs] = (bFsFreq[it.fs] || 0) + it.str.length; });
        const domFs = parseInt(Object.keys(bFsFreq).reduce((a, b) => (bFsFreq[a] || 0) > (bFsFreq[b] || 0) ? a : b));
        
        blocks.push({
            items: blockItems.sort((a,b) => Math.abs(a.y-b.y) < 5 ? a.x-b.x : a.y-b.y),
            y: Math.min(...blockItems.map(it => it.y)),
            x: Math.min(...blockItems.map(it => it.x)),
            fs: domFs
        });
    }

    blocks.sort((a, b) => Math.abs(a.y - b.y) > metrics.baseline * 1.2 ? a.y - b.y : a.x - b.x);

    let html = '', text = '';
    for (let b of blocks) {
        let bStr = '', lastX, lastW;
        for (let it of b.items) {
            if (lastX !== undefined && it.x > lastX + lastW + (it.h * 0.2)) bStr += ' ';
            bStr += it.str;
            lastX = it.x; lastW = it.w;
        }
        let hl = metrics.hMap[b.fs] || (metrics.hMap[b.fs-1]) || (metrics.hMap[b.fs+1]);
        const tag = hl ? `h${hl}` : 'p';
        const style = b.items.some(it => it.font.toLowerCase().includes('bold')) ? 'font-weight:bold;' : '';
        html += `<${tag} style="${style}">${bStr.trim()}</${tag}>`;
        text += bStr.trim() + '\n\n';
    }
    return { html, text: text.trim() };
}

// --- Native TTS ---

function toggleRead() {
    if (isReading) {
        if (pageAudio && !pageAudio.paused) {
            pageAudio.pause();
        } else {
            synth.pause();
        }
        isReading = false;
        document.getElementById('playIcon').className = "fas fa-play";
        document.getElementById('playText').innerText = "Play";
        announce("Reading paused");
    } else {
        if (pageAudio && pageAudio.paused && pageAudio.currentTime > 0) {
            pageAudio.play();
        } else if (synth.paused) {
            synth.resume();
            isReading = true;
            document.getElementById('playIcon').className = "fas fa-pause";
            document.getElementById('playText').innerText = "Pause";
            announce("Reading resumed");
        } else {
            readAloud();
        }
    }
}

function readAloud() {
    stopReading();
    const text = rawTextPages[currentPage];
    if (!text) return;

    if (pageAudio) {
        announce("Reading started.");
        pageAudio.play().catch(e => {
            console.error("High-quality TTS failed:", e);
            fallbackToNative(text);
        });
    } else {
        fallbackToNative(text);
    }
}

function fallbackToNative(text) {
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = readingSpeed;
    currentUtterance.onstart = () => { 
        isReading = true; 
        document.getElementById('playIcon').className = "fas fa-pause"; 
        document.getElementById('playText').innerText = "Pause"; 
    };
    currentUtterance.onend = () => { 
        isReading = false; 
        document.getElementById('playIcon').className = "fas fa-play"; 
        document.getElementById('playText').innerText = "Play"; 
        announce("Finished reading page."); 
    };
    currentUtterance.onerror = () => { 
        isReading = false; 
        document.getElementById('playIcon').className = "fas fa-play"; 
        document.getElementById('playText').innerText = "Play"; 
    };
    synth.speak(currentUtterance);
}

function stopReading() {
    synth.cancel();
    if (pageAudio) {
        pageAudio.pause();
        pageAudio.currentTime = 0;
    }
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
    }
    isReading = false;
    document.getElementById('playIcon').className = "fas fa-play";
    document.getElementById('playText').innerText = "Play";
    announce("Reading stopped");
}

// --- OpenRouter AI Chat ---

function closeChat() {
    document.getElementById('aiChatDialog').close();
    announce("Chat closed");
    if (lastFocusedElement) lastFocusedElement.focus();
}

async function askAiAboutPage() {
    if (!pdfDoc) return;
    const pageText = rawTextPages[currentPage];
    if (!pageText || pageText.trim().length < 10) return announce("Page is empty.");

    lastFocusedElement = document.activeElement;

    const dialog = document.getElementById('aiChatDialog');
    if (!dialog.open) {
        document.getElementById('aiChatHistory').innerHTML = `<div class="chat-msg ai" role="status">Hello! I've read Page ${currentPage + 1}. Ask me anything about it.</div>`;
    }
    dialog.showModal();
    document.getElementById('aiChatInput').focus();
    announce("AI Chat opened. Type your question about the current page.");
}

async function sendChatFollowUp() {
    const aiChatInput = document.getElementById('aiChatInput');
    const question = aiChatInput.value.trim();
    if (!question) return;

    if (!OPENROUTER_KEY) {
        announce("The AI service is still initializing. Please wait a few seconds and try again.");
        alert("AI is still loading. Please wait a few seconds.");
        return;
    }

    appendChatMessage('user', question);
    aiChatInput.value = "";
    
    const loadingId = 'loading-' + Date.now();
    appendChatMessage('ai', 'Thinking...', loadingId);
    announce("AI is processing your question.");
    
    try {
        const pageText = rawTextPages[currentPage];
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Blind Tech Agent PDF Reader"
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                messages: [
                    { 
                        role: "system", 
                        content: `You are a professional AI assistant created by Pawan Kumar to help users interact with their documents. 
                        Your primary goal is to help the user understand the provided PDF content. 
                        
                        RULES:
                        1. Use the provided PDF text as the primary context for answering questions.
                        2. If the user asks a question that isn't directly answered in the PDF, or a general question related to the topic, use your broader knowledge to provide a helpful and accurate response.
                        3. Maintain a professional, supportive, and clear tone.
                        
                        STRICT RESPONSE RULES:
                        1. Respond ONLY using raw semantic HTML tags (e.g., <p>, <strong>, <ul>, <li>, <code>).
                        2. DO NOT use Markdown (no backticks, #, or **).
                        3. ALL text must be wrapped in appropriate tags.
                        4. Be concise and highly accessible for screen readers.` 
                    },
                    { 
                        role: "user", 
                        content: `CONTEXT (PDF Page ${currentPage + 1}):\n"${pageText.substring(0, 4000)}"\n\nUSER QUESTION: ${question}` 
                    }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "API failure");
        }

        const data = await response.json();
        const answer = data.choices[0].message.content;
        
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        appendChatMessage('ai', answer.trim());
        announce("AI replied");
    } catch (err) {
        console.error("Chat Error:", err);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.innerText = "Error: " + err.message;
        }
        announce("An error occurred while talking to the AI.");
    }
}

function appendChatMessage(role, text, id = null) {
    const aiChatHistory = document.getElementById('aiChatHistory');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    if (id) msg.id = id;

    // Add heading for sender
    const heading = document.createElement('h5');
    heading.style.margin = "0 0 5px 0";
    heading.style.fontSize = "0.8em";
    heading.style.fontWeight = "bold";
    heading.style.opacity = "0.8";
    heading.textContent = role === 'user' ? "You said:" : (id ? "AI is thinking..." : "AI replied:");
    msg.appendChild(heading);
    
    if (role === 'ai' && id === null) {
        // AI response (not loading)
        const contentSpan = document.createElement('div');
        contentSpan.innerHTML = text;
        msg.appendChild(contentSpan);

        // Immediate High-Quality TTS Generation (Pre-loading)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = (tempDiv.textContent || tempDiv.innerText || "").substring(0, 3000);
        const ttsUrl = `https://googletexttospeech-apihubforblind.onrender.com/?text=${encodeURIComponent(plainText)}&lang=en-IN`;
        const aiResponseAudio = new Audio(ttsUrl);
        aiResponseAudio.playbackRate = readingSpeed;
        aiResponseAudio.preload = "auto";

        // Action buttons
        const actions = document.createElement('div');
        actions.style.marginTop = "10px";
        actions.style.display = "flex";
        actions.style.gap = "10px";

        const listenBtn = document.createElement('button');
        listenBtn.className = "w3-button w3-tiny w3-round w3-light-gray";
        listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        
        // Audio Event Listeners for UI state
        aiResponseAudio.onplay = () => {
            listenBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            announce("Playing audio.");
        };
        aiResponseAudio.onpause = () => {
            listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
            announce("Audio paused.");
        };
        aiResponseAudio.onended = () => {
            listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
            announce("Audio finished.");
        };

        listenBtn.onclick = () => {
            if (window.currentAudio && window.currentAudio === aiResponseAudio && !aiResponseAudio.paused) {
                aiResponseAudio.pause();
            } else {
                // Clean up any other existing audio
                if (window.currentAudio && window.currentAudio !== aiResponseAudio) {
                    window.currentAudio.pause();
                }
                window.currentAudio = aiResponseAudio;
                
                aiResponseAudio.play().catch(e => {
                    console.error("TTS Playback Error:", e);
                    announce("High-quality voice failed. Using standard voice.");
                    const speech = new SpeechSynthesisUtterance(plainText);
                    speech.onstart = () => listenBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                    speech.onend = () => listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
                    window.speechSynthesis.speak(speech);
                });
            }
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = "w3-button w3-tiny w3-round w3-light-gray";
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.onclick = () => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            navigator.clipboard.writeText(plainText).then(() => announce("Copied to clipboard"));
        };

        actions.appendChild(listenBtn);
        actions.appendChild(copyBtn);
        msg.appendChild(actions);
    } else {
        // User message or loading state
        const contentSpan = document.createElement('div');
        contentSpan.innerText = text;
        msg.appendChild(contentSpan);
    }

    aiChatHistory.appendChild(msg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

// --- UI Navigation ---

async function displayPage(index) {
    if (!pdfDoc || index < 0 || index >= pdfDoc.numPages) return;
    stopReading();
    currentPage = index;
    document.getElementById('resultContainer').innerHTML = pdfPagesHtml[currentPage];
    document.getElementById('pageIndicator').innerText = `Page ${currentPage + 1} of ${pdfDoc.numPages}`;
    document.getElementById('prevBtn').disabled = (currentPage === 0);
    document.getElementById('nextBtn').disabled = (currentPage === pdfDoc.numPages - 1);
    document.getElementById('resultContainer').parentElement.scrollTop = 0;
    document.getElementById('jumpInput').value = currentPage + 1;
    announce(`Showing page ${currentPage + 1}`);

    // Pre-load high quality audio for the current page
    const text = (rawTextPages[currentPage] || "").substring(0, 3000);
    if (text.trim().length > 0) {
        const ttsUrl = `https://googletexttospeech-apihubforblind.onrender.com/?text=${encodeURIComponent(text)}&lang=en-IN`;
        pageAudio = new Audio(ttsUrl);
        pageAudio.playbackRate = readingSpeed;
        pageAudio.preload = "auto";
        
        // Setup UI sync for the footer Play/Pause button
        pageAudio.onplay = () => {
            isReading = true;
            document.getElementById('playIcon').className = "fas fa-pause";
            document.getElementById('playText').innerText = "Pause";
        };
        pageAudio.onpause = () => {
            isReading = false;
            document.getElementById('playIcon').className = "fas fa-play";
            document.getElementById('playText').innerText = "Play";
        };
        pageAudio.onended = () => {
            isReading = false;
            document.getElementById('playIcon').className = "fas fa-play";
            document.getElementById('playText').innerText = "Play";
            announce("Finished reading page.");
            
            // Continuous Reading Logic
            if (isContinuous && pdfDoc && currentPage < pdfDoc.numPages - 1) {
                setTimeout(() => {
                    changePage(1);
                    setTimeout(() => toggleRead(), 500); // Start reading next page
                }, 1000);
            }
        };
    } else {
        pageAudio = null;
    }
}

function changePage(delta) { if (pdfDoc) displayPage(currentPage + delta); }

function jumpToPage() {
    const val = parseInt(document.getElementById('jumpInput').value);
    if (pdfDoc && val >= 1 && val <= pdfDoc.numPages) displayPage(val - 1);
    else announce("Invalid page.");
}

function updateSpeed(val) {
    readingSpeed = parseFloat(val);
    document.getElementById('speedVal').innerText = val;
    
    // Apply to current page audio
    if (pageAudio) pageAudio.playbackRate = readingSpeed;
    
    // Apply to active AI chat audio
    if (window.currentAudio) window.currentAudio.playbackRate = readingSpeed;

    announce(`Speed ${val}x`);
}function copyText() {
    navigator.clipboard.writeText(rawTextPages[currentPage]).then(() => announce("Copied current page."));
}
 
function downloadText() {
    const blob = new Blob([rawTextPages[currentPage]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Page_${currentPage + 1}.txt`; a.click();
    URL.revokeObjectURL(url);
}
 
function downloadAllText() {
    const blob = new Blob([rawTextPages.join('\n\n--- Page Break ---\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Full_Extracted_Text.txt'; a.click();
    URL.revokeObjectURL(url);
    announce("Downloading full document text.");
}
 
async function summarizeDocument() {
    if (!pdfDoc) return;
    document.getElementById('moreActionsDialog').close();
    
    lastFocusedElement = document.activeElement;
    const dialog = document.getElementById('aiChatDialog');
    
    // Create a special summary prompt
    const fullTextSample = rawTextPages.slice(0, 10).join('\n').substring(0, 4000);
    const summaryQuestion = "Please provide a concise summary of this document based on the first few pages.";
 
    if (!dialog.open) {
        document.getElementById('aiChatHistory').innerHTML = `<div class="chat-msg ai" role="status">Preparing a summary of your document...</div>`;
    }
    dialog.showModal();
    announce("AI is generating a document summary.");
 
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Blind Tech Agent PDF Reader"
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a professional document summarizer. Respond ONLY with semantic HTML tags. Be concise but thorough." 
                    },
                    { 
                        role: "user", 
                        content: `DOCUMENT CONTENT (Sample):\n"${fullTextSample}"\n\nTASK: ${summaryQuestion}` 
                    }
                ]
            })
        });
 
        if (!response.ok) throw new Error("API failure");
 
        const data = await response.json();
        const summary = data.choices[0].message.content;
        
        document.getElementById('aiChatHistory').innerHTML = ""; // Clear the loading msg
        appendChatMessage('ai', `<h3>Document Summary</h3>${summary.trim()}`);
        announce("Summary complete.");
    } catch (err) {
        console.error("Summary Error:", err);
        appendChatMessage('ai', "Failed to generate summary: " + err.message);
    }
}
 
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    const rc = document.getElementById('resultContainer');
    const toggleBtn = document.getElementById('themeToggle');
    
    if (isDarkMode) {
        if (rc) {
            rc.style.background = "#1a202c";
            rc.style.color = "#edf2f7";
        }
        toggleBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        announce("Dark mode enabled");
    } else {
        if (rc) {
            rc.style.background = "#ffffff";
            rc.style.color = "#1a202c";
        }
        toggleBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        announce("Light mode enabled");
    }
}

function clearAll() {
    stopReading(); pdfDoc = null; pdfPagesHtml = []; rawTextPages = [];
    document.getElementById('dashboard').style.display = "none"; 
    document.getElementById('file-details').style.display = "none";
    document.getElementById('upload-section').style.display = "block"; 
    document.getElementById('status').innerText = "";
    document.getElementById('fileInput').value = ""; 
    document.getElementById('resultContainer').innerHTML = "";
    announce("Closed.");
}

function announce(message) { 
    const sr = document.getElementById('sr-announcer');
    if (sr) {
        sr.innerText = '';
        setTimeout(() => {
            sr.innerText = message;
        }, 50);
    }
}
