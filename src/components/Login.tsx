import React, { useState } from 'react';
import { ScanFace, ShieldCheck, User, LogIn, GraduationCap, Radio } from 'lucide-react';
import AttendanceTerminal from './AttendanceTerminal';

import { loginUser, registerStudent } from '../services/database';

interface LoginProps {
  onLogin: (user: any) => void;
}


const Login: React.FC<LoginProps> = ({ onLogin }) => {

  const [role, setRole] = useState<'student' | 'staff'>('student');

  const [idValue, setIdValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Allow shortcut for specific staff login
      if (role === 'staff' && idValue === 'annamalaiyar@2026') {
        await handleDemoLogin();
        return;
      }

      const user = await loginUser(idValue, role);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid ID or credentials for the selected role.');
      }
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    const demoId = 'annamalaiyar@2026';
    const demoName = 'Admin - Annamalaiyar';
    
    try {
      // First check if this demo user already exists
      let user = await loginUser(demoId, 'staff');
      
      if (!user) {
        // Create a temporary demo profile that allows immediate entry
        user = await registerStudent(
          demoId, 
          demoName, 
          'admin@demo.com', // email
          'https://i.pravatar.cc/150?u=admin-demo', // photoUrl
          null, // faceDescriptor
          'staff', 
          { 
            department: 'Administration', 
            tutor: 'Sytem Hub', 
            mobile_no: '9999999999', 
            dob: '1985-05-20' 
          }
        );
      }

      if (user) {
        onLogin(user);
      } else {
        setError('Login failed. Please ensure the "students" table exists in your Supabase database.');
      }
    } catch (err) {
      console.error(err);
      setError('System Error: Database schema mismatch or connection lost.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showTerminal) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-[#F8FAFC] to-[#F8FAFC]">
        <AttendanceTerminal onReturnToLogin={() => setShowTerminal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-[#F8FAFC] to-[#F8FAFC]">
      <div className="w-full max-w-[1100px] flex bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-white/40 backdrop-blur-sm">
        
        {/* Left Side - Visual Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 opacity-90 transition-all duration-700 group-hover:scale-110"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-30 transform hover:scale-105 transition-transform duration-1000"></div>
          
          <div className="relative z-10">
            <div className="bg-white/10 backdrop-blur-xl w-16 h-16 rounded-2xl flex items-center justify-center mb-10 border border-white/20 shadow-2xl">
              <ScanFace className="w-9 h-9 text-white stroke-[2]" />
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Smart<br />Attendance<br />System
            </h1>
            <p className="text-blue-100/80 text-lg max-w-[320px] leading-relaxed font-medium">
              Next-generation biometric identification and time-tracking for modern institutions.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center">
          <div className="max-w-[400px] mx-auto w-full">
            <div className="mb-12">
              <h2 className="text-3xl font-black text-[#0F172A] tracking-tight mb-3">Welcome Back</h2>
              <p className="text-[#64748B] font-medium">Select your portal role and enter your ID to continue.</p>
            </div>

            {/* Role Switcher */}
            <div className="flex p-1.5 bg-[#F1F5F9] rounded-2xl mb-10 ring-1 ring-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  role === 'student'
                    ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/10 ring-1 ring-blue-100'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <GraduationCap className={`w-4 h-4 transition-colors ${role === 'student' ? 'text-blue-600' : ''}`} />
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  role === 'staff'
                    ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/10 ring-1 ring-blue-100'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 transition-colors ${role === 'staff' ? 'text-blue-600' : ''}`} />
                College Admin
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-black text-[#64748B] uppercase tracking-widest px-1">
                  {role === 'student' ? 'Student ID' : 'College Admin ID'}
                </label>

                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-blue-600 transition-colors w-5 h-5" />
                  <input
                    type="text"
                    value={idValue}
                    onChange={(e) => setIdValue(e.target.value)}
                    required
                    placeholder={`Enter your ${role} ID...`}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[24px] py-4 pl-14 pr-6 focus:ring-[6px] focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-[15px] font-bold shadow-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] py-4 font-black flex items-center justify-center gap-3 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 group mt-10"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Portal Login</span>
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <div className="mt-10 pt-10 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTerminal(true)}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-[32px] p-6 font-black flex flex-col items-center justify-center gap-4 transition-all border-2 border-emerald-100/50 group"
                >
                  <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                    <Radio className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl tracking-tight uppercase">Attendance Terminal</p>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Student Self-Service Flow</p>
                  </div>
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
