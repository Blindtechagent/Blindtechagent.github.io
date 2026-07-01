// Resolve the base path once at script-parse time using the script element itself.
// This is more reliable than reading the style.css href.
function getPathPrefix() {
  const styleLink = document.querySelector('link[href*="style.css"]');
  if (styleLink) {
    const href = styleLink.getAttribute('href');
    return href.replace('style.css', '');
  }
  return './';
}

function adjustRelativeLinks(container, pathPrefix) {
  if (!pathPrefix || pathPrefix === './') return;

  container.querySelectorAll('[href]').forEach(el => {
    const href = el.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('javascript:')) {
      el.setAttribute('href', pathPrefix + (href.startsWith('./') ? href.slice(2) : href));
    }
  });

  container.querySelectorAll('[src]').forEach(el => {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
      el.setAttribute('src', pathPrefix + (src.startsWith('./') ? src.slice(2) : src));
    }
  });
}

function loadHeaderAndFooter(onComplete) {
  const prefix = getPathPrefix();
  const headerEl = document.getElementById('header') || document.querySelector('header');
  const footerEl = document.getElementById('footer') || document.querySelector('footer');

  function renderHTML() {
    if (headerEl && window.BTA_HEADER_HTML) {
      headerEl.innerHTML = window.BTA_HEADER_HTML;
      adjustRelativeLinks(headerEl, prefix);
    }
    if (footerEl && window.BTA_FOOTER_HTML) {
      footerEl.innerHTML = window.BTA_FOOTER_HTML;
      adjustRelativeLinks(footerEl, prefix);
      // Update dynamic copyright year via stable id
      const copyright = footerEl.querySelector('#copyright');
      if (copyright) {
        const yr = new Date().getFullYear();
        copyright.textContent = `\u00A9 2023\u2013${yr} Blind Tech Agent. All Rights Reserved.`;
      }
    }
    if (typeof onComplete === 'function') onComplete();
  }

  // Render immediately if already loaded in window
  if (window.BTA_HEADER_HTML && window.BTA_FOOTER_HTML) {
    renderHTML();
    return;
  }

  const script = document.createElement('script');
  script.src = prefix + 'others/header-footer-data.js';
  script.onload = renderHTML;
  script.onerror = (err) => {
    console.error('Failed to load header/footer data script:', err);
    if (typeof onComplete === 'function') onComplete();
  };
  document.head.appendChild(script);
}

function initPage() {
  const accountBtn = document.getElementById("accountBtn");
  const loginBtn = document.getElementById("loginBtn");
  const menuBtn = document.querySelector('.menuBtn');
  const navDrawer = document.getElementById('navDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  if (accountBtn && loginBtn) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        accountBtn.innerHTML = "Manage Account";
        accountBtn.href = "./menu/manageAccount.html";
        loginBtn.style.display = 'none';
      } else {
        accountBtn.innerHTML = "Create Account";
        accountBtn.href = "./menu/createAccount.html";
        loginBtn.style.display = 'block';
        loginBtn.href = "./menu/login.html";
      }
    });
  }

  if (menuBtn && navDrawer && drawerCloseBtn) {
    // Open the navigation drawer as a modal dialog
    menuBtn.addEventListener("click", function () {
      navDrawer.showModal();
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.setAttribute("aria-label", "Close Navigation Menu");
    });

    // Close the drawer
    drawerCloseBtn.addEventListener("click", function () {
      navDrawer.close();
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open Navigation Menu");
    });

    // Reset aria state when the dialog is dismissed (Esc / backdrop)
    navDrawer.addEventListener("close", function () {
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open Navigation Menu");
    });
  }

  const copyBtn = document.querySelector(".copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function() {
      var text = document.querySelector(".textCopy").innerText;
      var input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      announce("Text copied successfully!");
    });
  }

  const copyTextBoxBtn = document.querySelector(".copyTextBoxBtn");
  if (copyTextBoxBtn) {
    copyTextBoxBtn.addEventListener("click", function() {
      var textarea = document.querySelector(".textBoxCopy");
      textarea.select();
      document.execCommand("copy");
      announce("Text copied successfully!");
    });
  }
}

function announce(message) {
  var announcement = document.getElementById("announcement");
  if (announcement) {
    announcement.textContent = message;
    setTimeout(function() {
      announcement.textContent = "";
    }, 3000);
  }
}

// Start loading components immediately
loadHeaderAndFooter(initPage);

