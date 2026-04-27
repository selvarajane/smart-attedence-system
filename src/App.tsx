import { useState } from 'react';
import { 
  LayoutDashboard,
  UserPlus, 
  Video, 
  ScanFace,
  Users,
  History as LogsIcon,
  Settings as SettingsIcon,
  HelpCircle,
  Bell,
  Search,
  ChevronRight,
  Menu
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudentRegistration from './components/StudentRegistration';
import AttendanceTracking from './components/AttendanceTracking';
import StudentList from './components/StudentList';
import AttendanceHistory from './components/AttendanceHistory';
import Settings from './components/Settings';
import Help from './components/Help';
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';
import { Student } from './lib/supabase';
import { LogOut } from 'lucide-react';


type View = 'dashboard' | 'register' | 'tracking' | 'students' | 'history' | 'settings' | 'help';

function App() {
  const [user, setUser] = useState<Student | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');


  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
    setShowRegistration(false);
  };

  const navigation = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, category: 'Main', roles: ['admin', 'staff'] },
    { id: 'tracking' as View, label: 'Real-time Track', icon: Video, category: 'Attendance', roles: ['admin', 'staff'] },
    { id: 'history' as View, label: 'Full Logs', icon: LogsIcon, category: 'Attendance', roles: ['admin', 'staff'] },
    { id: 'register' as View, label: 'New Registration', icon: UserPlus, category: 'Management', roles: ['admin', 'staff'] },
    { id: 'students' as View, label: 'Student Directory', icon: Users, category: 'Management', roles: ['admin', 'staff'] },
  ].filter(item => item.roles.includes(user?.role || 'student'));


  const secondaryNavigation = [
    { id: 'settings' as View, label: 'Settings', icon: SettingsIcon },
    { id: 'help' as View, label: 'Help & Docs', icon: HelpCircle },
  ];

  if (!user && !showRegistration) {
    return <Login onLogin={setUser} />;
  }

  if (!user && showRegistration) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-20">
        <button 
          onClick={() => setShowRegistration(false)}
          className="mb-10 flex items-center gap-2 text-[#64748B] font-black uppercase text-xs hover:text-blue-600 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Login
        </button>
        <StudentRegistration onComplete={(newUser) => { 
          if (newUser) setUser(newUser); 
          setShowRegistration(false); 
        }} />

      </div>
    );
  }

  if (!user) return null;

  return (


    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Premium Sidebar */}
      <aside className={`bg-white border-r border-[#E2E8F0] ${isSidebarOpen ? 'w-80' : 'w-24'} transition-all duration-500 ease-in-out flex flex-col shadow-[1px_0_15px_rgba(0,0,0,0.02)] z-50`}>
        {/* Sidebar Header */}
        <div className="p-8 pb-10 flex items-center justify-between border-b border-[#F1F5F9]">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] dark:from-blue-500 dark:to-blue-700 p-4 rounded-3xl shadow-[0_8px_20px_rgba(37,99,235,0.3)] rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <ScanFace className="w-8 h-8 text-white stroke-[2.5]" />
            </div>
            {isSidebarOpen && (
              <div className="animate-in fade-in slide-in-from-left-4">
                <h1 className="text-xl font-black text-[#0F172A] dark:text-blue-400 tracking-tighter leading-none uppercase">Smart Attendance</h1>
                <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-[0.2em] mt-1.5 opacity-70">
                  {user.role === 'student' ? 'Student Portal' : 'Admin Terminal'}
                </p>
              </div>

            )}
          </div>
        </div>

        {/* Navigation Contexts */}
        <nav className="flex-1 px-5 py-10 space-y-12 overflow-y-auto no-scrollbar">
          {['Main', 'Attendance', 'Management'].map((category) => (
            <div key={category}>
              {isSidebarOpen && (
                <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-6 px-4">{category}</p>
              )}
              <div className="space-y-2">
                {navigation.filter(item => item.category === category).map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative ${
                        isActive 
                          ? 'bg-[#EFF6FF] text-[#1E40AF] shadow-sm ring-1 ring-[#DBEAFE]' 
                          : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl transition-all duration-500 ${isActive ? 'bg-white shadow-[0_4px_12px_rgba(30,64,175,0.1)] scale-110' : 'bg-transparent group-hover:bg-white group-hover:scale-105'}`}>
                        <Icon className={`w-5 h-5 stroke-[2.2] transition-colors ${isActive ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`} />
                      </div>
                      {isSidebarOpen && (
                        <span className={`font-bold tracking-tight text-sm transition-all duration-300 ${isActive ? 'translate-x-1' : 'opacity-80 group-hover:opacity-100'}`}>{item.label}</span>
                      )}
                      {isActive && isSidebarOpen && (
                        <ChevronRight className="w-4 h-4 ml-auto text-[#2563EB] animate-in slide-in-from-left-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Navigation */}
        <div className="p-6 bg-[#F8FAFC]/50 border-t border-[#F1F5F9] mt-auto">
          <div className="space-y-1">
            {user.role !== 'student' && secondaryNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className={`w-5 h-5 stroke-[2] ${isActive ? 'text-white' : 'text-[#94A3B8]'}`} />
                  {isSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                </button>
              );
            })}

            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-3.5 mt-4 rounded-xl text-rose-500 hover:bg-rose-50 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              {isSidebarOpen && <span className="font-bold text-sm tracking-tight text-rose-600">Logout Portal</span>}
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-500">
        {/* Top Floating Bar */}
        <header className="h-28 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between px-12 z-40 sticky top-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 max-w-2xl hidden md:block group">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94A3B8] dark:text-slate-500 group-focus-within:text-[#2563EB] transition-colors w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Quick search students..." 
                  className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[24px] py-4 pl-14 pr-6 focus:ring-[6px] focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-[#2563EB] outline-none transition-all text-[15px] font-medium placeholder-[#94A3B8] shadow-sm dark:text-white"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-4 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] hover:shadow-lg transition-all relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </button>
            <div className="w-[1px] h-10 bg-[#E2E8F0] dark:bg-slate-800 mx-4"></div>
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-[22px] border border-[#E2E8F0] dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 bg-[#2563EB] rounded-[14px] flex items-center justify-center text-white font-black text-sm uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-black text-[#0F172A] dark:text-white tracking-tight leading-none">{user.name}</p>
                <p className="text-[10px] text-[#2563EB] font-black uppercase mt-1 tracking-widest">{user.student_id}</p>
              </div>
            </div>

          </div>
        </header>

        {/* Interactive View Area */}
        <div className="flex-1 overflow-y-auto px-12 py-10 no-scrollbar">
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {user.role === 'student' ? (
              <StudentPortal user={user} onLogout={handleLogout} />
            ) : (
              <>
                {currentView === 'dashboard' && <Dashboard user={user} />}
                {currentView === 'register' && <StudentRegistration onComplete={() => setCurrentView('dashboard')} />}
                {currentView === 'tracking' && <AttendanceTracking />}
                {currentView === 'students' && <StudentList />}
                {currentView === 'history' && <AttendanceHistory />}
              </>
            )}
            
            {currentView === 'settings' && <Settings theme={theme} onToggleTheme={toggleTheme} />}
            {currentView === 'help' && <Help />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

