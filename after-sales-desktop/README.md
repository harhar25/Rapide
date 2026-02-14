# After-Sales Desktop Application
## CRO Module (Interface 1: Customer Appointment & Scheduling)

A beautiful, minimalist desktop application for managing after-sales service operations.

### Tech Stack
- **Frontend**: Electron + React (CRA)
- **Backend**: Cloudflare Worker API
- **Database**: Cloudflare D1 (SQLite)

### Quick Start
1. Install Node.js (v20+) and npm
2. Install dependencies:
	- `cd worker && npm install`
	- `cd ../frontend && npm install`
3. Run the dev stack (Worker + React + Electron):
	- `cd frontend && npm run dev`

### Project Structure
```
after-sales-desktop/
├── worker/               # Cloudflare Worker API (D1)
├── frontend/             # Electron + UI
├── database/             # (Legacy) MySQL schema
└── README.md
```
