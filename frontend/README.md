# TriageAI — Premium SaaS Frontend for Email Triage

An AI-powered email intelligence dashboard and triage application built for modern accounting practices using Microsoft 365 / Microsoft Graph API. Inspired by Linear, Stripe Dashboard, and Notion.

---

## 1. Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Plus Jakarta Sans typography + JetBrains Mono
- **Icons**: Lucide React
- **Data Visualization**: Recharts (AreaChart, BarChart, PieChart, LineChart)
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)
- **Notifications**: Integrated glassmorphic toast notification system

---

## 2. Implemented Pages & Capabilities

### Main Layout
- **Collapsible Sidebar**: Workspace navigation with dynamic unread/critical badge counters and Graph connection status.
- **Top Navigation Bar**: Global search (hotkey `/`), one-click **Sync Mailbox** with Microsoft Graph, real-time Outlook M365 connection status, notification center popover, and light/dark mode theme toggle.

### Page 1: Executive Dashboard (`/`)
- **KPI Metrics**: Total processed emails, unread count, action-required count, urgent/P1 emails, awaiting response, and 99.8% AI reliability rate.
- **AI Daily Brief**: Important items breakdown, upcoming deadlines with company badges, overdue follow-ups, and suggested next steps.
- **Interactive Visualizations**:
  - Email Volume & Ingestion Rate over time (`AreaChart`).
  - Classification distribution across 10 categories (`PieChart`).
- **Recent Inflow**: Real-time incoming email stream.
- **Sync Engine Health**: Live delta token tracking and Celery/Redis status.

### Page 2: Smart Inbox (`/inbox`)
- **Three-Column Productivity Layout**:
  1. *Left*: Navigation & filter sidebar (All, Critical, Action Required, Read/Unread, Categories).
  2. *Center*: Email list with sender avatar, subject, preview snippet, category pill, priority badge, and attachments count.
  3. *Right*: Selected email detail & AI analysis panel.
- **Multi-select & Bulk Operations**: Check multiple emails for bulk mark read, bulk mark resolved/completed, and bulk category assignment.
- **Filters & Search**: Fast client-side and server-side filtering with category, priority, status, and search query.

### Page 3: Email Detail & AI Synthesis Panel
- Full email message content and sender/recipient metadata.
- **TriageAI Synthesis**:
  - Classification confidence score (e.g. 96%).
  - Executive summary and key bullet points.
  - Extracted financial amounts ($AUD), Australian client companies (`Pty Ltd`, `Trust`), and due dates.
  - Action flags (`action_required`, `response_required`, `follow_up_required`).
  - Recommended next steps.
- **Attachment Viewer**: File type icons, file sizes, SHA-256 checksums, and download triggers.
- Safety labels for incoming actions (e.g. direct Outlook reply marked as coming in v2.1).

### Page 4: Analytics (`/analytics`)
- Triage speed monitoring (average 275ms latency per email).
- Classification confidence tracking and action rate benchmarks.
- Horizontal bar chart of email volume by category.
- Priority tier breakdown donut chart.
- SLA performance timeline.

### Page 5: Attachments Hub (`/attachments`)
- Centrally indexed table of all downloaded email attachments.
- Filtering by file type (PDF, Spreadsheets, Documents) and live text search.
- Verification badges for SHA-256 deduplication and IBEX document bridge readiness.

### Page 6: Settings (`/settings`)
- Microsoft Entra ID connection parameters (`TARGET_MAILBOX`, `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, Client Secret).
- Microsoft Graph webhook validation handshake configuration.
- AI confidence threshold slider and execution mode switcher.
- One-click demo data reset button.

---

## 3. How to Run Locally

### Start Frontend:
```bash
cd frontend
npm run dev
```
The application will launch on `http://localhost:5173`.

### Build for Production:
```bash
cd frontend
npm run build
```
Generates production-optimized assets in `frontend/dist/`.
