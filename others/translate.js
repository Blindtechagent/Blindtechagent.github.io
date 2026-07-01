function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en' }, 'google_translate_element');

    // Run cleanup after a small delay to ensure Google Translate has populated the DOM
    setTimeout(function() {
        const googleDivChild = document.querySelector("#google_translate_element .skiptranslate div");
        if (googleDivChild && googleDivChild.nextElementSibling) {
            googleDivChild.nextElementSibling.remove();
        }

        const googleDiv = document.querySelector("#google_translate_element .skiptranslate");
        if (googleDiv) {
            Array.from(googleDiv.childNodes).forEach(node => {
                if (node.nodeType === 3 && node.nodeValue.trim() !== "") {
                    node.remove();
                }
            });
        }
    }, 500);
}

function acsDialog() {
    document.getElementById('accessibility-panel').showModal();
}
function openDialog() {
    document.getElementById('dialog').showModal();
}

function closeDialog() {
    document.getElementById('dialog').close();
}
function closeAcsDialog() {
    document.getElementById('accessibility-panel').close();
}
