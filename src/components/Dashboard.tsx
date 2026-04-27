import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid
} from 'lucide-react';
import { getAllStudents, getAttendanceRecords } from '../services/database';
import { Student, Attendance } from '../lib/supabase';

interface DashboardProps {
  user: Student;
}

export default function Dashboard({ user }: DashboardProps) {

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<(Attendance & { students: Student })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, attendanceData] = await Promise.all([
        getAllStudents(),
        getAttendanceRecords(),
      ]);
      setStudents(studentsData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    let displayAttendance = attendance;
    let displayStudents = students;

    if (user.role === 'student') {
      displayAttendance = attendance.filter(r => r.student_id === user.id);
      displayStudents = students.filter(s => s.id === user.id);
    }

    const todayAttendance = displayAttendance.filter((record) => 
      new Date(record.check_in_time).toISOString().split('T')[0] === today
    );

    const uniquePresentToday = new Set(todayAttendance.map(r => r.student_id)).size;

    
    return {
      totalStudents: displayStudents.length,
      presentToday: uniquePresentToday,
      attendanceRate: displayStudents.length > 0 ? ((uniquePresentToday / displayStudents.length) * 100).toFixed(1) : "0",
      avgConfidence: (displayAttendance.reduce((acc, curr) => acc + curr.confidence, 0) / (displayAttendance.length || 1) * 100).toFixed(0)
    };

  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase text-xs">Calibrating Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* SECTION 1: Welcome & Highlights */}
      <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-5xl font-black text-slate-900 dark:text-blue-500 tracking-tighter mb-4">
              Intelligence <span className="text-blue-600 dark:text-white">Overview</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl leading-relaxed">
              Real-time synchronization with AI-vision terminals. Monitoring <span className="text-slate-900 dark:text-white font-bold">{students.length} active identities</span> across all campus gateway points.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                SYSTEM LIVE
             </div>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest pr-4">Updated 2s ago</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Identities" 
            value={stats.totalStudents} 
            icon={Users} 
            color="blue" 
            trend="+12% from last month"
            isPositive={true}
          />
          <StatCard 
            title="Present Today" 
            value={stats.presentToday} 
            icon={CheckCircle2} 
            color="green" 
            trend="High capacity flow"
            isPositive={true}
          />
          <StatCard 
            title="AI Confidence" 
            value={`${stats.avgConfidence}%`} 
            icon={TrendingUp} 
            color="purple" 
            trend="Optimal performance"
            isPositive={true}
          />
        </div>
      </section>

      {/* SECTION 2: Visual Insights & Activity Flow */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        {/* Recent Registrations Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col">
          <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Student Population</h3>
              <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-2">Latest additions to the registry</p>
            </div>
            <button className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-blue-600 transition-colors">
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-10 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto max-h-[500px] no-scrollbar">
            {(user.role === 'student' ? students.filter(s => s.id === user.id) : students.slice(0, 6)).map((student) => (

              <div key={student.id} className="group flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-transparent hover:border-blue-100 hover:bg-white transition-all cursor-pointer">
                <div className="relative">
                  <div className="w-16 h-16 rounded-[24px] overflow-hidden border-2 border-white shadow-lg">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xl">
                        {student.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-[3px] border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 truncate tracking-tight">{student.name}</h4>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter mt-1">{student.student_id}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            ))}
            {students.length === 0 && (
              <div className="col-span-2 py-20 text-center opacity-40">
                <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold text-slate-400 tracking-tighter">No biological signatures found in registry</p>
              </div>
            )}
          </div>
          <div className="mt-auto p-10 bg-slate-50/30 border-t border-slate-50">
             <button className="w-full py-5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-sm uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all active:scale-[0.98]">
                View Full Population Report
             </button>
          </div>
        </div>

        {/* Real-time Activity Logs Sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
           <div className="p-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                 <Clock className="w-6 h-6 text-blue-600" />
                 <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Activity Feed</h3>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 px-4 py-3 rounded-2xl">
                 <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Current Sync</p>
                 <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Gateway Terminal Alpha</p>
              </div>
           </div>

           <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[600px] no-scrollbar">
              {attendance.slice(0, 8).map((record, idx) => (
                <div key={record.id} className="relative flex gap-4 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                   {idx !== attendance.slice(0, 8).length - 1 && (
                     <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                   )}
                   <div className="z-10 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                   </div>
                   <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-slate-800 transition-all">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{new Date(record.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <h5 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">{record.students.name}</h5>
                      <div className="mt-3 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md uppercase">Verified</span>
                         <span className="text-[10px] font-black text-slate-400">{(record.confidence * 100).toFixed(0)}% SENS</span>
                      </div>
                   </div>
                </div>
              ))}
              {attendance.length === 0 && (
                <div className="py-20 text-center opacity-40">
                   <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Awaiting First Detection</p>
                </div>
              )}
           </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, isPositive }: any) {
  const colors: any = {
    blue: 'from-blue-600 to-indigo-700 text-blue-600 bg-blue-50',
    green: 'from-emerald-500 to-teal-700 text-emerald-600 bg-emerald-50',
    orange: 'from-orange-500 to-red-600 text-orange-600 bg-orange-50',
    purple: 'from-violet-600 to-purple-800 text-violet-600 bg-violet-50',
  };

  return (
    <div className="group bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:shadow-blue-200/30 dark:hover:shadow-blue-900/10 transition-all duration-500 overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 rounded-full translate-x-10 -translate-y-10 bg-gradient-to-br ${colors[color].split(' ').slice(0,2).join(' ')}`}></div>
      <div className="relative flex flex-col h-full">
        <div className={`w-16 h-16 rounded-3xl ${colors[color].split(' ').slice(2,4).join(' ')} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-black/5`}>
          <Icon className="w-8 h-8 stroke-[2.5]" />
        </div>
        <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">{title}</p>
        <div className="flex items-baseline gap-2">
           <h3 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{value}</h3>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-2">
           {isPositive ? (
             <ArrowUpRight className="w-4 h-4 text-emerald-500" />
           ) : (
             <ArrowDownRight className="w-4 h-4 text-rose-500" />
           )}
           <span className={`text-xs font-black uppercase tracking-tighter ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{trend}</span>
        </div>
      </div>
    </div>
  );
}
