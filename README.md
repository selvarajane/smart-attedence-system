# Smart Attendance System 🚀

A premium, real-time biometric attendance tracking system powered by face recognition technology. Integrated with Supabase for robust data management and featuring a modern, high-performance UI.

![Smart Attendance System](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20TypeScript%20%7C%20Supabase-blue)

## 🌟 Key Features

- **Real-time Face Tracking**: Automated student identification via webcam with high-precision matching.
- **Biometric Registration**: Seamless onboarding for new students, capturing facial descriptors for future recognition.
- **Automated Attendance**: "Set and forget" tracking that logs presence instantly while preventing duplicate entries.
- **Advanced Dashboard**: Real-time stats, trends, and monitoring of system health.
- **Student Management**: Full CRUD capabilities for student profiles, including their biometric data status.
- **Detailed Logs**: Comprehensive attendance history with advanced search and filtering options.
- **Premium UI/UX**: Modern, responsive design with support for both Light and Dark modes.
- **System Settings**: Configurable biometric thresholds, hardware acceleration, and database connection controls.

## 🛠️ Tech Stack

- **Frontend Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/)
- **Face Detection Engine**: [YOLOv26](https://docs.ultralytics.com/models/yolov26/) + [@vladmandic/face-api](https://github.com/vladmandic/face-api) (powered by TensorFlow.js)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database**: [Supabase](https://supabase.com/)
- **Iconography**: [Lucide React](https://lucide.dev/)

## 📁 Project Structure

```text
src/
├── components/          # UI Modules (Dashboard, Registration, Tracking, etc.)
│   ├── AttendanceHistory.tsx
│   ├── AttendanceTracking.tsx
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   └── StudentRegistration.tsx
├── services/           # Core Logic & API Integrations
│   ├── database.ts      # Supabase client and database operations
│   └── faceDetection.ts # AI model loading and face matching logic
├── App.tsx             # Main application shell and routing
└── main.tsx            # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) project set up

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd smart-attendance-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

The system's behavior can be fine-tuned via the **Settings** panel within the application:
- **Biometric Matching Threshold**: Adjust sensitivity for face recognition (default 0.6).
- **Auto-Scan Interval**: Set how frequently the system checks for faces.
- **Theme Selection**: Toggle between premium Light and Dark aesthetics.
- **Hardware Acceleration**: Enable/disable WebGL for AI performance.

## 📄 License

This project is private and for internal use.

---

*Built with ❤️ for the future of education management.*
