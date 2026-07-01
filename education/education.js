        const db = firebase.database().ref('education');
        const subjectsContainer = document.getElementById('subjects-container');

        db.on('value', (snapshot) => {
            subjectsContainer.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const subjectKey = childSnapshot.key;
                    const subjectData = childSnapshot.val();
                    const subjectName = subjectData.subjectName;

                    const subjectLink = document.createElement('a');
                    subjectLink.className = 'mainLink';
                    subjectLink.href = `./text/subject.html?subject=${subjectKey}`;
                    subjectLink.textContent = subjectName;

                    const subjectDescription = document.createElement('p');
                    subjectDescription.textContent = `Learn about ${subjectName}.`;

                    const subjectItem = document.createElement('li');
                    subjectItem.appendChild(subjectLink);
                    subjectItem.appendChild(subjectDescription);

                    subjectsContainer.appendChild(subjectItem);
                });
            } else {
                // If no subjects, show a message inside the <ul>
                const noSubjectsItem = document.createElement('li');
                noSubjectsItem.textContent = 'No subjects found.';
                subjectsContainer.appendChild(noSubjectsItem);
            }
        });
