import { useState, useEffect } from 'react';
import { History as ArchiveIcon, Calendar, Search, CheckCircle2, DownloadCloud, Volume2, Play } from 'lucide-react';
import { getAttendanceRecords } from '../services/database';
import { Student, Attendance } from '../lib/supabase';

export default function AttendanceHistory() {
  const [records, setRecords] = useState<(Attendance & { students: Student })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const data = await getAttendanceRecords();
    setRecords(data);
    setLoading(false);
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.students.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.students.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? new Date(r.check_in_time).toISOString().split('T')[0] === filterDate : true;
    return matchesSearch && matchesDate;
  });

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Student Name,Student ID,Check-in Time,Check-out Time,Status,Confidence\n" +
      filteredRecords.map(r =>
        `${r.students.name},${r.students.student_id},${new Date(r.check_in_time).toLocaleString()},${r.check_out_time ? new Date(r.check_out_time).toLocaleString() : 'N/A'},${r.is_emergency_exit ? 'EMERGENCY' : (r.check_out_time ? 'COMPLETED' : 'IN CAMPUS')},${(r.confidence * 100).toFixed(1)}%`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-gray-50/80 p-6 border-r border-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <ArchiveIcon className="w-7 h-7 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Full Logs</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Search</label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
                <input
                  type="text"
                  placeholder="ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Filter by Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={exportData}
                className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                <DownloadCloud className="w-5 h-5" />
                Download Report
              </button>
            </div>

            <div className="mt-auto pt-12">
              <div className="bg-blue-100/50 p-4 rounded-2xl border border-blue-200/50">
                <p className="text-xs font-medium text-blue-800 leading-relaxed uppercase tracking-tighter mb-2">Total Records</p>
                <p className="text-3xl font-black text-blue-900 tracking-tighter">{filteredRecords.length}</p>
                <p className="text-xs text-blue-700/60 font-semibold uppercase tracking-widest">Entries found</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Attendance Logs</h3>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              <span className="text-xs font-bold text-gray-500 uppercase">Live Synced</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse border border-gray-100"></div>
                ))}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Search className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl font-bold text-gray-400">No records matched your search</p>
                <button
                  onClick={() => { setSearchTerm(''); setFilterDate(''); }}
                  className="mt-4 text-blue-600 hover:underline font-bold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                  >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900">{record.students.name}</h4>
                          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500 uppercase tracking-widest">
                            {record.students.student_id}
                          </span>
                        </div>
                        {/* IN time */}
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-700 font-bold">IN:</span>&nbsp;
                          {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          &nbsp;—&nbsp;
                          {new Date(record.check_in_time).toLocaleDateString()}
                        </p>
                        {/* OUT time */}
                        {record.check_out_time && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-rose-600 font-bold">OUT:</span>&nbsp;
                            {new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {/* Voice Reason Player / Display */}
                        {record.exit_reason && (
                          <div className="mt-3 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Voice Reason</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 italic">
                                {record.exit_reason.startsWith('data:audio') 
                                  ? "🎵 Audio Recording Captured" 
                                  : `"${record.exit_reason}"`}
                              </p>
                            </div>
                            <button
                              onClick={() => { 
                                if (record.exit_reason!.startsWith('data:audio')) {
                                  const a = new Audio(record.exit_reason!); a.play(); 
                                } else {
                                  const msg = new SpeechSynthesisUtterance(record.exit_reason!);
                                  window.speechSynthesis.speak(msg);
                                }
                              }}
                              className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm self-end"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status badge + confidence */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex gap-2 flex-wrap justify-end">
                        {record.is_emergency_exit && (
                          <span className="text-[10px] bg-rose-600 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-sm">Emergency</span>
                        )}
                        {record.check_out_time && !record.is_emergency_exit && (
                          <span className="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest">Completed</span>
                        )}
                        {!record.check_out_time && (
                          <span className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest animate-pulse">In Campus</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                        <span className="text-xs font-black text-green-700">{(record.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
