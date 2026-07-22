import React, { useState } from 'react';
import api from './api'; 

export default function AddStaff() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Recruiter', 
    birthday: '1990-01-01' 
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await api.post('/Users/create-staff', formData);
      setMessage(`Success: ${res.data.message}`);
      
      
      setFormData({ ...formData, fullName: '', email: '', password: '' }); 
    } catch (err) {
      console.error("Staff Creation Error:", err);
      setMessage(`Error: ${err.response?.data || err.message || 'Something went wrong'}`);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Add New Staff</h2>
      
      {message && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${message.startsWith('Success') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="text" 
          placeholder="Full Name" 
          required
          value={formData.fullName}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all" 
          onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
        />
        
        <input 
          type="email" 
          placeholder="Email address" 
          required
          value={formData.email}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all" 
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          required
          value={formData.password}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all" 
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
        />

        <select 
          value={formData.role}
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all [&>option]:text-black"
        >
          <option value="Recruiter">Recruiter</option>
          <option value="HiringManager">Hiring Manager</option>
        </select>

        <button 
          type="submit" 
          className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-500 transition-all"
        >
          CREATE STAFF
        </button>
      </form>
    </div>
  );
}