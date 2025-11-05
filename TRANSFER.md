# HotDish Planner – Transfer Notes

## Included
- Full source code (this repo)
- `.env.example` with required environment variables
- Deployed app instructions (see below)

## Not Included
- Seller’s Stripe account or keys (buyer must use their own)
- Any private keys or customer data

## Buyer Setup
1. Create a Stripe account and get:
   - `STRIPE_SECRET_KEY`
   - A Price ID (create a Product + Price in Stripe)

2. Copy `.env.example` to `.env.local` and fill in:
   ```
   STRIPE_SECRET_KEY=your_key
   STRIPE_PRICE_ID=price_xxx
   STRIPE_SUCCESS_URL=https://your-domain/success
   STRIPE_CANCEL_URL=https://your-domain/
   ```

3. Install dependencies and start the project locally:
   ```bash
   npm install
   npm run dev
   ```

4. Visit `http://localhost:3000` to confirm it runs.

## Deployment

### Option A: Transfer existing Vercel project
If preferred, the seller can transfer the current Vercel project.  
After transfer:
- Add environment variables in Project Settings → Environment Variables
- Redeploy

### Option B: Deploy to your own Vercel account
1. Go to https://vercel.com/import  
2. Import the repository  
3. Add the environment variables  
4. Deploy

## Demo Mode
Pro features can be viewed without Stripe by adding:
```
?demo=pro
```
Example:
```
https://your-domain/?demo=pro
```

## Stripe Notes
HotDish Planner uses Stripe Checkout.  
Required:
- Secret Key
- Price ID

Webhooks are not required for this version.

## Support
Basic setup help and Vercel project transfer assistance is available after purchase.
