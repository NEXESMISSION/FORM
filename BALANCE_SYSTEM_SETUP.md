# Balance Request System Setup

## Overview
The balance request system allows investors to request account top-ups (solde) and admins to approve or reject these requests.

## Setup Steps

### 1. Create Database Tables
Run the SQL script in Supabase SQL Editor:
```sql
-- File: supabase/create_balance_requests_table.sql
```

This will:
- Create `payment_method` enum (bank_transfer, flouci, d17, cash, other)
- Create `balance_requests` table
- Add `balance` column to `profiles` table
- Set up RLS policies
- Create triggers to automatically update balance when approved

### 2. Create Test Projects
Run the SQL script to add test projects:
```sql
-- File: supabase/create_test_projects.sql
```

This creates 5 test projects:
- Residential Complex Tunis Nord (120 units)
- Luxury Apartments La Marsa (50 units)
- Affordable Housing Sfax (200 units)
- Villas Project Hammamet (30 units)
- Social Housing Gabes (150 units)

## Features

### Investor Dashboard
- **Balance Display**: Shows current account balance
- **Add Solde Button**: Opens form to request balance top-up
- **Balance Request Form**:
  - Amount input
  - Payment method selection (Bank Transfer, Flouci, D17, Cash, Other)
  - Payment reference (optional)
- **Request History**: Shows all balance requests with status
- **Notifications**: Shows rejection reason if request is rejected

### Admin Dashboard
- **Balance Requests Tab**: New tab to manage all balance requests
- **Request Management**:
  - View all requests with investor details
  - See payment method and reference
  - Approve requests (automatically adds balance to investor account)
  - Reject requests with reason (investor sees rejection reason)
- **Stats Card**: Shows pending balance requests count

## Workflow

1. **Investor Requests Balance**:
   - Clicks "Add Solde" button
   - Fills form: amount, payment method, reference (optional)
   - Submits request → Status: `pending`

2. **Admin Reviews Request**:
   - Sees request in "Balance Requests" tab
   - Can approve or reject

3. **Approval**:
   - Admin clicks "Approve"
   - Balance is automatically added to investor's account
   - Status changes to `approved`

4. **Rejection**:
   - Admin clicks "Reject"
   - Enters rejection reason (required)
   - Status changes to `rejected`
   - Investor sees rejection reason in their dashboard

## Database Schema

### balance_requests table
- `id`: UUID (primary key)
- `investor_id`: UUID (references profiles.id)
- `amount`: DECIMAL(10, 2)
- `payment_method`: payment_method enum
- `payment_reference`: TEXT (optional)
- `status`: TEXT ('pending', 'approved', 'rejected')
- `rejection_reason`: TEXT (if rejected)
- `reviewed_at`: TIMESTAMP
- `reviewed_by`: UUID (references profiles.id)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### profiles table (updated)
- Added `balance`: DECIMAL(10, 2) DEFAULT 0.00

## Payment Methods
- `bank_transfer`: Bank Transfer
- `flouci`: Flouci payment gateway
- `d17`: D17 payment method
- `cash`: Cash payment
- `other`: Other payment methods

## Security
- RLS policies ensure investors can only see their own requests
- Admins can view and manage all requests
- Balance updates are handled by database triggers (secure)

## Testing
1. Run the SQL scripts to set up tables and test projects
2. Login as investor
3. Click "Add Solde" and submit a request
4. Login as admin
5. Go to "Balance Requests" tab
6. Approve or reject the request
7. Check investor dashboard to see updated balance or rejection reason
