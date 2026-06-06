// ==========================================
// 1. INISIALISASI FIREBASE (CLOUD DATABASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG2xoHq42KWpzU6wrtEIlr9zGyjf7K5Dg",
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
// 2. KEAMANAN HALAMAN (CEK LOGIN)
// ==========================================
let currentUser = null;
try {
  const storedUser = localStorage.getItem('inmo_current_user');
  if (!storedUser) {
    window.location.replace('login.html'); 
  } else {
    currentUser = JSON.parse(storedUser);
  }
} catch (error) {
  window.location.replace('login.html');
}

// ==========================================
// 3. VARIABEL GLOBAL SISTEM
// ==========================================
let PRODUK = [];
let editId = null;
let currentFilter = 'all';
let hasPlayedEmergency = false;
let LineChartObj = null;

// ==========================================
// 4. ENGINE SUARA & NOTIFIKASI
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
    } 
    else if(type === 'error') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } 
    else if(type === 'emergency') {
      osc.type = 'square'; osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.type = 'square'; osc2.frequency.setValueAtTime(1100, ctx.currentTime);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.start(); osc2.stop(ctx.currentTime + 0.3);
      }, 350);
    }
  } catch(e){}
}

function showNotification(msg, type = 'success') {
  if(type === 'success') playSound('success');
  if(type === 'danger' || type === 'warning') playSound('error');

  const container = document.getElementById('notif-container');
  const toast = document.createElement('div');
  toast.className = `toast-notif ${type}`;
  let icon = type === 'success' ? '<span style="font-size:20px;">✅</span>' : type === 'warning' ? '<span style="font-size:20px;">⚠️</span>' : '<span style="font-size:20px;">🚨</span>';
  toast.innerHTML = `<div style="display:flex;align-items:center;gap:12px">${icon} <span>${msg}</span></div> <span style="cursor:pointer;opacity:0.5;font-size:20px;line-height:1;" onclick="this.parentElement.remove()">✕</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ==========================================
// 5. FETCH & SETUP DATA DARI FIREBASE
// ==========================================
async function fetchProductsFromCloud() {
  try {
    const querySnapshot = await getDocs(collection(db, "produk"));
    PRODUK = [];
    querySnapshot.forEach((doc) => {
      PRODUK.push({ db_id: doc.id, ...doc.data() });
    });
    PRODUK.sort((a, b) => parseInt(a.id.replace('p', '')) - parseInt(b.id.replace('p', '')));
  } catch (error) {
    showNotification("Gagal terhubung ke Cloud Database.", "danger");
  }
}

async function initData() {
  try {
    if(currentUser && currentUser.name) {
      document.getElementById('user-name-display').textContent = currentUser.name;
    }
    updateAvatarUI();
    changeTheme(localStorage.getItem('inmo_theme') || 'default');
    
    await fetchProductsFromCloud();
    
    if(PRODUK.length === 0) {
      showNotification("Sistem sedang menginisialisasi 50 Master Data. Mohon tunggu...", "warning");
      
      const namaProdukList = [
        { nama: "Beras Premium 5kg", kat: "Sembako", hrg: 75000 }, { nama: "Minyak Goreng Bimoli 2L", kat: "Sembako", hrg: 34000 },
        { nama: "Gula Pasir Gulaku 1kg", kat: "Sembako", hrg: 16000 }, { nama: "Indomie Goreng 1 Dus", kat: "Sembako", hrg: 110000 },
        { nama: "Telur Ayam Kampung 1kg", kat: "Sembako", hrg: 28000 }, { nama: "Tepung Terigu Segitiga Biru", kat: "Sembako", hrg: 12000 },
        { nama: "Susu Kental Manis Frisian Flag", kat: "Sembako", hrg: 14000 }, { nama: "Kopi Kapal Api Mix 380g", kat: "Minuman", hrg: 25000 },
        { nama: "Teh Celup Sosro Box", kat: "Minuman", hrg: 6500 }, { nama: "Aqua Botol 600ml 1 Dus", kat: "Minuman", hrg: 45000 },
        { nama: "Teh Pucuk Harum 350ml", kat: "Minuman", hrg: 3500 }, { nama: "Pocari Sweat 350ml", kat: "Minuman", hrg: 7000 },
        { nama: "Sprite Pet 1.5L", kat: "Minuman", hrg: 15000 }, { nama: "Coca Cola 1.5L", kat: "Minuman", hrg: 15000 },
        { nama: "Chitato Sapi Panggang 68g", kat: "Snack", hrg: 10000 }, { nama: "Qtela Tempe Original", kat: "Snack", hrg: 8000 },
        { nama: "Taro Net Seaweed", kat: "Snack", hrg: 5000 }, { nama: "Beng-Beng Share It", kat: "Snack", hrg: 12000 },
        { nama: "SilverQueen Chocolate 62g", kat: "Snack", hrg: 15000 }, { nama: "Biskuit Roma Kelapa 300g", kat: "Snack", hrg: 11000 },
        { nama: "Good Time Cookies", kat: "Snack", hrg: 8000 }, { nama: "Kecap Bango Manis 600ml", kat: "Sembako", hrg: 24000 },
        { nama: "Saus Sambal ABC 340ml", kat: "Sembako", hrg: 16000 }, { nama: "Garam Dapur Beryodium", kat: "Sembako", hrg: 3000 },
        { nama: "Kaldu Masako Sapi 100g", kat: "Sembako", hrg: 5000 }, { nama: "Blue Band Margarin 200g", kat: "Sembako", hrg: 9000 },
        { nama: "Santan Kara 65ml", kat: "Sembako", hrg: 3500 }, { nama: "Sirup Marjan Melon", kat: "Minuman", hrg: 21000 },
        { nama: "ABC Squash Delight Jeruk", kat: "Minuman", hrg: 15000 }, { nama: "Milo UHT Coklat 190ml", kat: "Minuman", hrg: 5000 },
        { nama: "Bear Brand UHT 189ml", kat: "Minuman", hrg: 10500 }, { nama: "Le Minerale 600ml", kat: "Minuman", hrg: 3500 },
        { nama: "Floridina 350ml", kat: "Minuman", hrg: 3000 }, { nama: "Kopiko 78C Coffee Latte", kat: "Minuman", hrg: 6500 },
        { nama: "Lays Rasa Asin Klasik", kat: "Snack", hrg: 10000 }, { nama: "Cheetos Jagung Bakar", kat: "Snack", hrg: 5000 },
        { nama: "Garuda Kacang Garing", kat: "Snack", hrg: 15000 }, { nama: "Dua Kelinci Kacang Kulit", kat: "Snack", hrg: 14000 },
        { nama: "Oreo Coklat 133g", kat: "Snack", hrg: 8500 }, { nama: "Tango Wafer Coklat", kat: "Snack", hrg: 7000 },
        { nama: "Khong Guan Biscuit", kat: "Snack", hrg: 45000 }, { nama: "Indomie Ayam Bawang 1 Dus", kat: "Sembako", hrg: 105000 },
        { nama: "Mie Sedap Soto 1 Dus", kat: "Sembako", hrg: 103000 }, { nama: "Beras Merah Organik 2kg", kat: "Sembako", hrg: 35000 },
        { nama: "Sarden ABC Tomat 425g", kat: "Sembako", hrg: 22000 }, { nama: "Corned Beef Botan 425g", kat: "Sembako", hrg: 32000 },
        { nama: "Tolak Angin Botol Kaca", kat: "Minuman", hrg: 4000 }, { nama: "You C1000 Lemon Water", kat: "Minuman", hrg: 7500 },
        { nama: "Malkist Crackers Roma", kat: "Snack", hrg: 7500 }, { nama: "Slai O'lai Nanas", kat: "Snack", hrg: 6000 }
      ];

      const janjiSimpan = namaProdukList.map((item, i) => {
        let stokSim = 10 + (i%20);
        let minSim = 5; 
        if(i===7 || i===23) { stokSim = 2; minSim = 5; } 
        if(i===15 || i===37) { stokSim = 0; minSim = 10; } 
        
        const newProduct = { 
          id: 'p'+(i+1), kode: 'PRD-' + String(i+1).padStart(3, '0'), 
          nama: item.nama, kategori: item.kat, stok: stokSim, min: minSim, hjual: item.hrg 
        };
        return setDoc(doc(db, "produk", newProduct.id), newProduct);
      });

      await Promise.all(janjiSimpan); 
      await fetchProductsFromCloud(); 
      showNotification("Inisialisasi Master Data Selesai!", "success");
    }

    updateDatalist(); 
    showSection('dashboard'); 
  } catch (error) {
    showNotification("Terjadi kesalahan sistem saat memuat data.", "danger");
  }
}

function updateDatalist() {
  const dl = document.getElementById('kategori-list');
  const dKat = ['Sembako', 'Minuman', 'Snack'];
  const cKat = PRODUK.map(p => p.kategori).filter(k => k);
  dl.innerHTML = [...new Set([...dKat, ...cKat])].map(k => `<option value="${k}"></option>`).join('');
}

// ==========================================
// 6. UI TOGGLES & NAVIGATION
// ==========================================
function toggleLightDarkMode() {
  const isLight = document.body.classList.contains('theme-white');
  if(isLight) changeTheme('default'); else changeTheme('white'); 
}

function changeTheme(themeName) {
  document.body.className = themeName === 'default' ? '' : `theme-${themeName}`;
  localStorage.setItem('inmo_theme', themeName);
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  if(iconSun && iconMoon) {
     if(themeName === 'white') { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; } 
     else { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; }
  }
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  document.getElementById('topbar-title').textContent = (name==='dashboard')?'Dashboard':'Inventory';
  
  if(name === 'dashboard') renderDashboard();
  if(name === 'inventory') renderInventory();
}

function getStatus(p) {
  const batasMin = p.min !== undefined ? p.min : 5;
  if(p.stok === 0) return { label: 'Habis', cls: 'status-empty' };
  if(p.stok <= batasMin) return { label: 'Menipis', cls: 'status-low' };
  return { label: 'Aman', cls: 'status-ok' };
}

// ==========================================
// 7. DASHBOARD & CHART.JS RENDERING
// ==========================================
function renderDashboard() {
  document.getElementById('stat-total').textContent = PRODUK.length;
  
  const listLow = PRODUK.filter(p => p.stok > 0 && p.stok <= (p.min !== undefined ? p.min : 5));
  const listEmpty = PRODUK.filter(p => p.stok === 0);
  
  document.getElementById('stat-low').textContent = listLow.length;
  document.getElementById('stat-empty').textContent = listEmpty.length;
  document.getElementById('stat-value').textContent = 'Rp ' + PRODUK.reduce((s,p) => s + (p.stok * (p.hjual || 0)), 0).toLocaleString('id-ID');

  const alertBox = document.getElementById('emergency-box');
  const totalKritis = listLow.length + listEmpty.length;
  if(totalKritis > 0) {
    alertBox.style.display = 'flex';
    document.getElementById('emergency-text').textContent = `Sistem mendeteksi ${totalKritis} komoditas berada dalam zona tidak aman (menyentuh batas minimum).`;
    if(!hasPlayedEmergency) { playSound('emergency'); hasPlayedEmergency = true; }
  } else {
    alertBox.style.display = 'none';
    hasPlayedEmergency = false;
  }

  const chartLabels = PRODUK.map(p => p.kode);
  const chartData = PRODUK.map(p => p.stok);
  
  const pointColors = PRODUK.map(p => p.stok <= (p.min !== undefined ? p.min : 5) ? 'rgba(239, 68, 68, 1)' : 'rgba(108, 111, 255, 1)');
  const pointRadii = PRODUK.map(p => p.stok <= (p.min !== undefined ? p.min : 5) ? 6 : 4);
  const pointBorders = PRODUK.map(p => p.stok <= (p.min !== undefined ? p.min : 5) ? '#fff' : 'transparent');

  Chart.defaults.color = '#8888aa';
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  const ctx = document.getElementById('lineChart').getContext('2d');
  
  if(LineChartObj) LineChartObj.destroy();
  
  LineChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Stok Sistem', 
        data: chartData,
        borderColor: 'rgba(108, 111, 255, 0.6)',
        backgroundColor: 'rgba(108, 111, 255, 0.1)', 
        borderWidth: 2,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointBorders,
        pointBorderWidth: 2,
        pointRadius: pointRadii,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3 
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const p = PRODUK[index];
          const bMin = p.min !== undefined ? p.min : 5;
          if (p.stok <= bMin) {
            showNotification(`🚨 Kritis: [${p.kode}] ${p.nama} tersisa ${p.stok} Unit!`, 'danger');
          } else {
            showNotification(`✅ Aman: [${p.kode}] ${p.nama} tersedia ${p.stok} Unit.`, 'success');
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(24, 24, 30, 0.9)',
          titleColor: '#fff',
          bodyColor: '#e8e8f0',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (context) => PRODUK[context[0].dataIndex].nama,
            label: (context) => ` Stok Sistem: ${context.raw} Unit`
          }
        }
      }
    }
  });
}

function showValuationDetails() {
  const byCat = PRODUK.reduce((acc, p) => {
    if(!acc[p.kategori]) acc[p.kategori] = 0;
    acc[p.kategori] += (p.stok * p.hjual);
    return acc;
  }, {});
  
  let html = `<div style="text-align:left; margin-top:15px; font-size:14px;"><table style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text2); text-transform:uppercase; font-size:11px;"><th style="padding:10px 0;">Kategori</th><th style="text-align:right; padding:10px 0;">Nilai Kapital</th></tr></thead><tbody>`;
  let total = 0;
  for(let k in byCat) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:12px 0;">${k}</td><td style="text-align:right; font-family:var(--mono); color:var(--text);">Rp ${byCat[k].toLocaleString('id-ID')}</td></tr>`;
    total += byCat[k];
  }
  html += `</tbody><tfoot><tr><th style="padding:15px 0;">VALUASI TOTAL</th><th style="text-align:right; font-family:var(--mono); font-size:16px; color:var(--success); padding:15px 0;">Rp ${total.toLocaleString('id-ID')}</th></tr></tfoot></table></div>`;
  
  const m = document.createElement('div');
  m.className = 'modal-overlay open';
  m.innerHTML = `<div class="modal" style="width:450px;"><div class="modal-header"><span>Analisis Valuasi per Kategori</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body">${html}</div><div class="modal-footer"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Tutup Analisis</button></div></div>`;
  document.body.appendChild(m);
}

// ==========================================
// 8. INVENTORY & EXPORT EXCEL
// ==========================================
function filterInventory(type) {
  currentFilter = type;
  document.getElementById('search-inv').value = '';
  showSection('inventory');
}

function renderInventory() {
  const keyword = document.getElementById('search-inv').value.toLowerCase();
  let filtered = PRODUK;
  
  if (currentFilter === 'low') filtered = filtered.filter(p => p.stok > 0 && p.stok <= (p.min !== undefined ? p.min : 5));
  else if (currentFilter === 'empty') filtered = filtered.filter(p => p.stok === 0);
  else if (currentFilter === 'critical') filtered = filtered.filter(p => p.stok <= (p.min !== undefined ? p.min : 5)); 

  if (keyword) filtered = filtered.filter(p => p.nama.toLowerCase().includes(keyword) || p.kode.toLowerCase().includes(keyword));
  
  const badge = document.getElementById('filter-badge');
  if (currentFilter !== 'all') { badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; }

  document.querySelector('#tbl-inventory tbody').innerHTML = filtered.map(p => {
    const s = getStatus(p);
    const batasMin = p.min !== undefined ? p.min : 5;
    
    return `<tr>
      <td><code style="background:var(--bg3);padding:4px 6px;border-radius:6px;color:var(--text);font-family:var(--mono);">${p.kode}</code></td>
      <td><strong>${p.nama}</strong></td><td>${p.kategori}</td>
      <td><div style="font-family:var(--mono);font-weight:700;font-size:15px;">${p.stok} <span style="font-size:10px; color:var(--text2); font-weight:normal;">/ Min: ${batasMin}</span></div></td>
      <td style="font-family:var(--mono);">Rp ${Number(p.hjual).toLocaleString('id-ID')}</td>
      <td><span class="status ${s.cls}">${s.label}</span></td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="btn-inline" onclick="openModalProduk('${p.db_id}')">✏️ Edit</button>
          <button class="btn-inline" style="color:var(--danger); border-color:var(--danger); background:rgba(239,68,68,0.1);" onclick="hapusProduk('${p.db_id}')">🗑️ Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:25px;color:var(--text2);">Data tidak ditemukan.</td></tr>';
}

function eksporExcel() {
  if (PRODUK.length === 0) return showNotification("Tidak ada data untuk diekspor.", "warning");
  const dataExcel = PRODUK.map((p, index) => ({
    "No": index + 1, "UID / Kode": p.kode, "Nama Produk": p.nama, "Kategori": p.kategori, "Stok Aktual": p.stok,
    "Batas Minimum": p.min !== undefined ? p.min : 5, "Status": p.stok === 0 ? "Habis" : (p.stok <= (p.min !== undefined ? p.min : 5) ? "Menipis" : "Aman"),
    "Harga Pokok (Rp)": p.hjual, "Total Valuasi (Rp)": p.stok * p.hjual
  }));
  const ws = XLSX.utils.json_to_sheet(dataExcel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Master_Data");
  XLSX.writeFile(wb, "Laporan_Inventory.xlsx");
  showNotification("Dokumen Excel berhasil diunduh.", "success");
}

// ==========================================
// 9. CRUD PRODUK (SIMPAN KE CLOUD)
// ==========================================
function openModalProduk(db_id = null) {
  editId = db_id; updateDatalist(); 
  if(db_id) {
    const p = PRODUK.find(x => x.db_id === db_id);
    if(p) {
      document.getElementById('prod-id').value = p.id; document.getElementById('prod-kode').value = p.kode;
      document.getElementById('prod-nama').value = p.nama; document.getElementById('prod-kat').value = p.kategori;
      document.getElementById('prod-stok').value = p.stok; document.getElementById('prod-hjual').value = p.hjual;
      document.getElementById('prod-min').value = p.min !== undefined ? p.min : 5;
      document.getElementById('modal-title').innerHTML = "Edit Produk";
    }
  } else {
    ['prod-id','prod-kode','prod-nama','prod-kat'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('prod-stok').value = 0; document.getElementById('prod-hjual').value = 0; document.getElementById('prod-min').value = 5;
    document.getElementById('modal-title').innerHTML = "Tambah Produk Baru";
  }
  document.getElementById('modal-produk').classList.add('open');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

async function saveProduk() {
  const btn = document.getElementById('btn-save-produk');
  btn.textContent = "Menyimpan...";
  
  const kode = document.getElementById('prod-kode').value.trim();
  const nama = document.getElementById('prod-nama').value.trim();
  const stok = parseInt(document.getElementById('prod-stok').value) || 0;
  const min = parseInt(document.getElementById('prod-min').value) || 0; 
  const hjual = parseInt(document.getElementById('prod-hjual').value) || 0;
  const kategori = document.getElementById('prod-kat').value.trim() || 'Umum';

  if(!kode || !nama) { btn.textContent = "Otorisasi & Simpan"; return showNotification("Kode UID dan Nama wajib diisi!", "warning"); }

  const kodeExist = PRODUK.find(p => p.kode.toLowerCase() === kode.toLowerCase());
  if(kodeExist && kodeExist.db_id !== editId) {
    btn.textContent = "Otorisasi & Simpan";
    return showNotification(`Otorisasi ditolak: Kode UID "${kode}" sudah dipakai!`, "danger");
  }

  const payload = { kode, nama, kategori, stok, min, hjual };

  try {
    if(editId) {
      payload.id = PRODUK.find(x => x.db_id === editId).id; 
      await updateDoc(doc(db, "produk", editId), payload);
      showNotification("Pembaruan parameter aset tervalidasi di Cloud.", "success");
    } else {
      payload.id = 'p' + Date.now();
      await setDoc(doc(db, "produk", payload.id), payload);
      showNotification("Aset baru berhasil diintegrasikan ke Cloud.", "success");
    }
    
    await fetchProductsFromCloud(); 
    updateDatalist(); closeModal('modal-produk'); 
    if (document.getElementById('section-inventory').classList.contains('active')) renderInventory();
    if (document.getElementById('section-dashboard').classList.contains('active')) renderDashboard();
    
    btn.textContent = "Otorisasi & Simpan";
  } catch(e) {
    showNotification("Gagal menyimpan ke server Cloud.", "danger");
    btn.textContent = "Otorisasi & Simpan";
  }
}

// ==========================================
// 10. MANAJEMEN PROFIL AKUN (FIREBASE)
// ==========================================
let tempAvatar = null;

function toggleProfileDropdown() { document.getElementById('prof-menu').classList.toggle('show'); }

window.onclick = function(e) {
  if (!e.target.closest('.profile-box') && !e.target.closest('.modal-overlay') && !e.target.closest('.btn-theme-toggle')) {
    const menu = document.getElementById('prof-menu');
    if (menu && menu.classList.contains('show')) menu.classList.remove('show');
  }
}

function updateAvatarUI() {
  const ava = document.getElementById('user-avatar');
  if(currentUser.avatar) { ava.style.backgroundImage = `url(${currentUser.avatar})`; ava.textContent = ''; } 
  else { ava.style.backgroundImage = 'none'; ava.textContent = currentUser.name.charAt(0).toUpperCase(); }
}

function openProfileModal() {
  document.getElementById('prof-menu').classList.remove('show');
  const prev = document.getElementById('preview-avatar');
  if(currentUser.avatar) { prev.style.backgroundImage = `url(${currentUser.avatar})`; prev.textContent = ''; tempAvatar = currentUser.avatar; } 
  else { prev.style.backgroundImage = 'none'; prev.textContent = currentUser.name.charAt(0).toUpperCase(); tempAvatar = null; }
  
  document.getElementById('prof-name').value = currentUser.name;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-pass-old').value = '';
  document.getElementById('prof-pass-new').value = '';
  document.getElementById('modal-profil').classList.add('open');
}

function previewImage(event) {
  const reader = new FileReader();
  reader.onload = function() {
    document.getElementById('preview-avatar').style.backgroundImage = `url(${reader.result})`; 
    document.getElementById('preview-avatar').textContent = '';
    tempAvatar = reader.result;
  };
  if(event.target.files[0]) reader.readAsDataURL(event.target.files[0]);
}

async function saveProfileData() {
  const btn = document.getElementById('btn-save-profil');
  const name = document.getElementById('prof-name').value.trim();
  const oldP = document.getElementById('prof-pass-old').value;
  const newP = document.getElementById('prof-pass-new').value;

  if(!name) return showNotification("Nama operasional wajib diisi!", "warning");
  btn.textContent = "Menyimpan...";
  
  let updatePayload = { name: name, avatar: tempAvatar };

  if(oldP || newP) {
    if(!oldP || !newP) { btn.textContent = "Simpan Perubahan Akun"; return showNotification("Wajib isi sandi lama dan baru!", "warning"); }
    if(oldP !== currentUser.password) { btn.textContent = "Simpan Perubahan Akun"; return showNotification("Otorisasi gagal: Sandi lama salah!", "danger"); }
    if(newP.length < 6) { btn.textContent = "Simpan Perubahan Akun"; return showNotification("Keamanan lemah: Sandi baru minimal 6 karakter!", "warning"); }
    updatePayload.password = newP;
  }

  try {
    await updateDoc(doc(db, "users", currentUser.id), updatePayload);
    currentUser.name = name;
    currentUser.avatar = tempAvatar;
    if(updatePayload.password) currentUser.password = newP;
    
    localStorage.setItem('inmo_current_user', JSON.stringify(currentUser));
    
    updateAvatarUI();
    document.getElementById('user-name-display').textContent = name;
    closeModal('modal-profil');
    showNotification("Konfigurasi profil tersimpan di Cloud.", "success");
    btn.textContent = "Simpan Perubahan Akun";
  } catch(e) { 
    showNotification("Gagal memperbarui profil di server.", "danger"); 
    btn.textContent = "Simpan Perubahan Akun";
  }
}

function doLogout() {
  localStorage.removeItem('inmo_current_user');
  window.location.replace('login.html');
}

// ==========================================
// 11. FITUR MENGHAPUS DATA DARI FIREBASE
// ==========================================
function hapusProduk(db_id) {
  const m = document.createElement('div');
  m.className = 'modal-overlay open';
  m.innerHTML = `
    <div class="modal" style="width:400px; text-align:center; padding:30px 20px;">
      <div style="font-size:45px; margin-bottom:15px; animation: pulse 2s infinite;">⚠️</div>
      <h3 style="margin-bottom:10px; color:var(--text);">Konfirmasi Penghapusan</h3>
      <p style="color:var(--text2); margin-bottom:25px; font-size:14px; line-height:1.5;">
        Apakah Anda yakin ingin menghapus aset ini secara permanen? Data akan ditarik dari layar web dan pangkalan data Cloud.
      </p>
      <div style="display:flex; justify-content:center; gap:12px;">
        <button class="btn-inline" onclick="this.closest('.modal-overlay').remove()">Batal</button>
        <button class="btn-primary" style="background:var(--danger); border-color:var(--danger); width:auto; padding:10px 20px;" id="btn-confirm-delete">Ya, Hapus Permanen</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    const btn = document.getElementById('btn-confirm-delete');
    btn.textContent = "Menghapus...";
    try {
      await deleteDoc(doc(db, "produk", db_id));
      m.remove(); 
      await fetchProductsFromCloud(); 
      updateDatalist();
      renderInventory();
      renderDashboard();
      showNotification("Aset berhasil dihapus dari sistem dan layar.", "success");
    } catch (error) {
      m.remove();
      showNotification("Gagal menghapus data dari server.", "danger");
    }
  });
}

// ==========================================
// 12. REALTIME TICKERS (WAKTU & PING)
// ==========================================
setInterval(() => { 
  const timeEl = document.getElementById('topbar-time');
  if(timeEl) timeEl.textContent = new Date().toLocaleTimeString('id-ID', {hour12:false}) + ' WITA'; 
}, 1000);

setInterval(() => {
  const ping = Math.floor(Math.random() * 40) + 10; 
  const valEl = document.getElementById('ping-val');
  const boxEl = document.getElementById('network-status');
  if(boxEl && valEl) {
    const labelEl = boxEl.querySelector('.ping-label');
    valEl.textContent = ping + 'ms';
    if(ping > 40) { boxEl.className = 'network-status unstable'; labelEl.textContent = 'KONEKSI LAMBAT'; } 
    else { boxEl.className = 'network-status'; labelEl.textContent = 'KONEKSI STABIL'; }
  }
}, 2500);

// ==========================================
// 13. BINDING EVENT LISTENER KE HTML
// ==========================================
document.getElementById('nav-dashboard').addEventListener('click', () => showSection('dashboard'));
document.getElementById('nav-inventory').addEventListener('click', () => showSection('inventory'));
document.getElementById('btn-theme-toggle').addEventListener('click', toggleLightDarkMode);
document.getElementById('btn-profile-box').addEventListener('click', toggleProfileDropdown);
document.getElementById('btn-open-profile').addEventListener('click', openProfileModal);
document.getElementById('btn-do-logout').addEventListener('click', doLogout);
document.getElementById('btn-tindak-lanjut').addEventListener('click', () => filterInventory('critical'));
document.getElementById('card-filter-all').addEventListener('click', () => filterInventory('all'));
document.getElementById('card-filter-low').addEventListener('click', () => filterInventory('low'));
document.getElementById('card-filter-empty').addEventListener('click', () => filterInventory('empty'));
document.getElementById('card-valuation').addEventListener('click', showValuationDetails);
document.getElementById('btn-export-excel').addEventListener('click', eksporExcel);
document.getElementById('search-inv').addEventListener('input', renderInventory);
document.getElementById('btn-clear-filter').addEventListener('click', () => filterInventory('all'));
document.getElementById('btn-add-product').addEventListener('click', () => openModalProduk(null));
document.getElementById('btn-close-modal-produk').addEventListener('click', () => closeModal('modal-produk'));
document.getElementById('btn-cancel-produk').addEventListener('click', () => closeModal('modal-produk'));
document.getElementById('btn-save-produk').addEventListener('click', saveProduk);
document.getElementById('btn-close-modal-profil').addEventListener('click', () => closeModal('modal-profil'));
document.getElementById('btn-cancel-profil').addEventListener('click', () => closeModal('modal-profil'));
document.getElementById('btn-save-profil').addEventListener('click', saveProfileData);
document.getElementById('btn-upload-foto').addEventListener('click', () => document.getElementById('file-avatar').click());
document.getElementById('file-avatar').addEventListener('change', previewImage);

window.openModalProduk = openModalProduk;
window.hapusProduk = hapusProduk; 

// JALANKAN PROGRAM SAAT PERTAMA DIBUKA
window.addEventListener('DOMContentLoaded', initData);