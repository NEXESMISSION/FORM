# WhatsApp Notifications Setup

## Overview
The application now sends WhatsApp notifications to users when:
1. **Documents are rejected** - Admin rejects a document with a reason
2. **Additional documents are requested** - Admin requests new documents from the user

## Configuration

### 1. Infobip WhatsApp Setup
1. Log in to [Infobip Portal](https://portal.infobip.com/)
2. Navigate to **Channels** → **WhatsApp**
3. Register your WhatsApp Business number or use Infobip's test number
4. Get your WhatsApp sender number (usually starts with country code like `447860099299`)

### 2. Environment Variables
Add to your `.env.local` file:

```env
# WhatsApp Configuration (Infobip)
# Get your WhatsApp number from Infobip portal
INFOBIP_WHATSAPP_NUMBER=447860099299
```

**Note:** If `INFOBIP_WHATSAPP_NUMBER` is not set, the system will try to use `INFOBIP_SENDER_ID` or a default test number.

### 3. API Endpoint
The WhatsApp API endpoint is available at:
- **POST** `/api/whatsapp/send` (Admin only)

## How It Works

### Document Rejection
When an admin rejects a document:
1. Admin clicks "رفض" (Reject) button
2. Enters rejection reason
3. System updates document status to "rejected"
4. **Automatically sends WhatsApp message** to user's phone number with:
   - Document name
   - Rejection reason
   - Instructions to update the document

### Document Request
When an admin requests additional documents:
1. Admin selects documents from list or adds custom ones
2. Optionally adds a custom message
3. Clicks "إرسال للمتقدم" (Send to Applicant)
4. System updates application status to "documents_requested"
5. **Automatically sends WhatsApp message** to user's phone number with:
   - List of requested documents
   - Custom message (if provided)
   - Instructions to upload documents

## Phone Number Format
- Phone numbers are automatically formatted to international format: `+216XXXXXXXXX`
- Supports formats: `0XXXXXXXX`, `216XXXXXXXXX`, `+216XXXXXXXXX`
- Phone numbers are retrieved from:
  - `profiles.phone_number` (primary)
  - `housing_applications.phone` (fallback)
  - `project_direct_purchases.profiles.phone_number` (for purchases)

## SMS Fix
The SMS verification code issue has been fixed:
- Changed from strict `sanitizePhone()` to more lenient `formatTunisianPhone()`
- Now properly formats phone numbers for all users during registration
- Works for both authenticated and unauthenticated users

## Testing
1. Make sure `INFOBIP_BASE_URL` and `INFOBIP_API_KEY` are set in `.env.local`
2. Optionally set `INFOBIP_WHATSAPP_NUMBER` if you have a registered WhatsApp Business number
3. Test by rejecting a document or requesting documents from admin dashboard
4. Check browser console for WhatsApp sending logs
5. User should receive WhatsApp message on their registered phone number

## Troubleshooting

### WhatsApp messages not sending
1. Check Infobip portal to ensure WhatsApp is enabled
2. Verify `INFOBIP_BASE_URL` and `INFOBIP_API_KEY` are correct
3. Check browser console for error messages
4. Ensure phone number is in correct format (`+216XXXXXXXXX`)

### SMS not working for new users
- Fixed: Phone number formatting now uses `formatTunisianPhone()` instead of strict validation
- Phone numbers are properly formatted before sending SMS
- Works for all phone number input formats

## Files Modified
- `lib/utils/whatsapp.ts` - WhatsApp messaging utility
- `app/api/whatsapp/send/route.ts` - WhatsApp API endpoint (admin only)
- `app/api/sms/send/route.ts` - Fixed phone number formatting
- `app/dashboard/admin/page.tsx` - Integrated WhatsApp notifications
- `.env.example` - Added WhatsApp configuration example
