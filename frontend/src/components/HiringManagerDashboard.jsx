import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api';
import GlassCard from './GlassCard';

export default function HiringManagerDashboard() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName, setUserName] = useState('');
  const [userDepartment, setUserDepartment] = useState('');
  
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Evaluation Modal States
  const [evaluatingCandidate, setEvaluatingCandidate] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [managerScore, setManagerScore] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  // 🔥 Toast Notification State 🔥
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 🔥 Custom Confirm Dialog State 🔥
  const [confirmDialog, setConfirmDialog] = useState({ show: false, action: null });

  // 🔥 Pagination State 🔥
  const [currentPage, setCurrentPage] = useState(1);
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
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] 
                  || payload.name 
                  || payload.unique_name;
        const dept = payload['Department'] || payload.Department || 'General';
        
        if (name) setUserName(name);
        setUserDepartment(dept);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/Jobs/all');
      setJobs(res.data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const handleJobSelection = async (e) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
    setFetchError(''); 
    setCurrentPage(1); 
    
    if (!jobId) {
      setShortlistedCandidates([]);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.get(`/Jobs/applications/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const filteredAndSortedCandidates = res.data
        .filter(candidate => candidate.status === 'Shortlisted')
        .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)); 
        
      setShortlistedCandidates(filteredAndSortedCandidates);
      
    } catch (err) {
      console.error("Error fetching candidates:", err);
      if (err.response?.status === 403) {
        setFetchError("Permission Denied (403): Your account does not have Hiring Manager permissions for this action.");
      } else {
        setFetchError("Failed to load candidates. Make sure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationModal = (candidate) => {
    setEvaluatingCandidate(candidate);
    setFeedback('');
    setManagerScore('');
  };

  const closeEvaluationModal = () => {
    setEvaluatingCandidate(null);
    setFeedback('');
    setManagerScore('');
  };

  const handleDecision = async (appId, decision, skipConfirm = false) => {
    if (decision === 'Hired' && !feedback && !managerScore && !skipConfirm) {
      setConfirmDialog({
        show: true,
        action: () => handleDecision(appId, decision, true) 
      });
      return;
    }

    setDecisionLoading(true);
    const token = localStorage.getItem('token');
    try {
      await api.put(`/Jobs/update-status/${appId}`, {
        status: decision,
        feedback: feedback,
        score: managerScore
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      setShortlistedCandidates(shortlistedCandidates.filter(c => c.appId !== appId));
      displayToast(`Success: Candidate successfully marked as ${decision}!`, 'success');
      closeEvaluationModal();
      
    } catch (err) {
      console.error("Error updating status:", err);
      displayToast("Failed to make decision. Please try again.", 'error');
    } finally {
      setDecisionLoading(false);
      setConfirmDialog({ show: false, action: null }); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = shortlistedCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(shortlistedCandidates.length / candidatesPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
   
    <div className="min-h-screen w-full bg-[#090014] text-white flex flex-col relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      
     
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-700/10 blur-[150px] rounded-full"></div>
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-fuchsia-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

     
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in font-medium text-sm backdrop-blur-xl border ${
          toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '❌' : '✨'}</span>
          {toast.message}
        </div>
      )}

      {}
      <div className="relative z-10 flex flex-col h-full w-full">
        <Navbar 
          userName={userName} 
          role="Hiring Manager" 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          handleLogout={handleLogout} 
        />

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
          
          {/* Header Section */}
          <div className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-fade-in">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3 tracking-tight">
                Welcome, {userName || 'Hiring Manager'} 
              </h1>
              <p className="text-white/50 text-base md:text-lg max-w-2xl leading-relaxed">
                Review shortlisted talent and make final hiring decisions for your department.
              </p>
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

          <div className="w-full">
            
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stat Card 1 */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-inner group hover:border-fuchsia-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-fuchsia-400 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="text-5xl font-black text-white mb-2 tracking-tighter">{jobs.length || 0}</div>
                      <div className="text-white/50 text-sm font-medium uppercase tracking-wider">Active Jobs</div>
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-inner group hover:border-purple-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="text-3xl font-black text-white mb-2 mt-2 tracking-tight">Action Required</div> 
                      <div className="text-white/50 text-sm font-medium uppercase tracking-wider mt-4">Pending Reviews</div>
                    </div>
                  </div>

                  {/* Stat Card 3 */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-inner group hover:border-fuchsia-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-fuchsia-400 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="text-5xl font-black text-white mb-2 tracking-tighter">0</div>
                      <div className="text-white/50 text-sm font-medium uppercase tracking-wider">Interviews Conducted</div>
                    </div>
                  </div>
                </div>

                {/* Action Banner */}
                <div className="mt-8 bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-3">Ready to Make Decisions?</h3>
                    <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed">
                      Review the candidates shortlisted by your recruitment team. Evaluate their profiles, interview notes, and make the final call to hire or reject.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('review')} 
                    className="relative z-10 group/btn flex items-center gap-3 bg-white text-purple-900 font-bold py-4 px-8 rounded-full transition-all hover:bg-gray-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] whitespace-nowrap hover:scale-105"
                  >
                    <span className="text-xl group-hover/btn:-translate-y-1 transition-transform duration-300"></span>
                    Review Candidates Now
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="animate-fade-in">
                
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mb-8 flex items-center gap-3 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full transition-all font-medium text-sm border border-white/5 hover:border-white/20 w-fit group shadow-sm"
                >
                  <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> 
                  Back to Dashboard
                </button>

                <GlassCard className="w-full p-6 md:p-8 relative overflow-hidden shadow-2xl border-white/5">
                  
                  <h2 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-6">Review Shortlisted Candidates</h2>
                  
                  <div className="mb-10 bg-white/[0.02] p-6 rounded-2xl border border-white/5 shadow-inner">
                    <label className="block text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                       <span className="text-fuchsia-400 text-lg">📂</span> Select a Job to review its candidates:
                    </label>
                    <div className="relative max-w-xl">
                      <select 
                        value={selectedJobId} 
                        onChange={handleJobSelection}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-full py-4 pl-6 pr-12 text-white font-medium outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all cursor-pointer appearance-none shadow-inner"
                      >
                        <option value="" className="bg-[#150524] text-white/50">-- Choose a Job Position --</option>
                        {jobs.map(job => (
                          <option key={job.id} value={job.id} className="bg-[#150524]">
                            {job.title} • {job.location}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        ▼
                      </div>
                    </div>
                  </div>

                  {fetchError && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-center mb-8 font-medium flex items-center justify-center gap-2 shadow-inner">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {fetchError}
                    </div>
                  )}

                  <div>
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-white/40">
                        <div className="w-12 h-12 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading candidate profiles...</p>
                      </div>
                    ) : selectedJobId && shortlistedCandidates.length === 0 ? (
                      <div className="text-center py-20 border border-dashed border-fuchsia-500/30 rounded-3xl bg-fuchsia-500/5">
                        <div className="text-5xl mb-4 opacity-40">📭</div>
                        <h3 className="text-xl font-bold text-white/80 mb-2">No Candidates Found</h3>
                        <p className="text-white/60 max-w-md mx-auto">There are currently no shortlisted candidates pending your review for this specific position.</p>
                      </div>
                    ) : selectedJobId && shortlistedCandidates.length > 0 ? (
                      <>
                        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] shadow-inner">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#150524] border-b border-white/10">
                              <tr className="text-white/60 text-xs font-bold uppercase tracking-widest">
                                <th className="p-5">Candidate Details</th>
                                <th className="p-5">Skills & Documents</th>
                                <th className="p-5 text-center">AI Match Score</th>
                                <th className="p-5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {currentCandidates.map((candidate) => (
                                <tr key={candidate.appId} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-5">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-fuchsia-300 font-bold border border-fuchsia-500/30 text-lg shadow-inner">
                                         {candidate.candidateName.charAt(0)}
                                       </div>
                                       <div>
                                         <span className="font-bold text-white block mb-1 group-hover:text-fuchsia-300 transition-colors">{candidate.candidateName}</span>
                                         <span className="text-xs text-white/40 font-mono">ID: #{candidate.appId}</span>
                                       </div>
                                    </div>
                                  </td>
                                  <td className="p-5">
                                    <p className="text-white/60 text-sm max-w-xs truncate mb-3">{candidate.skills}</p>
                                    {candidate.cvFilePath ? (
                                      <a 
                                        href={`https://localhost:7186${candidate.cvFilePath}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="inline-flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-fuchsia-400 hover:text-fuchsia-300 transition-colors border border-white/5 font-medium shadow-sm"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        View Resume
                                      </a>
                                    ) : (
                                      <span className="text-xs text-white/30 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">No CV Attached</span>
                                    )}
                                  </td>
                                  <td className="p-5 text-center">
                                    <div className="inline-flex flex-col items-center justify-center">
                                      <div className="relative flex items-center justify-center w-14 h-14 bg-black/40 rounded-full border border-purple-500/30 shadow-inner">
                                        <span className="text-purple-300 font-bold text-sm">
                                          {candidate.aiScore}%
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-5 text-center">
                                    <button 
                                      onClick={() => openEvaluationModal(candidate)}
                                      className="bg-white/5 hover:bg-fuchsia-500 border border-white/10 hover:border-fuchsia-500 text-white font-bold py-2.5 px-6 rounded-full transition-all text-sm hover:shadow-[0_0_15px_rgba(217,70,239,0.4)]"
                                    >
                                      Evaluate
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center p-4 mt-6 border border-white/5 rounded-2xl bg-white/[0.02] shadow-inner">
                            <p className="text-sm text-white/50 font-medium">Page {currentPage} of {totalPages}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => paginate(currentPage - 1)} 
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                              >
                                ← Prev
                              </button>
                              <button 
                                onClick={() => paginate(currentPage + 1)} 
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                         <div className="text-3xl mb-4 opacity-40">👆</div>
                         <p className="text-white/50 font-medium">Please select a job from the dropdown above to begin reviewing.</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </main>

        {evaluatingCandidate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#090014]/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#150524] border border-fuchsia-500/30 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(217,70,239,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="p-2 bg-fuchsia-500/10 rounded-full border border-fuchsia-500/20 text-xl shadow-inner">⚖️</span> 
                  Final Evaluation
                </h3>
                <button onClick={closeEvaluationModal} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xl shadow-inner border border-transparent hover:border-white/10">&times;</button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 bg-white/[0.02] p-6 rounded-2xl border border-white/5 shadow-inner">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{evaluatingCandidate.candidateName}</h4>
                    <p className="text-sm text-white/50 mb-4 leading-relaxed">{evaluatingCandidate.skills}</p>
                    {evaluatingCandidate.cvFilePath && (
                      <a href={`https://localhost:7186${evaluatingCandidate.cvFilePath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-fuchsia-400 hover:text-fuchsia-300 transition-colors font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open Original Resume
                      </a>
                    )}
                  </div>
                  <div className="text-center bg-black/40 p-5 rounded-2xl border border-purple-500/20 min-w-[120px] shadow-inner">
                    <div className="text-xs text-purple-300/60 font-bold mb-2 uppercase tracking-widest">AI Match</div>
                    <div className="text-4xl font-black text-purple-400">{evaluatingCandidate.aiScore}<span className="text-xl text-purple-400/50">%</span></div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-3 ml-2">Interview Feedback & Notes <span className="text-white/30 font-normal">(Optional)</span></label>
                    <textarea 
                      rows="4" 
                      placeholder="Enter detailed feedback from the interview process..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all resize-none shadow-inner text-sm leading-relaxed"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-3 ml-2">Manager Evaluation Score <span className="text-white/30 font-normal">(0-10)</span></label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1"
                      placeholder="e.g. 8.5"
                      value={managerScore}
                      onChange={(e) => setManagerScore(e.target.value)}
                      className="w-full md:w-1/3 bg-white/[0.02] border border-white/10 rounded-full p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner text-xl font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 md:p-8 border-t border-white/5 bg-white/[0.02] flex flex-wrap justify-between items-center gap-4">
                <p className="text-xs text-white/40 font-medium max-w-xs">
                  These decisions are final and will notify the candidate automatically via Email/SMS.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleDecision(evaluatingCandidate.appId, 'Rejected')}
                    disabled={decisionLoading}
                    className="bg-transparent hover:bg-red-500/10 text-red-400 font-bold py-3 px-6 rounded-full transition-all border border-white/10 hover:border-red-500/30"
                  >
                    {decisionLoading ? 'Processing...' : 'Reject'}
                  </button>
                  <button 
                    onClick={() => handleDecision(evaluatingCandidate.appId, 'Hired')}
                    disabled={decisionLoading}
                    className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] flex items-center gap-2"
                  >
                    {decisionLoading ? 'Processing...' : 'Confirm Hire'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🔥 Custom Confirm Dialog Modal 🔥 */}
        {confirmDialog.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#090014]/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#150524] border border-fuchsia-500/30 rounded-3xl w-full max-w-sm p-8 shadow-[0_0_50px_rgba(217,70,239,0.2)] text-center">
              <div className="w-20 h-20 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                ⚠️
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Are you sure?</h3>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                You are about to hire this candidate without adding any feedback or evaluation score. Proceed anyway?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDialog.action} 
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]"
                >
                  Yes, Hire Candidate
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
    </div>
  );
}