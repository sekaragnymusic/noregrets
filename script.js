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

// Manual toggle for now
const statusIndicator = document.getElementById('statusIndicator');
let online = true;

function toggleStatus() {
  const dot = statusIndicator.querySelector('.dot');
  const text = statusIndicator.querySelector('.status-text');
  if (online) {
    dot.classList.remove('online');
    dot.classList.add('offline');
    text.textContent = 'Agny is not here, but you can talk to each other!';
  } else {
    dot.classList.remove('offline');
    dot.classList.add('online');
    text.textContent = 'Agny is here! Hello!';
  }
  online = !online;
}

// Example: toggle every 5 seconds (you can delete this later)
setInterval(toggleStatus, 5000);



