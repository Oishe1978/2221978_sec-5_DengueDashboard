import React, { useEffect, useState } from 'react';

interface DengueReport {
  id: number;
  patient_name: string;
  age: number;
  district: string;
  hospital_name: string;
  severity: string;
  status: string;
}

export default function App() {
  const [reports, setReports] = useState<DengueReport[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    patient_name: '',
    age: 25,
    district: 'Dhaka',
    hospital_name: '',
    severity: 'Medium',
    status: 'Admitted',
  });

  // 1. Fetch Reports (GET)
  const fetchReports = async (district: string = 'All') => {
    setLoading(true);
    try {
      const url = district === 'All' 
        ? '/api/v1/reports' 
        : `/api/v1/reports?district=${encodeURIComponent(district)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedDistrict);
  }, [selectedDistrict]);

  // 2. Create (POST) or Update (PATCH) Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name.trim() || !formData.hospital_name.trim()) {
      alert('Please enter both Patient Name and Hospital Name.');
      return;
    }

    const payload = {
      patient_name: formData.patient_name,
      age: Number(formData.age),
      district: formData.district,
      hospital_name: formData.hospital_name,
      severity: formData.severity,
      status: formData.status,
    };

    try {
      const url = editingId ? `/api/v1/reports/${editingId}` : '/api/v1/reports';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingId ? '✅ Report Updated Successfully!' : '✅ New Dengue Report Added!');
        setFormData({
          patient_name: '',
          age: 25,
          district: 'Dhaka',
          hospital_name: '',
          severity: 'Medium',
          status: 'Admitted',
        });
        setEditingId(null);
        fetchReports(selectedDistrict);
      } else {
        const errText = await res.text();
        alert(`❌ Action failed (${res.status}): ${errText}`);
      }
    } catch (err) {
      alert('⚠️ Network error while connecting to backend API.');
    }
  };

  // Load row data into form for Editing
  const handleEditClick = (report: DengueReport) => {
    setEditingId(report.id);
    setFormData({
      patient_name: report.patient_name,
      age: report.age,
      district: report.district,
      hospital_name: report.hospital_name,
      severity: report.severity,
      status: report.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3. Delete Report (DELETE)
  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Report #${id}?`)) return;

    try {
      const res = await fetch(`/api/v1/reports/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(`🗑️ Report #${id} Deleted!`);
        fetchReports(selectedDistrict);
      } else {
        alert(`❌ Failed to delete report (${res.status})`);
      }
    } catch (err) {
      alert('⚠️ Network error while deleting report.');
    }
  };

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1150px', margin: '0 auto', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '26px' }}>🦟 Dengue Surveillance & Monitoring System</h1>
        <p style={{ color: '#64748b', marginTop: '6px' }}>Full CRUD Live Dashboard (Create, Read, Update, Delete & District Filter)</p>
      </div>

      {/* Add / Edit Form */}
      <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: editingId ? '#d97706' : '#2563eb', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          {editingId ? `✏️ Update Dengue Report #${editingId}` : '➕ Add New Dengue Report'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Patient Name</label>
            <input
              type="text"
              placeholder="e.g. Nusrat Jahan"
              value={formData.patient_name}
              onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>District</label>
            <select
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            >
              <option value="Dhaka">Dhaka</option>
              <option value="Chittagong">Chittagong</option>
              <option value="Rajshahi">Rajshahi</option>
              <option value="Khulna">Khulna</option>
              <option value="Sylhet">Sylhet</option>
              <option value="Barisal">Barisal</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Hospital Name</label>
            <input
              type="text"
              placeholder="e.g. RMCH"
              value={formData.hospital_name}
              onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            >
              <option value="Admitted">Admitted</option>
              <option value="Recovered">Recovered</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              style={{ flex: 1, padding: '12px', backgroundColor: editingId ? '#d97706' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {editingId ? 'Save Updated Report' : 'Submit Report'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ patient_name: '', age: 25, district: 'Dhaka', hospital_name: '', severity: 'Medium', status: 'Admitted' });
                }}
                style={{ padding: '12px 20px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filter & Table */}
      <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#0f172a' }}>📊 Reported Dengue Cases ({reports.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', color: '#334155' }}>Filter by District:</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
            >
              <option value="All">All Districts</option>
              <option value="Dhaka">Dhaka</option>
              <option value="Chittagong">Chittagong</option>
              <option value="Rajshahi">Rajshahi</option>
              <option value="Khulna">Khulna</option>
              <option value="Sylhet">Sylhet</option>
              <option value="Barisal">Barisal</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading reports...</p>
        ) : reports.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#ef4444', padding: '20px' }}>No dengue reports found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Patient Name</th>
                  <th style={{ padding: '12px' }}>Age</th>
                  <th style={{ padding: '12px' }}>District</th>
                  <th style={{ padding: '12px' }}>Hospital</th>
                  <th style={{ padding: '12px' }}>Severity</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>#{item.id}</td>
                    <td style={{ padding: '12px' }}>{item.patient_name}</td>
                    <td style={{ padding: '12px' }}>{item.age}</td>
                    <td style={{ padding: '12px' }}>{item.district}</td>
                    <td style={{ padding: '12px' }}>{item.hospital_name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: item.severity === 'High' ? '#ef4444' : item.severity === 'Medium' ? '#f59e0b' : '#10b981'
                      }}>
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{item.status}</td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleEditClick(item)}
                        style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
