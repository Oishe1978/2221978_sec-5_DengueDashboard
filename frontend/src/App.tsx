import React, { useEffect, useState } from 'react';

interface DengueCase {
  id?: number;
  patient_name: string;
  age: number;
  district: string;
  hospital_name: string;
  severity: string;
  status: string;
  date: number;
  month: string;
  year: number;
}

export default function App() {
  const [cases, setCases] = useState<DengueCase[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [formData, setFormData] = useState<DengueCase>({
    patient_name: '',
    age: 25,
    district: 'Dhaka',
    hospital_name: '',
    severity: 'Medium',
    status: 'Admitted',
    date: 5,
    month: 'November',
    year: 2026,
  });

  // Fetch Cases from FastAPI Backend
  const fetchCases = async (district: string = 'All') => {
    setLoading(true);
    try {
      const url = district === 'All' ? '/api/cases' : `/api/cases?district=${district}`;
      const res = await fetch(url);
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(selectedDistrict);
  }, [selectedDistrict]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("Dengue Case Report Added Successfully!");
        setFormData({
          patient_name: '',
          age: 25,
          district: 'Dhaka',
          hospital_name: '',
          severity: 'Medium',
          status: 'Admitted',
          date: 5,
          month: 'November',
          year: 2026,
        });
        fetchCases(selectedDistrict);
      }
    } catch (err) {
      alert("Error adding case report!");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🦟 Dengue Dashboard & Monitoring System</h1>
      <hr />

      {/* Filter Section */}
      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
        <h3>Filter by District:</h3>
        <select 
          value={selectedDistrict} 
          onChange={(e) => setSelectedDistrict(e.target.value)}
          style={{ padding: '8px', fontSize: '16px' }}
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
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>➕ Add New Dengue Report</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Patient Name" 
            value={formData.patient_name} 
            onChange={(e) => setFormData({...formData, patient_name: e.target.value})} 
            required 
            style={{ padding: '8px' }}
          />
          <input 
            type="number" 
            placeholder="Age" 
            value={formData.age} 
            onChange={(e) => setFormData({...formData, age: Number(e.target.value)})} 
            required 
            style={{ padding: '8px' }}
          />
          <input 
            type="text" 
            placeholder="District" 
            value={formData.district} 
            onChange={(e) => setFormData({...formData, district: e.target.value})} 
            required 
            style={{ padding: '8px' }}
          />
          <input 
            type="text" 
            placeholder="Hospital Name" 
            value={formData.hospital_name} 
            onChange={(e) => setFormData({...formData, hospital_name: e.target.value})} 
            required 
            style={{ padding: '8px' }}
          />
          <select 
            value={formData.severity} 
            onChange={(e) => setFormData({...formData, severity: e.target.value})}
            style={{ padding: '8px' }}
          >
            <option value="Low">Low Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="High">High Severity</option>
          </select>
          <select 
            value={formData.status} 
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            style={{ padding: '8px' }}
          >
            <option value="Admitted">Admitted</option>
            <option value="Recovered">Recovered</option>
            <option value="Critical">Critical</option>
          </select>
          <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Submit Report
          </button>
        </form>
      </div>

      {/* Dengue Cases Table */}
      <h3>📊 Reported Dengue Cases</h3>
      {loading ? <p>Loading cases...</p> : (
        <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#eee' }}>
              <th>ID</th>
              <th>Patient</th>
              <th>Age</th>
              <th>District</th>
              <th>Hospital</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.patient_name}</td>
                <td>{item.age}</td>
                <td>{item.district}</td>
                <td>{item.hospital_name}</td>
                <td>{item.severity}</td>
                <td>{item.status}</td>
                <td>{`${item.date} ${item.month}, ${item.year}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
