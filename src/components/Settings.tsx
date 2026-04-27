import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Cpu, 
  Database, 
  Globe, 
  Lock, 
  Moon, 
  Sun,
  Camera,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  Scan
} from 'lucide-react';
import { useState } from 'react';
import { toggleHardwareAcceleration } from '../services/faceDetection';
import { getAttendanceRecords, flushCache } from '../services/database';
import { loadYoloModel } from '../services/yoloDetection';

interface SettingsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Settings({ theme, onToggleTheme }: SettingsProps) {
  const [hwAccel, setHwAccel] = useState(true);
  const [threshold, setThreshold] = useState(0.5);
  const [isExporting, setIsExporting] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [useYolo, setUseYolo] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleHwAccelToggle = async () => {
    const newState = !hwAccel;
    setHwAccel(newState);
    await toggleHardwareAcceleration(newState);
    setStatus(`HARDWARE ENGINE: ${newState ? 'GPU ENHANCED' : 'CPU MODE'}`);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleYoloToggle = async () => {
    const newState = !useYolo;
    if (newState) {
      setStatus('INITIALIZING YOLOV26 NMS-FREE ENGINE...');
      try {
        await loadYoloModel();
        setUseYolo(true);
        setStatus('YOLOV26 DETECTION ACTIVE');
      } catch (err) {
        setStatus('YOLOV26 ERROR: MODEL FILES MISSING');
        console.error(err);
      }
    } else {
      setUseYolo(false);
      setStatus('SWITCHING TO STANDARD ENGINE');
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const handleExportLogs = async () => {
    setIsExporting(true);
    setStatus('PREPARING REGISTRY REPORT...');
    try {
      const records = await getAttendanceRecords();
      if (records.length === 0) {
        setStatus('EMPTY REGISTRY: NO DATA FOUND');
        return;
      }

      // Convert to CSV
      const headers = ['Student ID', 'Name', 'Check In Time', 'Confidence'];
      const csvData = records.map(r => [
        r.students.student_id,
        r.students.name,
        new Date(r.check_in_time).toLocaleString(),
        (r.confidence * 100).toFixed(0) + '%'
      ]);

      const csvContent = [headers, ...csvData].map(e => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus('REPORT DOWNLOADED SUCCESSFULLY');
    } catch (err) {
       setStatus('EXPORT NODE FAILURE');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  const handleFlushCache = async () => {
    if (!window.confirm('CRITICAL ACTION: This will permanently purge ALL registered student identities and attendance histories. Proced?')) return;
    
    setIsFlushing(true);
    setStatus('PURGING GLOBAL REGISTRY...');
    try {
      const success = await flushCache();
      if (success) {
        setStatus('REGISTRY WIPED CLEAN');
      } else {
        setStatus('CACHE PURGE FAILED');
      }
    } catch (err) {
       setStatus('DATABASE CONNECTION ERROR');
    } finally {
      setIsFlushing(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 dark:text-white">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div>
            <h2 className="text-5xl font-black text-slate-900 dark:text-blue-500 tracking-tighter mb-4 flex items-center gap-4">
              <div className="bg-slate-900 dark:bg-blue-600 p-3 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-blue-900/40 text-white">
                <SettingsIcon className="w-8 h-8" />
              </div>
              System <span className="text-slate-900 dark:text-white">Config</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl leading-relaxed">
              Global terminal parameters and security protocols. Adjust AI sensitivity and hardware preferences.
            </p>
          </div>
          {status && (
            <div className="bg-slate-900 text-white px-2.5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl animate-bounce">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{status}</span>
            </div>
          )}
      </section>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column - General Settings */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-10 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              Biometric Parameters
            </h3>

            <div className="space-y-10">
              <div className="group">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight">Recognition Sensitivity</h4>
                    <p className="text-sm text-slate-400 font-semibold mt-1">Lower values are more strict (less false positives)</p>
                  </div>
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl font-black text-sm">{threshold.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.8" 
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                      <Cpu className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-black text-slate-900 dark:text-slate-200 text-sm">Hardware Acceleration</p>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Utilize GPU for inference</p>
                   </div>
                </div>
                <Toggle active={hwAccel} onClick={handleHwAccelToggle} />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                      <Scan className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-black text-slate-900 dark:text-slate-200 text-sm">YOLOv26 Detection</p>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ultralytics NMS-free 2026 Engine</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase">BETA</div>
                  <Toggle active={useYolo} onClick={handleYoloToggle} />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                      <Camera className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-black text-slate-900 dark:text-slate-200 text-sm">Liveness Detection</p>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Anti-spoofing verification</p>
                   </div>
                </div>
                <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase">Alpha</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-10 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              Data Management
            </h3>

            <div className="grid sm:grid-cols-2 gap-6">
               <button 
                onClick={handleExportLogs}
                disabled={isExporting}
                className="flex flex-col items-start p-8 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:ring-2 hover:ring-blue-600/10 hover:shadow-xl hover:shadow-blue-200/20 rounded-[32px] transition-all group disabled:opacity-50"
               >
                  {isExporting ? <Loader2 className="w-8 h-8 text-blue-600 mb-6 animate-spin" /> : <Save className="w-8 h-8 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />}
                  <p className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2">Export Logs</p>
                  <p className="text-xs text-slate-400 font-semibold text-left">Generate CSV report of all attendance activity.</p>
               </button>
               <button 
                onClick={handleFlushCache}
                disabled={isFlushing}
                className="flex flex-col items-start p-8 bg-rose-50/30 dark:bg-rose-900/10 hover:bg-white dark:hover:bg-rose-900/30 hover:ring-2 hover:ring-rose-600/10 hover:shadow-xl hover:shadow-rose-200/20 rounded-[32px] transition-all group disabled:opacity-50"
               >
                  {isFlushing ? <Loader2 className="w-8 h-8 text-rose-600 mb-6 animate-spin" /> : <Trash2 className="w-8 h-8 text-rose-600 mb-6 group-hover:scale-110 transition-transform" />}
                  <p className="font-black text-slate-900 dark:text-rose-500 uppercase tracking-tight mb-2">Flush Cache</p>
                  <p className="text-xs text-slate-400 font-semibold text-left">Permanently purge all identity registrations.</p>
               </button>
            </div>
          </div>
        </div>

        {/* Right Column - System & UI */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-8">Interface</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-orange-500" />}
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Display Theme</span>
                   </div>
                   <Toggle active={theme === 'dark'} onClick={onToggleTheme} />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-blue-500" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Audio Feedback</span>
                   </div>
                   <Toggle active={true} />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Regional Sync</span>
                   </div>
                   <Toggle active={true} />
                </div>
              </div>
           </div>

           <div className="bg-slate-900 dark:bg-blue-600 p-10 rounded-[40px] shadow-2xl shadow-slate-900/20 dark:shadow-blue-900/40 overflow-hidden relative group transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 dark:bg-white blur-[80px] opacity-20 -translate-x-10"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-white/10 rounded-[32px] backdrop-blur-md flex items-center justify-center mb-6 ring-1 ring-white/20">
                    <Lock className="w-10 h-10 text-white" />
                 </div>
                 <h4 className="text-white font-black text-xl mb-3 uppercase tracking-tighter">Enterprise Security</h4>
                 <p className="text-slate-400 dark:text-blue-100/70 text-xs font-medium leading-relaxed mb-8 px-4">
                    AES-256 identification hashes active. Bio-data is never stored as raw images.
                 </p>
                 <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors">
                    Security Audit
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ active, onClick }: { active: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-14 h-8 rounded-full p-1 transition-all duration-500 flex items-center ${active ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-500 ease-spring ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </button>
  );
}
