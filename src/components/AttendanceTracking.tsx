import { useState, useRef, useEffect } from 'react';
import { 
  VideoOff, 
  Loader2, 
  ShieldCheck, 
  Scan, 
  Activity, 
  CalendarCheck, 
  Fingerprint,
  AlertCircle,
  Mail
} from 'lucide-react';
import { loadModels, detectFaces, compareFaces, getConfidenceScore } from '../services/faceDetection';
import { getAllStudents, recordAttendance, getTodayAttendance, getTodayStudentAttendance, markCheckOut } from '../services/database';
import { sendCheckInEmail, sendCheckOutEmail } from '../services/emailService';
import { Student, Attendance } from '../lib/supabase';
import { Mic, Volume2, Play } from 'lucide-react';

interface ActiveDetection {
  id: string;
  box: { x: number, y: number, width: number, height: number };
  name: string;
  type: 'success' | 'already' | 'error' | 'analyzing';
}

interface Props {
}


export default function AttendanceTracking({ }: Props) {


  const [isVideoOn, setIsVideoOn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<(Attendance & { students: Student })[]>([]);
  const [currentDetection, setCurrentDetection] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'info' | 'error' | 'already', photoUrl?: string, email?: string } | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceReason, setVoiceReason] = useState('');
  const [emergencyStudent, setEmergencyStudent] = useState<Student | null>(null);
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);

  const modelsReadyRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const processingIdsRef = useRef<Set<string>>(new Set());
  const studentsRef = useRef<(Student & { descriptorObj?: Float32Array })[]>([]);
  const todayAttendanceRef = useRef<(Attendance & { students: Student })[]>([]);
  // Track which students already received an email this session to avoid duplicates
  const emailedTodayRef = useRef<Set<string>>(new Set());


  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // Reset state refs to ensure a clean start
        isNavigatingRef.current = false;
        isProcessingRef.current = false;
        
        await loadModels();
        if (!isMounted) return;
        modelsReadyRef.current = true;
        
        // Pre-load data
        await Promise.all([loadStudents(), loadTodayAttendance()]);
        if (!isMounted) return;
        
        // Automatically start video per user requirement for "any return same method"
        await startVideo();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
      }
    };

    initialize();

    return () => {
      isMounted = false;
      stopVideo();
    };
  }, []);

  const loadStudents = async () => {
    const data = await getAllStudents();
    // Pre-calculate descriptors for efficiency
    const optimized = data.map(s => ({
      ...s,
      descriptorObj: s.face_descriptor ? new Float32Array(JSON.parse(s.face_descriptor)) : undefined
    }));
    studentsRef.current = optimized;
  };

  const loadTodayAttendance = async () => {
    const data = await getTodayAttendance();
    setTodayAttendance(data);
    todayAttendanceRef.current = data;
  };

  const startVideo = async () => {
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoOn(true);
        // Ensure stream is active before starting detection loop
        videoRef.current.onloadedmetadata = () => {
          startDetection();
        };
      }
    } catch (err) {
      console.error('Camera tracking error:', err);
      setCurrentDetection(`HARDWARE ERROR: ${err instanceof Error ? err.message : 'Access Denied'}`);
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
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = window.setInterval(async () => {
      if (!isNavigatingRef.current && !isProcessingRef.current) {
        await performDetection();
      }
    }, 400); 
  };

  const performDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReadyRef.current || isNavigatingRef.current || isProcessingRef.current) {
        if (isNavigatingRef.current) {
            // clear canvas if navigating (showing large alert)
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        }
        return;
    }
    
    isProcessingRef.current = true;
    try {
      if (studentsRef.current.length === 0) {
        setCurrentDetection('NO DATA RECORDS');
        isProcessingRef.current = false;
        return;
      }

      const detections = await detectFaces(videoRef.current, true);

      if (detections.length === 0) {
        setCurrentDetection('AWAITING IDENTITIES...');
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        isProcessingRef.current = false;
        return;
      }

      // Sync canvas size with video
      if (canvasRef.current && videoRef.current) {
        if (canvasRef.current.width !== videoRef.current.videoWidth) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      }

      const results: ActiveDetection[] = [];

      for (const det of detections) {
        let bestMatch: { student: Student; distance: number } | null = null;
        for (const student of studentsRef.current) {
          if (!student.descriptorObj || student.role !== 'student') continue;

          let magSq = 0;
          for (let i = 0; i < student.descriptorObj.length; i++) {
            magSq += student.descriptorObj[i] * student.descriptorObj[i];
          }
          if (magSq < 0.75) continue; 

          const distance = compareFaces(det.descriptor, student.descriptorObj);
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { student, distance };
          }
        }

        const box = det.detection.box;
        if (bestMatch && bestMatch.distance <= 0.5) {
          const student = bestMatch.student;
          const studentId = student.id;
          
          // Check if already clocked in today
          const existingAttendance = await getTodayStudentAttendance(studentId);
          const isCurrentlyProcessing = processingIdsRef.current.has(studentId);

          if (isCurrentlyProcessing) {
            results.push({ id: studentId, box, name: student.name, type: 'analyzing' });
            continue;
          }

          const now = new Date();
          const hour = now.getHours();
          const isAfternoon = hour >= 15; // 4 PM window

          
          if (!existingAttendance) {
            // Clock In
            processingIdsRef.current.add(studentId);
            const attendanceRecord = await recordAttendance(studentId, getConfidenceScore(bestMatch.distance));
            if (attendanceRecord) {
              // Only email once per student per session
              if (student.email && !emailedTodayRef.current.has(`in-${studentId}`)) {
                emailedTodayRef.current.add(`in-${studentId}`);
                sendCheckInEmail(student.email, student.name, student.student_id, student.department);
              }
              results.push({ id: studentId, box, name: student.name, type: 'success' });
              loadTodayAttendance();
            }
            processingIdsRef.current.delete(studentId);
          } else if (existingAttendance && !existingAttendance.check_out_time) {
            // Already In, check for Out or Emergency
            if (isAfternoon) {
              // Standard Check Out
              processingIdsRef.current.add(studentId);
              await markCheckOut(existingAttendance.id);
              // Only email once per student per session
              if (student.email && !emailedTodayRef.current.has(`out-${studentId}`)) {
                emailedTodayRef.current.add(`out-${studentId}`);
                sendCheckOutEmail(student.email, student.name, student.student_id, student.department);
              }
              results.push({ id: studentId, box, name: student.name, type: 'success' });
              loadTodayAttendance();
              processingIdsRef.current.delete(studentId);
            } else {
              // Emergency Exit required?
              setEmergencyStudent(student);
              setActiveAttendanceId(existingAttendance.id);
              setIsVoiceActive(true);
              stopVideo(); // Stop scanning while talking
              startVoiceAssistant(student.name);
            }
          } else {
            // Already fully checked in and out
            results.push({ id: studentId, box, name: student.name, type: 'already' });
          }
        } else {
          results.push({ id: Math.random().toString(), box, name: 'Unknown', type: 'error' });
        }
      }


      drawOnCanvas(results);

      // Requirement: Single person show a message biggly
      if (results.length === 1 && (results[0].type === 'success' || results[0].type === 'already')) {
          const res = results[0];
          const student = studentsRef.current.find(s => s.id === res.id);
          handleMatchingResult(res.type as any, res.name, student?.photo_url, student?.email);
      } else {
          setCurrentDetection(results.length > 1 ? `${results.length} FACES TRACKED` : 'SCANNING...');
          isProcessingRef.current = false;
      }

    } catch (err) {
      console.error(err);
      setCurrentDetection('SYSTEM BUSY');
      isProcessingRef.current = false;
    }
  };

  const drawOnCanvas = (results: ActiveDetection[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Requirement: Show small messages in the box for multiple members
    results.forEach(res => {
      const { x, y, width, height } = res.box;
      
      // Select color based on status
      const color = res.type === 'success' ? '#10b981' : (res.type === 'already' ? '#f59e0b' : '#ef4444');
      
      // Draw Box with rounded corners look (strokeRect)
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Label background
      const label = res.name.toUpperCase();
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = color;
      // Top label
      ctx.fillRect(x, y - 25, textWidth + 15, 25);
      
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 7, y - 8);
      
      // Status tag
      const statusLabel = res.type === 'success' ? 'VERIFIED' : (res.type === 'already' ? 'RECORDED' : 'UNKNOWN');
      ctx.font = 'bold 8px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(statusLabel, x + 7, y - 18);
    });
  };

  const handleMatchingResult = (type: 'success' | 'already' | 'error', name: string, photoUrl?: string, email?: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    let message = '';
    if (type === 'success') message = 'ATTENDANCE VERIFIED';
    else if (type === 'already') message = 'ALREADY ATTENDANCE TAKEN';
    else message = 'NO DATA RECORDS';

    setStatusMessage({ 
      text: `${message}${name !== 'No Data Records' ? ': ' + name.toUpperCase() : ''}`, 
      type,
      photoUrl,
      email
    });
    setCurrentDetection(message);
    
    // For all results (Success/Already/Error), show the message then reset for next person
    setTimeout(() => {
        setStatusMessage(null);
        isNavigatingRef.current = false;
        isProcessingRef.current = false;
        setCurrentDetection('AWAITING IDENTITIES...');
    }, type === 'already' ? 1500 : 2500); // 1.5s for repeat faces, 2.5s for success
  };
  const startVoiceAssistant = (name: string) => {
    const msg = new SpeechSynthesisUtterance(`Hello ${name}. You are attempting to leave early. Please tell me your emergency reason for going home.`);
    
    msg.onend = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64AudioMessage = reader.result as string;
            setVoiceReason("Audio Record Saved.");
            handleEmergencySubmit(base64AudioMessage);
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        
        // Record for exactly 4.5 seconds
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 4500);

      } catch (err) {
        console.error("Microphone access denied or error:", err);
        setVoiceReason("Error accessing microphone");
        handleEmergencySubmit("Microphone error");
      }
    };
    
    window.speechSynthesis.speak(msg);
  };

  const handleEmergencySubmit = async (reason: string) => {
    if (activeAttendanceId && emergencyStudent) {
      await markCheckOut(activeAttendanceId, reason, true);
      // Send emergency checkout email
      if (emergencyStudent.email) {
        sendCheckOutEmail(
          emergencyStudent.email,
          emergencyStudent.name,
          emergencyStudent.student_id,
          emergencyStudent.department,
          'Emergency Early Exit'
        );
      }
      const msg = new SpeechSynthesisUtterance("Reason recorded. Emergency exit verified. Take care.");
      window.speechSynthesis.speak(msg);
      
      setTimeout(() => {
        setIsVoiceActive(false);
        setEmergencyStudent(null);
        setActiveAttendanceId(null);
        setVoiceReason('');
        loadTodayAttendance();
        startVideo(); // Resume scanning
      }, 3000);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200 text-white">
                <Scan className="w-8 h-8" />
              </div>
              Identity <span className="text-blue-600">Scanner</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl leading-relaxed">
              Optical verification node. Scanning for registered biometric signatures.
            </p>
          </div>
          <div className="flex items-center gap-2 px-6 py-4 bg-white rounded-3xl shadow-sm border border-slate-100">
            <CalendarCheck className="w-6 h-6 text-emerald-600" />
            <span className="text-slate-900 font-black text-2xl tracking-tighter">{todayAttendance.length}</span>
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest ml-2">Total Verified</span>
          </div>
      </div>

      {statusMessage && (
        <div className={`p-8 rounded-[40px] border flex items-center gap-6 animate-bounce transition-all ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
          statusMessage.type === 'already' ? 'bg-orange-50 border-orange-100 text-orange-900' :
          'bg-rose-50 border-rose-100 text-rose-900'
        }`}>
           <div className={`p-4 rounded-2xl shadow-lg overflow-hidden ${
             statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 
             statusMessage.type === 'already' ? 'bg-orange-600 text-white' :
             'bg-rose-600 text-white'
           }`}>
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-8 h-8" />
              ) : statusMessage.photoUrl ? (
                <img src={statusMessage.photoUrl} alt="Profile" className="w-16 h-16 rounded-xl object-cover border-2 border-white/50 shadow-inner" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
           </div>
           <div className="flex-1">
              <h3 className="text-2xl font-black tracking-tighter uppercase">{statusMessage.text}</h3>
               {statusMessage.type !== 'error' ? (
                 <div className="flex flex-col items-start">
                   <p className="font-bold opacity-60 text-xs uppercase tracking-[0.2em] mt-2">Biometric Signature Verified in Central Registry</p>
                   {statusMessage.email && statusMessage.type === 'success' && (
                     <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm text-green-700 rounded-xl text-[10px] font-black tracking-wider uppercase border border-green-200 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                       <Mail className="w-4 h-4 text-green-600" /> Auto-mailed Verification to {statusMessage.email}
                     </div>
                   )}
                 </div>
               ) : (
                 <p className="font-bold opacity-60 text-xs uppercase tracking-[0.2em] mt-2 text-rose-600 animate-pulse">Requesting new biometric sample...</p>
               )}
           </div>
           <Loader2 className="w-10 h-10 animate-spin opacity-20" />
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="relative aspect-video bg-slate-50 rounded-[40px] overflow-hidden border-8 border-white shadow-xl group ring-1 ring-slate-100">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-all duration-1000 ${isVideoOn ? 'opacity-100' : 'opacity-0 scale-105 pointer-events-none'}`}
            />

            <canvas 
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover z-20 pointer-events-none ${!isVideoOn || statusMessage ? 'hidden' : ''}`}
            />

            {isVideoOn && !statusMessage && (
               <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 border-[40px] border-white/5 shadow-inner"></div>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_20px_#3b82f6] animate-scan-line"></div>
                  <div className="absolute inset-x-[15%] inset-y-[10%] border-2 border-white/20 rounded-[80px] border-dashed animate-pulse"></div>
               </div>
            )}

            {!isVideoOn && !statusMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white/40 backdrop-blur-xl transition-all duration-700">
                <div className="w-24 h-24 bg-white shadow-xl rounded-[40px] flex items-center justify-center mb-8 border border-white group/load animate-pulse">
                   <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 uppercase">Initializing Sensors...</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] max-w-xs mb-10 leading-relaxed">
                  Establishing secure optical connection to biometric registry terminal.
                </p>
                <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-600 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse">
                   <Activity className="w-4 h-4" />
                   System Status: Booting Optical Node
                </div>
              </div>
            )}

            {currentDetection && isVideoOn && !statusMessage && (
              <div className="absolute bottom-10 left-10 right-10 z-30 flex items-center justify-center">
                 <div className={`px-10 py-5 rounded-[24px] flex items-center gap-4 text-white shadow-2xl animate-in slide-in-from-bottom-2 ${currentDetection.includes('MATCH IDENTIFIED') ? 'bg-emerald-600 shadow-emerald-100' : 'bg-slate-900/90 shadow-slate-400/20'}`}>
                    <div className={`w-2 h-2 rounded-full animate-ping ${currentDetection.includes('MATCH IDENTIFIED') ? 'bg-white' : 'bg-blue-500'}`}></div>
                    <span className="font-black text-xs uppercase tracking-[0.2em]">{currentDetection}</span>
                 </div>
              </div>
            )}
            {isVoiceActive && emergencyStudent && (
              <div className="absolute inset-0 bg-blue-600/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 z-50">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-10 border-4 border-white/20 relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20"></div>
                  <Volume2 className="w-16 h-16 text-white animate-pulse" />
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">AI Voice Assistant</h2>
                <p className="text-blue-100/80 text-xl font-bold mb-12 max-w-lg leading-relaxed capitalize">
                   "Hello {emergencyStudent.name}. What is your reason for leaving early?"
                </p>
                
                <div className="bg-white/10 border border-white/20 p-8 rounded-[32px] w-full max-w-md">
                   <div className="flex items-center gap-4 mb-6 text-blue-100 font-black text-xs uppercase tracking-widest">
                      <Mic className="w-4 h-4" /> Listening to your response...
                   </div>
                   <p className="text-white text-2xl font-black min-h-[60px] italic">
                     {voiceReason || '...'}
                   </p>
                </div>
              </div>
            )}
          </div>


          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 p-8 bg-white rounded-[32px] border border-slate-100 shadow-lg shadow-slate-200/40 flex items-center gap-6">
               <div className="bg-blue-50 p-5 rounded-2xl text-blue-600">
                 {isVideoOn ? <ShieldCheck className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Optical Engine</p>
                  <p className="text-slate-900 font-black text-xl tracking-tight">{isVideoOn ? 'ACTIVE SCANNING' : 'SYSTEM STANDBY'}</p>
               </div>
               {isVideoOn && !statusMessage && (
                 <button 
                  onClick={stopVideo}
                  className="ml-auto p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                 >
                   <VideoOff className="w-5 h-5" />
                 </button>
               )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col">
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full bg-white">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between pb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Today's Log</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-500" /> Synchronization
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 max-h-[500px] space-y-4 no-scrollbar bg-white">
                {todayAttendance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                    <Fingerprint className="w-16 h-16 text-slate-300 mb-6" />
                    <p className="font-bold text-slate-500 text-xs uppercase tracking-widest">NO DATA FOUND</p>
                  </div>
                ) : (
                  todayAttendance.map((record) => (
                    <div key={record.id} className="group p-6 bg-slate-50/50 rounded-3xl border border-transparent hover:border-blue-100 hover:bg-white transition-all flex justify-between items-center shadow-sm hover:shadow-md">
                       <div className="flex items-center gap-4 flex-1">
                          <div className={`w-1.5 h-1.5 ${record.check_out_time ? (record.is_emergency_exit ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-blue-500 animate-pulse'} rounded-full group-hover:scale-150 transition-transform`}></div>
                          <div>
                             <p className="font-black text-slate-900 leading-tight uppercase tracking-tight">{record.students.name.split(' ')[0]}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{record.students.student_id}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="text-right flex flex-col items-end gap-1.5">
                            <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase">
                              IN: {new Date(record.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            {record.check_out_time && (
                              <p className={`text-[10px] font-black ${record.is_emergency_exit ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'} px-2.5 py-1 rounded-lg uppercase`}>
                                OUT: {new Date(record.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            )}
                         </div>
                         {record.exit_reason && (
                           <button
                             onClick={() => {
                               if (record.exit_reason!.startsWith('data:audio')) {
                                 new Audio(record.exit_reason!).play();
                               } else {
                                 window.speechSynthesis.speak(new SpeechSynthesisUtterance(record.exit_reason!));
                               }
                             }}
                             className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 hidden group-hover:flex items-center justify-center shrink-0"
                             title="Play Voice Reason"
                           >
                             <Play className="w-4 h-4 fill-current" />
                           </button>
                         )}
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
