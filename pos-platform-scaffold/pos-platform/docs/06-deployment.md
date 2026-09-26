# Deployment

Neon (not Render Postgres) for the database — permanently free, no card, commercial use permitted. Render free web services sleep after 15 min idle; mitigate with an offline-first client plus a cron warm-ping. Vercel Hobby is fair-use non-commercial only — move to Pro before charging anyone. Everything HTTPS. Deploy order: Neon → prisma migrate deploy (CI) → Render API (health check green, seeded demo tenant) → Vercel PWA pointed at the Render URL → install on a real Android phone, make a sale → Daraja sandbox callback wired to the Render URL → Render AI service last.
