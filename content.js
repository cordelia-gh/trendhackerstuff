(() => {
    if (window.__trendHackerContentLoaded) {
        return;
    }
    window.__trendHackerContentLoaded = true;

const BRAINROT_FILES = [
    "skibidi.gif",
    "brainrot-cat.gif",
    "brainrot-scuba.gif",
    "brainrot-horse.gif"
];

const SKIBIDI_AUDIO = chrome.runtime.getURL("skibidi-toilet-song.mp3");
const FALLBACK_AUDIO = chrome.runtime.getURL("cursed.mp3");

const root = document.documentElement;
const PAGE_INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let activeBrainrotFile = "skibidi.gif";
let activeSessionId = String(Date.now());
let activeBrainrotUrl = makeBrainrotUrl(activeBrainrotFile);
let updateInterval = null;
let mutationObserver = null;
let updateQueued = false;
let cursedAudio = null;
let resizeListenersAdded = false;
let pageTimerInterval = null;

let videoIdCounter = 0;
const videoIds = new WeakMap();

checkBrainrotStatus();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "checkStatus") {
        if (msg.selectedBrainrotFile && msg.brainrotSessionId) {
            chrome.storage.local.set({
                selectedBrainrotFile: msg.selectedBrainrotFile,
                lastBrainrotFile: msg.selectedBrainrotFile,
                brainrotSessionId: msg.brainrotSessionId,
                brainrotPageInstanceId: PAGE_INSTANCE_ID
            });

            setActiveBrainrot(msg.selectedBrainrotFile, msg.brainrotSessionId);
            preloadActiveBrainrot();
            refreshAllBrainrot();
        }

        checkBrainrotStatus();
        sendResponse({ ok: true });
    }

    return true;
});

function makeBrainrotUrl(fileName) {
    // No query string here. Some Chrome extension setups fail to load
    // web_accessible_resources with cache-buster queries, which caused the
    // broken/green thumbnail boxes. Page reload already restarts the GIF.
    return chrome.runtime.getURL(fileName);
}

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

function setActiveBrainrot(fileName, sessionId) {
    activeBrainrotFile = BRAINROT_FILES.includes(fileName) ? fileName : "skibidi.gif";
    activeSessionId = String(sessionId || Date.now());
    activeBrainrotUrl = makeBrainrotUrl(activeBrainrotFile);
}

function preloadActiveBrainrot() {
    const img = new Image();
    img.src = activeBrainrotUrl;
}

function getBrainrotChoice(callback, options = {}) {
    const { forceNew = false } = options;

    chrome.storage.local.get([
        "selectedBrainrotFile",
        "brainrotSessionId",
        "lastBrainrotFile",
        "brainrotPageInstanceId"
    ], (data) => {
        let selected = data.selectedBrainrotFile;
        let sessionId = data.brainrotSessionId;

        // Every refresh creates a new PAGE_INSTANCE_ID. If this page instance
        // has not been seen before, choose a fresh random GIF.
        const pageWasReloaded = data.brainrotPageInstanceId !== PAGE_INSTANCE_ID;

        if (forceNew || pageWasReloaded || !BRAINROT_FILES.includes(selected) || !sessionId) {
            selected = pickRandomBrainrotFile(data.lastBrainrotFile);
            sessionId = `${Date.now()}-${selected}-${PAGE_INSTANCE_ID}`;

            chrome.storage.local.set({
                selectedBrainrotFile: selected,
                lastBrainrotFile: selected,
                brainrotSessionId: sessionId,
                brainrotPageInstanceId: PAGE_INSTANCE_ID
            });
        }

        setActiveBrainrot(selected, sessionId);
        preloadActiveBrainrot();
        callback();
    });
}

function checkBrainrotStatus() {
    chrome.storage.local.get(["brainrotEnabled", "expiry"], (data) => {
        if (!data.brainrotEnabled) {
            cleanupMeltdown();
            return;
        }

        if (Date.now() < data.expiry) {
            getBrainrotChoice(triggerMeltdown);
        } else {
            chrome.storage.local.set({
                brainrotEnabled: false,
                selectedBrainrotFile: null,
                brainrotSessionId: null,
                brainrotPageInstanceId: null
            });
            cleanupMeltdown();
        }
    });
}

function triggerMeltdown() {
    root.classList.add("stage-2");
    root.classList.add("stage-3");

    refreshAllBrainrot();
    startEfficientWatcher();
    playCursedSound();
    showBanner();
    showLockinTimer();
}

function refreshAllBrainrot() {
    coverThumbnailsAndProfiles();
    coverVisibleVideosWithGif();
    replacePageAudio();
}


function formatRemainingTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function showLockinTimer() {
    let timer = document.getElementById("brainrot-lockin-timer");

    if (!timer) {
        timer = document.createElement("div");
        timer.id = "brainrot-lockin-timer";
        timer.style.cssText = `
            position: fixed !important;
            top: 86px !important;
            right: 18px !important;
            z-index: 2147483647 !important;
            min-width: 145px !important;
            background: rgba(0, 0, 0, 0.92) !important;
            color: #00ff00 !important;
            border: 2px solid #ff00ff !important;
            border-radius: 12px !important;
            padding: 12px 14px !important;
            box-sizing: border-box !important;
            text-align: center !important;
            font-family: "Comic Sans MS", Arial, sans-serif !important;
            box-shadow: 0 0 18px rgba(255, 0, 255, 0.55) !important;
            pointer-events: none !important;
            transform: translateZ(0) !important;
            filter: none !important;
        `;
        timer.innerHTML = `
            <div style="font-size: 12px; font-weight: 900; color: #ff00ff; margin-bottom: 4px;">
                LOCKIN TIMER
            </div>
            <div id="brainrot-lockin-time-left" style="font-size: 28px; font-family: monospace; color: #ff0000; line-height: 1;">
                --:--
            </div>
        `;
        document.body.appendChild(timer);
    }

    const updateTimer = () => {
        chrome.storage.local.get(["brainrotEnabled", "expiry"], (data) => {
            const timeText = document.getElementById("brainrot-lockin-time-left");

            if (!data.brainrotEnabled || !data.expiry || Date.now() >= data.expiry) {
                const currentTimer = document.getElementById("brainrot-lockin-timer");
                if (currentTimer) currentTimer.remove();

                if (pageTimerInterval) {
                    clearInterval(pageTimerInterval);
                    pageTimerInterval = null;
                }

                return;
            }

            if (timeText) {
                timeText.textContent = formatRemainingTime(data.expiry - Date.now());
            }
        });
    };

    updateTimer();

    if (!pageTimerInterval) {
        pageTimerInterval = setInterval(updateTimer, 1000);
    }
}


function showBanner() {
    if (document.getElementById("shame-banner")) return;

    const banner = document.createElement("div");
    banner.id = "shame-banner";
    banner.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        background: red !important;
        color: white !important;
        text-align: center !important;
        font-size: 30px !important;
        z-index: 2147483647 !important;
        font-family: "Comic Sans MS", cursive !important;
        padding: 15px !important;
        font-weight: bold !important;
        box-sizing: border-box !important;
    `;
    banner.innerText = "⚠️ GET OFF AND FOCUS!! ⚠️";
    document.body.appendChild(banner);
}

function cleanupMeltdown() {
    root.classList.remove("stage-2");
    root.classList.remove("stage-3");

    document.querySelectorAll(".brainrot-video-cover, .brainrot-thumb-cover").forEach((overlay) => overlay.remove());

    const banner = document.getElementById("shame-banner");
    if (banner) banner.remove();

    const timer = document.getElementById("brainrot-lockin-timer");
    if (timer) timer.remove();

    if (pageTimerInterval) {
        clearInterval(pageTimerInterval);
        pageTimerInterval = null;
    }

    restoreBrainrotFrames();
    restoreBackgroundImages();

    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }

    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }

    if (cursedAudio) {
        cursedAudio.pause();
        cursedAudio = null;
    }
}

function isVisibleRect(rect) {
    if (!rect) return false;
    if (rect.width < 28 || rect.height < 28) return false;
    if (rect.bottom <= 0 || rect.right <= 0) return false;
    if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) return false;
    return true;
}

function rectArea(rect) {
    return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function rectsAreClose(a, b) {
    if (!a || !b) return false;
    const aArea = rectArea(a);
    const bArea = rectArea(b);
    if (!aArea || !bArea) return false;
    const ratio = Math.max(aArea, bArea) / Math.min(aArea, bArea);
    return ratio <= 1.7;
}

function prepareFrame(frame) {
    if (!frame || frame.dataset.brainrotFrameApplied === "1") return;

    const computed = getComputedStyle(frame);
    frame.dataset.brainrotOriginalPosition = frame.style.position || "";
    frame.dataset.brainrotOriginalOverflow = frame.style.overflow || "";
    frame.dataset.brainrotOriginalIsolation = frame.style.isolation || "";

    if (computed.position === "static") {
        frame.style.position = "relative";
    }

    frame.style.overflow = "hidden";
    frame.style.isolation = "isolate";
    frame.dataset.brainrotFrameApplied = "1";
}

function restoreBrainrotFrames() {
    document.querySelectorAll('[data-brainrot-frame-applied="1"]').forEach((frame) => {
        frame.style.position = frame.dataset.brainrotOriginalPosition || "";
        frame.style.overflow = frame.dataset.brainrotOriginalOverflow || "";
        frame.style.isolation = frame.dataset.brainrotOriginalIsolation || "";

        delete frame.dataset.brainrotFrameApplied;
        delete frame.dataset.brainrotOriginalPosition;
        delete frame.dataset.brainrotOriginalOverflow;
        delete frame.dataset.brainrotOriginalIsolation;
    });
}

function makeCoverOverlay(className) {
    const overlay = document.createElement("div");
    overlay.className = className;
    overlay.dataset.brainrotProtected = "1";
    overlay.dataset.session = activeSessionId;
    overlay.dataset.file = activeBrainrotFile;
    overlay.style.backgroundImage = `url("${activeBrainrotUrl}")`;
    return overlay;
}

function updateCoverOverlay(overlay) {
    if (!overlay) return;

    // Do not update repeatedly in the same session. Resetting backgroundImage
    // restarts the GIF and makes it look like a still/choppy image.
    if (
        overlay.dataset.session === activeSessionId &&
        overlay.dataset.file === activeBrainrotFile
    ) {
        return;
    }

    overlay.dataset.session = activeSessionId;
    overlay.dataset.file = activeBrainrotFile;
    overlay.style.backgroundImage = `url("${activeBrainrotUrl}")`;
}

function getBestVideoRect(video) {
    const videoRect = video.getBoundingClientRect();
    if (!isVisibleRect(videoRect) || videoRect.width < 120 || videoRect.height < 90) return null;

    const container = video.closest(`
        ytd-reel-video-renderer,
        ytd-shorts,
        ytd-watch-flexy,
        #shorts-player,
        #player-container,
        #movie_player,
        .html5-video-player,
        [data-e2e="reel-item"],
        article,
        [class*="VideoContainer"],
        [class*="video-container"]
    `);

    if (!container) return videoRect;

    const containerRect = container.getBoundingClientRect();
    if (!isVisibleRect(containerRect)) return videoRect;

    // Use the container for Shorts-style vertical videos; use the actual video
    // rectangle for normal YouTube pages so it does not cover the whole screen.
    if (rectsAreClose(videoRect, containerRect)) return containerRect;
    return videoRect;
}

function getVideoId(video) {
    if (!videoIds.has(video)) {
        videoIdCounter += 1;
        videoIds.set(video, `brainrot-video-${videoIdCounter}`);
    }
    return videoIds.get(video);
}

function coverVisibleVideosWithGif() {
    const activeOverlayIds = new Set();
    const videos = Array.from(document.querySelectorAll("video"));

    videos.forEach((video) => {
        const rect = getBestVideoRect(video);
        if (!rect) return;

        video.muted = true;
        video.volume = 0;

        const id = getVideoId(video);
        activeOverlayIds.add(id);

        let overlay = document.getElementById(id);

        if (!overlay) {
            overlay = makeCoverOverlay("brainrot-video-cover");
            overlay.id = id;
            document.body.appendChild(overlay);
        } else {
            updateCoverOverlay(overlay);
        }

        overlay.style.top = `${Math.max(0, rect.top)}px`;
        overlay.style.left = `${Math.max(0, rect.left)}px`;
        overlay.style.width = `${Math.min(rect.width, window.innerWidth)}px`;
        overlay.style.height = `${Math.min(rect.height, window.innerHeight)}px`;
    });

    document.querySelectorAll(".brainrot-video-cover").forEach((overlay) => {
        if (!activeOverlayIds.has(overlay.id)) overlay.remove();
    });
}

function getImageKind(img) {
    if (!img || img.dataset.brainrotProtected === "1") return null;

    const rect = img.getBoundingClientRect();
    if (!isVisibleRect(rect)) return null;

    const width = rect.width;
    const height = rect.height;
    const area = width * height;

    if (width < 28 || height < 28) return null;

    const text = `${img.className || ""} ${img.alt || ""} ${img.getAttribute("aria-label") || ""} ${img.id || ""} ${img.currentSrc || img.src || ""}`.toLowerCase();

    const looksLikeAvatar =
        /avatar|profile|channel|user|creator|author|pfp/.test(text) ||
        (width <= 150 && height <= 150 && Math.abs(width - height) <= 45);

    const looksLikeThumbnail =
        /thumb|thumbnail|preview|poster|video|reel|short|story|cover|feed/.test(text) ||
        area >= 10000;

    if (looksLikeThumbnail && area >= 10000) return "thumbnail";
    if (looksLikeAvatar) return "avatar";
    if (looksLikeThumbnail) return "thumbnail";

    return null;
}

function findThumbnailFrame(img) {
    const imgRect = img.getBoundingClientRect();

    const selectors = [
        "ytd-thumbnail",
        "a#thumbnail",
        "yt-thumbnail-view-model",
        ".yt-thumbnail-view-model",
        "[class*='thumbnail']",
        "[class*='Thumbnail']",
        "[data-e2e*='thumbnail']",
        "a[href*='/watch']",
        "a[href*='/shorts']"
    ];

    for (const selector of selectors) {
        const frame = img.closest(selector);
        if (!frame || frame === document.body || frame === document.documentElement) continue;

        const frameRect = frame.getBoundingClientRect();
        if (!isVisibleRect(frameRect)) continue;
        if (frameRect.width < 80 || frameRect.height < 60) continue;

        // Avoid choosing a giant anchor/card that also contains the title.
        if (rectArea(frameRect) <= rectArea(imgRect) * 2.2) return frame;
    }

    // Use the nearest parent whose rectangle is close to the image rectangle.
    let parent = img.parentElement;
    for (let i = 0; parent && i < 4; i += 1, parent = parent.parentElement) {
        const parentRect = parent.getBoundingClientRect();
        if (isVisibleRect(parentRect) && rectsAreClose(parentRect, imgRect)) {
            return parent;
        }
    }

    return null;
}

function findAvatarFrame(img) {
    const imgRect = img.getBoundingClientRect();
    let parent = img.parentElement;

    for (let i = 0; parent && i < 3; i += 1, parent = parent.parentElement) {
        const parentRect = parent.getBoundingClientRect();
        if (isVisibleRect(parentRect) && rectsAreClose(parentRect, imgRect)) {
            return parent;
        }
    }

    return img.parentElement || null;
}

function coverFrame(frame, coverClass) {
    if (!frame || frame.dataset.brainrotProtected === "1") return;

    prepareFrame(frame);

    let overlay = frame.querySelector(":scope > .brainrot-thumb-cover");
    if (!overlay) {
        overlay = makeCoverOverlay(coverClass);
        frame.appendChild(overlay);
    } else {
        updateCoverOverlay(overlay);
    }
}

function replaceImage(img) {
    const kind = getImageKind(img);
    if (!kind) return;

    if (kind === "thumbnail") {
        coverFrame(findThumbnailFrame(img), "brainrot-thumb-cover");
    } else if (kind === "avatar") {
        coverFrame(findAvatarFrame(img), "brainrot-thumb-cover brainrot-avatar-cover");
    }
}

function replaceBackgroundImage(el) {
    if (!el || el.dataset.brainrotProtected === "1") return;

    const rect = el.getBoundingClientRect();
    if (!isVisibleRect(rect)) return;

    const style = getComputedStyle(el);
    if (!style.backgroundImage || style.backgroundImage === "none") return;

    const width = rect.width;
    const height = rect.height;
    const area = width * height;
    const text = `${el.className || ""} ${el.getAttribute("aria-label") || ""} ${el.id || ""}`.toLowerCase();

    const looksLikeAvatar =
        /avatar|profile|channel|user|creator|author|pfp/.test(text) ||
        (width <= 150 && height <= 150 && Math.abs(width - height) <= 45);

    const looksLikeThumbnail =
        /thumb|thumbnail|preview|poster|video|reel|short|story|cover|feed/.test(text) ||
        area >= 10000;

    if (!looksLikeAvatar && !looksLikeThumbnail) return;

    if (
        el.dataset.brainrotBackgroundApplied === "1" &&
        el.dataset.brainrotSession === activeSessionId &&
        el.dataset.brainrotFile === activeBrainrotFile
    ) {
        return;
    }

    if (!el.dataset.brainrotOriginalInlineStyle) {
        el.dataset.brainrotOriginalInlineStyle = el.getAttribute("style") || "";
    }

    el.dataset.brainrotBackgroundApplied = "1";
    el.dataset.brainrotSession = activeSessionId;
    el.dataset.brainrotFile = activeBrainrotFile;
    el.style.backgroundImage = `url("${activeBrainrotUrl}")`;
    el.style.backgroundSize = "contain";
    el.style.backgroundPosition = "center center";
    el.style.backgroundRepeat = "no-repeat";
}

function restoreBackgroundImages() {
    document.querySelectorAll('[data-brainrot-background-applied="1"]').forEach((el) => {
        const originalStyle = el.dataset.brainrotOriginalInlineStyle || "";
        if (originalStyle) el.setAttribute("style", originalStyle);
        else el.removeAttribute("style");

        delete el.dataset.brainrotBackgroundApplied;
        delete el.dataset.brainrotSession;
        delete el.dataset.brainrotFile;
    });
}

function coverThumbnailsAndProfiles() {
    document.querySelectorAll("img").forEach(replaceImage);

    document.querySelectorAll(`
        [role="img"],
        [class*="avatar"],
        [class*="Avatar"],
        [class*="profile"],
        [class*="Profile"],
        [class*="channel"],
        [class*="Channel"],
        [class*="thumb"],
        [class*="Thumb"],
        [class*="thumbnail"],
        [class*="Thumbnail"],
        [class*="preview"],
        [class*="Preview"],
        [class*="story"],
        [class*="Story"],
        [class*="reel"],
        [class*="Reel"],
        [class*="short"],
        [class*="Short"]
    `).forEach(replaceBackgroundImage);
}

function scheduleOverlayUpdate() {
    if (updateQueued) return;

    updateQueued = true;
    requestAnimationFrame(() => {
        updateQueued = false;
        chrome.storage.local.get(["brainrotEnabled", "expiry"], (data) => {
            if (data.brainrotEnabled && Date.now() < data.expiry) {
                refreshAllBrainrot();
                showLockinTimer();
            }
        });
    });
}

function startEfficientWatcher() {
    if (!updateInterval) {
        let ticks = 0;
        updateInterval = setInterval(() => {
            ticks += 1;
            scheduleOverlayUpdate();

            if (ticks === 8) {
                clearInterval(updateInterval);
                updateInterval = setInterval(scheduleOverlayUpdate, 1200);
            }
        }, 250);
    }

    if (!mutationObserver) {
        mutationObserver = new MutationObserver(scheduleOverlayUpdate);
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (!resizeListenersAdded) {
        resizeListenersAdded = true;
        window.addEventListener("resize", scheduleOverlayUpdate, { passive: true });
        window.addEventListener("scroll", scheduleOverlayUpdate, { passive: true, capture: true });
    }
}

function replacePageAudio() {
    // Replace site audio by muting every native media element, including
    // YouTube videos, Shorts, TikTok reels, Instagram reels, ads, and previews.
    document.querySelectorAll("video, audio").forEach((media) => {
        try {
            media.muted = true;
            media.volume = 0;
        } catch (error) {
            // Some site-controlled media objects may reject direct changes.
        }
    });
}

function makeLoopingBrainrotAudio(src) {
    const audio = new Audio(src);
    audio.volume = 1.0;
    audio.loop = true;
    audio.preload = "auto";
    return audio;
}

function tryPlayBrainrotAudio() {
    if (!cursedAudio) cursedAudio = makeLoopingBrainrotAudio(SKIBIDI_AUDIO);

    cursedAudio.play().catch(() => {
        // If the skibidi-toilet-song.mp3 file is missing, fall back to cursed.mp3.
        cursedAudio = makeLoopingBrainrotAudio(FALLBACK_AUDIO);
        cursedAudio.play().catch(() => {});
    });
}

function playCursedSound() {
    if (cursedAudio) return;

    cursedAudio = makeLoopingBrainrotAudio(SKIBIDI_AUDIO);
    cursedAudio.addEventListener("error", () => {
        cursedAudio = makeLoopingBrainrotAudio(FALLBACK_AUDIO);
        cursedAudio.play().catch(() => {});
    }, { once: true });

    cursedAudio.play().catch(() => {
        console.log("🔊 Audio blocked. Waiting for user interaction...");

        const startOnInteraction = () => {
            tryPlayBrainrotAudio();
            document.removeEventListener("click", startOnInteraction);
            document.removeEventListener("keydown", startOnInteraction);
            document.removeEventListener("pointerdown", startOnInteraction);
        };

        document.addEventListener("click", startOnInteraction);
        document.addEventListener("keydown", startOnInteraction);
        document.addEventListener("pointerdown", startOnInteraction);
    });
}

})();
