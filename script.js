// --- Basic audio player control (CD rotation pauses when music stops) ---
const audio = document.getElementById('audioPlayer');
const cdArt = document.querySelector('.cd-art');

audio.addEventListener('play', () => {
  cdArt.style.animationPlayState = 'running';
});
audio.addEventListener('pause', () => {
  cdArt.style.animationPlayState = 'paused';
});

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