const timeEl = document.querySelector('.time');
const dateEl = document.querySelector('.date');
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function setTime() {
  const time = new Date();
  const month = time.getMonth();
  const year = time.getFullYear();

  const day = time.getDay();
  const date = time.getDate();
  const hours = time.getHours();
  const hoursForClock = hours >= 13 ? hours % 12 : hours;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  if (timeEl && dateEl) {
    timeEl.innerHTML = `${hoursForClock.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    dateEl.innerHTML = `${days[day]}, ${months[month]} ${date}, ${year}`;
  }
}

setTime();
setInterval(setTime, 1000);

firebase.auth().onAuthStateChanged(async (user) => {
  const emailId = user ? user.email : null;
  const greetEl = document.getElementById("greet");
  let name = "User";

  if (emailId) {
    try {
      const snapshot = await firebase.database().ref("users/" + emailId.replace('.', ',') + "/name").once("value");
      name = snapshot.val() || "User";
    } catch (error) {
      console.error("Database read error:", error);
      alert("An error occurred while retrieving data. Please try again.");
    }
  }

  const greeting = getGreeting(name);

  if (greetEl) {
    greetEl.innerHTML = greeting;
  }
});

function getGreeting(name) {
  const time = new Date().getHours();

  if (time < 7) {
    return `Very Good morning ${name}! We're delighted to see you here so early.`;
  } else if (time < 12) {
    return `Good morning ${name}! It's a beautiful morning and we're thrilled to have you join us on our website.`;
  } else if (time < 14) {
    return `Good afternoon ${name}! It's time to have lunch.`;
  } else if (time < 16) {
    return `Good afternoon ${name}! We're so happy to have you join us on our website.`;
  } else if (time < 20) {
    return `Good evening ${name}! How are you doing today?`;
  } else if (time < 22) {
    return `Good night ${name}! Thanks for stopping by at night! We hope you find what you're looking for.`;
  } else {
    return `Good night ${name}! It's time to sleep. We are so glad to see you at late night.`;
  }
}

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
  const accountBox = document.querySelector('#accountBox');
  const loginBtn = document.getElementById("loginBtn");
  const menuBtn = document.querySelector(".menuBtn");
  const navDrawer = document.getElementById("navDrawer");
  const drawerCloseBtn = document.getElementById("drawerCloseBtn");

  if (accountBtn && accountBox && loginBtn) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        accountBtn.innerHTML = "Manage Account";
        accountBtn.href = "./menu/manageAccount.html";
        accountBox.style.display = 'none';
        loginBtn.style.display = 'none';
      } else {
        accountBtn.innerHTML = "Create Account";
        accountBtn.href = "./menu/createAccount.html";
        accountBox.style.display = 'block';
        loginBtn.style.display = 'block';
        loginBtn.href = "./menu/login.html";
      }
    });

    // Open the navigation drawer as a modal dialog
    menuBtn.addEventListener("click", function () {
      navDrawer.showModal();
      navDrawer.querySelector("button").focus();
    });

    // Close the drawer
    drawerCloseBtn.addEventListener("click", function () {
      navDrawer.close();
      menuBtn.focus();
    });

  }
}

loadHeaderAndFooter(initPage);


function translateToHindi() {
  const thought = document.getElementById('thought').innerHTML;
  fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${thought}`)
    .then(response => response.json())
    .then(data => {
      const translated = data[0][0][0];
      document.getElementById('thought').innerHTML = translated;
      announce("translated successfully");
    })
    .catch(err => console.log(err));
}
function announce(message) {
  var announcement = document.getElementById("announcement");
  announcement.textContent = message;
  setTimeout(function () {
    announcement.style.display = "none";
  }, 3000);
  announcement.style.display = "block";
}
