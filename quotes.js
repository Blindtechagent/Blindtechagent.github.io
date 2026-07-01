const thoughtElement = document.getElementById("thought");

// High-quality curated list of famous, short quotes for guaranteed quality
const curatedQuotes = [
    { quote: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "I think, therefore I am.", author: "René Descartes" },
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { quote: "Knowledge is power.", author: "Francis Bacon" },
    { quote: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { quote: "Whatever you are, be a good one.", author: "Abraham Lincoln" },
    { quote: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
    { quote: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { quote: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
    { quote: "Happiness depends upon ourselves.", author: "Aristotle" },
    { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" }
];

// Function to fetch a list of motivational thoughts
async function fetchThought() {
    if (!thoughtElement) return;

    // Add loading state
    thoughtElement.innerText = "Loading quotation...";
    thoughtElement.style.opacity = "0.5";
    
    try {
        // Try to fetch a daily high-quality quote from FavQs
        const response = await fetch("https://favqs.com/api/qotd");
        if (!response.ok) throw new Error("API fail");
        
        const data = await response.json();
        const dailyQuote = data.quote;
        
        // Quality check: Ensure it's not too long and has a valid author
        if (dailyQuote && dailyQuote.body.length < 120 && dailyQuote.author) {
            thoughtElement.innerText = `"${dailyQuote.body}"\nAuthor: ${dailyQuote.author}`;
        } else {
            // If the daily quote is too long or bad, use our curated list
            useCuratedQuote();
        }
        
    } catch (error) {
        console.log("Using curated fallback due to API error");
        useCuratedQuote();
    } finally {
        thoughtElement.style.opacity = "1";
    }
}

function useCuratedQuote() {
    const randomIndex = Math.floor(Math.random() * curatedQuotes.length);
    const q = curatedQuotes[randomIndex];
    thoughtElement.innerText = `"${q.quote}"\nAuthor: ${q.author}`;
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
