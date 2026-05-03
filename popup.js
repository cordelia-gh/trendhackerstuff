document.addEventListener("DOMContentLoaded", () => {
    const BRAINROT_FILES = ["skibidi.gif", "brainrot-cat.gif", "brainrot-scuba.gif", "brainrot-horse.gif"];

    function secureRandomIndex(length) {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        return values[0] % length;
    }

    function pickRandomBrainrotFile(excludeFile) {
        let choices = BRAINROT_FILES;

        if (excludeFile && BRAINROT_FILES.length > 1) {
            choices = BRAINROT_FILES.filter((file) => file !== excludeFile);
        }

        return choices[secureRandomIndex(choices.length)];
    }

    const durationInput = document.getElementById("duration");
    const valDisplay = document.getElementById("val");
    const setupView = document.getElementById("setup-view");
    const activeView = document.getElementById("active-view");
    const countdownDisplay = document.getElementById("countdown");

    if (durationInput && valDisplay) {
        durationInput.addEventListener("input", () => {
            valDisplay.innerText = durationInput.value;
        });
    }

    chrome.storage.local.get(["brainrotEnabled", "expiry"], (data) => {
        if (data.brainrotEnabled && data.expiry > Date.now()) {
            showActive(data.expiry);
        } else {
            chrome.storage.local.set({
                brainrotEnabled: false,
                selectedBrainrotFile: null,
                brainrotSessionId: null,
                brainrotPageInstanceId: null
            });
            setupView.style.display = "block";
            activeView.style.display = "none";
        }
    });

    function showActive(expiry) {
        setupView.style.display = "none";
        activeView.style.display = "block";

        const updateTimer = () => {
            const diff = expiry - Date.now();

            if (diff <= 0) {
                chrome.storage.local.set({
                    brainrotEnabled: false,
                    selectedBrainrotFile: null,
                    brainrotSessionId: null,
                    brainrotPageInstanceId: null
                });
                setupView.style.display = "block";
                activeView.style.display = "none";
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            countdownDisplay.innerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    function sendBrainrotMessage(tabId, message) {
        chrome.tabs.sendMessage(tabId, message, () => {
            if (!chrome.runtime.lastError) return;

            // Fixes the "I need to reload the page before it works" issue.
            // If the page was open before the extension was reloaded, inject the
            // content script and CSS immediately, then send the message again.
            chrome.scripting.insertCSS({ target: { tabId }, files: ["style.css"] }, () => {
                chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
                    chrome.tabs.sendMessage(tabId, message, () => {
                        if (chrome.runtime.lastError) {
                            console.log("Content script could not be started on this page.");
                        }
                    });
                });
            });
        });
    }

    document.getElementById("startBtn").onclick = () => {
        const minutes = parseInt(durationInput.value, 10);
        const expiryTime = Date.now() + (minutes * 60 * 1000);

        chrome.storage.local.get(["lastBrainrotFile"], (data) => {
            const selectedBrainrotFile = pickRandomBrainrotFile(data.lastBrainrotFile);
            const brainrotSessionId = String(Date.now()) + "-" + selectedBrainrotFile;

            chrome.storage.local.set({
                brainrotEnabled: true,
                expiry: expiryTime,
                selectedBrainrotFile,
                lastBrainrotFile: selectedBrainrotFile,
                brainrotSessionId,
                brainrotPageInstanceId: null
            }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];

                    if (activeTab && activeTab.url && activeTab.url.startsWith("http")) {
                        sendBrainrotMessage(activeTab.id, {
                            action: "checkStatus",
                            selectedBrainrotFile,
                            brainrotSessionId
                        });
                    }

                    showActive(expiryTime);
                });
            });
        });
    };

    document.getElementById("stopBtn").onclick = () => {
        chrome.storage.local.set({
            brainrotEnabled: false,
            selectedBrainrotFile: null,
            brainrotSessionId: null,
            brainrotPageInstanceId: null
        }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.reload(tabs[0].id);
            });
            window.close();
        });
    };
});
