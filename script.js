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


// --- Chat feature (temporary local only, no Supabase yet) ---
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (text === '') return;
  
  const msg = document.createElement('div');
  msg.textContent = `🗣️ ${text}`;
  chatMessages.appendChild(msg);
  chatInput.value = '';
  
  // auto scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

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
