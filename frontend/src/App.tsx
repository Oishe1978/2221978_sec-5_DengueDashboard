import React, { useEffect, useState } from 'react';

interface DengueCase {
  id?: number;
  patient_name: string;
  age: number;
  district: string;
  hospital_name: string;
  severity: string;
  status: string;
  date?: number;
  month?: string;
  year?: number;
}

export default function App() {
  const [cases, setCases] = useState<DengueCase[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [formData, setFormData] = useState({
    patient_name: '',
    age: 25,
    district: 'Dhaka',
    hospital_name: '',
    severity: 'Medium',
    status: 'Admitted',
  });

  // Fetch Cases
  const fetchCases = async (district: string = 'All') => {
    setLoading(true);
    try {
      const url = district === 'All' ? '/api/cases' : `/api/cases?district=${district}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(selectedDistrict);
  }, [selectedDistrict]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name || !formData.hospital_name) {
      alert("Please fill in Patient Name and Hospital Name!");
      return;
    }

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: new Date().getDate(),
          month: "November",
          year: 2026
        }),
      });

      if (res.ok) {
        alert("✅ Dengue Report Added Successfully!");
        setFormData({
          patient_name: '',
          age: 25,
          district: 'Dhaka',
          hospital_name: '',
          severity: 'Medium',
          status: 'Admitted',
        });
        fetchCases(selectedDistrict);
      } else {
        alert("❌ Failed to add report. Check backend API.");
      }
    } catch (err) {
      alert("Error submitting form!");
    }
  };

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px 30px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '25px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '28px' }}>🦟 Dengue Dashboard & Monitoring System</h1>
        <p style={{ color: '#7f8c8d', marginTop: '5px' }}>Real-time Dengue Patient Tracking & Surveillance</p>
      </div>

      {/* Filter Section */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <h3 style={{ margin: 0, color: '#34495e', fontSize: '18px' }}>🔍 Filter by District:</h3>
        <select 
          value={selectedDistrict} 
          onChange={(e) => setSelectedDistrict(e.target.value)}
          style={{ padding: '10px 15px', fontSize: '15px', borderRadius: '6px', border: '1px solid #ced4da', cursor: 'pointer', outline: 'none' }}
        >
          <option value="All">All Districts</option>
          <option value="Dhaka">Dhaka</option>
          <option value="Chittagong">Chittagong</option>
          <option value="Rajshahi">Rajshahi</option>
          <option value="Khulna">Khulna</option>
          <option value="Sylhet">Sylhet</option>
        </select>
      </div>

      {/* Add Case Form */}
      <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: '#2980b9', borderBottom: '2px solid #ebf5fb', paddingBottom: '10px' }}>➕ Add New Dengue Report</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Patient Name</label>
            <input 
              type="text" 
              placeholder="e.g. Rahim Ali" 
              value={formData.patient_name} 
              onChange={(e) => setFormData({...formData, patient_name: e.target.value})} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Age</label>
            <input 
              type="number" 
              placeholder="Age" 
              value={formData.age} 
              onChange={(e) => setFormData({...formData, age: Number(e.target.value)})} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>District</label>
            <input 
              type="text" 
              placeholder="District Name" 
              value={formData.district} 
              onChange={(e) => setFormData({...formData, district: e.target.value})} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Hospital Name</label>
            <input 
              type="text" 
              placeholder="Hospital Name" 
              value={formData.hospital_name} 
              onChange={(e) => setFormData({...formData, hospital_name: e.target.value})} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Severity</label>
            <select 
              value={formData.severity} 
              onChange={(e) => setFormData({...formData, severity: e.target.value})}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            >
              <option value="Low">Low Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="High">High Severity</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Status</label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            >
              <option value="Admitted">Admitted</option>
              <option value="Recovered">Recovered</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <button 
            type="submit" 
            style={{ gridColumn: '1 / -1', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
          >
            Submit Report
          </button>
        </form>
      </div>

      {/* Reported Cases Table */}
      <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #f2f4f4', paddingBottom: '10px' }}>📊 Reported Dengue Cases</h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '20px' }}>Loading cases...</p>
        ) : cases.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#e74c3c', padding: '20px' }}>No reports found for this district.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#2c3e50', color: '#ffffff' }}>
                  <th style={{ padding: '12px 15px' }}>ID</th>
                  <th style={{ padding: '12px 15px' }}>Patient Name</th>
                  <th style={{ padding: '12px 15px' }}>Age</th>
                  <th style={{ padding: '12px 15px' }}>District</th>
                  <th style={{ padding: '12px 15px' }}>Hospital</th>
                  <th style={{ padding: '12px 15px' }}>Severity</th>
                  <th style={{ padding: '12px 15px' }}>Status</th>
                  <th style={{ padding: '12px 15px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item, index) => (
                  <tr key={item.id || index} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>#{item.id}</td>
                    <td style={{ padding: '12px 15px' }}>{item.patient_name}</td>
                    <td style={{ padding: '12px 15px' }}>{item.age}</td>
                    <td style={{ padding: '12px 15px' }}>{item.district}</td>
                    <td style={{ padding: '12px 15px' }}>{item.hospital_name}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: item.severity === 'High' ? '#e74c3c' : item.severity === 'Medium' ? '#f39c12' : '#2ecc71'
                      }}>
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>{item.status}</td>
                    <td style={{ padding: '12px 15px' }}>{`${item.date || 5} ${item.month || 'Nov'}, ${item.year || 2026}`}</td>
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
