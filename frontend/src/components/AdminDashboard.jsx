import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [candidatesList, setCandidatesList] = useState([]); 
  const [allJobsList, setAllJobsList] = useState([]); 

  // Form states
  const [newDept, setNewDept] = useState({ name: '', headOfDepartment: '' });
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'Recruiter', departmentName: '' });
  
  // Toast & Confirm States 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, action: null });

  // Pagination States for Staff Table 
  const [staffPage, setStaffPage] = useState(1);
  const staffPerPage = 5; 

  const displayToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name;
      if (name) setUserName(name);
    } catch (e) { console.error(e); }

    fetchDepartments();
    fetchStaff();
    fetchCandidatesList();
    fetchAllJobs();
  }, []);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/Departments/all', { headers: { Authorization: `Bearer ${token}` }});
      setDepartments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/Users/staff', { headers: { Authorization: `Bearer ${token}` }});
      setStaff(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCandidatesList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/Users/candidates', { headers: { Authorization: `Bearer ${token}` }});
      setCandidatesList(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAllJobs = async () => {
    try {
      const res = await api.get('/Jobs/all');
      setAllJobsList(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // Staff Pagination Calculations 
  const indexOfLastStaff = staffPage * staffPerPage;
  const indexOfFirstStaff = indexOfLastStaff - staffPerPage;
  const currentStaff = staff.slice(indexOfFirstStaff, indexOfLastStaff);
  const totalStaffPages = Math.ceil(staff.length / staffPerPage);
  const paginateStaff = (pageNumber) => setStaffPage(pageNumber);

  const exportCandidatesPDF = () => {
    const doc = new jsPDF();
    doc.text("Registered Candidates Report - RecruitPro", 14, 15);
    const tableColumn = ["ID", "Full Name", "Email", "Phone Number", "Skills"];
    const tableRows = [];
    candidatesList.forEach(candidate => {
      tableRows.push([candidate.id, candidate.fullName, candidate.email, candidate.phoneNumber || 'N/A', candidate.skills || 'N/A']);
    });
    // Fixed autoTable usage
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Candidates_Report.pdf");
    displayToast('Candidates PDF downloaded successfully!', 'success');
  };

  const exportCandidatesCSV = () => {
    const headers = ["ID", "Full Name", "Email", "Phone Number", "Skills"];
    const rows = candidatesList.map(c => [c.id, `"${c.fullName}"`, `"${c.email}"`, `"${c.phoneNumber || ''}"`, `"${(c.skills || '').replace(/"/g, '""')}"`]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Candidates_Report.csv");
    document.body.appendChild(link);
    link.click();
    displayToast('Candidates CSV downloaded successfully!', 'success');
  };

  const exportJobsPDF = () => {
    const doc = new jsPDF();
    doc.text("Job Postings Report - RecruitPro", 14, 15);
    const tableColumn = ["ID", "Job Title", "Department", "Location", "Type", "Posted Date"];
    const tableRows = [];
    allJobsList.forEach(job => {
      tableRows.push([job.id, job.title, job.departmentName || 'General', job.location, job.jobType, new Date(job.postedDate).toLocaleDateString()]);
    });
    // Fixed autoTable usage
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Jobs_Report.pdf");
    displayToast('Jobs PDF downloaded successfully!', 'success');
  };

  const exportJobsCSV = () => {
    const headers = ["ID", "Job Title", "Department", "Location", "Type", "Posted Date"];
    const rows = allJobsList.map(j => [j.id, `"${j.title}"`, `"${j.departmentName || 'General'}"`, `"${j.location}"`, j.jobType, new Date(j.postedDate).toLocaleDateString()]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Jobs_Report.csv");
    document.body.appendChild(link);
    link.click();
    displayToast('Jobs CSV downloaded successfully!', 'success');
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/Departments/create', newDept, { headers: { Authorization: `Bearer ${token}` }});
      displayToast('Department created successfully!', 'success');
      setNewDept({ name: '', headOfDepartment: '' });
      fetchDepartments();
    } catch (err) { displayToast(err.response?.data || 'Failed to create department.', 'error'); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.departmentName && newStaff.role !== 'Admin') {
      displayToast('Please select a department using the chips!', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await api.post('/Users/create-staff', { ...newStaff, birthday: new Date().toISOString() }, { headers: { Authorization: `Bearer ${token}` }});
      displayToast(`${newStaff.role} created successfully!`, 'success');
      setNewStaff({ fullName: '', email: '', password: '', role: 'Recruiter', departmentName: '' });
      fetchStaff();
    } catch (err) { displayToast(err.response?.data || 'Failed to create staff.', 'error'); }
  };

  const handleRevoke = (id) => {
    setConfirmDialog({
      show: true,
      action: async () => {
        try {
          const token = localStorage.getItem('token');
          await api.delete(`/Users/${id}`, { headers: { Authorization: `Bearer ${token}` }});
          displayToast('User revoked successfully.', 'success');
          fetchStaff();
        } catch (err) { 
          displayToast(err.response?.data || 'Failed to revoke user.', 'error'); 
        } finally {
          setConfirmDialog({ show: false, action: null });
        }
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#090014] text-white flex flex-col relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-700/10 blur-[150px] rounded-full"></div>
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-fuchsia-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in font-medium text-sm backdrop-blur-xl border ${
          toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '❌' : '✨'}</span>
          {toast.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-4 md:px-8 border-b border-white/5 bg-white/[0.02] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]">R</div>
          <span className="font-extrabold text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">RecruitPro</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-white/60 text-sm font-medium hidden md:block">{userName}</span>
          <button onClick={handleLogout} className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">Log Out</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 animate-fade-in">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3 tracking-tight">
              Administration Portal ⚙️
            </h1>
            <p className="text-white/50 text-base">System Configuration, Users & Organization Management</p>
          </div>
          
          <div className="flex flex-wrap bg-white/[0.02] p-1.5 rounded-full border border-white/5 shadow-inner backdrop-blur-xl">
            <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-white/50 hover:text-white'}`}>👥 Users & Roles</button>
            <button onClick={() => setActiveTab('departments')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'departments' ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-white/50 hover:text-white'}`}>🏢 Departments</button>
            <button onClick={() => setActiveTab('monitoring')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'monitoring' ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-white/50 hover:text-white'}`}>📊 Monitoring</button>
            <button onClick={() => setActiveTab('reports')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'reports' ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-white/50 hover:text-white'}`}>📑 Reports</button>
          </div>
        </div>

        {/* TAB 1: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
             <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 p-8 rounded-3xl h-fit shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-bold mb-6 text-white border-b border-white/5 pb-4">Add System Staff</h2>
              <form onSubmit={handleCreateStaff} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Full Name</label>
                  <input required type="text" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Email Address</label>
                  <input required type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Password</label>
                  <input required type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Assign Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-full p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="Recruiter" className="bg-[#150524]">Recruiter</option>
                    <option value="Hiring Manager" className="bg-[#150524]">Hiring Manager</option>
                    <option value="Admin" className="bg-[#150524]">Admin</option>
                  </select>
                </div>

                {newStaff.role !== 'Admin' && (
                  <div className="pt-2">
                    <label className="block text-sm font-semibold text-white/70 mb-3 ml-2">Assign Department</label>
                    <div className="flex flex-wrap gap-2">
                      {departments.length > 0 ? departments.map((dept) => (
                        <button key={dept.id} type="button" onClick={() => setNewStaff({...newStaff, departmentName: dept.name})} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${newStaff.departmentName === dept.name ? 'bg-fuchsia-500/20 text-fuchsia-300 shadow-inner border border-fuchsia-500/50' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10 hover:border-white/20'}`}>
                          {dept.name}
                        </button>
                      )) : <span className="text-white/40 text-sm italic ml-2">Please create a department first.</span>}
                    </div>
                  </div>
                )}
                <div className="pt-4">
                  <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-4 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                    CREATE USER
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex flex-col justify-between shadow-2xl backdrop-blur-xl">
              <div>
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <h2 className="text-xl font-bold text-white">Staff Directory</h2>
                  <span className="bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 py-1.5 px-4 rounded-full text-xs font-bold shadow-inner">
                    Total Staff: {staff.length}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#150524]/40 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#150524] border-b border-white/10 text-white/60 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="p-5">Name & Email</th>
                        <th className="p-5 text-center">Role</th>
                        <th className="p-5">Department</th>
                        <th className="p-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentStaff.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-5">
                            <p className="font-bold text-white group-hover:text-fuchsia-300 transition-colors">{user.fullName}</p>
                            <p className="text-xs text-white/40 mt-0.5">{user.email}</p>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'Admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                              user.role === 'Hiring Manager' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-5 text-white/60 text-sm font-medium">{user.departmentName || 'General Access'}</td>
                          <td className="p-5 text-center">
                            <button onClick={() => handleRevoke(user.id)} className="bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-red-400/70 hover:text-red-400 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm">
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                      {currentStaff.length === 0 && <tr><td colSpan="4" className="text-center p-10 text-white/40 italic">No staff members found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff Pagination Controls */}
              {totalStaffPages > 1 && (
                <div className="flex justify-between items-center mt-6 p-4 border border-white/5 rounded-2xl bg-white/[0.02] shadow-inner">
                   <p className="text-sm text-white/50 font-medium">Page {staffPage} of {totalStaffPages}</p>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => paginateStaff(staffPage - 1)} 
                        disabled={staffPage === 1}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
                      >
                        ← Prev
                      </button>
                      <button 
                        onClick={() => paginateStaff(staffPage + 1)} 
                        disabled={staffPage === totalStaffPages}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
                      >
                        Next →
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Current Departments</h2>
              <div className="space-y-4">
                {departments.map(dept => (
                  <div key={dept.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center hover:bg-white/10 hover:border-fuchsia-500/30 transition-all group shadow-inner">
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-fuchsia-300 transition-colors">{dept.name}</h3>
                      <p className="text-white/40 text-sm mt-1 font-medium flex items-center gap-1">👤 Head: {dept.headOfDepartment || 'Not Assigned'}</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 shadow-inner">Active</div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <div className="text-center p-12 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-white/40 font-medium">No departments configured yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl h-fit shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Add New Department</h2>
              <form onSubmit={handleCreateDepartment} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Department Name</label>
                  <input required type="text" placeholder="e.g. Finance & Accounting" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2 ml-2">Department Head (Optional)</label>
                  <input type="text" placeholder="e.g. Mr. Samantha" value={newDept.headOfDepartment} onChange={e => setNewDept({...newDept, headOfDepartment: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                </div>
                <div className="pt-4">
                  <button type="submit" className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] w-full">
                    + CREATE DEPARTMENT
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: MONITORING */}
        {activeTab === 'monitoring' && (
          <div className="animate-fade-in bg-white/[0.02] border border-white/5 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">System Monitoring & Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-inner relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">👥 Total Staff</p>
                <p className="text-4xl font-black text-white relative z-10">{staff.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-inner relative overflow-hidden group hover:border-fuchsia-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <p className="text-fuchsia-300 text-xs font-bold uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">📄 Total Candidates</p>
                <p className="text-4xl font-black text-white relative z-10">{candidatesList.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-inner relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <p className="text-orange-300 text-xs font-bold uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">🏢 Departments</p>
                <p className="text-4xl font-black text-white relative z-10">{departments.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-inner relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">🟢 System Health</p>
                <p className="text-2xl font-black text-white relative z-10 flex items-center gap-2 mt-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> 100% Online
                </p>
              </div>
            </div>

            <div className="bg-[#090014] border border-white/10 rounded-2xl p-6 font-mono text-sm text-emerald-400/80 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
              <p className="text-white/50 mb-6 flex items-center gap-2 font-bold font-sans text-xs tracking-widest uppercase">🖥️ Live Server Terminal</p>
              <div className="space-y-2 opacity-80">
                <p>[INFO] Application Started Successfully on Port 7186.</p>
                <p>[INFO] SMTP Email Service connection successful.</p>
                <p>[INFO] DB connection established to RecruitProDB.</p>
                <p>[INFO] AI Model 'Gemini-Flash' responding normally with 84ms latency.</p>
                <p className="animate-pulse mt-4 text-emerald-300">_</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS */}
        {activeTab === 'reports' && (
           <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Candidates Report Card */}
              <div className="bg-white/[0.02] border border-fuchsia-500/20 p-8 md:p-10 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(217,70,239,0.05)] hover:shadow-[0_0_40px_rgba(217,70,239,0.1)] transition-all backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="w-14 h-14 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl flex items-center justify-center text-fuchsia-400 mb-6 shadow-inner text-2xl">👥</div>
                <h2 className="text-2xl font-bold text-white mb-3 relative z-10">Candidates Report</h2>
                <p className="text-white/50 text-sm mb-10 relative z-10 leading-relaxed">Download a complete list of all registered candidates, including their extracted skills, contact info, and system IDs.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                  <button onClick={exportCandidatesPDF} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                    <span>📄</span> PDF
                  </button>
                  <button onClick={exportCandidatesCSV} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 px-6 rounded-full transition-all border border-white/10 shadow-sm">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>

              {/* Jobs Report Card */}
              <div className="bg-white/[0.02] border border-purple-500/20 p-8 md:p-10 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(147,51,234,0.05)] hover:shadow-[0_0_40px_rgba(147,51,234,0.1)] transition-all backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 shadow-inner text-2xl">💼</div>
                <h2 className="text-2xl font-bold text-white mb-3 relative z-10">Job Postings Report</h2>
                <p className="text-white/50 text-sm mb-10 relative z-10 leading-relaxed">Download a structured summary of all job postings across all departments, including locations, types, and published dates.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                  <button onClick={exportJobsPDF} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                    <span>📄</span> PDF
                  </button>
                  <button onClick={exportJobsCSV} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 px-6 rounded-full transition-all border border-white/10 shadow-sm">
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>

           </div>
        )}
      </main>

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090014]/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#150524] border border-red-500/30 rounded-3xl w-full max-w-sm p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Revoke Access?</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              You are about to permanently remove this user's access from the system. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDialog.action} 
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)]"
              >
                Yes, Revoke User
              </button>
              <button 
                onClick={() => setConfirmDialog({ show: false, action: null })} 
                className="w-full py-3.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}