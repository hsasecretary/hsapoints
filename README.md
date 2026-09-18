# 🐊 UF HSA Member Portal & Points Tracker

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-orange.svg)](https://firebase.google.com/)
[![Python](https://img.shields.io/badge/Python-Automation%20Scripts-green.svg)](https://www.python.org/)

The official internal web application and point management system for the **University of Florida Hispanic Student Association (UF HSA)**.

- 🌐 **Internal Portal:** [hsamemberportal.com](https://hsamemberportal.com)
- 🌐 **Official Website:** [ufhsa.com](https://ufhsa.com)
- 💻 **GitHub Repository:** [github.com/hsasecretary/hsapoints](https://github.com/hsasecretary/hsapoints)

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React (SPA), TypeScript, Vite, HTML5, CSS3 |
| **Backend & Database** | Firebase Authentication (`@ufl.edu` sign-in), Cloud Firestore |
| **Automation & Admin Tools** | Python 3 (data reconciliation, member exports, batch uploads) |
| **Design & Management** | Figma, GitHub, ClickUp |

---

## 📋 Prerequisites & Tools to Install

Before getting started, make sure you have the following installed on your machine:

1. **[Node.js (LTS Version)](https://nodejs.org/)** — Installs `node` and `npm` (Node Package Manager) needed to run the React app.
2. **[Git](https://git-scm.com/)** — For version control and GitHub collaboration.
3. **[Visual Studio Code](https://code.visualstudio.com/)** — The recommended code editor.
4. **[Python 3 (3.10+)](https://www.python.org/)** — Required for backend data automation and member extraction scripts.
5. **[uv (Fast Python Package Manager)](https://github.com/astral-sh/uv)** *(optional but recommended)* or standard `pip`.
6. **Firebase CLI** — For deploying rules and interacting with Firebase services:
   ```bash
   npm install -g firebase-tools
   ```

---

## 🧩 Recommended VS Code Extensions

Install these extensions for code formatting, linting, and syntax highlighting:

| Extension | ID | Purpose |
|---|---|---|
| **Prettier** | `esbenp.prettier-vscode` | Automatically formats JS/JSX/CSS on save |
| **ESLint** | `dbaeumer.vscode-eslint` | Catches syntax errors and style issues in React |
| **Python + Pylance** | `ms-python.python`, `ms-python.vscode-pylance` | Language support and autocomplete for Python scripts |
| **GitLens** | `eamodio.gitlens` | Visualizes Git branch history and code authorship |
| **Auto Rename Tag** | `formulahendry.auto-rename-tag` | Keeps HTML/JSX tags synchronized |

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone the Repository

Open your terminal (PowerShell, Command Prompt, or macOS/Linux Terminal) in your desired working folder (e.g., `Desktop/HSA WebDev`) and clone the repo:

```bash
git clone https://github.com/hsasecretary/hsapoints.git
cd hsapoints
```

### 2. Open the Project in VS Code

Open the `hsapoints` folder directly as the workspace root:

```bash
code .
```

### 3. Install React Dependencies

The web app lives in the `frontend/` folder. Install its Node modules from there:

```bash
cd frontend
npm install
```

### 4. Set Up Python Virtual Environment (For Admin Scripts)

If you are working on data exports or Firestore administrative scripts:

```bash
# Using uv (fast)
uv venv
uv pip install firebase-admin pandas openpyxl

# Or using standard python venv
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install firebase-admin pandas openpyxl
```

In VS Code, press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac) → **Python: Select Interpreter** → select `./.venv/Scripts/python.exe`.

### 5. Configure Firebase Authentication & Keys

- Create a `.env.local` file in the `frontend/` directory if environment variables are required.
- If running admin scripts locally, place your `serviceAccountKey.json` inside the repository root or `scripts/` directory.

> ⚠️ **CRITICAL SECURITY RULE:** Never commit `serviceAccountKey.json`, `.env`, or `.xlsx` files to GitHub. Always ensure they are listed in `.gitignore`.

---

## 💻 Available Scripts

Run the `npm` commands from the `frontend/` folder (`cd frontend`). The Python scripts run from the repository root.

| Command | Description |
|---|---|
| `npm run dev` (or `npm start`) | Runs the app with Vite in development mode at [http://localhost:5173](http://localhost:5173), with instant hot reloading. |
| `npm run build` | Builds the app for production to `frontend/build/` (the folder Firebase Hosting deploys, see `firebase.json`). |
| `npm run typecheck` | Checks the TypeScript types across `src/` without building. Run it before opening a PR. |
| `npm run preview` | Serves the production build locally so you can check it before deploying. |
| `python scripts/export_members.py` | Extracts active member profiles, point totals, and cabinet standings from Firestore into an Excel spreadsheet. |

---

## 📁 Project Structure

```
hsapoints/
├── README.md                  # Project documentation
├── .gitignore                 # Ignored files (node_modules, build, .venv, secrets, exports)
├── firebase.json              # Firebase Hosting (serves frontend/build) + Firestore config
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── .github/workflows/         # Deploy to Firebase Hosting on merge / preview on PR
├── scripts/                   # Python admin scripts (Firebase Admin SDK)
│   ├── export_members.py
│   └── serviceAccountKey.json (Git ignored)
└── frontend/                  # The web app (React + TypeScript + Vite)
    ├── index.html             # App entry page
    ├── package.json           # Dependencies and npm scripts
    ├── vite.config.ts         # Vite build/dev-server config
    ├── tsconfig.json          # TypeScript settings (lenient for now)
    ├── public/                # Static files copied as-is (favicon, manifest, 404 page)
    └── src/
        ├── main.tsx           # Entry point: loads styles and renders <App />
        ├── App.tsx            # Router, auth state, page layout (header, nav, footer)
        ├── pages/             # One folder per area of the site
        │   ├── auth/          # Login, SignUp, ForgotPassword
        │   ├── dashboard/     # Dashboard.tsx + sections/ (PointsOverview, EventCodeForm,
        │   │                  #   EventsAttendedList, PointRequestForm)
        │   ├── cabinet/       # Cabinet, CabinetPoints
        │   ├── eboard/        # Eboard and its tools (codes, requests, lookups, approvals)
        │   └── NotFound.tsx   # 404 page
        ├── components/
        │   └── layout/        # Header, NavBar, Footer, Logout (shared page frame)
        ├── lib/
        │   ├── firebase.ts    # Firebase App/Auth/Firestore initialization
        │   ├── reportWebVitals.ts
        │   └── admin/         # One-off cabinet-role scripts used from the E-Board page
        └── styles/            # All CSS: main.css imports base, layout, auth, dashboard, eboard
```

---

## 🌿 Git & Collaboration Workflow

**1. Always pull latest changes before starting work:**

```bash
git checkout main
git pull origin main
```

**2. Create a dedicated branch for your task:**

```bash
git checkout -b feature/voter-eligibility-ui
# or
git checkout -b fix/event-code-validation
```

**3. Commit with descriptive messages:**

```bash
git add .
git commit -m "Add circular progress bar for voter eligibility"
```

**4. Push your branch and open a Pull Request (PR):**

```bash
git push origin feature/voter-eligibility-ui
```

> 📌 Tag the **Senior Software Developer** on GitHub / ClickUp for review before merging into `main`.

---

## 📚 Helpful Resources & Documentation

- [React Documentation](https://react.dev)
- [Firebase Web SDK (v9/v10)](https://firebase.google.com/docs/web/setup)
- [Cloud Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin Python SDK](https://firebase.google.com/docs/admin/setup)
- [Git & GitHub Basics](https://docs.github.com/en/get-started)