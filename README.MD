# Sol-BnB Monorepo

## 1. Overview
The **OpenStay** monorepo contains the source code for a full-stack accommodation booking platform that leverages the **Solana** blockchain for secure and transparent payments.

The core innovation is a **decentralized escrow mechanism**, where guest payments are held in a smart contract from the date of booking until check-in. This ensures **trustless transactions** for both guests and hosts.

---

## 2. Core Features

- **User Authentication** – Basic registration and login for new and returning users.
- **Dashboard** – Central hub for users to view and manage their bookings.
- **Listings** – Browse detailed accommodation listings with images, pricing, and ratings.
- **Decentralized Escrow Payments** – Uses Solana smart contracts instead of traditional payment gateways.
- **Trustless Fund Holding** – Guest payments are locked in an on-chain escrow and automatically released to the host on check-in.
- **Web3 Wallet Integration** – Connect Solana wallets (e.g., Phantom) for transaction authorization.
- **Booking Management** – Clear separation of upcoming and past stays.
- **User Reviews & Ratings** – Guests can review and rate their past stays.

---

## 3. User Flow Explained

### 3.1 New User Registration & First Booking
1. The user enters via `/OpenStay` and registers via `/registration`.
2. After `register-user` action, the account is created.
3. The user is redirected to `/dashboard/{userID}`.
4. From the dashboard, the user proceeds to the core booking process.

### 3.2 Existing User Login
- Existing users log in and are redirected to `/dashboard/{userID}`.

### 3.3 Core Booking & Escrow Process
1. The user browses listings at `/listing` or `/listing/{listingID}`.
2. They select dates via an interactive calendar.
3. On proceeding with the reservation, they are directed to the Payment Portal.
4. **Connect Wallet:** The user connects their Solana wallet (e.g., Phantom). The payment amount is displayed.
5. **Authorize Transaction:** The user authorizes the transaction, transferring funds into the Solana escrow smart contract.
6. **Funds Held:** The payment is securely held on-chain. The transaction is confirmed on the blockchain, and the booking is marked as “Paid & Confirmed.”  
   - The confirmation modal may include a link to a block explorer (e.g., Solscan) for verification.
7. **Automatic Payout:** On the check-in date, the smart contract releases funds to the host’s wallet and triggers confirmation emails.

### 3.4 Post-Booking Management
- From the dashboard, users can manage upcoming and past bookings, including leaving reviews and ratings for completed stays.

---

## 4. Monorepo Structure
```bash
/
├── apps/
│   ├── web/             # Next.js frontend application
│   └── docs/            # Documentation site
├── packages/
│   ├── ui/              # Shared React components
│   └── wallet-adapter/  # Solana wallet connection logic
└── services/
    ├── anchor/          # Solana smart contracts (Anchor framework)
    └── api/             # Backend service for off-chain data
```

## 5. Getting Started

### Prerequisites
- Node.js (v18.x or later)
- pnpm / yarn / npm
- Solana Tool Suite
- Anchor CLI

### Installation
```bash
# Clone the repository
git clone <your-repo-url>

# Navigate to the root directory
cd <your-repo-name>

# Install dependencies
pnpm install
