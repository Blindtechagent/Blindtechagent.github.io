    const urlParams = new URLSearchParams(window.location.search);
    const subjectKey = urlParams.get('subject');
    const db = firebase.database();
    const subjectRef = db.ref(`education/${subjectKey}`);
    const unitsContainer = document.getElementById('units-container');
    const chapterContentContainer = document.getElementById('chapter-content-container');

    subjectRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const subjectData = snapshot.val();
            document.getElementById('subject-name').textContent = subjectData.subjectName;
            document.title = subjectData.subjectName;

            const units = subjectData.units;
            if (units) {
                for (const unitKey in units) {
                    const unit = units[unitKey];
                    const unitButton = document.createElement('button');
                    unitButton.className = 'btn';
                    unitButton.textContent = unit.name;

                    const unitBox = document.createElement('div');
                    unitBox.className = 'box';
                    unitBox.style.display = 'none';

                    const unitTitle = document.createElement('h4');
                    unitTitle.textContent = unit.name;
                    unitBox.appendChild(unitTitle);

                    const unitDescription = document.createElement('p');
                    unitDescription.textContent = `Learn about the different topics in ${unit.name}.`;
                    unitBox.appendChild(unitDescription);

                    const chapterSelect = document.createElement('select');
                    const defaultOption = document.createElement('option');
                    defaultOption.textContent = 'Select Chapter';
                    defaultOption.value = "";
                    defaultOption.disabled = true;
                    defaultOption.selected = true;
                    chapterSelect.appendChild(defaultOption);

                    const chapters = unit.chapters;
                    if (chapters) {
                        for (const chapterKey in chapters) {
                            const chapter = chapters[chapterKey];
                            const option = document.createElement('option');
                            option.value = chapterKey;
                            option.textContent = chapter.name;
                            chapterSelect.appendChild(option);
                        }
                    }

                    const goButton = document.createElement('button');
                    goButton.textContent = 'Go';
                    goButton.onclick = () => {
                        const selectedChapterKey = chapterSelect.value;
                        if (selectedChapterKey) {
                            window.location.href = `chapter.html?subject=${subjectKey}&unit=${unitKey}&chapter=${selectedChapterKey}`;
                        } else {
                            alert('Please select a chapter first.');
                        }
                    };

                    unitBox.appendChild(chapterSelect);
                    unitBox.appendChild(goButton);
                    unitsContainer.appendChild(unitButton);
                    unitsContainer.appendChild(unitBox);
                }
            } else {
                unitsContainer.innerHTML = '<p>No units found for this subject.</p>';
            }
        } else {
            document.getElementById('subject-name').textContent = 'Subject not found';
        }
    });
