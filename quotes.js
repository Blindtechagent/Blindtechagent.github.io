const thoughtElement = document.getElementById("thought");

// Function to fetch a list of motivational thoughts from DummyJSON API
async function fetchThought() {
    if (!thoughtElement) return;

    // Add loading state
    thoughtElement.innerText = "Loading quotation...";
    thoughtElement.style.opacity = "0.5";
    
    try {
        // Fetching random quote from DummyJSON API
        const response = await fetch("https://dummyjson.com/quotes/random");
        if (!response.ok) {
            throw new Error("Failed to fetch thoughts");
        }
        
        const data = await response.json();
        
        // Update UI with quote only
        if (data && data.quote) {
            thoughtElement.innerText = `"${data.quote}"`;
        } else {
            // If no results, show a static motivational thought
            thoughtElement.innerText = '"The only limit to our realization of tomorrow is our doubts of today."';
        }
        
    } catch (error) {
        console.error("Error fetching thought:", error);
        thoughtElement.innerText = '"Success is not final, failure is not fatal: it is the courage to continue that counts."';
    } finally {
        // Remove loading state
        thoughtElement.style.opacity = "1";
    }
}

// Fetch an initial thought when the page loads
window.addEventListener("load", fetchThought);

// copy function for thought
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', function () {
        const text = thoughtElement.innerText;
        navigator.clipboard.writeText(text).then(() => {
            if (typeof announce === 'function') {
                announce('Copied successfully');
            } else {
                alert('Copied successfully');
            }
        }).catch(err => {
            if (typeof announce === 'function') {
                announce('Error copying text');
            } else {
                console.error('Error copying text:', err);
            }
        });
    });
}
