
    document.addEventListener('DOMContentLoaded', () => {
      const selectImageBtn = document.getElementById('selectImageBtn');
      const captureCameraBtn = document.getElementById('captureCameraBtn');
      const clearImageBtn = document.getElementById('clearImageBtn');
      const fileInput = document.getElementById('fileInput');
      const cameraInput = document.getElementById('cameraInput');
      const languageSelect = document.getElementById('languageSelect');
      const convertBtn = document.getElementById('convertBtn');
      const statusContainer = document.getElementById('statusContainer');
      const progressWrapper = document.getElementById('progressWrapper');
      const progressBar = document.getElementById('progressBar');
      const resultContainer = document.getElementById('resultContainer');
      const copyBtn = document.querySelector('.copyBtn');
      const preview = document.getElementById('imagePreview');
      
      // REPLACE 'helloworld' WITH YOUR FREE API KEY FROM https://ocr.space/ocrapi
      const API_KEY = 'helloworld'; 

      let selectedFile = null;

      statusContainer.textContent = "Ready.";

      // Helpers
      const showClearBtn = () => clearImageBtn.style.display = 'flex';
      const hideClearBtn = () => clearImageBtn.style.display = 'none';

      if (selectImageBtn) {
        selectImageBtn.addEventListener('click', () => fileInput.click());
      }
      if (captureCameraBtn) {
        captureCameraBtn.addEventListener('click', () => cameraInput.click());
      }
      if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
          selectedFile = null;
          preview.src = '';
          preview.style.display = 'none';
          hideClearBtn();
          fileInput.value = '';
          cameraInput.value = '';
          resultContainer.style.display = 'none';
          resultContainer.textContent = '';
          copyBtn.style.display = 'none';
          statusContainer.textContent = 'Image cleared. Ready.';
        });
      }

      const handleFileSelection = (e) => {
        const file = e.target.files[0];
        if (file) {
          selectedFile = file;
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            showClearBtn();
          };
          reader.readAsDataURL(file);
          
          if (e.target === fileInput) {
            cameraInput.value = '';
          } else {
            fileInput.value = '';
          }
        }
      };

      if (fileInput) fileInput.addEventListener('change', handleFileSelection);
      if (cameraInput) cameraInput.addEventListener('change', handleFileSelection);

      convertBtn.addEventListener('click', async () => {
        if (!selectedFile) {
          statusContainer.textContent = "Please select or capture an image file first.";
          statusContainer.className = "error";
          return;
        }

        statusContainer.textContent = "Sending image to server...";
        statusContainer.className = "";
        resultContainer.style.display = 'none';
        progressWrapper.style.display = 'block';
        progressBar.style.width = '30%'; 

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("apikey", API_KEY);
        // Language 'auto' works for OCR.space
        formData.append("language", languageSelect.value === 'auto' ? 'unk' : languageSelect.value); 
        formData.append("isOverlayRequired", false);

        try {
          const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData
          });

          const result = await response.json();
          progressBar.style.width = '100%';

          if (result.OCRExitCode === 1) {
            const text = result.ParsedResults[0].ParsedText;
            if(text && text.trim().length > 0) {
                resultContainer.textContent = text;
                resultContainer.style.display = 'block';
                statusContainer.textContent = "Conversion complete!";
                statusContainer.className = "success";
                copyBtn.style.display = "inline";
            } else {
                statusContainer.textContent = "No text found in image.";
                statusContainer.className = "error";
            }
          } else {
            console.error('OCR Error:', result.ErrorMessage);
            statusContainer.textContent = "Error: " + (result.ErrorMessage || "Could not read image.");
            statusContainer.className = "error";
          }
        } catch (error) {
          console.error('Network Error:', error);
          statusContainer.textContent = "Network error. Please check your connection.";
          statusContainer.className = "error";
        } finally {
          progressWrapper.style.display = 'none';
          progressBar.style.width = '0%';
        }
      });

      copyBtn.addEventListener('click', () => {
        const text = resultContainer.textContent;
        navigator.clipboard.writeText(text)
          .then(() => typeof announce === 'function' ? announce("Text copied to clipboard") : alert("Text copied to clipboard"))
          .catch(() => typeof announce === 'function' ? announce("Failed to copy text") : alert("Failed to copy text"));
      });

    });
  