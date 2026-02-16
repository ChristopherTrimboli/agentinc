# Multi-Wallet & Server-Owned Wallet Architecture

## Overview

Agent Inc. uses **server-owned wallets** via Privy's Node SDK. Each user gets a Solana wallet created and controlled by the backend — the server can sign transactions directly without any client-side ceremony.

Users can also have multiple wallets (e.g., imported agent wallets) and switch between them.

## Wallet Types

| Type               | `serverOwned` | How Created                               | Server Can Sign?      |
| ------------------ | ------------- | ----------------------------------------- | --------------------- |
| Server-owned (new) | `true`        | `privy.wallets().create()` on user sync   | Yes (as owner)        |
| Legacy user-owned  | `false`       | Client-side Privy embed (pre-migration)   | Yes (as added signer) |
| Imported           | `true`        | `privy.wallets().import()` (agent import) | Yes (as owner)        |

## Database Schema

### `UserWallet` model

| Field           | Type    | Description                                         |
| --------------- | ------- | --------------------------------------------------- |
| `id`            | String  | CUID primary key                                    |
| `userId`        | String  | FK to User                                          |
| `privyWalletId` | String  | Privy wallet ID (e.g., `wallet_xxx`)                |
| `address`       | String  | Solana public key                                   |
| `serverOwned`   | Boolean | `true` = app owns wallet, `false` = legacy signer   |
| `label`         | String? | User-friendly label                                 |
| `importedFrom`  | String? | Source (e.g., `"agent-import"`, `null` for created) |

### `User` model (wallet fields)

| Field            | Type    | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| `activeWalletId` | String? | FK to the currently selected `UserWallet` |

## Key Files

| File                                | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `lib/privy/wallet-service.ts`       | Server-side wallet operations (create, sign, balance) |
| `lib/auth/verifyRequest.ts`         | Auth verification + active wallet resolution          |
| `app/api/users/sync/route.ts`       | Creates server-owned wallet on first login            |
| `app/api/users/wallets/route.ts`    | CRUD for user wallets                                 |
| `lib/tools/wallet/`                 | AI agent wallet tools (read, write, holders)          |
| `lib/x402/sol-server-middleware.ts` | Usage-based payment billing                           |

## How It Works

### New User Flow

1. User logs in via Privy (email auth)
2. `UserSync` component calls `POST /api/users/sync`
3. Sync route creates user record + server-owned wallet via Privy
4. Wallet set as active → user can immediately use AI tools and billing

### Transaction Signing

All wallet operations use the same pattern:

```typescript
const authContext = getAuthorizationContext(); // reads PRIVY_AUTHORIZATION_PRIVATE_KEY
await privy.wallets().solana().signTransaction(walletId, {
  transaction: base64Tx,
  authorization_context: authContext,
});
```

This works identically for both server-owned and legacy signer wallets.

### Wallet Resolution in Auth

`verifyAuth()` always resolves the active wallet from the database (never from Privy `linked_accounts`). This ensures:

- Wallet switches take effect immediately
- Only server-signable wallets are returned
- No stale cache issues

## Environment Variables

| Variable                          | Required | Description                                  |
| --------------------------------- | -------- | -------------------------------------------- |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY` | Yes      | P-256 PKCS8 private key (base64) for signing |
| `NEXT_PUBLIC_PRIVY_APP_ID`        | Yes      | Privy app ID                                 |
| `PRIVY_APP_SECRET`                | Yes      | Privy app secret                             |
