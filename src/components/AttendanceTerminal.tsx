import { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  ScanFace,
  Activity,
  User, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Fingerprint,
  CheckCircle2,
  XCircle,
  VideoOff,
  Clock,
  Layers,
  GraduationCap,
  Mic,
  Play,
  Square,
  Save,
  Volume2
} from 'lucide-react';
import { loginUser, recordAttendance, getTodayStudentAttendance, markCheckOut } from '../services/database';
import { loadModels, detectFaces, compareFaces } from '../services/faceDetection';
import { sendCheckInEmail, sendCheckOutEmail } from '../services/emailService';
import { Student } from '../lib/supabase';

interface Props {
  onReturnToLogin: () => void;
}

type TerminalStep = 'id-entry' | 'details' | 'camera' | 'voice-reason' | 'result';

export default function AttendanceTerminal({ onReturnToLogin }: Props) {
  const [step, setStep] = useState<TerminalStep>('id-entry');
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'already' } | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const modelsReadyRef = useRef(false);
  const isProcessingRef = useRef(false);
  const stepRef = useRef<TerminalStep>('id-entry');  // prevents stale closure
  const hasActedRef = useRef(false);                 // prevents duplicate attendance/email

  // Initialize models
  useEffect(() => {
    loadModels().then(() => {
      modelsReadyRef.current = true;
    });
    return () => stopVideo();
  }, []);

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const foundStudent = await loginUser(studentId, 'student');
      if (foundStudent) {
        setStudent(foundStudent);
        setStep('details');
        // Wait 3s then open camera
        setTimeout(() => {
          setStep('camera');
        }, 3000);
      } else {
        setError('No data found for this Student ID.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keep stepRef in sync with step state
  useEffect(() => {
    stepRef.current = step;
    if (step !== 'camera') {
      // Reset acted guard when leaving camera step
      hasActedRef.current = step === 'id-entry' ? false : hasActedRef.current;
    }
  }, [step]);

  useEffect(() => {
    if (step === 'camera') {
      startVideo();
    } else {
      stopVideo();
    }
  }, [step]);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoOn(true);
        videoRef.current.onloadedmetadata = () => {
          startDetection();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera.');
    }
  };

  const stopVideo = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoOn(false);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const startDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    hasActedRef.current = false; // reset for new scan session
    detectionIntervalRef.current = window.setInterval(async () => {
      // Use stepRef (not stale `step`) to check current state
      if (!isProcessingRef.current && stepRef.current === 'camera') {
        await performVerification();
      }
    }, 500);
  };

  const performVerification = async () => {
    if (!videoRef.current || !student || !modelsReadyRef.current) return;
    
    isProcessingRef.current = true;
    try {
      const detections = await detectFaces(videoRef.current, true);
      
      if (detections.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const det = detections[0]; // Take the first face
      const studentDescriptor = student.face_descriptor ? new Float32Array(JSON.parse(student.face_descriptor)) : null;
      
      if (!studentDescriptor) {
        setError('No biometric data found for this student. Please register first.');
        setStep('id-entry');
        isProcessingRef.current = false;
        return;
      }

      const distance = compareFaces(det.descriptor, studentDescriptor);
      
      if (distance <= 0.5) {
        // SUCCESS
        await handleAttendanceRecord();
      } else {
        // NO MATCH (FAILURE)
        setStatusMessage({ text: 'FACE NOT IN DATABASE (NO DATA FOUND)', type: 'error' });
        setStep('result');
        
        // Show reason for 10 seconds then go to login portal as requested
        setTimeout(() => {
          onReturnToLogin();
        }, 10000); 
      }
    } catch (err) {
      console.error(err);
      isProcessingRef.current = false;
    }
  };

  const handleAttendanceRecord = async () => {
    if (!student) return;
    
    const existingAttendance = await getTodayStudentAttendance(student.id);

    if (!existingAttendance) {
      // Clock In — guard against double-processing
      if (hasActedRef.current) return;
      hasActedRef.current = true;
      await recordAttendance(student.id, 0.95);
      // Send check-in email once
      if (student.email) {
        sendCheckInEmail(student.email, student.name, student.student_id, student.department);
      }
      setStatusMessage({ text: 'ATTENDANCE IN VERIFIED', type: 'success' });
      setStep('result');
      setTimeout(() => {
        onReturnToLogin();
      }, 2000);
    } else if (existingAttendance && !existingAttendance.check_out_time) {
      // Clock Out - Transition to voice reason step
      setAttendanceId(existingAttendance.id);
      setStep('voice-reason');
    } else {
      // 3rd Scan case (Already In and Out)
      setStatusMessage({ text: 'ALREADY ATTENDANCE TAKEN', type: 'already' });
      setStep('result');
      setTimeout(() => {
        onReturnToLogin();
      }, 2000);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      setError('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleVoiceSubmit = async () => {
    if (!attendanceId || !audioBlob) return;
    setIsLoading(true);

    try {
      // Convert blob to base64 to store in text column
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          await markCheckOut(attendanceId, base64Audio);
          // Send check-out email
          if (student && student.email) {
            sendCheckOutEmail(student.email, student.name, student.student_id, student.department, 'Voice reason recorded');
          }
          setStatusMessage({ text: 'ATTENDANCE OUT VERIFIED', type: 'success' });
          setStep('result');
          setTimeout(() => {
            onReturnToLogin();
          }, 2000);
        } catch (innerErr) {
          console.error(innerErr);
          setError('Failed to submit voice reason.');
        } finally {
          setIsLoading(false);
        }
      };
    } catch (err) {
      console.error(err);
      setError('Failed to read audio.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative min-h-[500px] flex flex-col">
        {/* Step: ID Entry */}
        {step === 'id-entry' && (
          <div className="p-16 flex flex-col items-center justify-center flex-1">
            <div className="w-full max-w-md">
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">Enter Student ID to Begin</label>
              <form onSubmit={handleIdSubmit} className="space-y-6">
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors w-6 h-6" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="STU-XXXXXX"
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] py-6 pl-16 pr-8 focus:ring-[8px] focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-2xl font-black tracking-tight shadow-sm text-slate-900"
                  />
                </div>
                {error && (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] py-6 font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Identify <ChevronRight className="w-6 h-6" /></>}
                </button>
              </form>
              <button 
                onClick={onReturnToLogin}
                className="w-full mt-10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                Back to Admin Login
              </button>
            </div>
          </div>
        )}

        {/* Step: Details - Card Method */}
        {step === 'details' && student && (
          <div className="p-16 flex flex-col items-center justify-center flex-1 animate-in slide-in-from-right-12 duration-700">
            <div className="w-full max-w-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-[48px] p-1.5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
              
              <div className="bg-[#1E293B]/50 backdrop-blur-2xl rounded-[44px] p-10 border border-white/5 relative z-10">
                {/* ID Card Header */}
                <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-8">
                   <div className="flex items-center gap-4">
                     <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-900/40">
                       <ScanFace className="w-6 h-6 text-white" />
                     </div>
                     <div>
                       <h3 className="text-white font-black text-xl tracking-tight uppercase">Smart Identity</h3>
                       <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em]">Central Registry Card</p>
                     </div>
                   </div>
                   <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                     Active Node
                   </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                    <img 
                      src={student.photo_url || ''} 
                      alt={student.name} 
                      className="w-52 h-52 rounded-[40px] object-cover relative z-10 border-4 border-white/10 shadow-2xl"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl shadow-xl z-20 text-white ring-4 ring-[#1E293B]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-8">
                    <div>
                      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Student Name</p>
                      <h4 className="text-4xl font-black text-white tracking-tighter leading-tight">{student.name}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                      {[
                        { label: 'Student ID', value: student.student_id, icon: Fingerprint },
                        { label: 'Department', value: student.department || 'GENERAL', icon: Layers },
                        { label: 'Access Code', value: 'VERIFIED', icon: GraduationCap },
                        { label: 'Portal Status', value: 'READY', icon: Activity }
                      ].map((item, i) => (
                        <div key={i}>
                          <p className="text-white/30 font-black text-[9px] uppercase tracking-widest mb-1 flex items-center gap-2">
                            <item.icon className="w-3 h-3" /> {item.label}
                          </p>
                          <p className="text-white font-bold text-sm tracking-tight">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Chip */}
                <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4 text-white/40">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                      Signature Locked
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-blue-500 font-black text-sm uppercase tracking-[0.25em] animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying Biometric Node
              </div>
              <div className="w-64 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 animate-progress"></div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Camera */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col p-8">
            <div className="relative aspect-video bg-slate-900 rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoOn ? 'opacity-100' : 'opacity-0'}`}
              />
              
              {/* Overlay graphics */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[40px] border-black/20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/30 rounded-full border-dashed animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_#3b82f6] animate-scan-line"></div>
              </div>

              {/* Status floating card */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-12">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center justify-between shadow-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white">
                      <Scan className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Target Signature</p>
                      <p className="text-white font-black text-sm uppercase">{student?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-blue-400 font-black text-[10px] uppercase tracking-widest">
                    <Fingerprint className="w-4 h-4" />
                    Scanning...
                  </div>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className={`mt-8 p-6 rounded-[32px] border-4 flex items-center gap-6 animate-bounce shadow-xl ${
                statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className={`p-4 rounded-2xl ${statusMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                  {statusMessage.type === 'error' ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black tracking-tight uppercase">{statusMessage.text}</h3>
                  {statusMessage.type === 'error' && (
                    <p className="text-sm font-bold opacity-60 uppercase tracking-widest mt-1">
                      Verification failed • Reposition your face
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setStep('id-entry')}
              className="mt-6 flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              <VideoOff className="w-4 h-4" /> Cancel Verification
            </button>
          </div>
        )}

        {/* Step: Voice Reason (Early Checkout) */}
        {step === 'voice-reason' && (
          <div className="p-16 flex flex-col items-center justify-center flex-1 animate-in zoom-in duration-700">
            <div className="w-full max-w-lg text-center">
              <div className="bg-amber-50 text-amber-700 p-8 rounded-[40px] border-2 border-amber-100 mb-12 shadow-inner">
                <Volume2 className="w-12 h-12 mx-auto mb-6 text-amber-500" />
                <h3 className="text-3xl font-black tracking-tight uppercase mb-4 text-amber-900">Why leave the classroom before time?</h3>
                <p className="text-sm font-bold opacity-70 uppercase tracking-widest">Provide your reason via voice to complete check-out.</p>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isRecording ? 'bg-rose-100 scale-110 shadow-[0_0_50px_rgba(225,29,72,0.3)]' : 'bg-blue-100 shadow-xl'
                }`}>
                   <button 
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                       isRecording ? 'bg-rose-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                     }`}
                   >
                     {isRecording ? <Square className="w-10 h-10 text-white fill-white" /> : <Mic className="w-12 h-12 text-white" />}
                   </button>
                </div>

                <div className="space-y-4 w-full">
                  {isRecording && (
                    <div className="flex justify-center gap-1 h-8 items-end">
                       {[...Array(12)].map((_, i) => (
                         <div key={i} className="w-1 bg-rose-500 rounded-full animate-voice-bar" style={{animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 80}%`}}></div>
                       ))}
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8">
                       <button 
                         onClick={() => { const a = new Audio(audioUrl); a.play(); }}
                         className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 px-6 py-3 rounded-2xl text-slate-600 font-bold transition-all"
                       >
                         <Play className="w-5 h-5 fill-slate-600" /> Play Recording
                       </button>

                       <button 
                         onClick={handleVoiceSubmit}
                         disabled={isLoading}
                         className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[24px] font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                       >
                         {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> Click OK & Finish</>}
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <div className={`p-20 flex flex-col items-center justify-center flex-1 animate-in zoom-in duration-500 ${
            statusMessage?.type === 'error' ? 'bg-rose-50/10' : 'bg-emerald-50/10'
          }`}>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-10 shadow-2xl relative ${
              statusMessage?.type === 'error' ? 'bg-rose-100 text-rose-600' : 
              statusMessage?.type === 'already' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                statusMessage?.type === 'error' ? 'bg-rose-600' : 
                statusMessage?.type === 'already' ? 'bg-orange-600' : 'bg-emerald-600'
              }`}></div>
              {statusMessage?.type === 'error' ? <XCircle className="w-16 h-16" /> : 
               statusMessage?.type === 'already' ? <Clock className="w-16 h-16" /> : <CheckCircle2 className="w-16 h-16" />}
            </div>
            
            <h2 className={`text-5xl font-black tracking-tighter uppercase mb-6 text-center ${
              statusMessage?.type === 'error' ? 'text-rose-900' : 
              statusMessage?.type === 'already' ? 'text-orange-900' : 'text-emerald-900'
            }`}>
              {statusMessage?.text}
            </h2>
            
            <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm w-full max-w-md mb-12">
              <div className="flex items-center gap-4 mb-6">
                <img src={student?.photo_url || ''} className="w-14 h-14 rounded-2xl object-cover" />
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tight">{student?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student?.student_id}</p>
                </div>
              </div>
              <div className="h-[1px] bg-slate-50 w-full mb-6"></div>
              <p className="text-center font-bold text-slate-400 text-xs uppercase tracking-[0.3em]">
                {statusMessage?.type === 'error' ? 'Portal resetting in 10 seconds' : 'Portal resetting in 4 seconds'}
              </p>
            </div>

            <button 
              onClick={onReturnToLogin}
              className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-blue-600 transition-colors"
            >
              Manual Return to Login
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
