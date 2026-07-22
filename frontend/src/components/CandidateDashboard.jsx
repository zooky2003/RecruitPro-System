import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api';
import GlassCard from './GlassCard';

export default function CandidateDashboard() {
  const navigate = useNavigate();
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('profile');

  // User Details State
  const [userName, setUserName] = useState('');

  // Professional Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({ 
    phoneNumber: '', 
    skills: '',
    headline: '',
    education: '',
    experience: '',
    gitHubLink: '',
    linkedInLink: ''
  });
  
  const [cvFile, setCvFile] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  
  // 🔥 Custom Toast Notification State 🔥
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // AI CV Parsing State & Ref 
  const [isParsing, setIsParsing] = useState(false);
  const cvParseRef = useRef(null);

  // Jobs & Applications States
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination States for Jobs
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 6; 
  
  const [myApps, setMyApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const displayToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchProfileData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.get('/Users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFormData(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] 
                  || payload.name 
                  || payload.unique_name;
                  
        if (name) {
            setUserName(name);
        }
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
    
    if (activeTab === 'profile') {
      fetchProfileData();
    } else if (activeTab === 'jobs') {
      fetchJobs();
      fetchRecommendedJobs(); 
    } else if (activeTab === 'applications') {
      fetchMyApplications();
    }
  }, [activeTab]);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get('/Jobs/all');
      setJobs(res.data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchMyApplications = async () => {
    setLoadingApps(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.get('/Jobs/my-applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMyApps(res.data);
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    setLoadingRecommendations(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.get('/Jobs/recommended', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecommendedJobs(res.data);
    } catch (err) {
      console.error("Error fetching recommended jobs:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleFileChange = (e) => {
    setCvFile(e.target.files[0]);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleAutoFillCV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    setToast({ show: false, message: '', type: 'success' }); // Clear previous toast

    const parseData = new FormData();
    parseData.append('cvFile', file);
    
    setCvFile(file);

    const token = localStorage.getItem('token');
    try {
      const res = await api.post('/Users/parse-cv', parseData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const aiData = res.data;
      
      setFormData(prev => ({
        ...prev,
        phoneNumber: aiData.phoneNumber || prev.phoneNumber,
        skills: aiData.skills || prev.skills,
        headline: aiData.headline || prev.headline,
        education: aiData.education || prev.education,
        experience: aiData.experience || prev.experience,
        gitHubLink: aiData.gitHubLink || prev.gitHubLink,
        linkedInLink: aiData.linkedInLink || prev.linkedInLink
      }));
      
      displayToast('✨ Magic! Profile auto-filled from your CV. Please review and save.', 'success');
    } catch (err) {
      displayToast(`Error parsing CV: ${err.response?.data || err.message}`, 'error');
    } finally {
      setIsParsing(false);
      e.target.value = null; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('phoneNumber', formData.phoneNumber);
    data.append('skills', formData.skills);
    data.append('headline', formData.headline);
    data.append('education', formData.education);
    data.append('experience', formData.experience);
    data.append('gitHubLink', formData.gitHubLink);
    data.append('linkedInLink', formData.linkedInLink);
    
    if (cvFile) {
      data.append('cvFile', cvFile);
    }
    if (profilePicFile) {
      data.append('profilePicture', profilePicFile);
    }

    const token = localStorage.getItem('token');
    try {
      const res = await api.post('/Users/update-profile', data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      displayToast(`Success: ${res.data.message}`, 'success');
      setIsEditingProfile(false); 
      fetchProfileData();
    } catch (err) {
      displayToast(`Error: ${err.response?.data || err.message}`, 'error');
    }
  };

  const handleApply = async (jobId, jobTitle) => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.post(`/Jobs/apply/${jobId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      displayToast(`Successfully applied for ${jobTitle}! (AI Match Score: ${res.data.matchScore}%)`, 'success');
      
      // Auto-switch to applications tab after short delay
      setTimeout(() => {
        setActiveTab('applications');
      }, 1500);

    } catch (err) {
      displayToast(err.response?.data || 'Failed to apply', 'error');
    }
  };

  // Pagination Logic & Filter Logic
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    // 🔥 New Deep Purple Background & Selection Color 🔥
    <div className="min-h-screen w-full bg-[#090014] text-white flex flex-col relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      
      {/* 🔥 Glowing Orbs in the background 🔥 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-700/10 blur-[150px] rounded-full"></div>
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-fuchsia-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Toast Notification UI */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in font-medium text-sm backdrop-blur-xl border ${
          toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '❌' : '✨'}</span>
          {toast.message}
        </div>
      )}

      {/* Main Content Wrapper (z-10 ensures it sits above orbs) */}
      <div className="relative z-10 flex flex-col h-full w-full">
        <Navbar userName={userName} role="Candidate" activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

        <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
          <div className="mb-8 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-2">
              Welcome, {userName || 'Candidate'}! 👋
            </h1>
            <p className="text-white/50 text-base md:text-lg">Manage your professional profile and track your applications.</p>
          </div>

          <GlassCard className="w-full p-6 md:p-8 relative overflow-hidden shadow-2xl border-white/5">
            
            {}
            {/* 1. PROFILE SECTION */}
            {activeTab === 'profile' && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-2xl font-semibold text-white">Professional Profile</h2>
                  {!isEditingProfile && (
                    <button 
                      onClick={() => setIsEditingProfile(true)} 
                      className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-inner"
                    >
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>
                
                {!isEditingProfile ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-black/40 border-2 border-fuchsia-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                        {profilePicPreview ? <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl">👤</span>}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{userName}</h3>
                        <p className="text-fuchsia-400 font-medium">{formData.headline || "Update your headline"}</p>
                        <p className="text-white/50 text-sm mt-1">📞 {formData.phoneNumber || "No phone number added"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5 shadow-inner">
                      <div><p className="text-white/50 text-sm mb-1 font-medium">Key Skills</p><p className="font-semibold text-fuchsia-100">{formData.skills || "Not specified"}</p></div>
                      <div><p className="text-white/50 text-sm mb-1 font-medium">Education</p><p className="font-semibold text-fuchsia-100">{formData.education || "Not specified"}</p></div>
                      <div className="md:col-span-2"><p className="text-white/50 text-sm mb-1 font-medium">Experience / Projects</p><p className="font-semibold text-white/80 whitespace-pre-line">{formData.experience || "Not specified"}</p></div>
                      <div><p className="text-white/50 text-sm mb-1 font-medium">GitHub Profile</p>{formData.gitHubLink ? <a href={formData.gitHubLink} target="_blank" rel="noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline transition-colors">{formData.gitHubLink}</a> : "Not specified"}</div>
                      <div><p className="text-white/50 text-sm mb-1 font-medium">LinkedIn Profile</p>{formData.linkedInLink ? <a href={formData.linkedInLink} target="_blank" rel="noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline transition-colors">{formData.linkedInLink}</a> : "Not specified"}</div>
                    </div>
                    
                    {!formData.headline && (
                      <div className="text-center p-8 border border-dashed border-fuchsia-500/30 bg-fuchsia-500/5 rounded-2xl">
                        <p className="text-white/70 mb-4 font-medium">Your profile looks a bit empty. A complete profile attracts more recruiters!</p>
                        <button 
                          onClick={() => setIsEditingProfile(true)} 
                          className="bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-full text-white font-bold hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all"
                        >
                          Update Profile Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {isParsing && (
                      <div className="absolute inset-0 z-10 bg-[#090014]/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.2)]">
                         <div className="w-12 h-12 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
                         <h3 className="text-xl font-bold text-white mb-2 animate-pulse">AI is reading your CV...</h3>
                         <p className="text-fuchsia-300 text-sm font-medium">Extracting skills, experience, and education</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in relative z-0">
                      
                      <div className="bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">🪄 Auto-Fill with AI</h3>
                          <p className="text-white/70 text-sm mt-1">Upload your PDF Resume and let Gemini AI extract your details instantly!</p>
                        </div>
                        <input type="file" accept=".pdf" ref={cvParseRef} onChange={handleAutoFillCV} className="hidden" />
                        <button 
                          type="button" 
                          onClick={() => cvParseRef.current?.click()} 
                          className="bg-white text-purple-900 font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-colors whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
                        >
                          Upload CV & Auto-Fill
                        </button>
                      </div>

                      <div className="flex items-center gap-6 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-black/50 flex items-center justify-center shadow-inner border border-white/10">
                          {profilePicPreview ? <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-3xl">📷</span>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-white mb-2">Upload Profile Picture</label>
                          <input type="file" accept="image/*" onChange={handleProfilePicChange} className="text-sm text-white/70 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Professional Headline</label>
                            <input type="text" placeholder="e.g. Software Engineering Undergraduate" value={formData.headline} onChange={(e) => setFormData({...formData, headline: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Phone Number</label>
                            <input type="text" placeholder="+94 7X XXX XXXX" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Key Skills</label>
                            <input type="text" placeholder="e.g. Java, React, SQL" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Manual CV Upload (PDF)</label>
                            <div className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex items-center shadow-inner">
                              <input type="file" accept=".pdf" onChange={handleFileChange} className="w-full text-white outline-none file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer transition-colors" />
                            </div>
                            {cvFile && <p className="text-xs text-fuchsia-400 mt-2 ml-2 font-medium">✓ Selected: {cvFile.name}</p>}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Education</label>
                            <input type="text" placeholder="e.g. BSc Computer Science at NSBM" value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1 ml-2">Experience / Projects</label>
                            <textarea rows="4" placeholder="Briefly describe your experience or projects..." value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all resize-none shadow-inner"></textarea>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                              <label className="block text-sm text-white/70 mb-1 ml-2">GitHub Link</label>
                              <input type="text" placeholder="https://github.com/..." value={formData.gitHubLink} onChange={(e) => setFormData({...formData, gitHubLink: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm text-white/70 mb-1 ml-2">LinkedIn Link</label>
                              <input type="text" placeholder="https://linkedin.com/in/..." value={formData.linkedInLink} onChange={(e) => setFormData({...formData, linkedInLink: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-6 flex flex-wrap gap-4 border-t border-white/5">
                        <button type="submit" className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                          Save & Update Profile
                        </button>
                        <button type="button" onClick={() => setIsEditingProfile(false)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-8 rounded-full transition-all">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {}
            {/* 2. JOB SEARCH SECTION WITH PAGINATION */}
            {activeTab === 'jobs' && (
              <div className="animate-fade-in">
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-fuchsia-400">✨</span> Recommended for You
                  </h2>
                  
                  {!formData.skills ? (
                    <div className="bg-fuchsia-900/20 border border-fuchsia-500/30 p-5 rounded-2xl text-fuchsia-300 text-sm font-medium shadow-inner">
                      Please update your profile skills or upload your CV to get AI-powered job recommendations!
                    </div>
                  ) : loadingRecommendations ? (
                    <div className="flex items-center gap-4 text-fuchsia-400 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-6 h-6 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin"></div> 
                      <span className="font-medium">AI is analyzing your profile to find the best jobs...</span>
                    </div>
                  ) : recommendedJobs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {recommendedJobs.map((job) => (
                        <div key={job.id} className="bg-gradient-to-br from-fuchsia-900/20 to-purple-900/10 border border-fuchsia-500/30 rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(217,70,239,0.15)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">Top Match</div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1 pr-16 group-hover:text-fuchsia-300 transition-colors">{job.title}</h3>
                            <p className="text-white/50 text-sm mb-4 flex items-center gap-1">📍 {job.location}</p>
                            <div className="bg-fuchsia-500/10 p-4 rounded-xl border border-fuchsia-500/20 mb-5 shadow-inner">
                              <p className="text-fuchsia-200 text-xs font-medium leading-relaxed italic">
                                " {job.reason} "
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleApply(job.id, job.title)} className="w-full bg-white/5 hover:bg-fuchsia-500 text-white border border-white/10 hover:border-fuchsia-500 font-bold py-3 rounded-full transition-all hover:shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                            Apply Now
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/50 bg-white/[0.02] p-5 rounded-2xl border border-white/5 text-sm shadow-inner">
                      No exact matches found right now. Keep exploring below!
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-6 pt-8 border-t border-white/10">
                  <h2 className="text-2xl font-semibold text-white">Explore All Jobs</h2>
                  <span className="bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 py-1.5 px-4 rounded-full text-sm font-bold shadow-inner">
                    {filteredJobs.length} Jobs Found
                  </span>
                </div>
                
                <div className="relative mb-8">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search by job title or location..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-full py-4 pl-12 pr-4 text-white outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner" 
                  />
                </div>
                
                {loadingJobs ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="w-10 h-10 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">Loading opportunities...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentJobs.map((job) => (
                        <div key={job.id} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-fuchsia-500/50 transition-all group hover:bg-white/[0.04] shadow-lg">
                          <div>
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-5 text-xl group-hover:bg-fuchsia-500/20 group-hover:border-fuchsia-500/30 group-hover:text-fuchsia-400 transition-colors shadow-inner">
                              🏢
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-fuchsia-300 transition-colors">{job.title}</h3>
                            <p className="text-white/50 text-sm mb-6 flex items-center gap-1 font-medium">
                              📍 {job.location}
                            </p>
                          </div>
                          <button onClick={() => handleApply(job.id, job.title)} className="w-full bg-white/5 hover:bg-fuchsia-500 border border-white/10 hover:border-fuchsia-500 text-white font-bold py-3 rounded-full transition-all hover:shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                            Apply Now
                          </button>
                        </div>
                      ))}
                      {currentJobs.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                          <span className="text-4xl mb-4 block opacity-50">🔍</span>
                          <p className="text-white/60 font-medium">No jobs found matching your search criteria.</p>
                        </div>
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-3 mt-10 pt-6 border-t border-white/5">
                        <button 
                          onClick={() => paginate(currentPage - 1)} 
                          disabled={currentPage === 1}
                          className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-semibold shadow-sm"
                        >
                          ← Prev
                        </button>
                        
                        <div className="flex gap-2">
                          {Array.from({ length: totalPages }, (_, i) => (
                             <button
                               key={i + 1}
                               onClick={() => paginate(i + 1)}
                               className={`w-10 h-10 rounded-full font-bold transition-all shadow-sm ${
                                 currentPage === i + 1 
                                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] scale-110' 
                                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                             >
                               {i + 1}
                             </button>
                          ))}
                        </div>

                        <button 
                          onClick={() => paginate(currentPage + 1)} 
                          disabled={currentPage === totalPages}
                          className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-semibold shadow-sm"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {}
            {/* 3. APPLICATIONS SECTION */}
            {activeTab === 'applications' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-semibold mb-6 text-white border-b border-white/10 pb-4">My Applications</h2>
                
                {loadingApps ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="w-10 h-10 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">Loading your applications...</p>
                  </div>
                ) : myApps.length === 0 ? (
                  <div className="text-center bg-white/[0.02] p-12 rounded-3xl border border-dashed border-white/10 shadow-inner">
                    <div className="text-5xl mb-4 opacity-50">📄</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Applications Yet</h3>
                    <p className="text-white/50 mb-6 font-medium">You haven't applied for any jobs yet. Start exploring and take the next step in your career!</p>
                    <button 
                      onClick={() => setActiveTab('jobs')} 
                      className="bg-gradient-to-r from-fuchsia-600 to-purple-600 px-8 py-3 rounded-full text-white font-bold hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all"
                    >
                      Browse Jobs
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#150524] border-b border-white/10">
                        <tr className="text-white/60 text-xs font-bold uppercase tracking-wider">
                          <th className="p-5">Job Title</th>
                          <th className="p-5">Location</th>
                          <th className="p-5">Applied Date</th>
                          <th className="p-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-white text-sm divide-y divide-white/5">
                        {myApps.map((app) => (
                          <tr key={app.appId} className="hover:bg-white/5 transition-colors group">
                            <td className="p-5 font-bold group-hover:text-fuchsia-300 transition-colors">{app.jobTitle}</td>
                            <td className="p-5 text-white/60 font-medium">{app.location}</td>
                            <td className="p-5 text-white/60 font-medium">{new Date(app.appliedAt).toLocaleDateString()}</td>
                            <td className="p-5">
                              <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-inner ${
                                app.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                app.status === 'Shortlisted' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' :
                                app.status === 'Hired' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </main>
      </div>
    </div>
  );
}