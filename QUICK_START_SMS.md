# 🚀 Quick Start: SMS Verification Setup

## Step 1: Sign Up for Plivo (5 minutes)

1. Go to **https://www.plivo.com/**
2. Click "Sign Up" (top right)
3. Create account (no credit card needed for trial)
4. You'll get **$5 free credit** to start!

## Step 2: Get Your Credentials

1. After login, go to **Dashboard**
2. Find your **Auth ID** and **Auth Token**
3. Copy them (you'll need them in Step 3)

## Step 3: Add Credentials to .env.local

Open `.env.local` and add these lines:

```env
PLIVO_AUTH_ID=your_auth_id_from_dashboard
PLIVO_AUTH_TOKEN=your_auth_token_from_dashboard
PLIVO_PHONE_NUMBER=Domobat
```

**Note**: For testing, you can use an alphanumeric sender ID like "Domobat" (no phone number purchase needed initially).

## Step 4: Restart Your Server

```bash
# Stop server (Ctrl+C), then:
npm run dev
```

## Step 5: Test It!

1. Go to registration page: `http://localhost:3000/auth/register`
2. Enter your phone number (e.g., `+216 98 123 456` or `09 8123 456`)
3. Click "Send Verification Code"
4. Check your phone for SMS!

## ✅ That's It!

You now have live SMS verification working!

---

## 💰 Cost Breakdown

- **Plivo**: ~$0.0055 per SMS (about 0.5 cents)
- **$5 free credit** = ~900 SMS messages
- After free credit: Pay only for what you use

## 📱 Phone Number Purchase (Optional)

If you want a dedicated phone number:

1. In Plivo dashboard → **Numbers** → **Buy Numbers**
2. Search for **Tunisia (+216)**
3. Purchase number (~$1-2/month)
4. Update `.env.local`:
   ```env
   PLIVO_PHONE_NUMBER=+216XXXXXXXXX
   ```

## 🆘 Troubleshooting

### SMS not received?
- Check phone number format
- Verify Plivo account has credits
- Check Plivo dashboard → Messages for delivery status
- Make sure phone number is correct

### "Invalid phone number" error?
- Use format: `+216XXXXXXXXX` or `0XXXXXXXX`
- Example: `+216 98 123 456` or `09 8123 456`

### Code expired?
- Codes expire after 10 minutes
- Request a new code

---

## 📚 More Info

See `SMS_SETUP.md` for detailed documentation and alternatives.
