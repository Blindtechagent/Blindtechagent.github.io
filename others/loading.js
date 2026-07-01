(function() {
    const startTime = Date.now();

    // Inject sr-only styles to ensure screen reader announcer is always hidden visually
    if (!document.getElementById('sr-only-styles')) {
        const style = document.createElement('style');
        style.id = 'sr-only-styles';
        style.innerHTML = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }
        `;
        document.head.appendChild(style);
    }

    let pageLoaded = false;
    let animationDone = false;

    function fadeOutPreloader() {
        // Only proceed if BOTH conditions are met
        if (!pageLoaded || !animationDone) return;

        const indexPreloader = document.querySelector('.index-preloader');
        const standardPreloader = document.querySelector('.preloader');
        const body = document.querySelector('.body');

        const element = indexPreloader || standardPreloader;
        if (!element) {
            // Preloader already removed, just ensure body is visible
            if (body) body.style.display = 'block';
            return;
        }

        // Announce loading finish for screen readers
        const announcer = document.getElementById('sr-announcer');
        if (announcer) {
            announcer.innerText = "loading finish";
            setTimeout(() => {
                announcer.innerText = "";
            }, 1000);
        }

        // Show body and slide up preloader
        if (body) body.style.display = 'block';
        element.classList.add('slide-up');

        // Remove preloader from DOM after slide transition completes (600ms)
        setTimeout(function() {
            element.remove();
        }, 600);
    }

    // Trigger pageLoaded on DOMContentLoaded (HTML parsed) instead of window.load (which waits for all external styles/scripts/APIs)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onPageReady);
    } else {
        onPageReady();
    }

    function onPageReady() {
        pageLoaded = true;
        fadeOutPreloader();


    }

    // Wait for animation to complete using animationend event, with safety fallback timer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAnimationEndListeners);
    } else {
        setupAnimationEndListeners();
    }

    function setupAnimationEndListeners() {
        const indexPreloader = document.querySelector('.index-preloader');
        const standardPreloader = document.querySelector('.preloader');
        
        let targetElement = null;
        let backupDuration = 1500;

        if (indexPreloader) {
            targetElement = document.getElementById('a');
            backupDuration = 2000;
        } else if (standardPreloader) {
            targetElement = standardPreloader.querySelector('.welcome');
            backupDuration = 1200;
        }

        let listenerTriggered = false;

        function handleAnimationEnd(event) {
            if (event.animationName === 'reveal' && !listenerTriggered) {
                listenerTriggered = true;
                animationDone = true;
                fadeOutPreloader();
            }
        }

        if (targetElement) {
            targetElement.addEventListener('animationend', handleAnimationEnd);
        }

        // Safety backup timer in case animationend event fails to fire
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, backupDuration - elapsedTime);

        setTimeout(function() {
            if (!listenerTriggered) {
                animationDone = true;
                fadeOutPreloader();
            }
        }, remainingTime);
    }
})();