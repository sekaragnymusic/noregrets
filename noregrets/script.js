// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://pkmhufszddbjmnpuerzl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbWh1ZnN6ZGRiam1ucHVlcnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODU5NzEsImV4cCI6MjA3NTg2MTk3MX0.is54Vuker0jWDvarqdIhDa_PNYb_1QjSps-pUtht4qo';

// Create a Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Connected to Supabase");

// --- LOAD + DISPLAY MESSAGES ---
const chatMessages = document.getElementById("chatMessages");

// --- LOAD + DISPLAY MESSAGES (maximum 300) ---
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("name, text, is_artist, created_at")
    .order("created_at", { ascending: true })
    .limit(300); // show only the latest 300 messages

  if (error) return console.error("❌ Load error:", error.message);
  renderMessages(data);
}


function renderMessages(data) {
  const shouldScroll =
    chatMessages.scrollTop + chatMessages.clientHeight >=
    chatMessages.scrollHeight - 50; // detect if user is near bottom

  chatMessages.innerHTML = "";
  data.forEach((msg) => {
    const div = document.createElement("div");
    const time = new Date(msg.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.innerHTML = `
      <span class="msg-time">[${time}]</span>
      <span class="msg-name ${msg.is_artist ? "artist" : ""}">${msg.name}:</span>
      <span class="msg-text">${msg.text}</span>
    `;
    chatMessages.appendChild(div);
  });

  // --- Smooth autoscroll only if user was already near bottom ---
  if (shouldScroll) {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth",
    });
  }
}

// --- SEND MESSAGE TO SUPABASE ---
const nameInput = document.getElementById("nameInput");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // --- Assign persistent random emoji for anonymous users ---
  let savedEmoji = sessionStorage.getItem("chatEmoji");

  if (!savedEmoji) {
    const emojiList = ["😺", "🐸", "🐻", "🐰", "🐼", "🦊", "🐨", "🐢", "🦋", "🐧", "🐙", "🐝", "🐞", "🌸", "⭐"];
    savedEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    sessionStorage.setItem("chatEmoji", savedEmoji);
  }

  // use typed name or persistent emoji
  const name = nameInput.value.trim() || savedEmoji;
  const is_artist = IS_ARTIST_MODE || false; // if secret link, mark as artist

  // === Immediately show message locally (prevents undefined flash) ===
  const tempMessage = {
    name,
    text,
    is_artist,
    created_at: new Date().toISOString(),
  };

  // === Send message to Supabase ===
  const { error } = await supabase
    .from("messages")
    .insert([{ name, text, is_artist }]);

  if (error) {
    console.error("❌ Error sending message:", error.message);
  } else {
    console.log("✅ Message sent:", text);
  }

  chatInput.value = ""; // clear input after send
}

// --- TEMPORARY LOCAL MESSAGE RENDER ---
function appendTempMessage(msg) {
  const div = document.createElement("div");
  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <span class="msg-time">[${time}]</span>
    <span class="msg-name ${msg.is_artist ? "artist" : ""}">${msg.name}:</span>
    <span class="msg-text">${msg.text}</span>
  `;

  const chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


// --- 👂 INITIAL LOAD + REALTIME LISTENER ---
loadMessages();sendMessage
supabase
  .channel("public:messages")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
    const msgTime = new Date(payload.new.created_at);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (msgTime >= cutoff) appendTempMessage(payload.new); // only append if fresh
  })
  .subscribe();


// --- Reliable CD rotation driven by audio events ---
const audio = document.getElementById("audioPlayer");
const cdArt = document.getElementById("cdArt");

let angle = 0;
let rotating = false;
let animationId = null;

function rotateFrame() {
  if (!rotating) return;
  angle = (angle + 0.3) % 360;
  cdArt.style.transform = `rotate(${angle}deg)`;
  animationId = requestAnimationFrame(rotateFrame);
}

function startRotation() {
  if (!rotating) {
    rotating = true;
    cancelAnimationFrame(animationId); // clear any leftover loop
    animationId = requestAnimationFrame(rotateFrame);
  }
}

function stopRotation() {
  rotating = false;
  cancelAnimationFrame(animationId);
}

// Link rotation to audio events
audio.addEventListener("play", startRotation);
audio.addEventListener("pause", stopRotation);
audio.addEventListener("ended", stopRotation);

// --- ARTIST ONLINE STATUS (Auto Mode via URL) ---
const urlParams = new URLSearchParams(window.location.search);
const IS_ARTIST_MODE = urlParams.get("eggny") === "54";

async function setOnlineStatus(isOnline) {
  if (!IS_ARTIST_MODE) return; // skip for public users

  const { error } = await supabase
    .from("status")
    .update({ online: isOnline })
    .eq("id", 1);

  if (error) console.error("⚠️ Error updating status:", error.message);
  else console.log(`👤 Artist is now ${isOnline ? "ONLINE" : "OFFLINE"}`);
}

// --- HEARTBEAT: Keep artist online status alive ---
let heartbeatInterval;

if (IS_ARTIST_MODE) {
  const HEARTBEAT_INTERVAL = 15000; // 15 seconds
  const TIMEOUT_DURATION = 30000;   // 30 seconds of no ping = offline

  async function sendHeartbeat() {
    const { error } = await supabase
      .from("status")
      .update({
        online: true,
        updated_at: new Date().toISOString(), // optional extra column if you have it
      })
      .eq("id", 1);

    if (error) console.error("⚠️ Heartbeat failed:", error.message);
    else console.log("💓 Heartbeat sent at", new Date().toLocaleTimeString());
  }

  // Start heartbeat loop when page loads
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Stop heartbeat when leaving page
  window.addEventListener("beforeunload", () => {
    clearInterval(heartbeatInterval);

    const url = `${SUPABASE_URL}/rest/v1/status?id=eq.1`;
    const payload = JSON.stringify([{ online: false }]);
    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=minimal"
    };

    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    fetch(url, { method: "PATCH", headers, body: payload, keepalive: true });
  });
}

if (IS_ARTIST_MODE) {
  console.log("🎤 Artist mode active");
  setOnlineStatus(true);

  window.addEventListener("beforeunload", () => {
    const url = `${SUPABASE_URL}/rest/v1/status?id=eq.1`;
    const payload = JSON.stringify([{ online: false }]);
    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=minimal"
    };

    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    fetch(url, { method: "PATCH", headers, body: payload, keepalive: true });
  });
} else {
  console.log("🎧 Listener mode active");
}



// --- REALTIME ARTIST STATUS INDICATOR ---
const statusDot = document.querySelector(".status-indicator .dot");
const statusText = document.querySelector(".status-indicator .status-text");

// Function to update the indicator visually
function updateArtistStatus(isOnline) {
  if (isOnline) {
    statusDot.classList.remove("offline");
    statusDot.classList.add("online");
    statusText.textContent = "Agny is here! Hello!";
  } else {
    statusDot.classList.remove("online");
    statusDot.classList.add("offline");
    statusText.textContent = "Agny is not here, but you can talk to each other :)";
  }
}

// Load the current status when page opens
async function loadArtistStatus() {
  const { data, error } = await supabase
    .from("status")
    .select("online")
    .eq("id", 1)
    .single();

  if (!error && data) updateArtistStatus(data.online);
}

loadArtistStatus();

// Listen for changes in real time
supabase
  .channel("public:status")
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "status" }, (payload) => {
    updateArtistStatus(payload.new.online);
  })
  .subscribe();

// --- SHARE BUTTON FEATURE ---
const shareBtn = document.getElementById("shareBtn");

if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const shareUrl = window.location.href;
    const shareText = "Listen to 'No Regrets' by Agny 🎧";

    // Native mobile share first
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text: shareText, url: shareUrl });
        console.log("✅ Shared via native share sheet");
        return;
      } catch (err) {
        console.warn("Share cancelled or failed:", err);
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);

      // temporary popup message
      const msg = document.createElement("div");
      msg.textContent = "Link copied! Thank you for sharing 💙";
      msg.style.position = "fixed";
      msg.style.bottom = "20px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.background = "#333";
      msg.style.color = "#fff";
      msg.style.padding = "8px 14px";
      msg.style.borderRadius = "8px";
      msg.style.fontSize = "0.9rem";
      msg.style.zIndex = "9999";
      msg.style.opacity = "0";
      msg.style.transition = "opacity 0.3s ease";

      document.body.appendChild(msg);
      requestAnimationFrame(() => (msg.style.opacity = "1"));

      setTimeout(() => {
        msg.style.opacity = "0";
        setTimeout(() => msg.remove(), 300);
      }, 2000);

      console.log("✅ Link copied to clipboard");
    } catch (err) {
      console.error("❌ Failed to copy link:", err);
      alert("Couldn't copy link. Try manually!");
    }
  });
}


// --- Minimal custom player logic (play/pause, progress, loop) ---
(function () {
  const audio = document.getElementById("audioPlayer");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");
  const progressFill = document.getElementById("progressFill");
  const progressBar = document.getElementById("progressBar");
  const progressWrap = document.getElementById("progressWrap");
  const loopBtn = document.getElementById("loopBtn");

  let isSeeking = false;

  function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // update progress UI
  audio.addEventListener("timeupdate", () => {
    if (!isSeeking && audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = pct + "%";
    }
  });

  // show duration when metadata loads
  audio.addEventListener("loadedmetadata", () => {
    // optional: show duration elsewhere if you want
  });

  // update play/pause icons when state changes
  function updatePlayUI(isPlaying) {
    if (isPlaying) {
      playIcon.classList.add("hidden");
      pauseIcon.classList.remove("hidden");
      if (typeof startRotation === "function") startRotation();
    } else {
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
      if (typeof stopRotation === "function") stopRotation();
    }
  }

  // play/pause toggle (user-initiated)
  playPauseBtn.addEventListener("click", async () => {
    try {
      if (audio.paused) {
        await audio.play();
        updatePlayUI(true);
      } else {
        audio.pause();
        updatePlayUI(false);
      }
    } catch (err) {
      console.warn("Playback prevented:", err);
    }
  });

  // sync UI to audio events (covers external play/pause)
  audio.addEventListener("play", () => updatePlayUI(true));
  audio.addEventListener("pause", () => updatePlayUI(false));
  audio.addEventListener("ended", () => updatePlayUI(false));

  // seek helpers (pointer friendly)
  function pctFromEvent(e) {
    const rect = progressBar.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const x = clientX - rect.left;
    return Math.min(1, Math.max(0, x / rect.width));
  }

  progressWrap.addEventListener("pointerdown", (e) => {
    isSeeking = true;
    progressWrap.setPointerCapture(e.pointerId);
    const pct = pctFromEvent(e);
    progressFill.style.width = pct * 100 + "%";
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  progressWrap.addEventListener("pointermove", (e) => {
    if (!isSeeking) return;
    const pct = pctFromEvent(e);
    progressFill.style.width = pct * 100 + "%";
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  progressWrap.addEventListener("pointerup", (e) => {
    isSeeking = false;
    try { progressWrap.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  // touch fallback
  progressWrap.addEventListener("touchstart", (e) => {
    isSeeking = true;
    const pct = pctFromEvent(e);
    progressFill.style.width = pct * 100 + "%";
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });
  progressWrap.addEventListener("touchmove", (e) => {
    if (!isSeeking) return;
    const pct = pctFromEvent(e);
    progressFill.style.width = pct * 100 + "%";
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });
  progressWrap.addEventListener("touchend", () => (isSeeking = false));

  // loop toggle
  loopBtn.addEventListener("click", () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle("active", audio.loop);
    loopBtn.setAttribute("aria-pressed", String(audio.loop));
  });

  // keyboard: space toggles play (unless typing)
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      playPauseBtn.click();
    }
  });
})();

// assumes these IDs exist
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
const progressKnob = document.getElementById('progressKnob');
const progressWrap = document.getElementById('progressWrap');
const audioEl = document.getElementById('audioPlayer');

// call this when timeupdate or when you set progressFill
function updateKnobPosition() {
  if (!audioEl.duration || isNaN(audioEl.duration)) return;
  const pct = (audioEl.currentTime / audioEl.duration) * 100 || 0;
  progressFill.style.width = pct + '%';
  // clamp left between 0% and 100%
  progressKnob.style.left = Math.min(100, Math.max(0, pct)) + '%';
}

// wire into your existing timeupdate
audioEl.addEventListener('timeupdate', updateKnobPosition);

// Seeking: pointer-based on track or knob
let seeking = false;

function pctFromEventOnTrack(e) {
  const rect = progressTrack.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;
  return Math.min(1, Math.max(0, x / rect.width));
}

// --- CLICK TO SEEK ---
progressTrack.addEventListener("pointerdown", (e) => {
  seeking = true;
  const pct = pctFromEventOnTrack(e);
  audioEl.currentTime = pct * audioEl.duration;
  updateKnobPosition();
  progressTrack.setPointerCapture(e.pointerId);
});

progressTrack.addEventListener("pointermove", (e) => {
  // only seek while mouse is pressed
  if (!seeking) return;
  const pct = pctFromEventOnTrack(e);
  audioEl.currentTime = pct * audioEl.duration;
  updateKnobPosition();
});

progressTrack.addEventListener("pointerup", (e) => {
  seeking = false;
  try {
    progressTrack.releasePointerCapture(e.pointerId);
  } catch (err) {}
});

progressTrack.addEventListener("pointerleave", () => {
  // stop seeking if cursor leaves the area
  seeking = false;
});

// --- TOUCH SUPPORT ---
progressTrack.addEventListener("touchstart", (e) => {
  seeking = true;
  const pct = pctFromEventOnTrack(e);
  audioEl.currentTime = pct * audioEl.duration;
  updateKnobPosition();
});
progressTrack.addEventListener("touchmove", (e) => {
  if (!seeking) return;
  const pct = pctFromEventOnTrack(e);
  audioEl.currentTime = pct * audioEl.duration;
  updateKnobPosition();
});
progressTrack.addEventListener("touchend", () => (seeking = false));

// only show for listeners, not artist
if (!IS_ARTIST_MODE) {
  const now = new Date();

} 

