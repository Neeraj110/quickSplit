import { endOfMonth, endOfYear, startOfMonth, startOfYear, subDays } from "date-fns";

const categories = [
  "All",
  "Food",
  "Transport",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Health",
  "General",
];

const sortOptions = [
  { value: "date-desc", label: "Date (Newest)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
  { value: "description", label: "Description (A-Z)" },
  { value: "payer", label: "Paid By (A-Z)" },
];

const datePresets = [
  {
    label: "Last 7 days",
    from: subDays(new Date(), 7),
    to: new Date(),
  },
  {
    label: "Last 30 days",
    from: subDays(new Date(), 30),
    to: new Date(),
  },
  {
    label: "This month",
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  },
  {
    label: "Last 3 months",
    from: subDays(new Date(), 90),
    to: new Date(),
  },
  {
    label: "This year",
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  },
];


export { categories, sortOptions, datePresets };