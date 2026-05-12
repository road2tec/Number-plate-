document.addEventListener('DOMContentLoaded', () => {
  // Check auth and role
  const token = localStorage.getItem('sp_token');
  const user = JSON.parse(localStorage.getItem('sp_user'));

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  if (user.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = 'dashboard.html';
    return;
  }

  // Sidebar Tabs
  const navLinks = document.querySelectorAll('.sb-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('pageTitle');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      link.classList.add('active');
      const tabId = link.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');
      pageTitle.textContent = link.textContent.replace(/[^\w\s]/g, '').trim();
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    window.location.href = 'login.html';
  });

  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Fetch Data
  fetchStats();
  fetchUsers();

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('statUsers').textContent = data.stats.totalUsers;
        document.getElementById('statBookings').textContent = data.stats.totalBookings;
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        renderUsers(data.users);
      } else {
        document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="6">Error: ${data.message}</td></tr>`;
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="6">Error loading users</td></tr>';
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      const date = new Date(u.createdAt).toLocaleDateString();
      const badgeClass = u.role === 'admin' ? 'badge-admin' : 'badge-user';
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || '-'}</td>
        <td><span class="badge ${badgeClass}">${u.role}</span></td>
        <td>${date}</td>
        <td>
          ${u.role !== 'admin' ? `<button class="btn-danger" onclick="deleteUser('${u._id}')">Delete</button>` : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.deleteUser = async function(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('User deleted');
        fetchUsers();
        fetchStats();
      } else {
        alert(data.message || 'Error deleting user');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error deleting user');
    }
  };

});
