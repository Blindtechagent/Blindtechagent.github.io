function sendPrompt() {
    var input = document.getElementById('imgPrompt');
    var prompt = input.value.trim();
    var model = document.getElementById('modelSelect').value;
    
    if (prompt) {
        generateImage(prompt, model);
        // We don't clear the input immediately so the user can see what they typed
    } else {
        announce("Please enter a description for the image.");
    }
}

function generateImage(query, model) {
    const announcement = document.getElementById('announcement');
    const generateBtn = document.getElementById('generateBtn');
    const imgBox = document.getElementById('imgBox');
    const downloadContainer = document.getElementById('downloadContainer');

    announcement.innerText = "Generating image, please wait...";
    generateBtn.disabled = true;
    imgBox.style.display = "block";
    imgBox.innerHTML = '<div class="loading-container"><p class="loading-text">🎨 Creating your masterpiece...<br>Using ' + model + ' model</p></div>';
    downloadContainer.style.display = "none";

    const seed = Math.floor(Math.random() * 1000000);
    const encodedQuery = encodeURIComponent(query);
    
    // Construct URL with model and other parameters
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedQuery}?seed=${seed}&width=1024&height=1024&model=${model}&nologo=true`;
    
    displayImage(apiUrl, query);
}

function displayImage(apiUrl, query) {
    const imgBox = document.getElementById('imgBox');
    const announcement = document.getElementById('announcement');
    const generateBtn = document.getElementById('generateBtn');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const img = new Image();
    
    // Timeout handling
    const timeout = setTimeout(() => {
        if (!img.complete) {
            img.src = ""; // Cancel loading
            announcement.innerText = "Generation is taking longer than expected. Please try again.";
            imgBox.innerHTML = '<p style="color: white; background: rgba(255,0,0,0.5); padding: 10px; border-radius: 5px;">Timeout: API is busy. Please try again or switch model.</p>';
            generateBtn.disabled = false;
        }
    }, 30000); // 30 second timeout

    img.onload = function() {
        clearTimeout(timeout);
        imgBox.innerHTML = '';
        img.alt = `AI generated image for: ${query}`;
        img.className = "generated-image";
        
        // Apply styles directly for robustness
        img.style.display = "block";
        img.style.margin = "20px auto";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "8px";
        img.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
        
        imgBox.appendChild(img);
        
        announcement.innerText = "Image generated successfully!";
        generateBtn.disabled = false;
        
        // Enable download
        downloadContainer.style.display = "block";
        downloadBtn.onclick = () => downloadImage(apiUrl, query);
        
        imgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    img.onerror = function() {
        clearTimeout(timeout);
        announcement.innerText = "Failed to load the image. Please check your connection.";
        imgBox.innerHTML = '<p style="color: white; background: rgba(255,0,0,0.5); padding: 10px; border-radius: 5px;">Error: Image failed to load.</p>';
        generateBtn.disabled = false;
    };

    img.src = apiUrl;
}

function downloadImage(url, query) {
    const announcement = document.getElementById('announcement');
    announcement.innerText = "Starting download...";
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
        })
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `BTA_AI_${query.substring(0, 20).replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            announcement.innerText = "Download started!";
        })
        .catch(err => {
            console.error('Download error:', err);
            announcement.innerText = "Download failed. Please try right-clicking the image and 'Save As'.";
        });
}

function announce(message) {
    const announcement = document.getElementById('announcement');
    if (announcement) {
        announcement.innerText = message;
    } else {
        alert(message);
    }
}
