const passwordInput = document.getElementById('password-input');
const accessButton = document.getElementById('access-button');
const messageDisplay = document.getElementById('message');
const d=new Date(), correctPassword = ("0"+d.getDate()).slice(-2)+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+d.getFullYear();
;

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

accessButton.addEventListener('click', () => {
    if (passwordInput.value === correctPassword) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        speak("Access granted. Redirecting to the admin panel.");
        messageDisplay.textContent = "Access granted! Redirecting to the content editor...";
        messageDisplay.className = "message-success";
        setTimeout(() => {
            window.location.href = "manage.html";
        }, 2000); // Increased timeout for better user experience
    } else {
        speak("Access denied.");
        messageDisplay.textContent = "Access denied! Incorrect password.";
        messageDisplay.className = "message-error";
    }
    passwordInput.value = ''; // Clear the password input field
});

// Allow pressing Enter to submit password
passwordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        accessButton.click();
    }
});
