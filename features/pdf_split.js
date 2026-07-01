// PDF Split Tool Logic
// Developed for Blind Tech Agent

(function() {
    const el = id => document.getElementById(id);
    const fileInput = el('fileInput');
    const dropZone = el('dropZone');
    const splitSection = el('split-section');
    const uploadSection = el('upload-section');
    const status = el('status');
    const fileNameDisplay = el('fileNameDisplay');
    const pageCountDisplay = el('pageCountDisplay');
    const pageRangeInput = el('pageRange');
    const srAnnouncer = el('sr-announcer');

    let selectedFile = null, totalPages = 0;

    function announce(msg) {
        if (srAnnouncer) srAnnouncer.innerText = msg;
    }

    const handleFile = async (file) => {
        if (!file) return;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) return alert("Please select a valid PDF file.");
        
        selectedFile = file;
        if (status) status.innerText = "Loading PDF...";
        
        try {
            if (typeof PDFLib === 'undefined') {
                throw new Error("PDF library is not loaded.");
            }
            const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
            totalPages = pdfDoc.getPageCount();
            if (fileNameDisplay) fileNameDisplay.innerText = `File: ${file.name}`;
            if (pageCountDisplay) pageCountDisplay.innerText = `Total Pages: ${totalPages}`;
            
            if (uploadSection) uploadSection.style.display = 'none';
            if (splitSection) splitSection.style.display = 'block';
            if (status) status.innerText = "";
            announce(`File loaded: ${file.name}. Total pages: ${totalPages}. Please enter the page range you wish to extract.`);
        } catch (err) {
            console.error("Load Error:", err);
            if (status) status.innerText = "Error loading PDF.";
            announce("Error loading PDF");
        }
    };

    window.clearFile = () => {
        selectedFile = null;
        if (uploadSection) uploadSection.style.display = 'block';
        if (splitSection) splitSection.style.display = 'none';
        if (status) status.innerText = "";
        if (pageRangeInput) pageRangeInput.value = "";
        if (fileInput) fileInput.value = "";
        announce("File cleared. Ready for new selection.");
    };

    const parseRange = (range, max) => {
        const indices = new Set();
        range.split(',').forEach(part => {
            const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
            const singleMatch = part.match(/^\d+$/);
            
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                if (!isNaN(start) && !isNaN(end)) {
                    const low = Math.min(start, end);
                    const high = Math.max(start, end);
                    for (let i = Math.max(1, low); i <= Math.min(max, high); i++) {
                        indices.add(i - 1);
                    }
                }
            } else if (singleMatch) {
                const val = parseInt(singleMatch[0]);
                if (val >= 1 && val <= max) {
                    indices.add(val - 1);
                }
            }
        });
        return Array.from(indices).sort((a, b) => a - b);
    };

    window.splitPDF = async () => {
        const range = pageRangeInput.value.trim();
        if (!range) return alert("Please enter a page range.");

        const indices = parseRange(range, totalPages);
        if (!indices.length) return alert("Invalid page range. Please enter valid page numbers within the file's range.");

        if (status) {
            status.innerText = "Processing... Please wait.";
            status.style.color = "var(--primary-color)";
        }
        announce("Processing started");

        try {
            const srcDoc = await PDFLib.PDFDocument.load(await selectedFile.arrayBuffer());
            const newDoc = await PDFLib.PDFDocument.create();
            const pages = await newDoc.copyPages(srcDoc, indices);
            pages.forEach(p => newDoc.addPage(p));

            const bytes = await newDoc.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted_${selectedFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            if (status) {
                status.innerText = "Success! Your extracted pages have been downloaded.";
                status.style.color = "var(--secondary-color)";
            }
            announce("Extraction successful");
        } catch (err) {
            console.error("Split Error:", err);
            if (status) {
                status.innerText = "Error splitting PDF.";
                status.style.color = "#ff4d4d";
            }
            announce("Error occurred during extraction");
        }
    };

    // Initialize Event Listeners
    if (dropZone) {
        ['dragover', 'dragleave', 'drop'].forEach(evt => 
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.toggle('dragover', evt === 'dragover');
                if (evt === 'drop') {
                    handleFile(e.dataTransfer.files[0]);
                }
            })
        );
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFile(e.target.files[0]);
        });
    }

})();
