import { useState, useRef, useEffect } from 'react';
import { Camera, UserPlus, Loader2, Fingerprint, Mail, User, ShieldCheck, Zap, Info, AlertCircle, Globe } from 'lucide-react';

import { loadModels, detectFace, compareFaces } from '../services/faceDetection';
import { registerStudent, getAllStudents } from '../services/database';
import { sendRegistrationEmail } from '../services/emailService';
import { supabase, Student } from '../lib/supabase';

interface Props {
  onComplete?: (student?: Student) => void;
}


export default function StudentRegistration({ onComplete }: Props) {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
  const [captureStep, setCaptureStep] = useState(0); // 0: Front, 1: Left, 2: Right, 3: Up, 4: Complete
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const role = 'student';

  const [department, setDepartment] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [dob, setDob] = useState('');
  const [tutor, setTutor] = useState('');

  const [regMode, setRegMode] = useState<'live' | 'upload'>('live');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [idCheckLoading, setIdCheckLoading] = useState(false);
  const [idExists, setIdExists] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [modelsReady, setModelsReady] = useState(false);

  const steps = [
    { label: 'FRONTAL SCAN', icon: User, instructions: 'Look directly into the optical node' },
    { label: 'LEFT PROFILE', icon: Zap, instructions: 'Turn head slightly to the LEFT' },
    { label: 'RIGHT PROFILE', icon: Zap, instructions: 'Turn head slightly to the RIGHT' },
    { label: 'TILT VERIFICATION', icon: ShieldCheck, instructions: 'Tilt head slightly UPWARDS' }
  ];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels()
      .then(() => setModelsReady(true))
      .catch((err) => console.error('Error loading models:', err));

    return () => {
      stopVideo();
    };
  }, []);

  const startVideo = async () => {
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
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      setMessage(`ERROR: Could not open camera. ${err instanceof Error ? err.message : 'Please check permissions.'}`);
    }
  };

  const stopVideo = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoOn(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || captureStep >= 4) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      
      const detection = await detectFace(video, false); // Use high-precision model for registration
      if (!detection) {
        setMessage('Biometric error: Face not detected. Ensure face is centered.');
        return;
      }

      setCapturedImages([...capturedImages, imageData]);
      setDescriptors([...descriptors, detection.descriptor]);
      setCaptureStep(captureStep + 1);
      setMessage('');
      
      if (captureStep === 3) {
        stopVideo();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('Processing biometric signature from image...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        setUploadedImage(imageUrl);

        // Create virtual image element to scan
        const img = new Image();
        img.src = imageUrl;
        await img.decode();

        const detection = await detectFace(img, false);
        if (detection) {
          setDescriptors([detection.descriptor]);
          setCapturedImages([imageUrl]);
          setCaptureStep(4); // Skip to complete
          setMessage('Biometric signature extracted from upload.');
        } else {
          setMessage('No identifiable face found in uploaded image.');
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setMessage('Error reading uploaded image.');
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImages([]);
    setDescriptors([]);
    setCaptureStep(0);
    setUploadedImage(null);
    if (regMode === 'live') startVideo();
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'student' && captureStep < 4) {
      setMessage('Complete all 4 biometric directions to established signature.');
      return;
    }

    if (!studentId || !name) {
      setMessage('Please provide all mandatory identification data.');
      return;
    }


    setLoading(true);
    setMessage('');

    try {
      // Primary biometric signature (if available)
      const finalDescriptor = role === 'student' ? descriptors[0] : null;


      // Load latest students for duplicate face check
      const currentStudents = await getAllStudents();

      // Check if face already exists in database
      let duplicateStudent: Student | null = null;
      if (role === 'student') {
        for (const existing of currentStudents) {
          if (!existing.face_descriptor) continue;
          const storedDescriptor = new Float32Array(JSON.parse(existing.face_descriptor));

          // Skip corrupted averaged descriptors (from the older bug) by checking magnitude squared
          let magSq = 0;
          for (let i = 0; i < storedDescriptor.length; i++) {
            magSq += storedDescriptor[i] * storedDescriptor[i];
          }
          if (magSq < 0.75) {
            continue; // Automatically ignore corrupted "wildcard" faces
          }

          const distance = compareFaces(finalDescriptor!, storedDescriptor);
          if (distance <= 0.45) { // Stricter threshold to prevent false matches between different people
            duplicateStudent = existing;
            break;
          }
        }
      }

      if (duplicateStudent) {
        setMessage(`ALREADY IN DATABASE: Identification signature for ${duplicateStudent.name.toUpperCase()} already exists.`);
        setLoading(false);
        return;
      }

      // Check for ID uniqueness WITHIN the chosen role (Double check at submission)
      const { data: existingId } = await supabase
        .from('students')
        .select('id, name, role')
        .eq('student_id', studentId)
        .eq('role', role)
        .maybeSingle();


      if (existingId) {
        setMessage(`CONFLICT: Identification ID "${studentId}" is already registered to ${existingId.name} (${existingId.role}).`);
        setLoading(false);
        return;
      }

      const student = await registerStudent(
        studentId,
        name,
        email,
        role === 'student' ? capturedImages[0] : '', // No photo for Staff unless uploaded/captured
        finalDescriptor,
        role,
        { department, mobile_no: mobileNo, dob, tutor }
      );


      if (student) {
        setMessage('SUCCESS: Identity registered in main database.');
        // Send registration confirmation email
        if (student.email) {
          sendRegistrationEmail(student.email, student.name, student.student_id, department, tutor);
        }
        setStudentId('');
        setName('');
        setEmail('');
        setCapturedImages([]);
        setDescriptors([]);
        setCaptureStep(0);
        setTimeout(() => {
          if (onComplete) onComplete(student);
        }, 2000);

      } else {
        setMessage('CONFLICT: Identification ID is already registered. Please go back to the Login screen and sign in with this ID.');
      }
    } catch (err) {
      setMessage('CRITICAL ERROR during registration nodes.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 text-slate-900">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-4 flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              New <span className="text-blue-600">Enrollment</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl leading-relaxed">
              Establishing a new encrypted identity signature. Camera activation required for biometric capture.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-[28px] shadow-sm border border-slate-100">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Verified Session</span>
          </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 flex flex-col gap-8">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-sm">01</div>
                    <h3 className="text-2xl font-black tracking-tight uppercase">Biometric Sequence</h3>
                 </div>
                  <div className="flex gap-2">
                    {role === 'student' && regMode === 'live' && steps.map((_, i) => (
                       <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i < captureStep ? 'bg-emerald-500' : i === captureStep ? 'bg-blue-600 w-8' : 'bg-slate-200'}`} />
                    ))}
                    {role === 'student' && regMode === 'upload' && (
                       <div className={`w-8 h-3 rounded-full transition-all duration-500 ${captureStep === 4 ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                    )}
                    {role !== 'student' && (
                       <div className="w-8 h-3 rounded-full bg-emerald-500" />
                    )}
                  </div>
              </div>

              {role === 'student' ? (
                <>
                  <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                     <button 
                      type="button"
                      onClick={() => { setRegMode('live'); setCaptureStep(0); stopVideo(); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${regMode === 'live' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Live Optical Scan
                     </button>
                     <button 
                      type="button"
                      onClick={() => { setRegMode('upload'); setCaptureStep(0); stopVideo(); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${regMode === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Upload Identity Photo
                     </button>
                  </div>

                  <div className="relative aspect-[4/3] bg-slate-50 rounded-[32px] overflow-hidden border-4 border-white shadow-inner group ring-1 ring-slate-100">
                    {regMode === 'live' ? (
                      captureStep < 4 ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoOn ? 'opacity-100' : 'opacity-0'}`}
                          />
                          {!isVideoOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 animate-in fade-in">
                              <div className="w-24 h-24 bg-white shadow-xl rounded-[40px] flex items-center justify-center mb-8 border border-slate-50 group-hover:scale-110 transition-transform">
                                 <Camera className="w-10 h-10 text-blue-600" />
                              </div>
                              <button
                                type="button"
                                onClick={startVideo}
                                disabled={!modelsReady}
                                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95"
                              >
                                Initialize Camera Node
                              </button>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-8">Secure Hardware Access Required</p>
                            </div>
                          )}
                          {isVideoOn && (
                            <div className="absolute inset-0 pointer-events-none flex flex-row items-center justify-center bg-transparent">
                               <div className="w-[70%] h-[70%] border-4 border-dashed border-white/40 rounded-[80px] animate-pulse"></div>
                               <div className="absolute bottom-10 left-10 right-10 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex items-center gap-5 translate-y-2">
                                  <div className="bg-blue-600 p-3 rounded-xl text-white">
                                     {(() => {
                                        const StepIcon = steps[captureStep]?.icon || User;
                                        return <StepIcon className="w-6 h-6" />;
                                     })()}
                                  </div>
                                  <div className="text-left">
                                     <p className="text-white font-black text-xs uppercase tracking-widest mb-1">{steps[captureStep]?.label}</p>
                                     <p className="text-white/60 text-[10px] font-bold uppercase tracking-tighter">{steps[captureStep]?.instructions}</p>
                                  </div>
                               </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-2 h-full gap-1 p-1 bg-slate-200">
                           {capturedImages.map((img, i) => (
                              <img key={i} src={img} alt="Capture" className="w-full h-full object-cover" />
                           ))}
                        </div>
                      )
                    ) : (
                      /* UPLOAD MODE */
                      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                        {uploadedImage ? (
                          <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain bg-black rounded-2xl" />
                        ) : (
                          <>
                            <div className="w-24 h-24 bg-white shadow-xl rounded-[40px] flex items-center justify-center mb-8 border border-slate-50">
                               <Fingerprint className="w-10 h-10 text-blue-600" />
                            </div>
                            <p className="text-slate-500 font-bold text-sm mb-6 max-w-xs">Upload student biometric photo or ignore for Staff manual entry.</p>
                            <input 
                              type="file" 
                              id="face-upload" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileUpload}
                            />
                            <label 
                              htmlFor="face-upload"
                              className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all cursor-pointer active:scale-95"
                            >
                              Browse Local Image
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex gap-4">
                    {isVideoOn && captureStep < 4 && (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                        >
                          <Fingerprint className="w-5 h-5" />
                          Capture {steps[captureStep]?.label.split(' ')[0]}
                        </button>
                        <button
                          type="button"
                          onClick={retakePhoto}
                          className="px-8 py-5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-black transition-all"
                        >
                          Reset
                        </button>
                      </>
                    )}
                    {captureStep === 4 && (
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:bg-slate-800"
                      >
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Discard & Retake Sequence
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="relative aspect-[4/3] bg-slate-900 rounded-[32px] overflow-hidden flex flex-col items-center justify-center text-center p-12">
                   <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80')] bg-cover opacity-10"></div>
                   <div className="relative z-10">
                      <div className="w-24 h-24 bg-white/10 rounded-[40px] border border-white/20 flex items-center justify-center mb-10 mx-auto backdrop-blur-xl">
                         <UserPlus className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="text-white font-black text-2xl mb-4 uppercase tracking-tight">College Admin Mode</h4>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto opacity-70">
                         College Admin profiles utilize standard ID validation instead of optical biometric signatures.
                      </p>

                      <div className="mt-10 px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest inline-block">Secure Protocol Active</div>
                   </div>
                </div>
              )}

           </div>

           <div className="bg-blue-50/50 p-8 rounded-[32px] flex gap-5 items-start border border-blue-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-blue-700/70 text-sm font-semibold leading-relaxed uppercase tracking-tight text-xs">
                 The high-precision sequence collects 4 distinct biometric angles to establish a more robust identity signature, significantly reducing false negatives during live tracking.
              </p>
           </div>
        </div>

        <div className="lg:col-span-5">
           <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-sm">02</div>
                 <h3 className="text-2xl font-black tracking-tight uppercase">Identity Registry</h3>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <div className="relative">
                    <InputField 
                      label={role === 'student' ? 'Student ID' : 'Admin ID'} 
                      value={studentId} 
                      onChange={async (v: string) => {
                        setStudentId(v);
                        if (v.length > 2) {
                          setIdCheckLoading(true);
                          const { data } = await supabase
                            .from('students')
                            .select('id')
                            .eq('student_id', v)
                            .eq('role', role)
                            .maybeSingle();
                          setIdExists(!!data);
                          setIdCheckLoading(false);
                        } else {
                          setIdExists(false);
                        }
                      }} 
                      icon={ShieldCheck} 
                      placeholder="e.g., COL-ADM-001" 
                    />
                    <button 
                      type="button"
                      onClick={() => setStudentId(`${role === 'student' ? 'STU' : 'ADM'}-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="absolute right-4 top-[42px] px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      Auto-ID
                    </button>
                  </div>
                  {idCheckLoading && <p className="text-[10px] text-blue-500 font-bold px-1 mt-1 animate-pulse">Checking Registry...</p>}
                  {idExists && <p className="text-[10px] text-rose-500 font-bold px-1 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> This ID is already taken</p>}
                </div>

                <InputField label="Name" value={name} onChange={(v: string) => setName(v)} icon={User} placeholder="Full Legal Name" />

                <InputField label="Email Address" value={email} onChange={(v: string) => setEmail(v)} icon={Mail} placeholder="name@school.sh" type="email" />
                


                <div className="grid grid-cols-2 gap-6">
                   <InputField label="Department" value={department} onChange={(v: string) => setDepartment(v)} icon={Globe} placeholder="e.g. Science" />
                   <InputField label="Tutor Name" value={tutor} onChange={(v: string) => setTutor(v)} icon={User} placeholder="e.g. Prof. X" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <InputField label="Mobile No" value={mobileNo} onChange={(v: string) => setMobileNo(v)} icon={ShieldCheck} placeholder="+91 0000 0000" type="tel" />
                   <InputField label="DOB" value={dob} onChange={(v: string) => setDob(v)} icon={Zap} placeholder="YYYY-MM-DD" type="date" />
                </div>
              </div>


              {message && (
                <div className={`p-6 rounded-[24px] flex items-center gap-4 ${message.includes('SUCCESS') ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                  <div className={`p-2 rounded-lg ${message.includes('SUCCESS') ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                     {message.includes('SUCCESS') ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{message}</p>
                </div>
              )}

              {message.includes('CONFLICT') && onComplete && (
                <button
                  type="button"
                  onClick={() => onComplete()}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 mb-6"
                >
                  Return to Login Portal
                </button>
              )}


              <button
                type="submit"
                disabled={loading || (role === 'student' && (!modelsReady || captureStep < 4)) || idExists}
                className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><UserPlus className="w-6 h-6" /> Complete Enrollment</>}
              </button>
           </form>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function InputField({ label, value, onChange, icon: Icon, placeholder, type = "text" }: any) {
  return (
    <div className="group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 block group-focus-within:text-blue-600 transition-colors">{label} <span className="text-rose-500">*</span></label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
          placeholder={placeholder}
          required={label !== "Email Address"}
        />
      </div>
    </div>
  )
}
