# CivicEvents+: Accessible City Events & Services Portal

An accessible, responsive frontend for the CivicEvents+ city events and services portal.
Residents can browse and register for events, leave feedback, listen to audio announcements,
watch captioned video promos and read notifications. Administrators manage all of that content
and the user accounts.

**Tech:** HTML, Tailwind CSS (CDN) and jQuery only. No build step.

**Repository layout:** `frontend/` holds the whole frontend application; `backend/` holds the provided Node.js/Express + PostgreSQL API (base URL `http://localhost:4000/api`); `video-demo/README.md` holds the demo video link.

---

## 1. Prerequisites

| Tool | Version used | Purpose |
|---|---|---|
| Node.js | 18+ (tested on 24) | Runs the provided backend API |
| PostgreSQL | 15+ (tested on 17) | Database for the backend |
| VS Code and Live Server extension | any | Serves the frontend at `http://127.0.0.1:5500` |
| A modern browser | Chrome, Edge, Firefox or Safari | |

An internet connection is needed when the pages load, for the Tailwind and jQuery CDNs.

---

## 2. Set up and run the backend

All commands run from the repository root unless stated. The examples use Windows PowerShell;
on macOS/Linux the commands are the same.

### 2.1 Create the database

```powershell
psql -U postgres
```

```sql
CREATE DATABASE "civic-events-db";
\q
```

> **Windows:** if `psql` is not recognised, add PostgreSQL to your PATH:
> `$env:Path += ";C:\Program Files\PostgreSQL\17\bin"` (if your using a different version, change `17` to your version).

### 2.2 Configure environment variables

Edit `backend/.env`:

| Variable | Example | Notes |
|---|---|---|
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASS` | `"your_password"` | Note it's **`DB_PASS`**, not `DB_PASSWORD`. Use quotes if the password contains `#`. |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_NAME` | `civic-events-db` | |
| `JWT_SECRET` | any long random string | Signs login tokens (they last 1 hour) |

### 2.3 Create the tables and start the API

```powershell
cd backend
psql -U postgres -d civic-events-db -h localhost -f ./migrations/001_create_tables.sql
npm install
npm start
```

Expected output: `CivicEvents+ backend listening on port 4000` and `Connected to PostgreSQL`.

> Use `npm start`, not `npm run dev`. The dev script uses nodemon, which restarts the server whenever a file is uploaded into `backend/uploads`, and that interrupts the upload.
Check **http://localhost:4000/health**, which should return `{"ok":true,...}`.

### 2.4 Create an admin account

The signup page always creates normal users. The admin is created once through the API
(Postman, or PowerShell as below):

```powershell
$body = '{"full_name":"Admin Abbie","email":"admin@civic.test","password":"Admin@1234","role":"admin"}'
Invoke-RestMethod -Uri http://localhost:4000/api/auth/signup -Method Post -ContentType "application/json" -Body $body
```

---

## 3. Connect and run the frontend

1. The backend address is set in **`frontend/js/config.js`**:
   ```js
   API_BASE_URL: 'http://localhost:4000/api',   
   FILES_BASE_URL: 'http://localhost:4000',  
   ```
2. Open the project in VS Code, right-click **`frontend/index.html`** and choose **Open with Live Server**.
3. Sign in, or create an account.

### Test accounts (local demo data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@civic.test | Admin@1234 |
| User | jane@civic.test | Jane@1234 |
| User | test@civic.test | Test@1234 |

---

## 4. Features

| Area | Normal user | Admin |
|---|---|---|
| **Auth** | Sign up (password strength meter, strong password rules), sign in, "Keep me signed in", sign out | Same |
| **Home** | Greeting, activity stats, next 3 events | Shortcut to the admin dashboard |
| **Events** | Search, location and date filters, pagination, register/cancel, map link | Create/edit with image upload and preview, delete, view attendees, average rating and all reviews |
| **My registrations** | Upcoming, past or cancelled tabs, cancel | – |
| **Feedback** | One 1–5 star rating and comment per event, editable | Average rating, breakdown, all reviews |
| **Announcements (audio format)** | Play inline or on the detail page (play/pause, ±10 s, speed, volume, time or duration) | Create (audio upload), edit, publish/unpublish, delete |
| **Promos (video format with editable transcript)** | Video with captions on by default, CC toggle, transcript | Create or edit (video + captions), publish or unpublish, delete |
| **Notifications** | Bell with unread count, drawer, inbox with all or unread, mark all as read, link to related item | Delete notifications |
| **Admin dashboard** | – | 8 stat tiles, activity and user-growth charts (hover tooltips, table view, auto-refresh) |
| **Users** | – | List, search or filter, view details, enable or disable (no role changes) |
| **Profile** | View details edit name and email | Same |

---

## 5. Project structure

```
frontend/
├── index.html                 entry: redirects to login or home
├── login.html  signup.html  profile.html
├── dashboard.html             home page after signing in
├── events.html  event.html  event-form.html  my-registrations.html
├── announcements.html  announcement.html  announcement-form.html
├── promos.html  promo.html  promo-form.html
├── notifications.html
├── admin-dashboard.html  admin-users.html
├── css/custom.css             buttons, inputs, focus styles, skeletons
└── js/
    ├── config.js              API address, upload limits
    ├── auth.js                token storage + ROLE GUARDS
    ├── api.js                 $.ajax wrapper: Bearer token, errors, uploads
    ├── ui.js                  toasts, dialogs, loaders, form errors, formatting
    ├── layout.js              header, footer, notification drawer, admin sidebar
    ├── events-shared.js       registrations state, event card, delete
    ├── feedback.js            event feedback section
    ├── content-admin.js       publish/unpublish/delete, promo cache
    ├── captions.js            builds WebVTT captions from caption text
    └── pages/                 one script per page
```

---

## 6. Role-based access guards

Frontend guards only improve the user experience. **Real security is enforced by the backend**,
which checks the JWT on every protected route and returns `403` to non-admins on admin routes.
Every guard in the code has a comment starting with `ROLE GUARD`.

| Guard | Where | What it does |
|---|---|---|
| `Auth.requireLogin()` | top of every signed-in page | No token → login page; expired token → signed out with a message |
| `Auth.requireAdmin()` | `event-form`, `announcement-form`, `promo-form`, `admin-dashboard`, `admin-users` | Normal users are redirected home with an "administrators only" message |
| `Auth.redirectIfLoggedIn()` | `login`, `signup` | Signed-in users skip to the home page |
| `Auth.applyRoleVisibility()` | after every render | Removes `data-role="admin"` elements for users and `data-role="user"` elements for admins |
| Data filters | events, announcements, promos | Users only see `published` items |
| `api.js` | every request | `401` → signed out; `403` → permission message |

Search the code for `ROLE GUARD` to find every one.

---

## 7. Token storage

- **"Keep me signed in" unticked → `sessionStorage`:** cleared when the tab closes. Safer on shared computers.
- **Ticked → `localStorage`:** survives browser restarts, but any script on the page could read it (XSS risk).
- The token lasts 1 hour. Its expiry (`exp`) is checked on each page load, and any `401` from the API also signs the user out.

---

## 8. Design decisions and backend limitations

| Backend behaviour | How the frontend handles it |
|---|---|
| `GET /events` returns every event and ignores query parameters | Search, filters and pagination run in the browser |
| Events have a `published` column, but no endpoint changes it (only announcements and promos have publish/unpublish routes) | Events are always published; normal users still only see `published` items, and admins see everything |
| Deleting an event with registrations fails (no `ON DELETE CASCADE` on `event_registrations`) | The admin sees a clear message and can edit the event instead |
| Cancelled registrations are kept, and re-registering returns `409` | The UI explains this instead of showing a Register button that would fail |
| `/dashboard/me` counts cancelled registrations | Home page counts active registrations itself |
| Feedback list (`/event-feedback/event/:id`) is admin-only | Admins see the average and all reviews; users see their own |
| One feedback per user per event (DB unique constraint) | Form becomes "Edit my feedback" after submitting; `409` is handled |
| No "mark as read" endpoint for notifications | Read state is stored per user in `localStorage` (optimistic UI) |
| Announcements have no duration or transcript fields | Duration is read from the audio file; the page explains there's no transcript |
| Announcement `PUT` ignores a new audio file | Edit form only changes title and published status |
| Promos store `caption_text`, not a caption file | A WebVTT track is generated in the browser, split by sentence across the video length |
| New promos are always created as published | If "Published" is unticked, the form unpublishes straight after creating |
| Postgres `COUNT()` returns strings | Converted with `Number()` before display and charts |
| The notifications controller has a `create` function, but no route exposes it (only GET and DELETE are routed) | Admins send broadcast notifications by publishing an event, announcement or promo; the backend notifies everyone automatically. Admins can delete notifications. |
| A notification is sent for every new announcement or promo, even one saved as unpublished | Opening it shows "not published" for normal users; admins can delete it |
| Login doesn't check `is_active` | Disabled users can still sign in. This needs a backend fix. |

---

## 9. Accessibility and UX

- Semantic HTML (`header`, `nav`, `main`, `article`, `section`, tables with captions), skip link, visible focus outline
- Labels on every input; errors linked with `aria-describedby` and `aria-invalid`; focus moves to the first error
- `aria-live` toasts and result counts; accessible tabs, switches, dialogs (focus trap, Esc to close)
- Captions on by default for video; transcripts; audio controls with labels and fallback text
- Colour is never the only signal (icons, text and badges too); WCAG AA contrast
- Mobile-first responsive layouts; reduced-motion support
- Skeleton loaders, empty states, inline errors with try again, network-error toasts with retry
- Upload type and size checks before sending, previews and progress bars; lazy-loaded video thumbnails

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| "Can't reach the server" | Start the backend (`npm start` in `backend/`) and check `API_BASE_URL` |
| `password authentication failed` in the backend | Check `DB_PASS` in `backend/.env` |
| Redirect loop to login | Clear site data in DevTools → Application, then sign in again |
| Page unstyled | Tailwind CDN didn't load; check your internet connection |
| Uploaded files don't show | Start the backend from inside `backend/` so `uploads/` is in the right place |
