// Reliable URLs (Wikimedia is usually not blocked by CSP)
const SKIBIDI_URL = "https://m.media-amazon.com/images/M/MV5BMzgzMzY2MmMtMWNkNy00ZjVkLWIxOWUtZDJjODNmY2IyOWFiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg"; 
const RACOON_URL = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm96Z3pndnR6Z3pndnR6Z3pndnR6Z3pndnR6Z3pndnR6Z3pndnZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/v0ok8uhZvw3yE/giphy.gif";

const STAGE_1_DELAY = 5000;
const STAGE_2_DELAY = 5000;

let currentLevel = 0;
const root = document.documentElement;

console.log("🚀 Skibidi Scroll: TrendHacker2026 initialized.");

// --- INITIAL START ---

setTimeout(() => {
    applyStage(1);
}, STAGE_1_DELAY);

setTimeout(() => {
    applyStage(2);
}, STAGE_1_DELAY + STAGE_2_DELAY);

// --- THE REST OF YOUR FUNCTIONS ---
// (applyStage, infectImages, startRizzCounter, etc. stay exactly the same)

function applyStage(level) {
    console.log(`⚠️ ENTERING STAGE ${level} ⚠️`);
    if (level === 1) {
        root.classList.add('stage-1');
        infectImages();
    } 
    if (level === 2) {
        root.classList.add('stage-2');
        startRizzCounter(); // Start the countdown to the final meltdown
    }
}

function infectImages() {
    const localGifUrl = chrome.runtime.getURL("skibidi.gif");

    const runInfection = () => {
        // 1. Standard Image Swap
        document.querySelectorAll('img').forEach(img => {
            if (img.src !== localGifUrl) {
                img.src = localGifUrl;
                if (img.srcset) img.srcset = localGifUrl;
            }
        });

        // 2. The Video Overpower Logic
        document.querySelectorAll('video').forEach(vidi => {
            // Find the "Main" container for the video post
            // For YouTube Shorts: ytd-reel-video-renderer
            // For Instagram: article
            // For TikTok: div[data-e2e="reel-item"]
            const container = vidi.closest('ytd-reel-video-renderer, article, [data-e2e="reel-item"], .video-container') || vidi.parentElement;

            if (container && !container.querySelector('.brainrot-overlay')) {
                // Kill the video visual
                vidi.style.opacity = "0";
                vidi.pause();

                const overlay = document.createElement('div');
                overlay.className = 'brainrot-overlay';
                overlay.style.cssText = `
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background-image: url("${localGifUrl}") !important;
                    background-size: cover !important;
                    background-position: center !important;
                    background-repeat: no-repeat !important;
                    z-index: 2147483647 !important; /* MAX VALUE */
                    pointer-events: none !important;
                `;
                
                // YouTube Shorts needs relative positioning on the container
                container.style.position = 'relative';
                container.appendChild(overlay);
                console.log("🔥 Infected a video container!");
            }
        });
    };

    runInfection();
    setInterval(runInfection, 2000);
}

function startRizzCounter() {
    if (document.getElementById('rizz-counter')) return;

    const counter = document.createElement('div');
    counter.id = "rizz-counter";
    counter.style.cssText = `
        position: fixed !important; bottom: 50px !important; right: 50px !important;
        background: #000 !important; color: #0f0 !important; padding: 30px !important;
        font-size: 50px !important; font-weight: bold !important; border: 10px solid #0f0 !important;
        z-index: 2147483647 !important; font-family: monospace !important;
    `;
    document.body.appendChild(counter);

    let rizzValue = 1000; // Adjust this to make the countdown faster/slower
    const drain = setInterval(() => {
        rizzValue -= 20;
        counter.innerText = `L-RIZZ: ${rizzValue}`;
        
        if (rizzValue <= 0) {
            clearInterval(drain);
            triggerFullMeltdown(counter);
        }
    }, 100);
}

function triggerFullMeltdown(counterElement) {
    console.log("💀 TOTAL RIZZ LOSS. FULL MELTDOWN. 💀");
    root.classList.add('stage-3'); 
    
    counterElement.innerText = "STATUS: COOKED 💀";
    counterElement.style.color = "red";
    counterElement.style.borderColor = "red";

    // --- NEW: AUDIO TRIGGER ---
    playCursedSound();
    
    // Final chaos: random shaking
    setInterval(() => {
        window.scrollBy(Math.random() * 20 - 10, Math.random() * 20 - 10);
    }, 50);
}

function playCursedSound() {
    // This looks for the local file you just downloaded
    const audioUrl = chrome.runtime.getURL("cursed.mp3");
    const audio = new Audio(audioUrl);
    
    audio.volume = 0.7; // Turn it up for the judges
    audio.loop = true; 
    
    audio.play().catch(e => {
        console.log("Audio needs a user click on the page first!", e);
    });
}