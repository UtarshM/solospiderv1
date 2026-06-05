# Welcome to SoloSpider AI project

## Project info
abe jana 

## How can I edit this code?

There are several ways of editing your application.
₹₹₹₹₹₹

**Use your preferred IDE**


The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Local Docker Dev (Next App + Worker + Redis)

1. Configure env files:

```sh
cp apps/web-next/.env.example apps/web-next/.env 2>/dev/null || true
cp apps/worker/.env.example apps/worker/.env 2>/dev/null || true
```

2. Make sure these are set:
- `apps/web-next/.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/web-next/.env`: `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `WORKER_SECRET`
- `apps/worker/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (must be service role key), `OPENROUTER_API_KEY`, `REDIS_URL`

3. Start the stack:

```sh
docker compose up --build
```

4. Open:
- Frontend: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`

## Supabase Local (optional)

If you want local Supabase instead of cloud:

```sh
supabase start
supabase db reset
```

Then update envs to local:
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_URL=http://host.docker.internal:54321`

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase
- BullMQ worker service

## How can I deploy this project?




Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.
