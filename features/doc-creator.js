document.getElementById("content").addEventListener("input", updateCounters);

const LINE_LIMIT = 30;
const WORD_LIMIT = 300;

// Function to start voice typing using Web Speech API
function startVoiceTyping() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Voice typing is only supported in Chrome.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    showMessage("Voice typing started. Speak now...");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("content").value += transcript + " ";
    updateCounters();
  };

  recognition.onerror = (event) => {
    showMessage("Voice typing failed. Please try again.");
  };

  recognition.onend = () => {
    showMessage("Voice typing stopped.");
  };

  recognition.start();
}

// Function to generate the document in the chosen format
function generate(event) {
  if (event) event.preventDefault();
  const fileName = document.getElementById("fileName").value || "document";
  const content = document.getElementById("content").value || "No content provided.";
  const format = document.getElementById("format").value;

  switch (format) {
    case "docx":
      generateDocx(fileName, content);
      break;
    case "txt":
      generateTxt(fileName, content);
      break;
    case "md":
      generateMarkdown(fileName, content);
      break;
    case "pdf":
      generatePdf(fileName, content);
      break;
  }
}

// Function to format file size
function formatFileSize(sizeInBytes) {
  const size = (sizeInBytes / 1024).toFixed(2);
  return size >= 1000 ? (size / 1000).toFixed(2) + ' MB' : size + ' KB';
}

// Function to generate DOCX file
function generateDocx(fileName, content) {
  const docx = window.docx;
  const lines = content.split("\n").map(line => new docx.Paragraph(line));

  const doc = new docx.Document({
    sections: [{ properties: {}, children: lines }]
  });

  docx.Packer.toBlob(doc).then((blob) => {
    const sizeText = formatFileSize(blob.size);
    saveAs(blob, `${fileName}.docx`);
    showMessage(`DOCX created successfully! (Size: ${sizeText})`);
    clearForm();
  });
}

// Function to generate TXT file
function generateTxt(fileName, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const sizeText = formatFileSize(blob.size);
  saveAs(blob, `${fileName}.txt`);
  showMessage(`TXT created successfully! (Size: ${sizeText})`);
  clearForm();
}

// Function to generate Markdown file
function generateMarkdown(fileName, content) {
  const blob = new Blob([content], { type: "text/markdown" });
  const sizeText = formatFileSize(blob.size);
  saveAs(blob, `${fileName}.md`);
  showMessage(`Markdown created successfully! (Size: ${sizeText})`);
  clearForm();
}

// Function to generate PDF file
function generatePdf(fileName, content) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  
  // PDF Page settings
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const maxLineWidth = pageWidth - margin * 2;
  const startY = 10;
  const lineHeight = 10;
  let currentY = startY;

  // Split content into lines and handle wrapping
  const sourceLines = content.split("\n");
  sourceLines.forEach((sourceLine) => {
    // If line is empty, just move Y
    if (sourceLine.trim() === "") {
        currentY += lineHeight;
    } else {
        const wrappedLines = pdf.splitTextToSize(sourceLine, maxLineWidth);
        wrappedLines.forEach((line) => {
            // Add a new page if we're near the bottom
            if (currentY > pdf.internal.pageSize.getHeight() - margin) {
                pdf.addPage();
                currentY = margin;
            }
            pdf.text(line, margin, currentY);
            currentY += lineHeight;
        });
    }
  });

  const blob = pdf.output('blob');
  const sizeText = formatFileSize(blob.size);
  pdf.save(`${fileName}.pdf`);
  showMessage(`PDF created successfully! (Size: ${sizeText})`);
  clearForm();
}

// Function to update counters for characters, words, and lines
function updateCounters() {
  const content = document.getElementById("content").value;
  const charCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = content.split("\n").length;

  document.getElementById("charCount").innerText = `Characters: ${charCount}`;
  document.getElementById("wordCount").innerText = `Words: ${wordCount}`;
  document.getElementById("lineCount").innerText = `Lines: ${lineCount}`;

  const progress = Math.min(100, (charCount / 1000) * 100);
  document.getElementById("progress").style.width = progress + "%";
}

// Function to show a message on the page
function showMessage(message) {
  const messageBox = document.getElementById("message");
  messageBox.innerText = message;
  setTimeout(() => messageBox.innerText = "", 3000);
}

// Function to clear form fields after document generation
function clearForm() {
  document.getElementById("fileName").value = "";
  document.getElementById("content").value = "";
  updateCounters();
}
