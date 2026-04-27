import { useState, useEffect } from 'react';
import { Users, Search, Mail, Fingerprint, Calendar, MoreVertical, Edit2, Trash2, X, ShieldCheck, Loader2 } from 'lucide-react';
import { getAllStudents, updateStudent, deleteStudent } from '../services/database';
import { Student } from '../lib/supabase';

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', student_id: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);


  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const data = await getAllStudents();
    // Show students, even legacy ones without a role column, but hide specific demo admins.
    setStudents(
      data.filter(s => 
        s.student_id !== 'annamalaiyar@2026' && 
        s.student_id !== 'STAFF-DEMO' && 
        s.role !== 'admin' && 
        s.role !== 'staff'
      )
    );
    setLoading(false);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student? All attendance records will also be removed.')) {
      setIsDeleting(id);
      const success = await deleteStudent(id);
      if (success) {
        setStudents(students.filter(s => s.id !== id));
      }
      setIsDeleting(null);
      setActiveDropdown(null);
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, student_id: student.student_id, email: student.email || '' });
    setActiveDropdown(null);
    setEditMessage(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditLoading(true);
    setEditMessage(null);

    const success = await updateStudent(editingStudent.id, {
      name: editForm.name,
      student_id: editForm.student_id,
      email: editForm.email
    });

    if (success) {
      setEditMessage({ text: 'Student updated successfully!', type: 'success' });
      await loadStudents();
      setTimeout(() => setEditingStudent(null), 1500);
    } else {
      setEditMessage({ text: 'Failed to update student.', type: 'error' });
    }
    setEditLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Student Directory
              </h2>
              <p className="text-gray-600 mt-1">Manage and view all registered students in the system.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider font-semibold">
                <th className="px-8 py-4">Student</th>
                <th className="px-8 py-4">Student ID</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Dept / Contact</th>
                <th className="px-8 py-4">Registered Date</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-8 py-6"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                    <td className="px-8 py-6"></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-500 italic">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-blue-100 flex-shrink-0">
                          {student.photo_url ? (
                            <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{student.name}</p>
                          <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                            <Fingerprint className="w-3 h-3" /> Face Registered
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-mono text-sm border border-gray-200">
                        {student.student_id}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {student.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-600">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900 text-sm">{student.department || 'General'}</span>
                        <span className="text-xs flex items-center gap-1 opacity-70">
                          {student.mobile_no || 'No Contact'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-600">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(student.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === student.id ? null : student.id)}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-blue-600 shadow-sm border border-transparent hover:border-gray-200"
                      >
                        {isDeleting === student.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoreVertical className="w-5 h-5" />}
                      </button>
                      
                      {activeDropdown === student.id && (
                        <div className="absolute right-8 top-12 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2">
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 transition-colors font-medium border-b border-gray-50"
                          >
                            <Edit2 className="w-4 h-4 text-blue-500" /> Edit Metadata
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="w-full px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" /> Revoke Access
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden shadow-slate-900/20">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Registry Data
              </h3>
              <button 
                onClick={() => setEditingStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                disabled={editLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Identification ID
                  </label>
                  <input
                    type="text"
                    value={editForm.student_id}
                    onChange={(e) => setEditForm({...editForm, student_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
                  />
                </div>
              </div>

              {editMessage && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${editMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                  {editMessage.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {editMessage.text}
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={editLoading}
                  className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

