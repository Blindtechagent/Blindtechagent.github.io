// PDF Merge Tool Logic
// Developed for Blind Tech Agent

(function() {
    const el = id => document.getElementById(id);
    const fileInput = el('fileInput');
    const dropZone = el('dropZone');
    const fileList = el('fileList');
    const actionButtons = el('action-buttons');
    const status = el('status');
    const srAnnouncer = el('sr-announcer');

    let selectedFiles = [];

    function announce(msg) {
        if (srAnnouncer) srAnnouncer.innerText = msg;
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function updateUI() {
        if (!fileList) return;
        
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            if (actionButtons) actionButtons.style.display = 'none';
            return;
        }

        fileList.innerHTML = selectedFiles.map((file, i) => {
            const safeName = file.name.replace(/"/g, '&quot;');
            return `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-name"><strong>${i + 1}.</strong> ${safeName}</span>
                        <span class="file-size">(${formatSize(file.size)})</span>
                    </div>
                    <div class="file-controls">
                        <button class="control-btn" onclick="moveFile(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Move Up" aria-label="Move ${safeName} up">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="control-btn" onclick="moveFile(${i}, 1)" ${i === selectedFiles.length - 1 ? 'disabled' : ''} title="Move Down" aria-label="Move ${safeName} down">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="remove-btn" onclick="removeFile(${i})" title="Remove" aria-label="Remove ${safeName}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (actionButtons) actionButtons.style.display = 'block';
    }

    function addFiles(files) {
        if (!files) return;
        const pdfs = Array.from(files).filter(f => 
            f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
        );

        if (pdfs.length) {
            selectedFiles.push(...pdfs);
            updateUI();
            if (fileInput) fileInput.value = '';
            announce(`${pdfs.length} file(s) added.`);
        } else if (files.length > 0) {
            alert("Please select valid PDF files.");
        }
    }

    // Export functions to window for onclick handlers
    window.removeFile = (index) => {
        selectedFiles.splice(index, 1);
        updateUI();
        announce("File removed");
    };

    window.clearFiles = () => {
        if (confirm("Are you sure you want to clear all selected files?")) {
            selectedFiles = [];
            updateUI();
            if (status) status.innerText = '';
            if (fileInput) fileInput.value = '';
            announce("All files cleared");
        }
    };

    window.moveFile = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < selectedFiles.length) {
            const temp = selectedFiles[index];
            selectedFiles[index] = selectedFiles[newIndex];
            selectedFiles[newIndex] = temp;
            updateUI();
            announce(`File moved ${direction === -1 ? 'up' : 'down'}`);
        }
    };

    window.mergePDFs = async () => {
        if (selectedFiles.length < 2) return alert("Please select at least two PDF files to merge.");
        
        if (typeof PDFLib === 'undefined') {
            alert("The PDF library is still loading. Please wait a moment and try again.");
            return;
        }

        if (status) {
            status.innerText = "Processing... Please wait.";
            status.style.color = "var(--primary-color)";
        }
        announce("Merge process started");

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                if (status) status.innerText = `Merging file ${i + 1} of ${selectedFiles.length}: ${file.name}...`;
                
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(p => mergedPdf.addPage(p));
                
                // Allow UI to breathe
                await new Promise(r => setTimeout(r, 50));
            }

            if (status) status.innerText = "Finalizing PDF...";
            const bytes = await mergedPdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);

            if (status) {
                status.innerText = "Success! Your merged PDF has been downloaded.";
                status.style.color = "var(--secondary-color)";
            }
            announce("Merge successful");
        } catch (err) {
            console.error("Merge Error:", err);
            if (status) {
                status.innerText = "Error: " + (err.message || "Failed to merge PDFs.");
                status.style.color = "#ff4d4d";
            }
            announce("Error occurred during merging");
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
                    addFiles(e.dataTransfer.files);
                }
            })
        );
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            addFiles(e.target.files);
        });
    }

})();
