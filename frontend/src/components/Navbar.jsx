import React from 'react';


export default function Navbar({ userName, role, activeTab, setActiveTab, handleLogout }) {
  return (
    <nav className="w-full bg-white/5 border-b border-white/10 px-8 py-4 flex justify-between items-center backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white">R</div>
        <span className="text-xl font-bold tracking-wide text-white">RecruitPro</span>
      </div>

      {}
      <div className="hidden md:flex gap-2">
        
        {/* Candidate  Links */}
        {role === 'Candidate' && (
          <>
            <button onClick={() => setActiveTab('profile')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-purple-600/20 text-purple-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>My Profile</button>
            <button onClick={() => setActiveTab('jobs')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'jobs' ? 'bg-purple-600/20 text-purple-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Find Jobs</button>
            <button onClick={() => setActiveTab('applications')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'applications' ? 'bg-green-500/20 text-green-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>My Applications</button>
          </>
        )}

        {/* Recruiter  Links */}
        {role === 'Recruiter' && (
          <>
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('post-job')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'post-job' ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Post a Job</button>
            <button onClick={() => setActiveTab('candidates')} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'candidates' ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Candidates</button>
          </>
        )}

      </div>

      <div className="flex items-center gap-4">
       
        <span className="text-white/80 font-medium hidden sm:block">
          {userName}
        </span>
        <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 px-5 rounded-xl transition-all text-sm">
          Log Out
        </button>
      </div>
    </nav>
  );
}