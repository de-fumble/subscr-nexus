# Local Development Setup Guide

## Prerequisites

1. **Node.js and npm** - Install from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
   - Recommended: Node.js v18+ or v20+
   - Verify installation:
     ```sh
     node --version
     npm --version
     ```

2. **Supabase Account** (if using hosted Supabase)
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon/public key from Project Settings > API

## Step-by-Step Setup

### 1. Navigate to the project directory

```sh
cd subscr-nexus
```

### 2. Install dependencies

```sh
npm install
```

This will install all required packages including React, Vite, Supabase client, and other dependencies.

### 3. Set up environment variables

Create a `.env` file in the `subscr-nexus` directory (same level as `package.json`):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

**To get these values:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → **anon/public** → `VITE_SUPABASE_PUBLISHABLE_KEY`

**Example `.env` file:**
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run database migrations (if using Supabase CLI locally)

If you're using Supabase locally with the CLI, you'll need to run migrations:

```sh
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Start local Supabase (requires Docker)
supabase start

# Apply migrations
supabase migration up
```

**Note:** If you're using a hosted Supabase project, migrations should be applied through the Supabase dashboard or will be applied automatically if connected.

### 5. Start the development server

```sh
npm run dev
```

The app will start on `http://localhost:5173` (or another port if 5173 is busy).

### 6. Open in your browser

Open `http://localhost:5173` in your browser. You should see the application running!

## Additional Commands

```sh
# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Troubleshooting

### Port already in use
If port 5173 is already in use, Vite will automatically use the next available port. Check the terminal output for the actual port.

### Supabase connection errors
- Verify your `.env` file exists and has correct values
- Make sure `VITE_` prefix is used (required for Vite to expose env vars to client)
- Restart the dev server after changing `.env` file

### Module not found errors
```sh
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database migration issues
If you see errors about missing tables:
- Check that migrations have been applied in your Supabase project
- Go to Supabase Dashboard → **Database** → **Migrations** to verify

## Project Structure

```
subscr-nexus/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── integrations/      # Supabase client setup
│   └── ...
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
├── public/                # Static assets
├── .env                   # Environment variables (create this)
└── package.json           # Dependencies and scripts
```

## Need Help?

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review [Vite Documentation](https://vitejs.dev/)
- Check the project's main README.md for more details
