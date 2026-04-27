import { useState, useEffect, useRef } from 'react';
import { Student } from '../lib/supabase';
import { 
  ScanFace, 
  ShieldCheck, 
  Mail, 
  Layers, 
  GraduationCap, 
  Clock, 
  Activity, 
  Fingerprint, 
  Loader2,
  Mic,
  Play,
  Square,
  Save,
  Volume2
} from 'lucide-react';
import { loadModels, detectFaces, compareFaces } from '../services/faceDetection';
import { getTodayStudentAttendance, recordAttendance, markCheckOut } from '../services/database';
import { sendCheckInEmail, sendCheckOutEmail, sendSecurityAlertEmail } from '../services/emailService';

interface Props {
  user: Student;
  onLogout: () => void;
}

type PortalStep = 'details' | 'camera' | 'voice-reason';

export default function StudentPortal({ user, onLogout }: Props) {
  const [step, setStep] = useState<PortalStep>('details');
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

  const failCountRef = useRef(0);

  useEffect(() => {
    loadModels().then(() => {
      modelsReadyRef.current = true;
    });
    
    // Auto transition to camera after 3s
    const timer = setTimeout(() => {
      setStep('camera');
    }, 3000);

    return () => {
      clearTimeout(timer);
      stopVideo();
    };
  }, []);

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
    detectionIntervalRef.current = window.setInterval(async () => {
      if (!isProcessingRef.current && step === 'camera') {
        await performVerification();
      }
    }, 500);
  };

  const performVerification = async () => {
    if (!videoRef.current || !user || !modelsReadyRef.current) return;
    
    isProcessingRef.current = true;
    try {
      const detections = await detectFaces(videoRef.current, true);
      
      if (detections.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const det = detections[0];
      const studentDescriptor = user.face_descriptor ? new Float32Array(JSON.parse(user.face_descriptor)) : null;
      
      if (!studentDescriptor) {
        isProcessingRef.current = false;
        return;
      }

      const distance = compareFaces(det.descriptor, studentDescriptor);
      
      if (distance <= 0.5) {
        failCountRef.current = 0;
        await handleAttendanceRecord();
      } else {
        failCountRef.current += 1;
        
        if (failCountRef.current >= 3) {
          setStatusMessage({ text: 'FACE NOT IN DATABASE (NO DATA FOUND)', type: 'error' });
          
          if (user.email) {
            // Send security alert via emailService
            sendSecurityAlertEmail(user.email, user.name, user.student_id).catch(() => {});
          }

          setTimeout(() => {
            onLogout();
          }, 3000); 
        } else {
          setStatusMessage({ text: `RETRYING SCAN... ATTEMPT ${failCountRef.current}/3`, type: 'error' });
          setTimeout(() => {
            setStatusMessage(null);
            isProcessingRef.current = false;
          }, 1500);
        }
      }
    } catch (err) {
      console.error(err);
      isProcessingRef.current = false;
    }
  };

  const handleAttendanceRecord = async () => {
    const existingAttendance = await getTodayStudentAttendance(user.id);
    
    if (!existingAttendance) {
      // Clock In
      await recordAttendance(user.id, 0.95);
      // Send check-in email
      if (user.email) {
        sendCheckInEmail(user.email, user.name, user.student_id, user.department);
      }
      setStatusMessage({ text: 'ATTENDANCE IN VERIFIED', type: 'success' });
      setTimeout(() => {
        onLogout();
      }, 2000);
    } else if (existingAttendance && !existingAttendance.check_out_time) {
      // Clock Out - Need voice reason
      setAttendanceId(existingAttendance.id);
      setStep('voice-reason');
    } else {
      // 3rd Scan case (Already In and Out)
      setStatusMessage({ text: 'ALREADY ATTENDANCE TAKEN', type: 'already' });
      setTimeout(() => {
        onLogout();
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
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await markCheckOut(attendanceId, base64Audio);
        // Send check-out email
        if (user.email) {
          sendCheckOutEmail(user.email, user.name, user.student_id, user.department, 'Voice reason recorded');
        }
        setStatusMessage({ text: 'ATTENDANCE OUT VERIFIED', type: 'success' });
        setTimeout(() => {
          onLogout();
        }, 2000);
      };
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-700">
      {step === 'details' ? (
        <div className="animate-in slide-in-from-right-12 duration-700">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-4">Student <span className="text-blue-600">Portal</span></h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Signed in as {user.student_id}</p>
          </div>

          <div className="w-full max-w-3xl mx-auto relative group perspective-1000">
            {/* Background animated glows */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 rounded-[50px] blur-xl opacity-40 group-hover:opacity-75 transition duration-1000 animate-gradient-xy"></div>
            
            <div className="relative bg-white/70 backdrop-blur-3xl rounded-[48px] p-10 shadow-2xl border border-white overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:-translate-y-2">
              
              {/* Internal decorative elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full mix-blend-multiply"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full mix-blend-multiply"></div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-12 border-b border-slate-200/50 pb-8">
                   <div className="flex items-center gap-6">
                     <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-5 rounded-3xl shadow-lg shadow-purple-500/30 transform transition-transform group-hover:rotate-6">
                       <ScanFace className="w-10 h-10 text-white" />
                     </div>
                     <div>
                       <h3 className="text-slate-800 font-black text-3xl tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Smart Identity</h3>
                       <p className="text-purple-600 font-extrabold text-xs uppercase tracking-[0.4em] mt-1">Digital Campus Card</p>
                     </div>
                   </div>
                   <div className="bg-emerald-100/80 backdrop-blur-md text-emerald-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-200/50 shadow-sm flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                     Active Profile
                   </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-14">
                  <div className="relative shrink-0 group/avatar">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-500 blur-2xl opacity-40 group-hover/avatar:opacity-70 transition-opacity duration-500 rounded-full"></div>
                    <div className="relative p-1.5 rounded-[50px] bg-gradient-to-br from-white to-white/50 backdrop-blur-sm">
                      <img 
                        src={user.photo_url || ''} 
                        alt={user.name} 
                        className="w-56 h-56 rounded-[44px] object-cover shadow-inner transform transition-transform duration-500 group-hover/avatar:scale-105"
                      />
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-[24px] shadow-2xl z-20 text-white ring-4 ring-white transform transition-transform hover:scale-110">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-8">
                    <div>
                      <h4 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-800 tracking-tighter leading-tight drop-shadow-sm">{user.name}</h4>
                      <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-blue-500 mt-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {[
                        { label: 'Student ID', value: user.student_id, icon: Fingerprint, color: 'text-purple-600', bg: 'bg-purple-100' },
                        { label: 'Department', value: user.department || 'GENERAL', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-100' },
                        { label: 'Status', value: 'READY', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                        { label: 'Auth Method', value: 'BIOMETRIC', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100' }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col bg-white/60 p-5 rounded-3xl border border-white shadow-sm backdrop-blur-md hover:bg-white/80 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                             <div className={`p-2 rounded-xl ${item.bg}`}>
                               <item.icon className={`w-4 h-4 ${item.color}`} />
                             </div>
                             <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{item.label}</span>
                          </div>
                          <p className="text-slate-800 font-black text-lg tracking-tight ml-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl text-slate-600 font-medium text-sm backdrop-blur-md shadow-sm border border-white">
                         <Clock className="w-4 h-4 text-purple-500" />
                         {new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                      </div>
                      {user.email && (
                        <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl text-slate-600 font-medium text-sm backdrop-blur-md shadow-sm border border-white">
                           <Mail className="w-4 h-4 text-blue-500" />
                           {user.email}
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl text-blue-600 text-[10px] font-black uppercase tracking-[0.25em] border border-blue-100 shadow-inner">
                      Signature Locked
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : step === 'camera' ? (
        <div className="flex-1 flex flex-col p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100 min-h-[500px]">
          <div className="relative aspect-video bg-slate-900 rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoOn ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-[40px] border-black/20"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/30 rounded-full border-dashed animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_#3b82f6] animate-scan-line"></div>
            </div>
          </div>
          {statusMessage && (
            <div className={`mt-8 p-6 rounded-[32px] border-4 flex items-center gap-6 animate-bounce shadow-xl ${
              statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex-1">
                <h3 className="text-xl font-black tracking-tight uppercase">{statusMessage.text}</h3>
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest mt-1">Portal resetting in 10 seconds</p>
              </div>
            </div>
          )}
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-blue-600 font-black text-sm uppercase tracking-[0.2em] animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" /> Scanning Biometric Signature...
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 flex flex-col items-center justify-center flex-1 bg-white rounded-[40px] shadow-2xl border border-slate-100 min-h-[500px] animate-in zoom-in duration-700">
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
                       className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[24px] font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
                     >
                       <Save className="w-6 h-6" /> Click OK & Finish
                     </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
