const SKIBIDI_GIF = chrome.runtime.getURL("skibidi.gif");
const root = document.documentElement;

const S1_DELAY = 5000;
const S2_DELAY = 5000;

let checkInterval;

// Run immediately on page load
checkBrainrotStatus();

// Also listen for the popup turning it on
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "checkStatus") checkBrainrotStatus();
});

function checkBrainrotStatus() {
    chrome.storage.local.get(['brainrotEnabled', 'expiry'], (data) => {
        if (!data.brainrotEnabled) return;

        const now = Date.now();
        
        // If the session is still active (expiry is in the future)
        if (now < data.expiry) {
            triggerMeltdown();
        } else {
            // Timer passed! Set enabled to false so they can scroll again
            chrome.storage.local.set({ brainrotEnabled: false });
        }
    });
}

function triggerMeltdown() {
    const root = document.documentElement;
    root.classList.add('stage-2'); // Start shaking
    root.classList.add('stage-3'); // Invert colors
    
    infectImages(); 
    playCursedSound();
    
    // The "Shame" Banner
    if (!document.getElementById('shame-banner')) {
        const banner = document.createElement('div');
        banner.id = 'shame-banner';
        banner.style.cssText = `
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100% !important; background: red !important; color: white !important;
            text-align: center !important; font-size: 30px !important; z-index: 2147483647 !important;
            font-family: "Comic Sans MS" !important; padding: 15px !important;
            font-weight: bold !important;
        `;
        banner.innerText = "⚠️ GET OFF AND FOCUS!! ⚠️";
        document.body.appendChild(banner);
    }
}

// ... (Keep your infectImages() and playCursedSound() functions here) ...
function infectImages() {
    const runInfection = () => {
        // Target standard images
        document.querySelectorAll('img').forEach(img => {
            if (img.src !== SKIBIDI_GIF) {
                img.src = SKIBIDI_GIF;
                if (img.srcset) img.srcset = SKIBIDI_GIF;
            }
        });

        // Target Videos (YT Shorts, TikTok, IG)
        document.querySelectorAll('video').forEach(vidi => {
            // Find the main container to cover everything
            const container = vidi.closest('ytd-reel-video-renderer, article, [data-e2e="reel-item"], .video-container') || vidi.parentElement;

            if (container && !container.querySelector('.brainrot-overlay')) {
                vidi.style.opacity = "0";
                vidi.pause();

                const overlay = document.createElement('div');
                overlay.className = 'brainrot-overlay';
                overlay.style.cssText = `
                    position: absolute !important;
                    top: 0 !important; left: 0 !important;
                    width: 100% !important; height: 100% !important;
                    background-image: url("${SKIBIDI_GIF}") !important;
                    background-size: cover !important;
                    background-position: center !important;
                    z-index: 2147483640 !important;
                    pointer-events: none !important;
                `;
                container.style.position = 'relative';
                container.appendChild(overlay);
            }
        });
    };

    runInfection();
    setInterval(runInfection, 2000);
}

function playCursedSound() {
    const audioUrl = chrome.runtime.getURL("cursed.mp3");
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    audio.loop = true;
    audio.play().catch(e => console.log("Click the page to hear the rot!", e));
}