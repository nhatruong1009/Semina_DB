import React, { useState, useEffect } from 'react';
import { adminCompanyAPI } from '../api';
import '../styles/AdminCompany.css';

const AdminCompany = () => {
  const [companies, setCompanies] = useState([]);
  const [newCompany, setNewCompany] = useState({ name: '', industry: '', description: '', adminUserId: '' });

  useEffect(() => {
    adminCompanyAPI.getAllCompanies().then(res => setCompanies(res.data));
  }, []);

  const handleCreateCompany = async () => {
    try {
      const res = await adminCompanyAPI.createCompanyWithAdmin(
        newCompany.name,
        newCompany.industry,
        newCompany.description,
        newCompany.adminEmail
      );
      setCompanies([...companies, res.data]);
      setNewCompany({ name: '', industry: '', description: '', adminEmail: '' });
    } catch (err) {
      console.error('Error creating company:', err);
    }
  };

  return (
    <div className="admin-company-container">
      <h2>Admin Company Management</h2>

      <section className="create-company">
        <h3>Create Company & Assign Admin</h3>
        <input
          type="text"
          placeholder="Company Name"
          value={newCompany.name}
          onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Industry"
          value={newCompany.industry}
          onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={newCompany.description}
          onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
        />
        <input
          type="email"
          placeholder="Admin Email"
          value={newCompany.adminEmail}
          onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
        />

        <button onClick={handleCreateCompany}>Create Company</button>
      </section>

      <section className="all-companies">
        <h3>All Companies</h3>
        <ul>
          {companies.map(c => (
            <li key={c.id}>{c.name} ({c.industry})</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminCompany;
