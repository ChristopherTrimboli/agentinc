# Multi-Wallet Support Implementation

## Overview

This implementation adds full multi-wallet support to Agent Inc., allowing users to manage multiple Solana wallets and switch between them in the UI. The system automatically syncs all wallets from Privy's linked accounts and stores them in a dedicated `UserWallet` table.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

**Added `UserWallet` model:**

- Tracks multiple Solana wallets per user
- Fields: `id`, `userId`, `privyWalletId`, `address`, `signerAdded`, `label`, `importedFrom`, `createdAt`, `updatedAt`
- Unique constraint on `userId` + `address` combination

**Updated `User` model:**

- Added `activeWalletId` field to track the currently selected wallet
- Added `activeWallet` relation pointing to the active `UserWallet`
- Added `wallets` relation for all user wallets
- Kept legacy wallet fields for backward compatibility

### 2. API Routes

**Created `/api/users/wallets` (route.ts):**

- `GET`: Fetch all wallets for the authenticated user
- `POST`: Add new wallet or set active wallet
  - Action: `"add"` - Add a new wallet to the user's account
  - Action: `"setActive"` - Set a wallet as the active wallet

**Updated `/api/users/sync` (route.ts):**

- Now syncs ALL Solana wallets from Privy's `linked_accounts`
- Creates `UserWallet` entries for each wallet
- Automatically sets first wallet as active if none is set
- Maintains backward compatibility with legacy wallet fields

### 3. React Hooks

**Created `useUserWallets` hook:**

- Fetches all user wallets from the API
- Tracks active wallet state
- Provides `setActiveWallet()` and `addWallet()` functions
- Auto-refetches when needed

**Created `useActiveWalletAddress` hook:**

- Unified hook to get the current active wallet address
- Prioritizes database active wallet over linkedAccounts
- Fallback to linkedAccounts for backward compatibility

### 4. UI Components

**Created `WalletSwitcher` component:**

- Dropdown menu showing all user wallets
- Displays wallet address (truncated) and optional label
- Shows "imported from" source (e.g., "bags")
- Check mark indicates active wallet
- Only renders if user has 2+ wallets

**Updated `WalletProfile` component:**

- Integrated `WalletSwitcher` into the dropdown menu
- Uses `useActiveWalletAddress` hook for wallet state
- Refreshes balance and earnings when wallet is changed

**Updated `UserSync` component:**

- Added automatic syncing of new wallets from Privy
- Detects when new wallets are added and syncs them to the database

### 5. Components Updated to Use Active Wallet

All components now use the `useActiveWalletAddress` hook:

- `WalletProfile.tsx`
- `StakingPanel.tsx`
- `app/incorporate/page.tsx`
- `app/dashboard/incorporate/page.tsx`
- `lib/hooks/useMintAgent.ts`

## User Flow

1. **Initial Login:**
   - User logs in with Privy (email + embedded wallet)
   - UserSync creates user record and syncs embedded wallet to UserWallet table
   - First wallet automatically set as active

2. **Importing Additional Wallet (e.g., from Bags):**
   - User imports wallet via Privy (e.g., using Bags import flow)
   - Wallet appears in Privy's linkedAccounts
   - UserSync detects new wallet and syncs to database
   - User can now switch between wallets

3. **Switching Wallets:**
   - User opens WalletProfile dropdown
   - Clicks "Switch Wallet" menu item
   - Selects desired wallet from list
   - Active wallet updates in database
   - UI automatically refreshes with new wallet's balance/data

## Database Migration

The schema changes were applied using `bun prisma db push --accept-data-loss`:

- Created `UserWallet` table
- Added `activeWalletId` to `User` table
- Added necessary indexes and relations

## Backward Compatibility

The implementation maintains backward compatibility:

- Legacy `walletId`, `walletAddress`, and `walletSignerAdded` fields preserved
- `useActiveWalletAddress` falls back to `linkedAccounts` if no active wallet set
- Existing users automatically migrated on next sync

## Testing Recommendations

1. **Test wallet switching:**
   - Login with cjft.dev@gmail.com
   - Verify both wallets appear in switcher
   - Switch between wallets and verify balance/address updates

2. **Test Bags import:**
   - Import a new wallet via Bags
   - Verify it appears in WalletSwitcher
   - Verify it's automatically added to database

3. **Test minting with active wallet:**
   - Switch to imported wallet
   - Mint an agent
   - Verify transaction uses correct wallet

4. **Test staking with active wallet:**
   - Switch wallets
   - Stake tokens
   - Verify transaction uses correct active wallet

## Configuration

No environment variables needed. The system uses existing Privy configuration.

## Next Steps (Optional Enhancements)

1. Add wallet labeling UI (let users name their wallets)
2. Add wallet removal functionality
3. Add wallet import button in UI
4. Show wallet source badge (embedded vs imported)
5. Add wallet-specific transaction history
