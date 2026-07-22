import React, { useState, useEffect } from 'react';
import api from './api';
import GlassCard from './GlassCard';
import { useNavigate } from 'react-router-dom';

export default function AuthForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false); 
  
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    birthday: '' 
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 🔥 Typewriter Effect States & Logic 🔥
  const phrases = ["Discover Your Future Career", "Find Your Dream Tech Job", "Next-Gen Recruitment Platform", "Elevate Your Hiring Process"];
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    let timer = setTimeout(() => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      setCurrentPhrase(
        isDeleting 
          ? fullText.substring(0, currentPhrase.length - 1)
          : fullText.substring(0, currentPhrase.length + 1)
      );

      // ටයිප් කරන වේගය සහ මකන වේගය
      setTypingSpeed(isDeleting ? 40 : 100);

      // වාක්‍ය ලියලා ඉවර වුණාම තත්පර 2ක් නතර වෙලා ඉන්නවා
      if (!isDeleting && currentPhrase === fullText) {
        setTypingSpeed(2000); 
        setIsDeleting(true);
      } 
      // මකලා ඉවර වුණාම ඊළඟ වාක්‍යයට යනවා
      else if (isDeleting && currentPhrase === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        setTypingSpeed(500); 
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [currentPhrase, isDeleting, loopNum, typingSpeed]);

  const displayToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      displayToast("Passwords do not match!", "error");
      return;
    }

    setIsLoading(true); 
    const { confirmPassword, ...restData } = formData;
    
    const dataToSubmit = isLogin 
      ? { email: formData.email, password: formData.password }
      : { ...restData, role: 'Candidate' };

    const endpoint = isLogin ? '/Users/login' : '/Users/register';

    try {
      const res = await api.post(endpoint, dataToSubmit);

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        const userRole = res.data.role;

        displayToast(`Welcome back! Logging in as ${userRole}...`, 'success');

        setTimeout(() => {
          if (userRole === 'Admin') navigate('/admin-dashboard');
          else if (userRole === 'Candidate') navigate('/candidate-dashboard');
          else if (userRole === 'Recruiter') navigate('/recruiter-dashboard');
          else if (userRole === 'HiringManager' || userRole === 'Hiring Manager') navigate('/hiring-manager-dashboard');
        }, 1500);
        
      } else {
        displayToast('Account created successfully! Please login.', 'success');
        setTimeout(() => {
          setIsLogin(true); 
          setIsLoading(false);
        }, 1500);
      }
      
    } catch (err) {
      displayToast(err.response?.data?.message || err.response?.data || 'Something went wrong', 'error');
      setIsLoading(false);
    }
  };

  return (
    // 🔥 New Deep Purple Background 🔥
    <div className="min-h-screen w-full bg-[#090014] flex items-center justify-center relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      
      {/* 🔥 Glowing Orbs in the background 🔥 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/20 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-700/20 blur-[150px] rounded-full"></div>
        <div className="absolute top-[30%] left-[50%] w-[400px] h-[400px] bg-fuchsia-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
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

      {/* Glass Card Wrapper */}
      <div className="relative z-10 w-full max-w-md p-4">
        <GlassCard>
          <div className="mb-8 text-center relative z-10">
            {/* Logo updated to Fuchsia/Purple gradient and rounded-full */}
            <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.4)]">
              <span className="text-2xl font-black text-white">R</span>
            </div>
            
            {/* 🔥 Typewriter Effect Element (Size increased to text-sm md:text-base) 🔥 */}
            <p className="text-fuchsia-400 text-sm md:text-base font-bold uppercase tracking-widest mb-3 min-h-[24px] flex items-center justify-center">
              {currentPhrase}<span className="animate-pulse text-white ml-1">|</span>
            </p>

            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-white/40 text-sm mt-3 font-medium px-4">
              {isLogin ? 'Streamline your workflow and simplify your processes.' : 'Join our all-in-one professional platform.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {!isLogin && (
              <div className="animate-fade-in space-y-4">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner placeholder:text-white/30" 
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                />
                <input 
                  type="date" 
                  required
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white/50 text-sm outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner cursor-pointer" 
                  onChange={(e) => setFormData({...formData, birthday: e.target.value})} 
                />
              </div>
            )}
            
            <input 
              type="email" 
              placeholder="Email address" 
              required
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner placeholder:text-white/30" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
            
            <input 
              type="password" 
              placeholder="Password" 
              required
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner placeholder:text-white/30" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
            
            {!isLogin && (
              <input 
                type="password" 
                placeholder="Confirm Password" 
                required
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:bg-white/[0.05] focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all shadow-inner placeholder:text-white/30 animate-fade-in" 
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
              />
            )}

            {/* 🔥 New Button Style (Rounded Full + Fuchsia Gradient) 🔥 */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold py-4 rounded-full hover:from-fuchsia-500 hover:to-purple-500 transition-all mt-6 shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                 <><span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> Processing...</>
              ) : (
                 <>
                   {isLogin ? 'Sign In' : 'Get Started'} 
                   <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                 </>
              )}
            </button>
          </form>

          <p 
            className="text-center text-white/40 text-sm mt-8 cursor-pointer hover:text-white transition-all font-medium relative z-10" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-fuchsia-400">Register here</span></>
            ) : (
              <>Already have an account? <span className="text-purple-400">Sign in</span></>
            )}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}