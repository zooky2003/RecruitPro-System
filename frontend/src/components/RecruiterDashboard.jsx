import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api';
import GlassCard from './GlassCard';

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [userName, setUserName] = useState('');
  const [userDepartment, setUserDepartment] = useState(''); 
  
  const [jobData, setJobData] = useState({ title: '', description: '', location: '', jobType: 'Full-Time' });
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Modal States
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewData, setInterviewData] = useState({
    date: '', time: '', duration: '60', type: 'Virtual (Zoom/Meet)'
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editJobData, setEditJobData] = useState({ id: '', title: '', description: '', location: '', jobType: '' });

  // Custom Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Custom Confirm/Delete Modal State
  const [confirmDialog, setConfirmDialog] = useState({ show: false, jobId: null, jobTitle: '' });

  // Pagination States for Jobs
  const [currentPageJobs, setCurrentPageJobs] = useState(1);
  const jobsPerPage = 5;

  // Pagination States for Candidates
  const [currentPageCandidates, setCurrentPageCandidates] = useState(1);
  const candidatesPerPage = 5;

  const displayToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name || payload.unique_name;
        const dept = payload['Department'] || payload.Department || 'General';
        
        if (name) setUserName(name);
        setUserDepartment(dept);
      } catch (error) { console.error("Error decoding token:", error); }
    }
    fetchMyPostedJobs();
    fetchStats();
  }, []);

  const fetchMyPostedJobs = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.get('/Jobs/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMyJobs(res.data);
    } catch (err) { console.error("Error fetching jobs:", err); }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.get('/Jobs/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) { console.error("Error fetching stats:", err); }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchMyPostedJobs();
      fetchStats(); 
    } else if (activeTab === 'candidates') {
      fetchMyPostedJobs();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await api.post('/Jobs/create', jobData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      displayToast('Success: Job posted successfully!', 'success');
      setJobData({ title: '', description: '', location: '', jobType: 'Full-Time' }); 
      fetchMyPostedJobs(); 
    } catch (err) {
      displayToast(`Error: ${err.response?.data || err.message}`, 'error');
    }
  };

  const openDeleteConfirm = (jobId, jobTitle) => {
    setConfirmDialog({ show: true, jobId, jobTitle });
  };

  const handleDeleteJob = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.delete(`/Jobs/delete/${confirmDialog.jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      displayToast("Job deleted successfully!", "success");
      setConfirmDialog({ show: false, jobId: null, jobTitle: '' });
      fetchMyPostedJobs(); 
      fetchStats();
    } catch (err) {
      displayToast(`Failed to delete job: ${err.response?.data || err.message}`, "error");
    }
  };

  const openEditModal = (job) => {
    setEditJobData(job);
    setShowEditModal(true);
  };

  const handleUpdateJobSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await api.put(`/Jobs/update/${editJobData.id}`, editJobData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      displayToast("Job updated successfully!", "success");
      setShowEditModal(false);
      fetchMyPostedJobs(); 
    } catch (err) {
      displayToast(`Failed to update job: ${err.response?.data || err.message}`, "error");
    }
  };

  const handleJobSelection = async (e) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
    setCurrentPageCandidates(1); 
    if (!jobId) { setCandidates([]); return; }
    
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.get(`/Jobs/applications/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCandidates(res.data);
    } catch (err) { console.error("Error fetching candidates:", err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (appId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await api.put(`/Jobs/update-status/${appId}`, { status: newStatus }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCandidates(candidates.map(c => c.appId === appId ? { ...c, status: newStatus } : c));
      displayToast(`Status updated to ${newStatus}!`, "success");
      fetchStats(); 
    } catch (err) { 
      console.error("Error updating status:", err); 
      displayToast("Failed to update status", "error");
    }
  };

  const generateGoogleCalendarLink = (candidate, interview) => {
    const startDateTime = new Date(`${interview.date}T${interview.time}`).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(new Date(`${interview.date}T${interview.time}`).getTime() + interview.duration * 60000);
    const endDateTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview: ${candidate.candidateName}`)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(`Interview with ${candidate.candidateName}`)}`;
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await api.post('/Jobs/schedule-interview', {
        appId: selectedCandidate.appId, date: interviewData.date, time: interviewData.time, type: interviewData.type
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      
      window.open(generateGoogleCalendarLink(selectedCandidate, interviewData), '_blank');
      displayToast(`Interview scheduled for ${selectedCandidate.candidateName}!`, "success");
      setShowInterviewModal(false);
    } catch (err) {
      displayToast(`Error scheduling interview: ${err.response?.data || err.message}`, "error");
    }
  };

  const getStatusChartData = () => {
    if (!stats || !stats.statusDistribution) return { max: 1, data: [] };
    const max = Math.max(...stats.statusDistribution.map(s => s.count), 1);
    const colorMap = { 
      'Pending': 'from-yellow-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]', 
      'Shortlisted': 'from-fuchsia-400 to-purple-600 shadow-[0_0_10px_rgba(217,70,239,0.5)]', 
      'Rejected': 'from-red-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]', 
      'Hired': 'from-emerald-400 to-teal-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
    };
    const textColors = {
      'Pending': 'text-amber-300',
      'Shortlisted': 'text-fuchsia-300',
      'Rejected': 'text-rose-300',
      'Hired': 'text-emerald-300'
    };
    return { max, data: stats.statusDistribution, colorMap, textColors };
  };

  const getScoreChartData = () => {
    if (!stats || !stats.scoreDistribution) return { max: 1, bins: [] };
    const bins = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    stats.scoreDistribution.forEach(s => {
      const score = s.aiScore || 0;
      if (score <= 20) bins['0-20']++;
      else if (score <= 40) bins['21-40']++;
      else if (score <= 60) bins['41-60']++;
      else if (score <= 80) bins['61-80']++;
      else bins['81-100']++;
    });
    const max = Math.max(...Object.values(bins), 1);
    return { max, bins: Object.entries(bins) };
  };

  const statusData = getStatusChartData();
  const scoreData = getScoreChartData();

  // Pagination Calculations
  const indexOfLastJob = currentPageJobs * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = myJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalJobPages = Math.ceil(myJobs.length / jobsPerPage);
  const paginateJobs = (pageNumber) => setCurrentPageJobs(pageNumber);

  const indexOfLastCandidate = currentPageCandidates * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = candidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalCandidatePages = Math.ceil(candidates.length / candidatesPerPage);
  const paginateCandidates = (pageNumber) => setCurrentPageCandidates(pageNumber);

  return (
    <div className="min-h-screen w-full bg-[#090014] text-white flex flex-col relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      
      {/* Background Glowing Orbs */}
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

      {/* Main Container Wrapper */}
      <div className="relative z-10 flex flex-col h-full w-full">
        <Navbar userName={userName} role="Recruiter" activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

        <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
          <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-fade-in">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3 tracking-tight">
                Welcome, {userName || 'Recruiter'}! 
              </h1>
              <p className="text-white/50 text-base md:text-lg">Manage job postings and find the best talent.</p>
            </div>
            
            {/* Department Badge */}
            <div className="bg-white/[0.02] border border-white/10 px-5 py-3 rounded-full flex items-center gap-3 shadow-inner backdrop-blur-xl hover:border-fuchsia-500/50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.8)]"></div>
              <span className="text-white/60 text-sm font-medium">Department:</span>
              <span className="bg-fuchsia-500/10 text-fuchsia-300 text-sm font-bold px-3 py-1.5 rounded-full border border-fuchsia-500/20">
                {userDepartment}
              </span>
            </div>
          </div>

          <GlassCard className="w-full p-6 md:p-8 relative overflow-hidden shadow-2xl border-white/5">
            
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/5 pb-4">Overview & Statistics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-inner group hover:border-fuchsia-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="text-fuchsia-400 text-sm font-bold mb-2 flex items-center gap-2">🏢 Active Jobs</div>
                      <div className="text-5xl font-black text-white tracking-tighter">{myJobs.length || 0}</div>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-inner group hover:border-purple-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="text-purple-400 text-sm font-bold mb-2 flex items-center gap-2">👥 Total Applicants</div>
                      <div className="text-5xl font-black text-white tracking-tighter">
                        {stats?.scoreDistribution?.length || 0}
                      </div> 
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-inner group hover:border-fuchsia-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="text-fuchsia-400 text-sm font-bold mb-2 flex items-center gap-2">🎯 Shortlisted / Hired</div>
                      <div className="text-5xl font-black text-white tracking-tighter">
                        {stats?.statusDistribution?.filter(s => s.status === 'Shortlisted' || s.status === 'Hired').reduce((a, b) => a + b.count, 0) || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Polished Status Chart */}
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between shadow-2xl backdrop-blur-xl">
                      <h3 className="text-lg font-bold mb-6 text-white/80">Application Status</h3>
                      {statusData.data.length > 0 ? (
                        <div className="space-y-6">
                          {statusData.data.map(item => (
                            <div key={item.status} className="group">
                              <div className="flex justify-between text-sm mb-2 font-medium">
                                <span className={`font-semibold ${statusData.textColors[item.status] || 'text-white'}`}>{item.status}</span>
                                <span className="text-white/60">{item.count} Candidates</span>
                              </div>
                              <div className="w-full bg-white/[0.03] rounded-full h-3.5 overflow-hidden border border-white/5 p-[1px]">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${statusData.colorMap[item.status] || 'from-fuchsia-500 to-purple-500'} transition-all duration-1000 ease-out`} 
                                  style={{ width: `${(item.count / statusData.max) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-white/30 border border-dashed border-white/10 rounded-2xl py-12">No application data yet</div>
                      )}
                    </div>

                    {/* Polished Bar Chart */}
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between shadow-2xl backdrop-blur-xl">
                      <h3 className="text-lg font-bold mb-6 text-white/80">AI Match Score Distribution</h3>
                      {stats.scoreDistribution?.length > 0 ? (
                        <div className="flex items-end justify-between h-48 mt-4 gap-3 border-b border-white/10 pb-2">
                          {scoreData.bins.map(([label, count]) => (
                            <div key={label} className="flex flex-col items-center flex-1 group h-full justify-end relative">
                              {/* Hover Tooltip */}
                              <span className="absolute -top-7 text-xs font-bold text-fuchsia-300 opacity-0 group-hover:opacity-100 transition-opacity bg-fuchsia-500/10 px-2.5 py-1 rounded-xl border border-fuchsia-500/20 shadow-lg">
                                {count} applicants
                              </span>
                              <div 
                                className="w-full bg-gradient-to-t from-purple-600 to-fuchsia-500 rounded-t-xl transition-all duration-1000 ease-out opacity-80 group-hover:opacity-100 shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_25px_rgba(217,70,239,0.6)]" 
                                style={{ 
                                  height: `${(count / scoreData.max) * 100}%`, 
                                  minHeight: count > 0 ? '6px' : '2px' 
                                }}
                              ></div>
                              <span className="text-[10px] md:text-xs text-white/40 mt-3 font-semibold whitespace-nowrap">{label}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-white/30 border border-dashed border-white/10 rounded-2xl py-12">No AI scores generated yet</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-white/50 text-center py-10">Loading statistics...</p>
                )}

                {/* Manage Posted Jobs */}
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Manage Posted Jobs</h2>
                    <button 
                      onClick={() => setActiveTab('post-job')} 
                      className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-bold px-6 py-3 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:scale-105"
                    >
                      + Create New Job
                    </button>
                  </div>
                  
                  {myJobs.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-fuchsia-500/30 rounded-3xl bg-fuchsia-500/5">
                      <p className="text-white/50">No jobs have been posted in your department yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#150524]/40 shadow-inner">
                      <table className="w-full text-left">
                        <thead className="bg-[#150524] border-b border-white/10">
                          <tr className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            <th className="p-5">Job Title</th>
                            <th className="p-5">Location</th>
                            <th className="p-5 text-center">Type</th>
                            <th className="p-5 text-center">Date Posted</th>
                            <th className="p-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentJobs.map(job => (
                            <tr key={job.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-5 font-bold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">{job.title}</td>
                              <td className="p-5 text-white/60 text-sm font-medium">{job.location}</td>
                              <td className="p-5 text-center">
                                <span className="bg-white/5 border border-white/10 text-white/80 text-xs font-bold px-3 py-1.5 rounded-full">{job.jobType}</span>
                              </td>
                              <td className="p-5 text-center text-white/50 text-sm font-semibold">
                                {new Date(job.postedDate).toLocaleDateString()}
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex justify-end gap-3">
                                  <button onClick={() => openEditModal(job)} className="bg-white/5 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/40 text-fuchsia-300 font-bold px-4 py-2 rounded-full text-xs transition-colors" title="Edit Job">
                                    Edit
                                  </button>
                                  <button onClick={() => openDeleteConfirm(job.id, job.title)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold px-4 py-2 rounded-full text-xs transition-colors" title="Delete Job">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Job Pagination */}
                      {totalJobPages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-white/5 bg-white/[0.01]">
                          <p className="text-sm text-white/50 font-medium">Page {currentPageJobs} of {totalJobPages}</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => paginateJobs(currentPageJobs - 1)} 
                              disabled={currentPageJobs === 1}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                            >
                              ← Prev
                            </button>
                            <button 
                              onClick={() => paginateJobs(currentPageJobs + 1)} 
                              disabled={currentPageJobs === totalJobPages}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'post-job' && (
               <div className="animate-fade-in">
               <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                 <button onClick={() => setActiveTab('dashboard')} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2.5 rounded-full border border-white/5">← Back</button>
                 <h2 className="text-2xl font-bold text-white">Post a New Job</h2>
               </div>
               
               <div className="bg-fuchsia-900/10 border border-fuchsia-500/30 p-5 rounded-2xl mb-6 flex items-start gap-3">
                  <span className="text-fuchsia-400 text-xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-fuchsia-200 font-bold">Automatic Department Assignment</p>
                    <p className="text-xs text-white/60 mt-1">This job will be securely and automatically assigned to the <strong>{userDepartment}</strong> department. You do not need to select it manually.</p>
                  </div>
               </div>
               
               <form onSubmit={handleJobSubmit} className="space-y-6 max-w-2xl">
                 <div>
                   <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Title</label>
                   <input type="text" required value={jobData.title} onChange={(e) => setJobData({...jobData, title: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Location</label>
                     <input type="text" required value={jobData.location} onChange={(e) => setJobData({...jobData, location: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                   </div>
                   <div>
                      <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Type</label>
                      <select required value={jobData.jobType} onChange={(e) => setJobData({...jobData, jobType: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all cursor-pointer shadow-inner appearance-none">
                        <option value="Full-Time" className="bg-[#150524]">Full-Time</option>
                        <option value="Part-Time" className="bg-[#150524]">Part-Time</option>
                        <option value="Contract" className="bg-[#150524]">Contract</option>
                        <option value="Remote" className="bg-[#150524]">Remote</option>
                      </select>
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Description & Requirements</label>
                   <textarea rows="6" required value={jobData.description} onChange={(e) => setJobData({...jobData, description: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all resize-none shadow-inner"></textarea>
                 </div>
                 <div className="pt-4">
                   <button type="submit" className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black py-4 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                     POST JOB
                   </button>
                 </div>
               </form>
             </div>
            )}

            {activeTab === 'candidates' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/5 pb-4">Review Ranked Applicants</h2>
                <div className="mb-8">
                  <div className="relative max-w-md">
                    <select value={selectedJobId} onChange={handleJobSelection} className="w-full bg-white/[0.02] border border-white/10 rounded-full py-4 pl-6 pr-12 text-white font-medium outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all cursor-pointer appearance-none shadow-inner">
                      <option value="" className="bg-[#150524] text-white/50">-- Choose a Job --</option>
                      {myJobs.map(job => <option key={job.id} value={job.id} className="bg-[#150524]">{job.title}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">▼</div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="w-12 h-12 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">AI is analyzing candidates...</p>
                  </div>
                ) : selectedJobId && candidates.length > 0 ? (
                  <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#150524]/40 shadow-xl">
                    <table className="w-full text-left">
                      <thead className="bg-[#150524] border-b border-white/10">
                        <tr className="text-white/70 text-xs font-bold uppercase tracking-widest">
                          <th className="p-5">Rank</th>
                          <th className="p-5">Candidate</th>
                          <th className="p-5 text-center">AI Score</th>
                          <th className="p-5 text-center">CV</th>
                          <th className="p-5 text-center">Status</th>
                          <th className="p-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {currentCandidates.map((c, i) => (
                          <tr key={c.appId} className="hover:bg-white/5 transition-colors group">
                            <td className="p-5 font-bold text-fuchsia-300">#{indexOfFirstCandidate + i + 1}</td>
                            <td className="p-5 font-bold text-white group-hover:text-fuchsia-300 transition-colors">{c.candidateName}</td>
                            <td className="p-5 text-center">
                              <span className="px-3.5 py-1.5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded-full text-xs font-bold shadow-inner">
                                {c.aiScore}%
                              </span>
                            </td>
                            <td className="p-5 text-center">
                              {c.cvFilePath ? (
                                <a href={`https://localhost:7186${c.cvFilePath}`} target="_blank" rel="noreferrer" className="text-lg hover:scale-115 transition-transform inline-block p-2 bg-white/5 border border-white/10 rounded-full" title="View CV">📄</a>
                              ) : (
                                <span className="text-white/30 text-xs font-semibold">No CV</span>
                              )}
                            </td>
                            <td className="p-5 text-center">
                              {c.status === 'Hired' ? (
                                <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/30">Hired ✅</span>
                              ) : (
                                <select value={c.status} onChange={(e) => handleStatusChange(c.appId, e.target.value)} className="bg-transparent border border-white/10 rounded-full px-4 py-1.5 outline-none cursor-pointer text-xs font-bold text-center">
                                  {['Pending', 'Shortlisted', 'Rejected'].map(s => <option key={s} className="bg-[#150524]" value={s}>{s}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="p-5 text-center">
                              {c.status === 'Shortlisted' && (
                                <button onClick={() => { setSelectedCandidate(c); setShowInterviewModal(true); }} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                                  📅 Schedule
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Candidate Pagination */}
                    {totalCandidatePages > 1 && (
                      <div className="flex justify-between items-center p-4 border-t border-white/5 bg-[#150524]/20">
                        <p className="text-sm text-white/50 font-medium">Page {currentPageCandidates} of {totalCandidatePages}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => paginateCandidates(currentPageCandidates - 1)} 
                            disabled={currentPageCandidates === 1}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                          >
                            ← Prev
                          </button>
                          <button 
                            onClick={() => paginateCandidates(currentPageCandidates + 1)} 
                            disabled={currentPageCandidates === totalCandidatePages}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedJobId ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                    <p className="text-white/40">No applicants found for this position yet.</p>
                  </div>
                ) : null}
              </div>
            )}
          </GlassCard>
        </main>
      </div>

      {/* Edit Job Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#150524] border border-fuchsia-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#1a0a2e] p-6 flex justify-between items-center border-b border-fuchsia-500/30">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">✏️ Edit Job Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/50 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleUpdateJobSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Title</label>
                <input type="text" required value={editJobData.title} onChange={(e) => setEditJobData({...editJobData, title: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-fuchsia-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Location</label>
                   <input type="text" required value={editJobData.location} onChange={(e) => setEditJobData({...editJobData, location: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-fuchsia-500 transition-colors" />
                 </div>
                 <div>
                    <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Type</label>
                    <select required value={editJobData.jobType} onChange={(e) => setEditJobData({...editJobData, jobType: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-fuchsia-500 transition-colors appearance-none cursor-pointer">
                      <option value="Full-Time" className="bg-[#150524]">Full-Time</option>
                      <option value="Part-Time" className="bg-[#150524]">Part-Time</option>
                      <option value="Contract" className="bg-[#150524]">Contract</option>
                      <option value="Remote" className="bg-[#150524]">Remote</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2 ml-2 font-bold">Job Description</label>
                <textarea rows="5" required value={editJobData.description} onChange={(e) => setEditJobData({...editJobData, description: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-4 text-white outline-none focus:border-fuchsia-500 transition-colors resize-none"></textarea>
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t border-white/5">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 rounded-full text-white/70 hover:bg-white/10 font-bold transition-colors">Cancel</button>
                <button type="submit" className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black px-6 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#150524] border border-fuchsia-500/30 rounded-3xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="text-xl font-bold">Schedule Interview</h3>
              <button onClick={() => setShowInterviewModal(false)} className="text-white/50 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-white/50 mb-6">Set up an interview with <span className="font-bold text-fuchsia-300">{selectedCandidate?.candidateName}</span>.</p>
            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div><label className="block text-sm text-white/70 mb-1 ml-1 font-semibold">Date</label><input type="date" required onChange={(e) => setInterviewData({...interviewData, date: e.target.value})} className="w-full bg-[#090014] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer" /></div>
              <div><label className="block text-sm text-white/70 mb-1 ml-1 font-semibold">Time</label><input type="time" required onChange={(e) => setInterviewData({...interviewData, time: e.target.value})} className="w-full bg-[#090014] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer" /></div>
              <div>
                <label className="block text-sm text-white/70 mb-1 ml-1 font-semibold">Duration</label>
                <select onChange={(e) => setInterviewData({...interviewData, duration: e.target.value})} className="w-full bg-[#090014] border border-white/10 rounded-xl p-3.5 text-white cursor-pointer">
                  <option value="30">30 Minutes</option><option value="60" selected>1 Hour</option><option value="90">1.5 Hours</option>
                </select>
              </div>
              <div className="pt-3">
                <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]">📅 Schedule & Notify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal for Job Delete */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#150524] border border-fuchsia-500/30 rounded-3xl w-full max-w-sm p-8 shadow-[0_0_50px_rgba(217,70,239,0.2)] text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Are you sure?</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              You are about to delete <strong className="text-fuchsia-300">"{confirmDialog.jobTitle}"</strong>. All applicants for this job will also be removed permanently. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteJob} 
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              >
                Yes, Delete Job
              </button>
              <button 
                onClick={() => setConfirmDialog({ show: false, jobId: null, jobTitle: '' })} 
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