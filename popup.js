// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const durationInput = document.getElementById('duration');
    const valDisplay = document.getElementById('val');
    const setupView = document.getElementById('setup-view');
    const activeView = document.getElementById('active-view');
    const countdownDisplay = document.getElementById('countdown');

    // 1. SLIDER FIX: Update text as you drag
    if (durationInput && valDisplay) {
        durationInput.addEventListener('input', () => {
            valDisplay.innerText = durationInput.value;
        });
    }

    // 2. CHECK STATUS: Decide which view to show
    chrome.storage.local.get(['brainrotEnabled', 'expiry'], (data) => {
        if (data.brainrotEnabled && data.expiry > Date.now()) {
            showActive(data.expiry);
        } else {
            setupView.style.display = 'block';
            activeView.style.display = 'none';
        }
    });

    function showActive(expiry) {
        setupView.style.display = 'none';
        activeView.style.display = 'block';

        const updateTimer = () => {
            const now = Date.now();
            const diff = expiry - now;

            if (diff <= 0) {
                chrome.storage.local.set({ brainrotEnabled: false });
                setupView.style.display = 'block';
                activeView.style.display = 'none';
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            countdownDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // 3. START BUTTON
    document.getElementById('startBtn').onclick = () => {
    const minutes = parseInt(durationInput.value);
    const expiryTime = Date.now() + (minutes * 60 * 1000);

    chrome.storage.local.set({ brainrotEnabled: true, expiry: expiryTime }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const activeTab = tabs[0];
            
            // Check if the tab exists and is a web page (not a chrome:// page)
            if (activeTab && activeTab.url.startsWith('http')) {
                chrome.tabs.sendMessage(activeTab.id, {action: "checkStatus"}, (response) => {
                    // This callback handles the error silently if the script isn't there
                    if (chrome.runtime.lastError) {
                        console.log("Content script not active on this page. That's fine!");
                    }
                });
            }
            showActive(expiryTime);
        });
    });
};

    // 4. STOP BUTTON (RESETS EVERYTHING)
    document.getElementById('stopBtn').onclick = () => {
        chrome.storage.local.set({ brainrotEnabled: false }, () => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.reload(tabs[0].id);
            });
            window.close();
        });
    };
});