import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Zap,
  Layout,
  RefreshCcw
} from 'lucide-react';

export default function Help() {
  const sections = [
    { 
      title: "Quick Start Guide", 
      icon: Zap, 
      color: "blue",
      items: ["New Student Registration", "Live Tracking Basics", "Database Management"]
    },
    { 
      title: "Troubleshooting", 
      icon: ShieldAlert, 
      color: "rose",
      items: ["Camera Access Issues", "Biometric Misses", "Synchronization Errors"]
    },
    { 
      title: "API & Integration", 
      icon: BookOpen, 
      color: "emerald",
      items: ["Webhooks Setup", "Data Exporting", "Secure Hashes"]
    }
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="flex-1">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200 text-white">
                <HelpCircle className="w-8 h-8" />
              </div>
              Knowledge <span className="text-blue-600">Base</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl leading-relaxed">
              Explore our comprehensive implementation guide. Need help? Our system documentation has you covered.
            </p>
          </div>
          <div className="w-full md:w-96">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search documentation..." 
                className="w-full bg-white border border-slate-100 rounded-[28px] py-6 pl-14 pr-6 focus:ring-[6px] focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 shadow-sm"
              />
            </div>
          </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          const colors: any = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100',
            rose: 'bg-rose-50 text-rose-600 border-rose-100',
            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          };
          
          return (
            <div key={idx} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-200/10 transition-all duration-500">
               <div className={`w-16 h-16 rounded-3xl ${colors[section.color]} flex items-center justify-center mb-8 border shadow-sm`}>
                  <Icon className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{section.title}</h3>
               <div className="space-y-4">
                 {section.items.map((item, i) => (
                    <button key={i} className="w-full group flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                       <span className="font-bold text-slate-700 tracking-tight">{item}</span>
                       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-all" />
                    </button>
                 ))}
               </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
         <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 blur-[100px] opacity-20 -translate-x-10 -translate-y-20"></div>
            <div className="relative z-10">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                     <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white font-black text-2xl tracking-tight">Direct Support</h4>
               </div>
               <p className="text-slate-400 font-medium leading-relaxed mb-10 max-w-sm">
                  Our biometric engineers are available for priority technical assistance during system deployment.
               </p>
               <button className="flex items-center gap-3 px-8 py-5 bg-white text-slate-900 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all group-hover:scale-[1.02]">
                  Open Support Hub <ExternalLink className="w-4 h-4" />
               </button>
            </div>
         </div>

         <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            <div className="relative">
               <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Latest Software Update</h4>
               <p className="text-slate-500 font-semibold mb-8">Version 4.2.0-stable is now live with enhanced AI throughput.</p>
               <div className="flex gap-4">
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                     <RefreshCcw className="w-3 h-3" /> New Models v2
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                     <Layout className="w-3 h-3" /> UI Refactor
                  </div>
               </div>
            </div>
            <div className="relative mt-12">
               <button className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">
                  Read Release Notes <FileText className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
