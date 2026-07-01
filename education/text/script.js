document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        alert('Access denied. Please log in first.');
        window.location.href = 'admin.html';
        return;
    }
    const output = document.getElementById('output');
    const publishForm = document.getElementById('publish-form');
    const chapterNameDisplay = document.getElementById('chapter-name-display');
    const elementType = document.getElementById('elementType');
    const contentInput = document.getElementById('elementContent');
    const urlInputContainer = document.getElementById('urlInputContainer');
    const urlInput = document.getElementById('elementURL');
    const createBtn = document.getElementById('createBtn');
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('adminAuthenticated');
        window.location.href = 'admin.html';
    });

    // --- URL Parameter Handling ---
    const urlParams = new URLSearchParams(window.location.search);
    const subjectKey = urlParams.get('subjectKey');
    const unitKey = urlParams.get('unitKey');
    const chapterKey = urlParams.get('chapterKey');
    const unitName = urlParams.get('unitName');
    const chapterName = urlParams.get('chapterName');

    if (!subjectKey || !unitKey || !chapterKey) {
        alert('Missing critical information. Redirecting to the main page.');
        window.location.href = 'manage.html';
        return;
    }

    // --- Display Chapter Name & Set Title ---
    if (chapterName) {
        const decodedChapterName = decodeURIComponent(chapterName);
        chapterNameDisplay.textContent = `Editing: ${decodedChapterName}`;
        document.title = `Editor: ${decodedChapterName}`;
    }

    // --- Firebase Database Reference ---
    const db = firebase.database();
    const chapterContentRef = db.ref(`education/${subjectKey}/units/${unitKey}/chapters/${chapterKey}/content`);

    // --- Core Functions ---

    function getCleanHtml() {
        let finalHtml = '';
        const containers = output.querySelectorAll('.element-container');
        containers.forEach(container => {
            const element = container.firstElementChild.cloneNode(true);
            element.removeAttribute('contenteditable');
            finalHtml += element.outerHTML;
        });
        return finalHtml;
    }

    

    

    function loadContent(htmlString) {
        // Clear only added elements, keeping the empty message span if it exists
        const containers = output.querySelectorAll('.element-container');
        containers.forEach(container => container.remove());

        if (!htmlString) {
            updateEmptyMessage();
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        Array.from(doc.body.children).forEach(el => {
            addElementToOutput(el);
        });
        updateEmptyMessage();
    }

    function addElementToOutput(el) {
        // hr and br should not be editable
        if (el.tagName !== 'HR' && el.tagName !== 'BR') {
            el.contentEditable = true;
        }
        
        const container = document.createElement('div');
        container.className = 'element-container';
        
        // Add focus/blur handlers for visual feedback (defined in CSS as .editing)
        el.onfocus = () => container.classList.add('focused', 'editing');
        el.onblur = () => container.classList.remove('focused', 'editing');

        // Simple remove button as in education2
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'w3-button w3-red w3-tiny w3-round';
        removeBtn.style.marginTop = '5px';
        removeBtn.style.display = 'block';
        removeBtn.onclick = function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to remove this element?')) {
                container.remove();
                updateEmptyMessage();
            }
        };

        container.appendChild(el);
        container.appendChild(removeBtn);
        output.appendChild(container);
        updateEmptyMessage();
    }
    window.addElementToOutput = addElementToOutput; // Expose globally for ai-generator.js

    function updateEmptyMessage() {
        const emptyMsg = document.getElementById('output-empty-message');
        if (!emptyMsg) return; // Guard against missing element

        if (output.querySelectorAll('.element-container').length === 0) {
            emptyMsg.style.display = 'block';
        } else {
            emptyMsg.style.display = 'none';
        }
    }

    // --- Load Existing Content with Diagnostics ---
    chapterContentRef.once('value').then(snapshot => {
        loadContent(snapshot.val());
    }).catch(error => {
        console.error('Error loading content:', error);
        alert(`CRITICAL ERROR: Could not load content from the database.\n\nError: ${error.message}`);
    });

    // --- Event Listeners ---

    elementType.addEventListener('change', () => {
        const type = elementType.value;
        urlInputContainer.style.display = (type === 'a') ? 'block' : 'none';
        contentInput.style.display = (type === 'hr' || type === 'br') ? 'none' : 'block';
        contentInput.placeholder = (type === 'ul' || type === 'ol') 
            ? 'Enter list items, one per line.' 
            : 'Type your text here.';
        if (type === 'a') contentInput.placeholder = 'Type the link text here.';
    });

    createBtn.addEventListener('click', () => {
        const type = elementType.value;
        const content = contentInput.value.trim();
        const url = urlInput.value.trim();

        if (type !== 'hr' && type !== 'br' && !content) {
            alert('Content is required for this element type.');
            return;
        }
        if (type === 'a' && !url) {
            alert('Please enter a URL for the link.');
            return;
        }

        let el;
        if (type === 'ul' || type === 'ol') {
            el = document.createElement(type);
            content.split('\n').forEach(line => {
                if (line.trim()) {
                    const li = document.createElement('li');
                    li.textContent = line.trim();
                    el.appendChild(li);
                }
            });
        } else {
            el = document.createElement(type);
            if (type === 'a') {
                el.href = url;
                el.target = '_blank';
                el.textContent = content;
            } else if (type !== 'hr' && type !== 'br') {
                el.textContent = content;
            }
        }

        addElementToOutput(el);

        contentInput.value = '';
        urlInput.value = '';
    });

    

    const deleteAllBtn = document.getElementById('deleteAll');

    deleteAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to delete all content? This action cannot be undone.')) {
            // Clear only added elements
            const containers = output.querySelectorAll('.element-container');
            containers.forEach(container => container.remove());
            updateEmptyMessage();
        }
    });

    publishForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const finalHtml = getCleanHtml();

        chapterContentRef.set(finalHtml).then(() => {
            alert('Content published successfully!');
            if (unitName) {
                window.location.href = `manage-chapters.html?subjectKey=${subjectKey}&unitKey=${unitKey}&unitName=${encodeURIComponent(unitName)}`;
            }
        }).catch((error) => {
            console.error('Error publishing content:', error);
            alert(`CRITICAL ERROR: Could not save content to the database.\n\nError: ${error.message}`);
        });
    });

    // Initialize UI on page load
    elementType.dispatchEvent(new Event('change'));
});
