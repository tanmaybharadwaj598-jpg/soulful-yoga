# Yoga Classes Website

A responsive yoga-class website with a student enquiry form, WhatsApp links, a private admin dashboard, and Supabase-backed data.

## Architecture

- **Frontend:** Static HTML/CSS/JavaScript hosted on Netlify.
- **Backend:** Node.js + Express hosted on Render.
- **Database:** Supabase PostgreSQL.
- **Admin:** Password-protected dashboard. Admin credentials are configured as Render environment variables.

## Included features

### Public website
- Responsive landing page, about section, class programs, schedule and contact section.
- Student enquiry form saved to Supabase.
- WhatsApp links for direct enquiries.
- Website content and classes load from the backend.

### Admin dashboard (`/admin.html`)
- Login for the studio administrator.
- View up to 1,000 recent student enquiries.
- Update enquiry status: New, Contacted, Registered, Closed.
- Open a student's WhatsApp chat.
- Export enquiry data as CSV.
- Edit studio name, instructor details, WhatsApp number, location and about text.
- Add, edit and delete yoga classes and timings.

## 1. Create the Supabase database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. Open **Project Settings → API**.
5. Copy the Project URL and the `service_role` secret key. Keep the service-role key private; it belongs only in Render environment variables.

## 2. Deploy the backend to Render

1. Push this project to a GitHub repository.
2. In Render, create a **New Web Service** connected to that repository.
3. Set **Root Directory** to `backend`.
4. Runtime: Node.
5. Build command: `npm install`
6. Start command: `npm start`
7. Add these environment variables in Render:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| `JWT_SECRET` | A long, random secret (32+ characters) |
| `ADMIN_USERNAME` | Choose an admin username |
| `ADMIN_PASSWORD` | Choose a strong password |
| `CORS_ORIGINS` | Your Netlify site origin, e.g. `https://your-site.netlify.app` |

Do not include a trailing slash in the Netlify origin. After deployment, test `https://YOUR-RENDER-SERVICE.onrender.com/health`.

**Admin password option:** `ADMIN_PASSWORD` may be a plain secret set in Render, or a bcrypt hash beginning with `$2`. A hash is preferable for production. Generate one locally with:
`node -e "console.log(require('bcryptjs').hashSync('YOUR-STRONG-PASSWORD', 12))"`
Set the resulting hash as the Render `ADMIN_PASSWORD` value.

## 3. Configure and deploy the frontend to Netlify

1. Open `frontend/config.js`.
2. Replace `http://localhost:4000` with your Render backend URL, for example:
   `window.APP_CONFIG = { API_BASE_URL: "https://your-yoga-api.onrender.com" };`
3. Push the change to GitHub.
4. In Netlify, import the repository.
5. Set **Base directory** to `frontend`.
6. Leave **Build command** blank.
7. Set **Publish directory** to `.`.
8. Deploy the site.
9. Copy the deployed Netlify origin and add it to Render's `CORS_ORIGINS` environment variable. Redeploy the backend after changing environment variables.

Your public website will be at the Netlify URL. Your mother's admin page will be at:
`https://YOUR-NETLIFY-SITE.netlify.app/admin.html`

## 4. First-time admin setup

1. Sign in using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` configured on Render.
2. Open **Studio settings**.
3. Enter the studio name, instructor name, WhatsApp number, public phone display, location and introduction.
4. Save settings.
5. Review the sample yoga classes and edit their timings/descriptions or add the actual programs.
6. Submit a test enquiry from the public website and confirm it appears in the dashboard.

For WhatsApp, enter the number with country code and digits only. Example for India: `919876543210` (no `+`, spaces or hyphens).

## 5. Local testing

Backend:
```bash
cd backend
cp .env.example .env
# Fill in the Supabase URL, service-role key, JWT secret and admin credentials.
npm install
npm run dev
```

Frontend:
- Update `frontend/config.js` to `http://localhost:4000`.
- Serve the `frontend` folder with a local static server (for example VS Code Live Server).
- Open the local URL and test the enquiry form and `/admin.html`.

## Important production notes

- Never commit `.env` files or expose the Supabase service-role key in frontend code.
- Use a strong, unique admin password and a long random JWT secret.
- Keep the Render CORS origin restricted to the actual Netlify domain.
- Enable backups/point-in-time recovery in Supabase if the project data becomes important.
- This starter includes one administrator account configured through Render environment variables. It does not include public account creation or multiple staff roles.
- The sample site name, instructor details, copy, timings and class programs are placeholders. Replace them with accurate details before publishing.
- The WhatsApp button opens a direct chat. The website does not send WhatsApp messages automatically; automated outbound messaging requires the official WhatsApp Business Platform and its approval/consent requirements.


## Business details preconfigured
- Name: Soulful Yoga Classes
- WhatsApp: 919024130300 (displayed as 9024130300)
- Address: Soulful Yoga Classes, Chetak Marg, near Gopinath Hospital, Sector 8, Pratap Nagar, Sanganer, Jaipur 302033

Class types in the starter content are examples. Confirm actual offerings, instructor profile, fees, and batch timings with the owner and edit them in the admin dashboard before publishing. The WhatsApp link opens a chat; it does not send automated messages.
