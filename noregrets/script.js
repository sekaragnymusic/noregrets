// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://pkmhufszddbjmnpuerzl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbWh1ZnN6ZGRiam1ucHVlcnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODU5NzEsImV4cCI6MjA3NTg2MTk3MX0.is54Vuker0jWDvarqdIhDa_PNYb_1QjSps-pUtht4qo';

// Create a Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Connected to Supabase");

// --- LOAD + DISPLAY MESSAGES ---
const chatMessages = document.getElementById("chatMessages");

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("name, text, is_artist, created_at")
    .order("created_at", { ascending: true });

  if (error) return console.error("❌ Load error:", error.message);
  renderMessages(data);
}

function renderMessages(data) {
  chatMessages.innerHTML = "";
  data.forEach((msg) => {
    const div = document.createElement("div");
    const time = new Date(msg.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.innerHTML = `<span class="msg-time">[${time}]</span>
      <span class="msg-name ${msg.is_artist ? "artist" : ""}">${msg.name}:</span>
      <span class="msg-text">${msg.text}</span>`;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

  const { error } = await supabase
    .from("messages")
    .insert([{ name, text, is_artist }]);

  if (error) {
    console.error("❌ Error sending message:", error.message);
    return;
  }

  console.log("✅ Message sent:", text);
  chatInput.value = ""; // clear input after send
}

// === Immediately show message locally (prevents undefined flash) ===
  const tempMessage = {
    name,
    text,
    is_artist,
    created_at: new Date().toISOString(),
  };
  appendTempMessage(tempMessage);
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
loadMessages();
supabase
  .channel("public:messages")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
    renderMessages([...chatMessages.children].map(c => c.dataset), [payload.new]);
    loadMessages(); // simplest refresh
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
    statusText.textContent = "Agny is not here, but you can talk to each other!";
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



