# Infobip SMS Troubleshooting Guide

## Common Error: 400 Bad Request

### Possible Causes:

1. **Sender ID Not Approved**
   - Alphanumeric sender IDs (like "Domobat") need to be registered/approved in Infobip
   - Go to Infobip Portal → Senders → Request new sender
   - For Tunisia, you may need to use a phone number instead

2. **Wrong API Endpoint**
   - Current: `/sms/3/messages` (Messages API)
   - Alternative: `/sms/2/text/advanced` (SMS API v2)

3. **Invalid Request Format**
   - Check the request body structure matches Infobip requirements

## Quick Fixes

### Option 1: Use Phone Number Instead of Alphanumeric Sender

Update `.env.local`:
```env
INFOBIP_SENDER_ID=+216XXXXXXXXX
```

**Note**: You need to purchase/configure a Tunisian phone number in Infobip portal.

### Option 2: Register Sender ID in Infobip Portal

1. Go to https://portal.infobip.com/
2. Navigate to **Senders** or **My Requests**
3. Submit a request for alphanumeric sender "Domobat"
4. Wait for approval (can take 1-3 business days)

### Option 3: Check API Key Permissions

1. Go to Infobip Portal → API Keys
2. Verify your API key has `sms:message:send` permission
3. Check if key is active and not expired

### Option 4: Use Alternative Endpoint

If `/sms/3/messages` doesn't work, try the v2 endpoint:
- Copy `route-alternative.ts` content to `route.ts`
- Uses `/sms/2/text/advanced` endpoint

## Debugging Steps

1. **Check Server Logs**
   - Look for detailed error messages in console
   - Error should show what Infobip is complaining about

2. **Test API Directly**
   ```bash
   curl -X POST https://8vgner.api.infobip.com/sms/3/messages \
     -H "Authorization: App YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{
         "channel": "SMS",
         "sender": "Domobat",
         "destinations": [{"to": "+21698123456"}],
         "content": {
           "body": {
             "text": "Test message",
             "type": "TEXT"
           }
         }
       }]
     }'
   ```

3. **Check Infobip Dashboard**
   - Go to Messages → Logs
   - See if requests are being received
   - Check delivery status

## Error Messages Explained

- **400 Bad Request**: Invalid request format or sender ID not approved
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API key doesn't have required permissions
- **429 Too Many Requests**: Rate limit exceeded

## Recommended Solution

For immediate testing, use a phone number sender ID:

1. In Infobip Portal, purchase a Tunisian number or use an existing one
2. Update `.env.local`:
   ```env
   INFOBIP_SENDER_ID=+216XXXXXXXXX
   ```
3. Restart server

For production, register your alphanumeric sender ID through Infobip's approval process.

## Contact Infobip Support

If issues persist:
- Email: support@infobip.com
- Portal: https://portal.infobip.com/ → Support
- Check API status: https://status.infobip.com/
