# ⚡ Synapse: Hybrid Meeting-to-Action Engine

> **Synapse** is a privacy-first task prioritization engine built in a **Node.js/React monorepo** for **product and engineering teams** to instantly distill chaotic meeting notes into stress-tested, actionable workflows.

![Synapse UI Demo](<img width="1223" height="1061" alt="image" src="https://github.com/user-attachments/assets/5ed2865d-aa6b-49e7-904a-b74d89a697f2" />
)


## 🎯 Try it live
**[Live Demo](https://synapse-idea-extractor--ciuleioctavian.replit.app/)** 

To test the resilience mechanism:
1. Generate 5 rapid plans consecutively.
2. Observe the custom 15-minute cooldown UI trigger seamlessly, backed by `localStorage` absolute timing to prevent tab-refresh workarounds.

---

## 🧠 Architecture & "The Hybrid Engine"

Synapse doesn't blindly rely on a single LLM call. It utilizes a two-step hybrid approach to ensure speed, accuracy, and logic:

1. **Deterministic Scoring (Term Frequency):** The engine initially scans and scores raw notes locally based on frequency and keyword density to establish a baseline of importance.
2. **The "Arguer" (LLM Integration):** A customized Gemini AI agent acts as a stress-tester. It reviews the deterministic output to flag human errors (e.g., unassigned roles, signs of burnout, overlapping deadlines) before returning the final JSON.

### 🛡️ Built for Resilience & Privacy
* **Stateless by Design:** User data is processed strictly in-memory. No cookies, no databases. Once the tab closes, the data is gone.
* **Production-Grade Rate Limiting:** Implemented custom `express-rate-limit` middleware on the backend. When API limits are reached (HTTP 429), the API gracefully degrades, triggering an isolated front-end cooldown state rather than leaking raw JSON errors to the user.
* **Security Scanned:** Zero high-severity vulnerabilities. Enforced clean dependency trees using `pnpm` workspace overrides (`esbuild`, etc.).

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, local UI state management.
* **Backend:** Node.js, Express, strict CORS/Proxy policies for secure internal routing.
* **AI Provider:** Google Gemini API (Flash-Lite for high-speed reasoning).
* **Tooling:** `pnpm` (Monorepo management), Vite.

---

## 🚀 Local Setup (For Developers & Reviewers)

Want to run Synapse locally? The setup is streamlined using `pnpm` workspaces.

### Prerequisites
* Node.js (v18+)
* `pnpm` installed globally (`npm install -g pnpm`)
* A free [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install
Run the following commands in your terminal to pull the repository and install all workspace dependencies:

```bash
git clone [https://github.com/Ciulik/Synapse-planner.git](https://github.com/Ciulik/Synapse-planner.git)
cd Synapse-planner
pnpm install
```

### 2. Configure Environment
Create a `.env` file in the root directory and add your secure API key:

```env
GEMINI_API_KEY=your_api_key_here
```
*(Note: The `.env` file is safely ignored by git to prevent accidental credential leaks).*

### 3. Spin Up the Engine
Start both the React frontend and the Express backend simultaneously:

```bash
pnpm run dev
```
*The application will now be running locally. The Frontend connects to `http://localhost:5173` while the Backend safely handles AI requests at `http://localhost:8080`.*

---
*Designed & Engineered for seamless human-AI collaboration.*
