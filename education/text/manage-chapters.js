    $(document).ready(function() {
        if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
            alert('Access denied. Please log in first.');
            window.location.href = 'admin.html';
            return;
        }

        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('adminAuthenticated');
            window.location.href = 'admin.html';
        });

        const urlParams = new URLSearchParams(window.location.search);
        const subjectKey = urlParams.get('subjectKey');
        const unitKey = urlParams.get('unitKey');
        const unitName = urlParams.get('unitName');

        if (!subjectKey || !unitKey || !unitName) {
            alert('Subject, Unit, or Unit Name not specified.');
            window.location.href = 'manage.html';
            return;
        }

        document.getElementById('unitNameDisplay').textContent = unitName;

        const db = firebase.database().ref('education');
        const chaptersContainer = document.getElementById('chaptersContainer');
        const newChapterBox = document.getElementById('newChapterBox');
        const chapterForm = document.getElementById('chapter-form');

        // Corrected the regex to be valid in JavaScript for Firebase keys
        function safeKey(name) {
            return name.trim().replace(/[.#$[\/]]/g, "_");
        }

        chapterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const chapterName = document.getElementById('chapterName').value.trim();
            if (!chapterName) { alert('Please enter a chapter name.'); return; }
            const chapterKey = safeKey(chapterName);
            const unitRef = db.child(subjectKey).child('units').child(unitKey).child('chapters');

            unitRef.child(chapterKey).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    alert('This chapter name already exists for this unit.');
                } else {
                    unitRef.child(chapterKey).set({ name: chapterName }).then(() => {
                        alert('Chapter added successfully! Now, let\'s add content.');
                        const url = `editor.html?subjectKey=${subjectKey}&unitKey=${unitKey}&chapterKey=${chapterKey}&unitName=${encodeURIComponent(unitName)}&chapterName=${encodeURIComponent(chapterName)}`;
                        window.location.href = url;
                    });
                }
            }).catch(error => alert('Error: ' + error.message));
        });

        const chaptersRef = db.child(subjectKey).child('units').child(unitKey).child('chapters');
        chaptersRef.on('value', (chaptersSnapshot) => {
            chaptersContainer.innerHTML = '';
            if (!chaptersSnapshot.exists()) {
                chaptersContainer.innerHTML = '<p>No chapters found. Create one to get started.</p>';
            } else {
                chaptersSnapshot.forEach((chapterChildSnapshot) => {
                    const chapterKey = chapterChildSnapshot.key;
                    const chapterData = chapterChildSnapshot.val();
                    
                    const chapterBtn = document.createElement('button');
                    chapterBtn.className = 'btn';
                    chapterBtn.textContent = chapterData.name;

                    const chapterBox = document.createElement('div');
                    chapterBox.className = 'box';
                    chapterBox.style.display = 'none';
                    chapterBox.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3>${chapterData.name}</h3>
                                <div>
                                    <button class="w3-button w3-orange w3-text-white w3-round w3-small rename-chapter" style="margin-right: 5px;">Rename</button>
                                    <button class="w3-button w3-red w3-round w3-small delete-chapter">Delete Chapter</button>
                                </div>
                            </div>
                            <button class="w3-button w3-blue w3-round edit-content-btn">Edit Content</button>
                        </div>
                    `;

                    chapterBox.querySelector('.rename-chapter').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const newName = prompt('Enter new chapter name:', chapterData.name);
                        if (newName && newName.trim() !== "" && newName !== chapterData.name) {
                            chaptersRef.child(chapterKey).update({ name: newName.trim() })
                                .then(() => alert('Chapter renamed successfully.'));
                        }
                    });

                    chapterBox.querySelector('.delete-chapter').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the chapter "${chapterData.name}"?`)) {
                            chaptersRef.child(chapterKey).remove().then(() => alert('Chapter deleted.'));
                        }
                    });

                    chapterBox.querySelector('.edit-content-btn').addEventListener('click', () => {
                        const url = `editor.html?subjectKey=${subjectKey}&unitKey=${unitKey}&chapterKey=${chapterKey}&unitName=${encodeURIComponent(unitName)}&chapterName=${encodeURIComponent(chapterData.name)}`;
                        window.location.href = url;
                    });

                    // Note: chapterBtn click is handled by jquery.js for slideToggle of chapterBox
                    chaptersContainer.appendChild(chapterBtn);
                    chaptersContainer.appendChild(chapterBox);
                });
            }
        });

        
    });
    
