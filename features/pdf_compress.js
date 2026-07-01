const el = id => document.getElementById(id);
const fileInput = el('fileInput'), dropZone = el('dropZone'), compressSection = el('compress-section'),
      uploadSection = el('upload-section'), status = el('status'), fileNameDisplay = el('fileNameDisplay'),
      fileSizeDisplay = el('fileSizeDisplay'), resultInfo = el('resultInfo');

let selectedFile = null;

const announce = (msg) => {
    const announcer = el('sr-announcer');
    if (announcer) announcer.innerText = msg;
};

const handleFile = (file) => {
    if (file?.type !== 'application/pdf') return alert("Please select a PDF file.");
    selectedFile = file;
    fileNameDisplay.innerText = `File: ${file.name}`;
    fileSizeDisplay.innerText = `Original Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    uploadSection.style.display = 'none';
    compressSection.style.display = 'block';
    status.innerText = "";
    resultInfo.innerText = "";
    announce("File loaded. Ready to optimize.");
};

window.clearFile = () => {
    selectedFile = null;
    uploadSection.style.display = 'block';
    compressSection.style.display = 'none';
    status.innerText = "";
    resultInfo.innerText = "";
    announce("File cleared");
};

window.compressPDF = async () => {
    status.innerText = "Optimizing... This may take a moment.";
    announce("Optimization started");

    try {
        const pdfDoc = await PDFLib.PDFDocument.load(await selectedFile.arrayBuffer());
        
        // Basic optimization: remove metadata
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');

        const bytes = await pdfDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        const originalSize = selectedFile.size;
        const newSize = bytes.length;
        const saved = originalSize - newSize;
        const percent = ((saved / originalSize) * 100).toFixed(1);

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `optimized_${selectedFile.name}`;
        a.click();
        
        status.innerText = "Success! Optimized file downloaded.";
        resultInfo.style.display = 'inline-block';
        resultInfo.innerText = `Final Size: ${(newSize / 1024 / 1024).toFixed(2)} MB (Reduced by ${percent}%)`;
        announce(`Optimization successful. Reduced by ${percent} percent.`);
    } catch (err) {
        status.innerText = "Error optimizing document.";
        announce("Error occurred");
    }
};

['dragover', 'dragleave', 'drop'].forEach(evt => 
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.toggle('dragover', evt === 'dragover');
        if (evt === 'drop') handleFile(e.dataTransfer.files[0]);
    })
);

fileInput.onchange = (e) => handleFile(e.target.files[0]);
