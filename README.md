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
| **Frontend** | React (SPA), JavaScript (ES6+), HTML5, CSS3 |
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

Install all required Node modules:

```bash
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

- Create a `.env.local` file in the root directory if environment variables are required.
- If running admin scripts locally, place your `serviceAccountKey.json` inside the repository root or `scripts/` directory.

> ⚠️ **CRITICAL SECURITY RULE:** Never commit `serviceAccountKey.json`, `.env`, or `.xlsx` files to GitHub. Always ensure they are listed in `.gitignore`.

---

## 💻 Available Scripts

In the project directory, you can run:

| Command | Description |
|---|---|
| `npm start` | Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser with live reloading. |
| `npm test` | Launches the test runner in interactive watch mode. |
| `npm run build` | Builds the app for production to the `build/` folder. Bundles React in production mode and optimizes the output for best performance. |
| `python scripts/export_members.py` | Extracts active member profiles, point totals, and cabinet standings from Firestore into an Excel spreadsheet. |

---

## 📁 Project Structure

```
hsapoints/
├── .gitignore               # Ignored files (node_modules, .venv, secrets, exports)
├── package.json             # Frontend dependencies and npm scripts
├── public/                  # Static assets and index.html
├── scripts/                 # Python automation, cleanup, and extraction scripts
│   ├── export_members.py
│   └── serviceAccountKey.json (Git ignored)
├── src/                     # React application source code
│   ├── assets/              # Logos, icons, and image assets
│   ├── components/          # Reusable UI components (Navbar, PointsCard, etc.)
│   ├── pages/                # Main route views (Dashboard, Admin, Login, Events)
│   ├── firebase.js          # Client-side Firebase App/Auth/Firestore initialization
│   ├── App.js                # Root component and router
│   └── index.js               # React entry point
└── README.md                # Project documentation
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