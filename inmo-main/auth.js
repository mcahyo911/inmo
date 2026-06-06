// ==========================================
// 1. INISIALISASI FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// !!! PENTING: Ganti kode di bawah ini dengan config Firebase Anda sendiri !!!
const firebaseConfig = {
  apiKey: "AIzaSyCG2xohq42KWpzU6WrEEIlr9zGyjF7K5Bg",
  authDomain: "inventorysembako.firebaseapp.com",
  projectId: "inventorysembako",
  storageBucket: "inventorysembako.firebasestorage.app",
  messagingSenderId: "706241778773",
  appId: "1:706241778773:web:5237829e3aa38d3f09b0dc",
  measurementId: "G-3QG3080H7L"

};



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. FUNGSI NOTIFIKASI & SUARA (KHUSUS AUTH)
// ==========================================
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if(type === 'success') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  } catch(e){}
}

function showNotification(msg, type = 'success') {
  playSound(type);
  const container = document.getElementById('notif-container');
  if(!container) return alert(msg);
  const toast = document.createElement('div');
  toast.className = `toast-notif ${type}`;
  let icon = type === 'success' ? '<span style="font-size:20px;">✅</span>' : type === 'warning' ? '<span style="font-size:20px;">⚠️</span>' : '<span style="font-size:20px;">🚨</span>';
  toast.innerHTML = `<div style="display:flex;align-items:center;gap:12px">${icon} <span>${msg}</span></div> <span style="cursor:pointer;opacity:0.5;font-size:20px;line-height:1;" onclick="this.parentElement.remove()">✕</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ==========================================
// 3. LOGIKA OTENTIKASI
// ==========================================

// --- FUNGSI LOGIN ---
const btnLogin = document.getElementById('btn-do-login');
if(btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    
    btnLogin.textContent = "Memverifikasi..."; // Efek loading
    
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      let match = null;
      querySnapshot.forEach((doc) => {
        if(doc.data().password === pass) match = { id: doc.id, ...doc.data() };
      });

      if(match) {
        // Simpan sesi login ke memori browser sementara
        localStorage.setItem('inmo_current_user', JSON.stringify(match));
        showNotification(`Otorisasi Diterima. Selamat datang, ${match.name}!`, 'success');
        // Pindah ke halaman dashboard
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      } else { 
        showNotification("Kredensial tidak valid di dalam sistem.", "danger"); 
        btnLogin.textContent = "Otorisasi Masuk";
      }
    } catch(e) {
      showNotification("Gagal terhubung ke Cloud Database.", "danger");
      btnLogin.textContent = "Otorisasi Masuk";
    }
  });
}

// --- FUNGSI REGISTRASI ---
const btnRegister = document.getElementById('btn-do-register');
if(btnRegister) {
  btnRegister.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value;
    
    if(!name || !email || !pass) return showNotification("Semua parameter identitas wajib diisi!", "warning");
    if(pass.length < 6) return showNotification("Keamanan lemah: Sandi minimal 6 karakter.", "warning");
    
    btnRegister.textContent = "Mendaftarkan...";

    try {
      // Cek apakah email sudah dipakai
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if(!querySnapshot.empty) {
        btnRegister.textContent = "Simpan Identitas";
        return showNotification("Alamat surel telah terdaftar!", "danger");
      }
      
      // Simpan ke Firebase
      await setDoc(doc(collection(db, "users")), { name, email, password: pass, avatar: null });
      showNotification("Registrasi tersimpan di Cloud! Mengalihkan ke Login...", "success");
      
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch(e) {
      showNotification("Koneksi ke Firebase gagal.", "danger");
      btnRegister.textContent = "Simpan Identitas";
    }
  });
}

// --- FUNGSI LUPA KATA SANDI ---
const btnForgot = document.getElementById('btn-do-forgot');
if(btnForgot) {
  btnForgot.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value.trim();
    const newPass = document.getElementById('forgot-newpass').value;
    
    if(!email || !newPass) return showNotification("Wajib diisi parameter email dan sandi baru!", "warning");
    if(newPass.length < 6) return showNotification("Keamanan lemah: Sandi minimal 6 karakter.", "warning");
    
    btnForgot.textContent = "Memperbarui...";

    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        let userId = "";
        querySnapshot.forEach((d) => { userId = d.id; });
        await updateDoc(doc(db, "users", userId), { password: newPass });
        showNotification("Kata sandi berhasil diperbarui! Silakan login kembali.", "success");
        setTimeout(() => {
          document.getElementById('card-forgot').style.display='none'; 
          document.getElementById('card-login').style.display='block';
          btnForgot.textContent = "Simpan Kata Sandi Baru";
        }, 1500);
      } else { 
        showNotification("Alamat surel tidak ditemukan di pangkalan data.", "danger"); 
        btnForgot.textContent = "Simpan Kata Sandi Baru";
      }
    } catch(e) {
      showNotification("Gagal menghubungi server.", "danger");
      btnForgot.textContent = "Simpan Kata Sandi Baru";
    }
  });
}

// Cek Inisialisasi Admin Bawaan (Jika Cloud masih kosong)
async function initAdmin() {
  try {
    const userSnap = await getDocs(collection(db, "users"));
    if(userSnap.empty) {
      await setDoc(doc(collection(db, "users")), { email: 'admin@inmo.com', password: 'admin123', name: 'Administrator Utama', avatar: null });
    }
  } catch(e) {}
}
// Jalankan pengecekan saat file dimuat
initAdmin();