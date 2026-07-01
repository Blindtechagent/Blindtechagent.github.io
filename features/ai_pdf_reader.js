/* 
 * Professional PDF Reader JavaScript
 * Uses PDF.js for extraction and a professional layout engine for high-fidelity HTML reconstruction.
 */

// State Management
let pdfDoc = null;
let currentPage = 0;
let readingSpeed = 1.0;
let fontSize = 18;
let synth = window.speechSynthesis;
let currentUtterance = null;
let isReading = false;
let pageAudio = null; // High-quality audio for the current page

// Processing State
let API_KEY = null;
let pageCache = {}; // Stores reconstructed HTML for each page

// Fetch processing configuration (Project standard)
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        firebase.database().ref('config/api_keys/openrouter').on('value', (snapshot) => {
            API_KEY = snapshot.val();
            console.log("AI Engine configuration loaded.");
        }, (error) => {
            console.error("Error fetching engine configuration:", error);
        });
    } else {
        console.warn("Firebase not ready, retrying in 2s...");
        setTimeout(initializeFirebase, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    // Initialize pdf.js
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'application/pdf') {
                    alert("Please select a valid PDF file.");
                    return;
                }
                processPDF(file);
            }
        });
    }

    window.addEventListener('keydown', (e) => {
        if (!pdfDoc) return;
        const activeEl = document.activeElement;
        const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
        if (isInput) return;
        
        const key = e.key.toLowerCase();
        switch (key) {
            case 'n': changePage(1); break;
            case 'p': changePage(-1); break;
            case 'r': toggleRead(); break;
            case 's': stopReading(); break;
            case '+': adjustFontSize(2); break;
            case '-': adjustFontSize(-2); break;
        }
    });

    // Expose global functions
    window.processPDF = processPDF;
    window.displayPage = displayPage;
    window.changePage = changePage;
    window.jumpToPage = jumpToPage;
    window.updateSpeed = updateSpeed;
    window.adjustFontSize = adjustFontSize;
    window.copyText = copyText;
    window.downloadText = downloadText;
    window.clearAll = clearAll;
    window.toggleRead = toggleRead;
    window.processPageContent = processPageContent;
});

// --- Core Functions ---

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

    console.log("ProcessPDF started (AI Reader):", file.name);
    
    if (!window.pdfjsLib) {
        console.error("PDF.js library missing!");
        alert("PDF library not loaded. Please refresh the page.");
        return;
    }

    // Ensure worker is set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    status.innerText = "Reading file...";
    uploadSection.style.display = "none";
    pageCache = {};
    
    announce(`Analyzing document structure for ${file.name}.`);

    try {
        console.log("Converting file to ArrayBuffer...");
        const arrayBuffer = await file.arrayBuffer();
        console.log("ArrayBuffer ready, size:", arrayBuffer.byteLength);

        status.innerText = "Opening document...";
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        
        loadingTask.onProgress = (progress) => {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                status.innerText = `Loading document: ${percent}%`;
            }
        };

        console.log("Waiting for PDF promise...");
        pdfDoc = await loadingTask.promise;
        console.log("PDF document loaded successfully. Pages:", pdfDoc.numPages);
        
        fileNameDisplay.innerText = file.name;
        pageCountDisplay.innerText = `${pdfDoc.numPages} Pages`;

        status.innerText = "";
        dashboard.style.display = "flex";
        fileDetails.style.display = "flex";
        
        displayPage(0);
        announce(`Ready! ${file.name} loaded. Reconstructing layout.`);
    } catch (error) {
        console.error("Detailed PDF Error (AI):", error);
        alert("Oops! We couldn't open this file: " + error.message);
        clearAll();
    }
}

async function displayPage(index) {
    if (!pdfDoc || index < 0 || index >= pdfDoc.numPages) return;
    
    stopReading();
    currentPage = index;
    
    const pageIndicator = document.getElementById('pageIndicator');
    const jumpInput = document.getElementById('jumpInput');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageIndicator) pageIndicator.innerText = `Page ${currentPage + 1} of ${pdfDoc.numPages}`;
    if (prevBtn) prevBtn.disabled = (currentPage === 0);
    if (nextBtn) nextBtn.disabled = (currentPage === pdfDoc.numPages - 1);
    if (jumpInput) jumpInput.value = currentPage + 1;

    // Check if page is in cache
    if (pageCache[currentPage]) {
        renderHTML(pageCache[currentPage]);
    } else {
        await processPageContent(currentPage);
    }
}

async function processPageContent(pageIndex) {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = `
        <div class="analysis-loading">
            <div class="analysis-spinner"></div>
            <p>Reconstructing the page layout...</p>
            <small>This may take a few seconds depending on page complexity.</small>
        </div>
    `;
    announce("Formatting the page content.");

    try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.5 });
        const textContent = await page.getTextContent();
        
        const items = textContent.items.map(item => {
            const tx = applyTransform(viewport.transform, item.transform);
            return {
                str: item.str,
                x: tx[4],
                y: tx[5],
                w: item.width,
                h: Math.abs(tx[3])
            };
        }).filter(it => it.str.trim().length > 0)
        .sort((a, b) => {
            if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
            return a.x - b.x;
        });

        if (items.length === 0) {
            resultContainer.innerHTML = `<div style="padding:40px; text-align:center;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color:#ccc;"></i>
                <p>No readable text found on this page.</p>
                <small>This page might be a scanned image or empty.</small>
            </div>`;
            announce("No text found on this page.");
            return;
        }

        let rawText = "";
        let lastItem;
        for (let item of items) {
            if (lastItem) {
                if (Math.abs(item.y - lastItem.y) > 5) {
                    rawText += "\n";
                } else {
                    const gap = item.x - (lastItem.x + lastItem.w);
                    if (gap > 1) rawText += " ";
                }
            }
            rawText += item.str;
            lastItem = item;
        }

        const reconstructedHtml = await fetchReconstructedLayout(rawText);
        pageCache[pageIndex] = reconstructedHtml;
        renderHTML(reconstructedHtml);
        announce("Page reconstruction complete.");
    } catch (error) {
        console.error("Analysis Error:", error);
        resultContainer.innerHTML = `
            <div style="padding:40px; text-align:center; color:#e53e3e;">
                <i class="fas fa-plug fa-3x"></i>
                <p>Failed to reconstruct this page.</p>
                <small>${error.message}</small>
                <br><br>
                <button class="w3-button w3-light-gray w3-round" onclick="processPageContent(${pageIndex})">Retry</button>
            </div>
        `;
    }
}

async function fetchReconstructedLayout(text) {
    if (!API_KEY) {
        throw new Error('Analysis engine is initializing. Please wait a moment.');
    }

    try {
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
                        content: `You are a professional PDF Reader engine.
                        TASK: Convert the provided raw text from a PDF page into clean, semantic, and well-formatted HTML.
                        RULES: Respond ONLY with HTML. No markdown, no commentary.`
                    },
                    { role: "user", content: text }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Failed to connect to analysis engine.');
        }

        const data = await response.json();
        let html = data.choices[0].message.content;
        html = html.replace(/```html/gi, "").replace(/```/g, "").trim();
        return html;
    } catch (err) {
        throw err;
    }
}

function renderHTML(html) {
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) {
        resultContainer.innerHTML = html;
        resultContainer.style.fontSize = fontSize + 'px';
        resultContainer.parentElement.scrollTop = 0;

        // Pre-load high quality audio for the reconstructed text
        const text = resultContainer.innerText.substring(0, 3000);
        if (text.trim().length > 0) {
            const ttsUrl = `https://googletexttospeech-apihubforblind.onrender.com/?text=${encodeURIComponent(text)}&lang=en-IN`;
            pageAudio = new Audio(ttsUrl);
            pageAudio.playbackRate = readingSpeed;
            pageAudio.preload = "auto";
            
            // Sync UI
            pageAudio.onplay = () => {
                isReading = true;
                const playIcon = document.getElementById('playIcon');
                const playText = document.getElementById('playText');
                if (playIcon) playIcon.className = "fas fa-pause";
                if (playText) playText.innerText = "Pause";
            };
            pageAudio.onpause = () => {
                isReading = false;
                const playIcon = document.getElementById('playIcon');
                const playText = document.getElementById('playText');
                if (playIcon) playIcon.className = "fas fa-play";
                if (playText) playText.innerText = "Play";
            };
            pageAudio.onended = () => {
                isReading = false;
                const playIcon = document.getElementById('playIcon');
                const playText = document.getElementById('playText');
                if (playIcon) playIcon.className = "fas fa-play";
                if (playText) playText.innerText = "Play";
                announce("Finished reading page.");
            };
        } else {
            pageAudio = null;
        }
    }
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (pdfDoc && newPage >= 0 && newPage < pdfDoc.numPages) {
        displayPage(newPage);
        announce(`Switching to Page ${currentPage + 1}`);
    }
}

function jumpToPage() {
    const jumpInput = document.getElementById('jumpInput');
    const val = parseInt(jumpInput.value);
    if (pdfDoc && val >= 1 && val <= pdfDoc.numPages) {
        displayPage(val - 1);
    } else if (pdfDoc) {
        alert(`Please pick a page between 1 and ${pdfDoc.numPages}`);
    }
}

function updateSpeed(val) {
    readingSpeed = parseFloat(val);
    const speedVal = document.getElementById('speedVal');
    if (speedVal) speedVal.innerText = val;

    // Apply to current page audio
    if (pageAudio) pageAudio.playbackRate = readingSpeed;
    
    // Apply to active AI chat audio
    if (window.currentAudio) window.currentAudio.playbackRate = readingSpeed;

    if (isReading && !pageAudio) {
        stopReading();
        readAloud();
    }
}

function adjustFontSize(delta) {
    fontSize += delta;
    if (fontSize < 12) fontSize = 12;
    if (fontSize > 48) fontSize = 48;
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.style.fontSize = fontSize + 'px';
    announce(`Zoom set to ${fontSize}`);
}

function copyText() {
    const resultContainer = document.getElementById('resultContainer');
    const text = resultContainer.innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Text copied to clipboard!");
        const moreActionsDialog = document.getElementById('moreActionsDialog');
        if (moreActionsDialog) moreActionsDialog.close();
    });
}

function downloadText() {
    const resultContainer = document.getElementById('resultContainer');
    const text = resultContainer.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Page_${currentPage + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    const moreActionsDialog = document.getElementById('moreActionsDialog');
    if (moreActionsDialog) moreActionsDialog.close();
}

async function downloadAllText() {
    if (!pdfDoc) return;
    announce("Preparing full document extraction. This may take a moment.");
    
    let fullText = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
    }

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameDisplay.innerText.replace('.pdf', '')}_Full_Text.txt`;
    a.click();
    URL.revokeObjectURL(url);
    announce("Full text extraction complete.");
    const moreActionsDialog = document.getElementById('moreActionsDialog');
    if (moreActionsDialog) moreActionsDialog.close();
}

function clearAll() {
    stopReading();
    pdfDoc = null;
    pageCache = {};
    currentPage = 0;
    
    document.getElementById('dashboard').style.display = "none";
    document.getElementById('file-details').style.display = "none";
    document.getElementById('upload-section').style.display = "block";
    document.getElementById('status').innerText = "";
    document.getElementById('fileInput').value = "";
    document.getElementById('resultContainer').innerHTML = "";
    announce("Document closed.");
}

function toggleRead() {
    if (isReading) {
        if (pageAudio && !pageAudio.paused) {
            pageAudio.pause();
        } else {
            synth.pause();
        }
        isReading = false;
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        if (playIcon) playIcon.className = "fas fa-play";
        if (playText) playText.innerText = "Play";
        announce("Paused");
    } else {
        if (pageAudio && pageAudio.paused && pageAudio.currentTime > 0) {
            pageAudio.play();
        } else if (synth.paused) {
            synth.resume();
            isReading = true;
            const playIcon = document.getElementById('playIcon');
            const playText = document.getElementById('playText');
            if (playIcon) playIcon.className = "fas fa-pause";
            if (playText) playText.innerText = "Pause";
            announce("Resumed");
        } else {
            readAloud();
        }
    }
}

function readAloud() {
    stopReading();
    const resultContainer = document.getElementById('resultContainer');
    const text = resultContainer.innerText;
    if (!text || text.trim().length === 0) return;

    if (pageAudio) {
        announce("Reading page with high-quality voice.");
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
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        if (playIcon) playIcon.className = "fas fa-pause";
        if (playText) playText.innerText = "Pause";
    };
    
    currentUtterance.onend = () => {
        isReading = false;
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        if (playIcon) playIcon.className = "fas fa-play";
        if (playText) playText.innerText = "Play";
        announce("Finished reading page.");
    };
    
    currentUtterance.onerror = () => {
        isReading = false;
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        if (playIcon) playIcon.className = "fas fa-play";
        if (playText) playText.innerText = "Play";
    };

    synth.speak(currentUtterance);
}

function stopReading() {
    synth.cancel();
    if (pageAudio) {
        pageAudio.pause();
        pageAudio.currentTime = 0;
    }
    isReading = false;
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    if (playIcon) playIcon.className = "fas fa-play";
    if (playText) playText.innerText = "Play";
}

function announce(message) {
    const sr = document.getElementById('sr-announcer');
    if (sr) {
        sr.innerText = "";
        setTimeout(() => { sr.innerText = message; }, 50);
    }
}
