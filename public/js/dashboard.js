const token = localStorage.getItem('sp_token');
const user = JSON.parse(localStorage.getItem('sp_user') || '{}');
if (!token) window.location.href = 'login.html';

// Auth header helper
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

// Populate user info
document.getElementById('sidebarName').textContent = user.name || 'User';
document.getElementById('sidebarEmail').textContent = user.email || '';
document.getElementById('userAvatar').textContent = (user.name || 'U')[0].toUpperCase();
document.getElementById('profileAvatar').textContent = (user.name || 'U')[0].toUpperCase();
document.getElementById('pName').textContent = user.name || '—';
document.getElementById('pEmail').textContent = user.email || '—';
document.getElementById('pRole').textContent = user.role || 'user';

// Load full profile
fetch('/api/auth/me', { headers: authHeaders() }).then(r => r.json()).then(d => {
  if (d.success) {
    document.getElementById('pPhone').textContent = d.user.phone || '—';
    document.getElementById('pVehicle').textContent = d.user.vehicleNumber || '—';
    document.getElementById('bookVehicle').value = d.user.vehicleNumber || '';
  }
}).catch(() => {});

// Tab switching
const tabs = document.querySelectorAll('.sb-link');
const contents = document.querySelectorAll('.tab-content');
const titles = { map: 'Real-Time Floor Map', book: 'Book a Slot', mybookings: 'My Bookings', profile: 'My Profile' };

tabs.forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    const t = tab.dataset.tab;
    tabs.forEach(x => x.classList.remove('active'));
    contents.forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${t}`).classList.add('active');
    document.getElementById('pageTitle').textContent = titles[t];
    if (t === 'mybookings') loadMyBookings();
    if (t === 'book') loadAvailableSlots();
    if (t === 'monitoring') fetchAllBookings();
    // close sidebar on mobile
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
  });
});

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_user');
  window.location.href = 'login.html';
});

// ======= FLOOR MAP =======
let allSlots = [];
async function loadFloorMap() {
  try {
    const res = await fetch('/api/slots', { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;
    allSlots = data.slots;
    renderFloorMap(data.slots);
    updateSidebarStats(data.slots);
  } catch (e) { console.error(e); }
}

function renderFloorMap(slots) {
  const grid = document.getElementById('floorGrid');
  grid.innerHTML = '';
  slots.forEach(slot => {
    const el = document.createElement('div');
    const cls = slot.status === 'occupied' && slot.type === 'offline' ? 'slot-offline'
      : slot.status === 'occupied' && slot.type === 'online' ? 'slot-online'
      : slot.status === 'reserved' ? 'slot-reserved'
      : 'slot-available';
    el.className = `slot-card ${cls}`;
    const icon = slot.type === 'offline' ? '🏢' : slot.type === 'online' ? '🌐' : '✅';
    const typeLabel = slot.status === 'available' ? 'AVAILABLE' : slot.type.toUpperCase();
    el.innerHTML = `<span class="slot-num">Slot ${slot.slotNumber}</span><span>${icon}</span><span class="slot-type-label">${typeLabel}</span>`;
    if (slot.status === 'available') {
      el.title = 'Click to book';
      el.addEventListener('click', () => quickBook(slot));
    }
    grid.appendChild(el);
  });
}

function updateSidebarStats(slots) {
  const avail = slots.filter(s => s.status === 'available').length;
  const offline = slots.filter(s => s.type === 'offline' && s.status === 'occupied').length;
  const online = slots.filter(s => s.type === 'online' && s.status === 'occupied').length;
  document.getElementById('sbAvail').textContent = avail;
  document.getElementById('sbOffline').textContent = `${offline} Slots Allocated`;
  document.getElementById('sbOnline').textContent = `${online} Slots Reserved`;
  document.getElementById('sbTime').textContent = 'Waiting...';
  const statsRes = fetch('/api/slots/stats', { headers: authHeaders() }).then(r => r.json()).then(d => {
    if (d.success) document.getElementById('sbAvail').textContent = d.stats.available;
  }).catch(() => {});
}

function quickBook(slot) {
  // Switch to book tab and pre-select slot
  tabs.forEach(x => x.classList.remove('active'));
  contents.forEach(x => x.classList.remove('active'));
  document.querySelector('[data-tab="book"]').classList.add('active');
  document.getElementById('tab-book').classList.add('active');
  document.getElementById('pageTitle').textContent = titles['book'];
  loadAvailableSlots().then(() => {
    document.getElementById('slotSelect').value = slot._id;
  });
}

// ======= BOOK SLOT =======
let duration = 1;
const ratePerHour = 30;

document.getElementById('durMinus').addEventListener('click', () => {
  if (duration > 1) { duration--; updatePrice(); }
});
document.getElementById('durPlus').addEventListener('click', () => {
  if (duration < 24) { duration++; updatePrice(); }
});

function updatePrice() {
  document.getElementById('durVal').textContent = duration;
  document.getElementById('totalPrice').textContent = `₹${ratePerHour * duration}`;
}

async function loadAvailableSlots() {
  try {
    const res = await fetch('/api/slots', { headers: authHeaders() });
    const data = await res.json();
    const select = document.getElementById('slotSelect');
    select.innerHTML = '<option value="">-- Choose a slot --</option>';
    data.slots.filter(s => s.status === 'available').forEach(s => {
      const opt = document.createElement('option');
      opt.value = s._id;
      opt.textContent = `Slot ${s.slotNumber} (Floor ${s.floor})`;
      select.appendChild(opt);
    });
  } catch (e) { console.error(e); }
}

document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const slotId = document.getElementById('slotSelect').value;
  const vehicleNumber = document.getElementById('bookVehicle').value;
  if (!slotId) { showBookAlert('Please select a slot.', 'error'); return; }

  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  document.getElementById('payBtnText').textContent = 'Creating order...';
  document.getElementById('paySpinner').classList.remove('hidden');

  try {
    const res = await fetch('/api/bookings/create-order', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ slotId, duration, vehicleNumber })
    });
    const data = await res.json();
    if (!data.success) {
      showBookAlert(data.message || 'Error creating order', 'error');
      resetPayBtn(); return;
    }
    openRazorpay(data);
  } catch (err) {
    showBookAlert('Server error. Try again.', 'error');
    resetPayBtn();
  }
});

function resetPayBtn() {
  const btn = document.getElementById('payBtn');
  btn.disabled = false;
  document.getElementById('payBtnText').textContent = '💳 Pay with Razorpay';
  document.getElementById('paySpinner').classList.add('hidden');
}

function openRazorpay(orderData) {
  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'SmartPark',
    description: `Parking Slot Booking — ${duration} hr(s)`,
    order_id: orderData.orderId,
    handler: async function (response) {
      try {
        const res = await fetch('/api/bookings/verify-payment', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: orderData.bookingId
          })
        });
        const data = await res.json();
        if (data.success) {
          showModal(`Slot booked & payment confirmed! ₹${orderData.amount / 100} paid successfully.`);
          loadFloorMap();
          document.getElementById('bookingForm').reset();
          duration = 1; updatePrice();
        } else {
          showBookAlert('Payment verification failed.', 'error');
        }
      } catch (err) {
        showBookAlert('Error verifying payment.', 'error');
      }
      resetPayBtn();
    },
    prefill: { name: user.name, email: user.email },
    theme: { color: '#6366f1' },
    modal: { ondismiss: () => resetPayBtn() }
  };
  const rzp = new Razorpay(options);
  rzp.on('payment.failed', () => { showBookAlert('Payment failed. Try again.', 'error'); resetPayBtn(); });
  rzp.open();
}

// ======= MY BOOKINGS =======
async function loadMyBookings() {
  const list = document.getElementById('bookingsList');
  list.innerHTML = '<div class="loading-slots">Loading...</div>';
  try {
    const res = await fetch('/api/bookings/my', { headers: authHeaders() });
    const data = await res.json();
    if (!data.success || data.bookings.length === 0) {
      list.innerHTML = '<div class="loading-slots">No bookings yet. Book your first slot!</div>';
      return;
    }
    list.innerHTML = '';
    data.bookings.forEach(b => {
      const badgeCls = b.status === 'confirmed' ? 'bk-confirmed' : b.status === 'cancelled' ? 'bk-cancelled' : 'bk-pending';
      const el = document.createElement('div');
      el.className = 'booking-item';
      el.innerHTML = `
        <div class="bk-info">
          <h4>Slot #${b.slotNumber}</h4>
          <p>🚘 ${b.vehicleNumber} &nbsp;|&nbsp; ⏱ ${b.duration}h &nbsp;|&nbsp; 📅 ${new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          <p style="margin-top:.3rem">Payment: ${b.paymentStatus}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem">
          <span class="bk-badge ${badgeCls}">${b.status.toUpperCase()}</span>
          <span class="bk-amount">₹${b.amount / 100}</span>
          ${b.status === 'confirmed' ? `<button onclick="cancelBooking('${b._id}')" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;padding:.3rem .7rem;border-radius:8px;cursor:pointer;font-size:.78rem;font-family:Inter,sans-serif">Cancel</button>` : ''}
        </div>`;
      list.appendChild(el);
    });
  } catch (e) {
    list.innerHTML = '<div class="loading-slots">Error loading bookings.</div>';
  }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  try {
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (data.success) { loadMyBookings(); loadFloorMap(); }
    else alert(data.message);
  } catch (e) { alert('Error cancelling booking.'); }
}

// ======= LIVE MONITORING =======
async function fetchAllBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-slots">Loading bookings...</td></tr>';
  try {
    const res = await fetch('/api/bookings/live', { headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      renderAllBookings(data.bookings);
    } else {
      tbody.innerHTML = `<tr><td colspan="6">Error: ${data.message}</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching live bookings:', err);
    tbody.innerHTML = '<tr><td colspan="6">Error loading bookings</td></tr>';
  }
}

function renderAllBookings(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = '';
  
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No bookings found.</td></tr>';
    return;
  }

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    const date = new Date(b.createdAt).toLocaleString();
    const userName = b.user ? b.user.name : 'Unknown User';
    const slotNum = b.slot ? `Slot ${b.slot.slotNumber} (Floor ${b.slot.floor})` : 'Deleted Slot';
    
    tr.innerHTML = `
      <td>${userName}</td>
      <td>${b.vehicleNumber}</td>
      <td>${slotNum}</td>
      <td>${b.duration} hr(s)</td>
      <td>₹${(b.amount / 100).toFixed(2)}</td>
      <td>${date}</td>
    `;
    tbody.appendChild(tr);
  });
}

// HELPERS
function showBookAlert(msg, type) {
  const a = document.getElementById('bookAlertBox');
  a.textContent = msg;
  a.className = `alert alert-${type}`;
}

function showModal(msg) {
  document.getElementById('modalMsg').textContent = msg;
  document.getElementById('bookModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('bookModal').classList.add('hidden');
}

// Init
loadFloorMap();
setInterval(loadFloorMap, 15000); // auto-refresh every 15s
