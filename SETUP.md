# Setup Instructions

## Quick Start Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key
4. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Database

1. Go to your Supabase project SQL Editor
2. Copy and paste the entire contents of `supabase/schema.sql`
3. Run the SQL script
4. This will create all necessary tables, functions, and security policies

### 4. Configure Authentication

In your Supabase dashboard:
1. Go to Authentication > Providers
2. Enable Email provider (for now, phone auth requires additional setup)
3. For production SMS verification, you'll need to integrate Twilio or similar service

### 5. Create Admin User

After running the schema, create an admin user:

1. Go to Authentication > Users in Supabase dashboard
2. Create a new user manually or sign up through the app
3. In SQL Editor, run:

```sql
UPDATE profiles SET role = 'admin' WHERE phone_number = 'your_phone_number';
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the Application

### Test as Housing Applicant:
1. Register with phone number (use demo code: 123456)
2. Complete the 7-section application form
3. View your application in the dashboard
4. Browse available projects

### Test as Investor:
1. Register with `?role=investor` parameter
2. Browse investment opportunities
3. Submit investment requests
4. Track your investments

### Test as Admin:
1. Login with admin account
2. View all applications
3. Manage projects
4. Approve/reject investments
5. View analytics and reports

## Important Notes

- **SMS Verification**: Currently uses a demo code (123456). For production, integrate a real SMS service.
- **File Uploads**: Project study PDFs need to be uploaded to Supabase Storage. Configure storage bucket in Supabase dashboard.
- **Maps Integration**: Google Maps integration is planned but not yet implemented. Add your Google Maps API key when ready.
- **Multi-language**: Arabic/French support is planned but not yet implemented.

## Troubleshooting

### Database Connection Issues
- Verify your Supabase URL and keys in `.env.local`
- Check that the schema.sql was executed successfully
- Ensure RLS policies are enabled

### Authentication Issues
- Clear browser cookies and try again
- Check Supabase Auth logs in dashboard
- Verify email provider is enabled

### Build Errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall
- Check Node.js version (requires 18+)

## Production Deployment

1. Build the application: `npm run build`
2. Set environment variables in your hosting platform
3. Run database migrations on production Supabase instance
4. Configure domain and SSL certificates
5. Set up monitoring and error tracking
