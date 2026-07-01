const articlesList = document.getElementById('articles');
const totalArticlesElement = document.getElementById('totalArticles');
const paginationContainer = document.getElementById('pagination');
const db = firebase.database().ref('articles');

let currentPage = 0; // Start on the first page
const articlesPerPage = 7; // Number of articles per page
let totalArticles = 0;
let sortedArticles = [];
let isLoaded = false; // Flag to track if data has been fetched

// Initial setup for pagination buttons - moved up to avoid race conditions
if (paginationContainer) {
  paginationContainer.innerHTML = `
    <button id="previousBtn" onclick="prevPage()" style="display: none;">Previous 7 days</button>
    <button id="nextBtn" onclick="nextPage()">Next 7 days</button>
  `;
}

// Load and sort articles initially
db.orderByKey().on('value', (snapshot) => {
  const articles = snapshot.val();
  isLoaded = true;
  
  if (articles) {
    // Filter out entries that don't have a title or publishDate (e.g., savedData)
    sortedArticles = Object.entries(articles)
      .filter(([, article]) => article.title && article.publishDate)
      .sort(([, a], [, b]) => {
        const dateA = new Date(a.publishDate);
        const dateB = new Date(b.publishDate);
        return (dateB - dateA) || 0; // Fallback to 0 if NaN
      });
    totalArticles = sortedArticles.length;
    if (totalArticlesElement) {
      totalArticlesElement.innerHTML = `Total articles: ${totalArticles}`;
    }
  } else {
    sortedArticles = [];
    totalArticles = 0;
    if (totalArticlesElement) {
      totalArticlesElement.innerHTML = `Total articles: 0`;
    }
  }
  displayArticles();
}, (error) => {
  console.error("Firebase error:", error);
  isLoaded = true;
  if (articlesList) {
    articlesList.innerHTML = `<p>Error loading articles: ${error.message}</p>`;
  }
});

// Function to display articles for the current page
function displayArticles() {
  if (!articlesList) return;
  
  articlesList.innerHTML = ''; // Clear the list
  const start = currentPage * articlesPerPage;
  const end = start + articlesPerPage;
  const paginatedArticles = sortedArticles.slice(start, end);

  if (paginatedArticles.length === 0) {
    if (isLoaded) {
      articlesList.innerHTML = `<p>No articles found.</p>`;
    } else {
      articlesList.innerHTML = `<p>Loading Articles...</p>`;
    }
    return;
  }

  paginatedArticles.forEach(([key, article]) => {
    displayArticle(key, article.title, article.author, article.publishDate, article.category, article.viewCount || 0);
  });

  // Update button visibility
  const previousBtn = document.getElementById('previousBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (previousBtn) previousBtn.style.display = currentPage === 0 ? 'none' : 'inline';
  if (nextBtn) nextBtn.style.display = end >= totalArticles ? 'none' : 'inline';
}

// Display each article
function displayArticle(id, title, author, publishDate, category, viewCount) {
  const articleDiv = document.createElement('div');
  articleDiv.classList.add('article');
  articleDiv.innerHTML = `
    <h2>${title}</h2>
    <p><strong>Written by: ${author}</strong></p>
    <p><strong>Published on: ${publishDate}</strong></p>
    <p><strong>Category: ${category}</strong></p>
    <p><strong>Views: ${viewCount}</strong></p>
    <button class="read-full-article-btn" onclick="viewArticle('${id}')">Read Full Article</button>
  `;
  articlesList.appendChild(articleDiv);
}

// Handle viewing full article
function viewArticle(id) {
  window.location.href = `articles_system/article.html?id=${id}`;
}

// Next page
function nextPage() {
  if ((currentPage + 1) * articlesPerPage < totalArticles) {
    currentPage++;
    displayArticles();
  }
}

// Previous page
function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    displayArticles();
  }
}

// Search functionality
const searchForm = document.getElementById('searchform');
if (searchForm) {
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent form submission
    const searchText = document.getElementById('searchBox').value.toLowerCase();
    
    db.orderByKey().once('value', (snapshot) => {
      const articles = snapshot.val();
      if (!articles) {
        sortedArticles = [];
        totalArticles = 0;
        currentPage = 0;
        displayArticles();
        return;
      }
      
      const filteredArticles = Object.entries(articles)
        .filter(([key, article]) =>
          (article.title && article.title.toLowerCase().includes(searchText)) ||
          (article.category && article.category.toLowerCase().includes(searchText)) ||
          (article.author && article.author.toLowerCase().includes(searchText)) ||
          (article.content && article.content.toLowerCase().includes(searchText))
        )
        .sort(([, a], [, b]) => new Date(b.publishDate) - new Date(a.publishDate));

      sortedArticles = filteredArticles; // Update the sortedArticles array with filtered results
      totalArticles = sortedArticles.length; // Update totalArticles count for pagination
      currentPage = 0; // Reset to first page
      displayArticles();
    });
    document.getElementById('searchBox').value = ''; // Clear search input
  });
}

// Filter by category
const filterBy = document.getElementById('filter-by');
if (filterBy) {
  filterBy.addEventListener('change', function () {
    const selectedCategory = this.value;
    db.orderByKey().once('value', (snapshot) => {
      const articles = snapshot.val();
      if (!articles) {
        sortedArticles = [];
        totalArticles = 0;
        currentPage = 0;
        displayArticles();
        return;
      }
      
      const filteredArticles = selectedCategory === 'all'
        ? Object.entries(articles)
        : Object.entries(articles).filter(([key, article]) => article.category === selectedCategory);

      const sortedFilteredArticles = filteredArticles.sort(([, a], [, b]) => new Date(b.publishDate) - new Date(a.publishDate));

      sortedArticles = sortedFilteredArticles; // Update the sortedArticles array with filtered results
      totalArticles = sortedArticles.length; // Update totalArticles count for pagination
      currentPage = 0; // Reset to first page
      displayArticles();
    });
  });
}

function sortArticles(sortOption) {
  switch (sortOption) {
    case 'popular':
      sortedArticles.sort(([, a], [, b]) => (b.viewCount || 0) - (a.viewCount || 0));
      break;
    case 'latest':
      sortedArticles.sort(([, a], [, b]) => new Date(b.publishDate) - new Date(a.publishDate));
      break;
    case 'oldest':
      sortedArticles.sort(([, a], [, b]) => new Date(a.publishDate) - new Date(b.publishDate));
      break;
    default:
      // Default to sorting by latest
      sortedArticles.sort(([, a], [, b]) => new Date(b.publishDate) - new Date(a.publishDate));
      break;
  }
  currentPage = 0; // Reset to the first page
  displayArticles();
}

// Initial display
displayArticles();

// sort articles
const sortBy = document.getElementById('sort-by');
if (sortBy) {
  sortBy.addEventListener('change', function () {
    sortArticles(this.value);
  });
}

