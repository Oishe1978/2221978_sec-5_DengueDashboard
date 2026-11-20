import React, { useEffect, useState } from 'react';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface DengueReport {
  id: number;
  patient_name: string;
  age: number;
  district: string;
  hospital_name: string;
  severity: string;
  status: string;
  owner_email: string;
}

export default function App() {
  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'admin1@dengue.gov.bd', password: 'Admin@2026#1' });

  // Reports State
  const [reports, setReports] = useState<DengueReport[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    patient_name: '',
    age: 25,
    district: 'Dhaka',
    hospital_name: '',
    severity: 'Medium',
    status: 'Admitted',
  });

  // Admin State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const authHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Fetch Reports
  const fetchReports = async (district = selectedDistrict) => {
    try {
      const url = district === 'All' ? '/api/v1/reports' : `/api/v1/reports?district=${encodeURIComponent(district)}`;
      const res = await fetch(url);
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Admin Data
  const fetchAdminData = async (currentToken: string) => {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch('/api/v1/admin/audit-logs', { headers: { Authorization: `Bearer ${currentToken}` } })
      ]);
      if (uRes.ok) setAdminUsers(await uRes.json());
      if (lRes.ok) setAuditLogs(await lRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReports(selectedDistrict);
  }, [selectedDistrict]);

  // Handle Login / Signup
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`❌ ${data.detail || 'Authentication failed'}`);
        return;
      }
      if (authMode === 'signup') {
        alert('✅ Signup successful! Now click Login.');
        setAuthMode('login');
      } else {
        setToken(data.access_token);
        setUser(data.user);
        alert(`✅ Welcome, ${data.user.name} (${data.user.role.toUpperCase()})`);
        if (data.user.role === 'admin') fetchAdminData(data.access_token);
      }
    } catch {
      alert('⚠️ Network error during authentication.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (token) {
      await fetch('/api/v1/auth/logout', { method: 'POST', headers: authHeaders() });
    }
    setToken(null);
    setUser(null);
    setAdminUsers([]);
    setAuditLogs([]);
    alert('👋 Logged out successfully.');
  };

  // Handle Create / Update Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('⚠️ Please Log In first before adding or updating a report!');
      return;
    }
    const url = editingId ? `/api/v1/reports/${editingId}` : '/api/v1/reports';
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({ ...formData, age: Number(formData.age) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(editingId ? '✅ Report Updated!' : '✅ Report Added!');
        setEditingId(null);
        setFormData({ patient_name: '', age: 25, district: 'Dhaka', hospital_name: '', severity: 'Medium', status: 'Admitted' });
        fetchReports();
        if (user?.role === 'admin') fetchAdminData(token);
      } else {
        alert(`❌ Error (${res.status}): ${data.detail}`);
      }
    } catch {
      alert('⚠️ Network error while saving report.');
    }
  };

  // Handle Delete Report
  const handleDeleteReport = async (id: number) => {
    if (!token) {
      alert('⚠️ Please Log In first to delete a report!');
      return;
    }
    if (!window.confirm(`Delete Report #${id}?`)) return;

    try {
      const res = await fetch(`/api/v1/reports/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🗑️ Report #${id} Deleted!`);
        fetchReports();
        if (user?.role === 'admin') fetchAdminData(token);
      } else {
        alert(`❌ Error (${res.status}): ${data.detail}`);
      }
    } catch {
      alert('⚠️ Network error while deleting.');
    }
  };

  // Admin Toggle Ban
  const handleToggleBan = async (email: string) => {
    if (!token) return;
    const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(email)}/toggle-ban`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message}`);
      fetchAdminData(token);
    } else {
      alert(`❌ Error (${res.status}): ${data.detail}`);
    }
  };

  // Admin Export CSV
  const handleExportCSV = async () => {
    if (!token) return;
    const res = await fetch('/api/v1/admin/export-csv', { headers: authHeaders() });
    if (res.ok) {
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dengue_reports_export.csv';
      a.click();
    }
  };

  return (
    <div style={{ padding: '25px 15px', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1150px', margin: '0 auto', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      
      {/* Top Authentication & Navigation Bar */}
      <div style={{ backgroundColor: '#1e293b', color: '#fff', padding: '18px 24px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>🦟 Dengue Surveillance Dashboard</h2>
          <small style={{ color: '#94a3b8' }}>CSE309 Production System | RBAC & JWT Protected</small>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: user.role === 'admin' ? '#dc2626' : '#2563eb', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
              {user.role.toUpperCase()}
            </span>
            <span>{user.name} ({user.email})</span>
            <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                required
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none' }}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
              style={{ padding: '7px 10px', borderRadius: '5px', border: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
              style={{ padding: '7px 10px', borderRadius: '5px', border: 'none' }}
            />
            <button type="submit" style={{ padding: '7px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{ padding: '7px 10px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
            >
              {authMode === 'login' ? 'Need Account? Sign Up' : 'Back to Login'}
            </button>
          </form>
        )}
      </div>

      {/* Add / Edit Report Form */}
      <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: editingId ? '#d97706' : '#2563eb' }}>
          {editingId ? `✏️ Edit Dengue Report #${editingId}` : '➕ Add New Dengue Report'}
        </h3>
        <form onSubmit={handleReportSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <input
            type="text"
            placeholder="Patient Name"
            value={formData.patient_name}
            onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <input
            type="number"
            placeholder="Age"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <select
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="Dhaka">Dhaka</option>
            <option value="Chittagong">Chittagong</option>
            <option value="Rajshahi">Rajshahi</option>
            <option value="Khulna">Khulna</option>
            <option value="Sylhet">Sylhet</option>
          </select>
          <input
            type="text"
            placeholder="Hospital Name"
            value={formData.hospital_name}
            onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="Admitted">Admitted</option>
            <option value="Recovered">Recovered</option>
            <option value="Critical">Critical</option>
          </select>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ flex: 1, padding: '11px', backgroundColor: editingId ? '#d97706' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {editingId ? 'Save Updated Report' : 'Submit Report'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ patient_name: '', age: 25, district: 'Dhaka', hospital_name: '', severity: 'Medium', status: 'Admitted' });
                }}
                style={{ padding: '11px 18px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Reports List Table */}
      <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>📊 Reported Dengue Cases ({reports.length})</h3>
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Filter District:</label>
            <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} style={{ padding: '7px 12px', borderRadius: '6px' }}>
              <option value="All">All Districts</option>
              <option value="Dhaka">Dhaka</option>
              <option value="Chittagong">Chittagong</option>
              <option value="Rajshahi">Rajshahi</option>
              <option value="Khulna">Khulna</option>
              <option value="Sylhet">Sylhet</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Patient</th>
                <th style={{ padding: '10px' }}>Age</th>
                <th style={{ padding: '10px' }}>District</th>
                <th style={{ padding: '10px' }}>Hospital</th>
                <th style={{ padding: '10px' }}>Severity</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Owner</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>#{r.id}</td>
                  <td style={{ padding: '10px' }}>{r.patient_name}</td>
                  <td style={{ padding: '10px' }}>{r.age}</td>
                  <td style={{ padding: '10px' }}>{r.district}</td>
                  <td style={{ padding: '10px' }}>{r.hospital_name}</td>
                  <td style={{ padding: '10px' }}>{r.severity}</td>
                  <td style={{ padding: '10px' }}>{r.status}</td>
                  <td style={{ padding: '10px', fontSize: '12px', color: '#64748b' }}>{r.owner_email}</td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setFormData({
                          patient_name: r.patient_name,
                          age: r.age,
                          district: r.district,
                          hospital_name: r.hospital_name,
                          severity: r.severity,
                          status: r.status,
                        });
                      }}
                      style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      style={{ padding: '5px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Control Panel (Visible only when logged in as Admin) */}
      {user?.role === 'admin' && (
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '2px solid #dc2626', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#dc2626' }}>🛡️ Admin Control Panel & Audit Logs</h3>
            <button onClick={handleExportCSV} style={{ padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              📥 Export CSV
            </button>
          </div>

          <h4>Registered Users Management</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#fee2e2' }}>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Role</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Moderation</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{u.id}</td>
                  <td style={{ padding: '8px' }}>{u.name}</td>
                  <td style={{ padding: '8px' }}>{u.email}</td>
                  <td style={{ padding: '8px' }}>{u.role}</td>
                  <td style={{ padding: '8px', color: u.is_banned ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                    {u.is_banned ? 'BANNED' : 'ACTIVE'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button
                      onClick={() => handleToggleBan(u.email)}
                      style={{ padding: '5px 10px', backgroundColor: u.is_banned ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {u.is_banned ? 'Unban User' : 'Ban User'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>System Security Audit Log</h4>
          <div style={{ maxHeight: '180px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                <strong>[{log.action}]</strong> Actor: <code>{log.actor}</code> — {log.details}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
