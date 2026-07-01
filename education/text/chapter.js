    const urlParams = new URLSearchParams(window.location.search);
    const subjectKey = urlParams.get('subject');
    const unitKey = urlParams.get('unit');
    const chapterKey = urlParams.get('chapter');

    const db = firebase.database();
    const unitRef = db.ref(`education/${subjectKey}/units/${unitKey}/chapters`);

    unitRef.once('value').then((snapshot) => {
      if (snapshot.exists()) {
        const chapters = snapshot.val();
        const chapterKeys = Object.keys(chapters);
        const currentChapterIndex = chapterKeys.indexOf(chapterKey);

        const chapterData = chapters[chapterKey];
        if (chapterData) {
            document.getElementById('chapter-name').textContent = chapterData.name;
            document.getElementById('chapter-content').innerHTML = chapterData.content || '<p>No content available for this chapter yet.</p>';
            document.title = chapterData.name;
        } else {
            document.getElementById('chapter-name').textContent = 'Chapter details not found';
            document.getElementById('chapter-content').innerHTML = '<p>Sorry, we couldn\'t find the details for this chapter.</p>';
        }

        const prevChapterBtn = document.getElementById('prev-chapter-btn');
        const nextChapterBtn = document.getElementById('next-chapter-btn');

        if (currentChapterIndex > 0) {
          const prevChapterKey = chapterKeys[currentChapterIndex - 1];
          prevChapterBtn.addEventListener('click', () => {
            window.location.href = `chapter.html?subject=${subjectKey}&unit=${unitKey}&chapter=${prevChapterKey}`;
          });
        } else {
          prevChapterBtn.disabled = true;
          prevChapterBtn.ariaDisabled = 'true';
        }

        if (currentChapterIndex < chapterKeys.length - 1) {
          const nextChapterKey = chapterKeys[currentChapterIndex + 1];
          nextChapterBtn.addEventListener('click', () => {
            window.location.href = `chapter.html?subject=${subjectKey}&unit=${unitKey}&chapter=${nextChapterKey}`;
          });
        } else {
          nextChapterBtn.disabled = true;
          nextChapterBtn.ariaDisabled = 'true';
        }
      } else {
        document.getElementById('chapter-name').textContent = 'Chapter not found';
      }
    });
