# SMS Verification Setup Guide

## 🏆 Recommended: Plivo (Cheapest for Tunisia)

**Pricing**: ~$0.0055 per SMS (about 1/100th the cost of Twilio!)

### Why Plivo?
- ✅ **Cheapest option** for Tunisia SMS
- ✅ Reliable delivery
- ✅ Good API documentation
- ✅ Pay-as-you-go pricing
- ✅ No monthly fees

### Setup Steps:

1. **Sign up for Plivo**:
   - Go to https://www.plivo.com/
   - Create a free account (no credit card needed for trial)
   - Get $5 free credit to start

2. **Get your credentials**:
   - Auth ID: Found in your Plivo dashboard
   - Auth Token: Found in your Plivo dashboard
   - Phone Number: Purchase a Tunisian number or use alphanumeric sender ID

3. **Add to .env.local**:
   ```env
   PLIVO_AUTH_ID=your_auth_id_here
   PLIVO_AUTH_TOKEN=your_auth_token_here
   PLIVO_PHONE_NUMBER=+216XXXXXXXXX
   # Or use alphanumeric sender ID like "Domobat"
   ```

4. **Purchase a phone number** (optional):
   - In Plivo dashboard, go to Numbers → Buy Numbers
   - Search for Tunisia (+216)
   - Purchase a number (usually $1-2/month)

5. **Test the integration**:
   - Restart your dev server: `npm run dev`
   - Try registering with your phone number
   - You should receive an SMS with verification code

---

## Alternative: Twilio (More Expensive but Better Support)

**Pricing**: ~$0.5379 per SMS (100x more expensive than Plivo!)

### Why Twilio?
- ✅ Excellent documentation
- ✅ Great customer support
- ✅ More features
- ✅ Better for complex use cases
- ❌ Much more expensive for Tunisia

### Setup Steps:

1. **Sign up for Twilio**:
   - Go to https://www.twilio.com/
   - Create account (get free $15 credit)

2. **Get credentials**:
   - Account SID
   - Auth Token
   - Phone Number (purchase Tunisia number)

3. **Add to .env.local**:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+216XXXXXXXXX
   ```

4. **Install Twilio**:
   ```bash
   npm install twilio
   ```

5. **Update API route** (see `app/api/sms/send/route.ts`):
   - Replace Plivo code with Twilio SDK
   - Use Twilio client instead

---

## Cost Comparison for Tunisia SMS

| Service | Price per SMS | Best For |
|--------|--------------|----------|
| **Plivo** | **$0.0055** | ✅ **Best value - Recommended** |
| Twilio | $0.5379 | Better support, more features |
| MessageBird | ~$0.01-0.05 | Good middle ground |
| AWS SNS | ~$0.00645 | If already using AWS |

**Recommendation**: Use **Plivo** - it's 100x cheaper than Twilio for Tunisia!

---

## Phone Number Format

The app accepts Tunisian phone numbers in these formats:
- `+216 98 123 456`
- `+21698123456`
- `09 8123 456`
- `098123456`

All formats are automatically converted to `+21698123456` format.

---

## Testing

### Development Mode
- In development, the API will return the code in the response (for testing)
- Check browser console or network tab to see the code

### Production Mode
- Codes are only sent via SMS
- Never expose codes in API responses

---

## Troubleshooting

### SMS not received?
1. Check phone number format
2. Verify Plivo account has credits
3. Check Plivo dashboard for delivery status
4. Verify phone number is correct
5. Check spam folder

### Code expired?
- Codes expire after 10 minutes
- Request a new code if expired

### Rate limiting?
- Plivo has rate limits (check dashboard)
- Implement your own rate limiting for production

---

## Production Considerations

1. **Use Redis** for code storage (instead of in-memory Map)
2. **Add rate limiting** (max 3 codes per phone per hour)
3. **Monitor delivery rates** in Plivo dashboard
4. **Set up webhooks** for delivery status
5. **Add retry logic** for failed sends
6. **Log all SMS attempts** for debugging

---

## Security Best Practices

1. ✅ Codes expire after 10 minutes
2. ✅ Codes are 6 digits (1 million combinations)
3. ✅ Codes are single-use
4. ✅ Rate limiting prevents abuse
5. ✅ Phone numbers are validated
6. ✅ Never log codes in production

---

## Need Help?

- Plivo Docs: https://www.plivo.com/docs/
- Plivo Support: support@plivo.com
- Check Plivo dashboard for delivery logs
