app/
├── api/
│   ├── auth/
│   │   ├── signup/route.ts
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── profile/route.ts
│   │   └── oauth/[provider]/route.ts
│   ├── users/
│   │   ├── [id]/route.ts
│   │   └── payment-methods/route.ts
│   ├── groups/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── [id]/members/route.ts
│   ├── expenses/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── settlements/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── suggestions/route.ts
│   ├── payments/
│   │   ├── paypal/
│   │   │   ├── create-order/route.ts
│   │   │   └── capture-order/route.ts
│   │   └── webhook/route.ts
│   └── reports/
│       └── export/route.ts
├── models/
│   ├── user.ts
│   ├── group.ts
│   ├── expense.ts
│   └── settlement.ts
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── Dashboard.tsx
│   ├── ExpenseForm.tsx
│   └── PaymentButton.tsx

