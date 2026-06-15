# 🖋️ WikiDoCollab

A high-performance MERN-stack platform for real-time collaborative document creation, version tracking, and workspace management. Designed with a premium, Anthropic-inspired editorial aesthetic, the platform features responsive layouts, real-time presence indicators, conflict prevention locks, and interactive WebGL background effects optimized for all hardware configurations.

---

## 🚀 Key Features

*   **Real-Time Collaborative Editing**: Powered by BlockNote rich-text editor, utilizing a granular block-level reconciliation algorithm (`reconcileBlocks`) that prevents editor cursor jumps and state overrides when multiple users write concurrently.
*   **Granular Version History & Commits**: Save document snapshots with custom commit messages. View a historical timeline of all changes, and quickly explore previous iterations.
*   **Live Socket Presence**: Socket.io-driven presence tracking that displays real-time active viewers/editors next to document status indicators with overlapping, drop-shadowed avatar badges.
*   **Real-Time Commit Lock (Conflict Prevention)**: Locks document commits dynamically when a collaborator begins saving a version, notifying other editors with warning alerts to prevent overlapping snapshots.
*   **Flexible Access Control**: Supports private and public documents with owner-level invitation settings. Collaborators can request access, which can be approved or rejected directly from the Profile Settings page.
*   **Multi-Format Export Engine**: Export documents to clean HTML, DOCX, and print-ready PDF formats instantly.
*   **Premium Interactive Backgrounds**:
    *   **Landing Page**: Interactive 3D WebGL particle storm powered by `ogl` that follows pointer movements with theme-responsive colors.
    *   **Login Page**: A diagonal drifting shape grid canvas featuring interactive hover trail animations.
    *   **Library & Profile Pages**: A retro-pixelated winter `<PixelSnow />` WebGL shader that adjusts snow colors dynamically matching the light/dark theme.
*   **Performance Mode (Low-End Hardware Optimization)**: 
    *   Features a global toggle inside the Profile page settings to turn off background animations. When enabled, canvas/WebGL initialization is completely bypassed, saving system memory and battery.
    *   Renders the raymarched PixelSnow WebGL canvas at a low resolution and upscales it via CSS `image-rendering: pixelated`, reducing GPU workload by **over 98%** while enhancing the pixel-art winter aesthetic.

---

## 🛠️ Technology Stack

### Frontend
*   **Core**: React 19, Vite (Dev server & bundler), React Router 6.
*   **Editor**: BlockNote Core & React components.
*   **Graphics & Animation**: Three.js (WebGL renderer), OGL (Minimal WebGL library), GSAP & `@gsap/react` (Staggered text animations).
*   **Styling**: Vanilla CSS with custom theme variables (warm cream light mode, charcoal dark mode), Mantine Core (helpers).

### Backend
*   **Runtime & Server**: Node.js, Express.
*   **Database**: MongoDB (Mongoose ODM).
*   **Real-time Communication**: Socket.io (WebSockets).
*   **Security**: JWT (Access & Refresh tokens) with secure authorization middleware.

---

## 📦 Project Structure

```text
├── backend/                  # Node.js + Express + Socket.IO Server
│   ├── src/
│   │   ├── middleware/       # JWT auth & Socket.IO presence filters
│   │   ├── models/           # Mongoose schemas (User, Document, Version, Request)
│   │   ├── routes/           # REST endpoints (auth, documents, public, requests)
│   │   └── index.js          # Express server entry point & WebSockets
│   ├── package.json
│   └── .env
└── frontend/                 # React + Vite Client
    ├── src/
    │   ├── pages/            # View components (App, Landing, Library, Editor, Profile)
    │   ├── utils/            # Helper modules (Axios API client, thumbnail generator)
    │   └── styles.css        # Premium Anthropic-inspired global stylesheet
    ├── package.json
    └── index.html
```

---

## ⚙️ Setup & Installation

### Prerequisites
*   Node.js 18+ and `npm` installed.
*   An active MongoDB instance (Local or MongoDB Atlas connection string).

### 1. Run the Backend Server
1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root of the `backend/` folder:
    ```env
    PORT=5112
    MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/wikidocollab
    JWT_SECRET=your_jwt_access_secret
    JWT_REFRESH_SECRET=your_jwt_refresh_secret
    ACCESS_TOKEN_TTL=15m
    REFRESH_TOKEN_TTL=12h
    ```
4.  Launch the development server:
    ```bash
    npm run dev
    ```
    The server will connect to MongoDB and start on `http://localhost:5112`.

### 2. Run the Frontend Client
1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install client dependencies:
    ```bash
    npm install
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5174` (or port `5173` depending on network availability).

---

## 🚀 Build & Production

To compile the React project for production:
```bash
cd frontend
npm run build
```
This outputs a minified, code-split bundle inside the `frontend/dist/` directory, ready to be hosted on static file services like Vercel, Netlify, or AWS S3.
