# Phone Number Validation

## Overview
The application now enforces that each phone number can only be used for **one account**. This prevents duplicate registrations and ensures data integrity.

## Implementation

### Database Level
- The `profiles` table has a `UNIQUE` constraint on the `phone_number` column
- This ensures that duplicate phone numbers cannot be inserted at the database level

### Application Level
The registration flow includes multiple checks:

1. **Real-time Validation** (Step 1 - Personal Info)
   - As users type their phone number, the system checks if it's already registered
   - Visual indicators:
     - Red border on input field if phone is taken
     - Warning message: "This phone number is already registered"
     - Submit button is disabled if phone is taken

2. **Pre-SMS Check** (Step 2 - Send SMS)
   - Before sending the verification code, the system verifies the phone number is available
   - If taken, user sees: "This phone number is already registered. Please use a different number or try logging in."

3. **Pre-Registration Check** (Step 4 - Create Account)
   - Final check before creating the account
   - Ensures phone number hasn't been taken between SMS verification and account creation

4. **Database Error Handling**
   - If somehow a duplicate gets through, the database constraint will reject it
   - User sees: "This phone number is already registered. Please use a different number or try logging in."

## Existing Accounts

**Important**: All existing accounts with duplicate phone numbers are **preserved**. The system will not delete or modify existing accounts.

However, going forward:
- ✅ New registrations with duplicate phone numbers will be **blocked**
- ✅ Users will see clear error messages
- ✅ The system prevents creating orphaned accounts

## User Experience

### When Phone Number is Available
1. User enters phone number
2. System checks availability (shows spinner briefly)
3. User can proceed to SMS verification

### When Phone Number is Taken
1. User enters phone number
2. System detects it's already registered
3. Input field shows red border
4. Warning message appears below input
5. "Next" button is disabled
6. User must use a different phone number or log in

### Error Messages
- **During typing**: "This phone number is already registered. Please use a different number or try logging in."
- **During SMS step**: Same message, prevents SMS from being sent
- **During registration**: Same message, prevents account creation

## Technical Details

### Phone Number Formatting
The system normalizes phone numbers to ensure consistent checking:
- `+216 XX XXX XXX` → `+216XXXXXXXXX`
- `0X XXX XXX` → `+216XXXXXXXXX`
- `216 XX XXX XXX` → `+216XXXXXXXXX`

All formats are normalized before checking against the database.

### Database Query
```sql
SELECT id FROM profiles 
WHERE phone_number = 'formatted_phone'
LIMIT 1
```

If a row is found, the phone number is considered taken.

## Future Improvements

1. **Account Recovery**: If a user forgets which email is associated with their phone number, they can:
   - Use "Forgot Password" with their phone number
   - Contact support

2. **Phone Number Change**: Allow users to change their phone number (with verification)

3. **Merge Accounts**: Admin tool to merge duplicate accounts if needed

## Troubleshooting

### "Phone number already registered" but I don't have an account
- Try logging in with your phone number
- Contact support if you believe this is an error
- The system preserves all existing accounts, so your account may exist

### Can't register with my phone number
- Ensure you're using the correct format
- Try logging in instead - your account may already exist
- Contact support for assistance

## Security Notes

- Phone numbers are stored securely in the database
- The UNIQUE constraint prevents duplicates at the database level
- Multiple validation layers ensure data integrity
- Existing accounts are never automatically deleted
