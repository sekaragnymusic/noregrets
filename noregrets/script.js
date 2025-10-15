// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://pkmhufszddbjmnpuerzl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbWh1ZnN6ZGRiam1ucHVlcnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODU5NzEsImV4cCI6MjA3NTg2MTk3MX0.is54Vuker0jWDvarqdIhDa_PNYb_1QjSps-pUtht4qo';

// Create a Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Connected to Supabase");

// --- LOAD & DISPLAY CHAT MESSAGES ---

const chatMessages = document.getElementById("chatMessages");

// Function to render one message
function renderMessage(msg) {
  const p = document.createElement("p");
  p.textContent = msg.text;
  chatMessages.appendChild(p);
}

// Fetch all existing messages once
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ Error loading messages:", error.message);
    return;
  }

  chatMessages.innerHTML = ""; // clear placeholder
  data.forEach(renderMessage);
}

loadMessages(); // call once when page loads

// --- Listen for new messages in real time ---
supabase
  .channel("public:messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      renderMessage(payload.new);
    }
  )
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


// --- SEND MESSAGE TO SUPABASE ---
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

sendBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) return;

  console.log("Attempting to insert:", { text });

  const { data, error } = await supabase
    .from("messages")
    .insert([{ name: "Anonymous", text }]);

  console.log("Response:", { data, error });

  if (error) {
    console.error("❌ Error sending message:", error.message);
    return;
  }

  console.log("✅ Message sent:", data);
  chatInput.value = ""; // clear input
});

// --- Share button ---
const shareBtn = document.getElementById('shareBtn');
shareBtn.addEventListener('click', () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  alert('Link copied! You can share it on Instagram or anywhere!');
});

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



