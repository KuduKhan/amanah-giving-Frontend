export type Language = "en" | "sw";
export type Campaign = {
  id: string;
  organization_id: string;
  title: string;
  title_sw: string;
  story: string;
  story_sw: string;
  category: string;
  location: string;
  goal: number;
  raised: number;
  donor_count: number;
  end_date: string;
  image: string;
  status: string;
  zakat_eligible: boolean;
  policy_id: string | null;
  verification_summary: string | null;
  budget: { label: string; amount: number }[];
};
export type Organization = {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  description: string;
  registration: string;
  status: string;
  verification_summary: string | null;
};
export type Donation = {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  giving_type: string;
  policy_id: string | null;
  provider: string;
  status: string;
  anonymous: boolean;
  dedication: string;
  created_at: string;
  confirmed_at: string | null;
};
export type Update = {
  id: string;
  campaign_id: string;
  title: string;
  title_sw: string;
  body: string;
  body_sw: string;
  status: string;
  created_at: string;
};
export type Policy = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};
export type Notice = {
  id: string;
  title: string;
  title_sw: string;
  body: string;
  body_sw: string;
  read_at: string | null;
  created_at: string;
};
export type Disbursement = {
  id: string;
  campaign_id: string;
  giving_type: string;
  amount: number;
  status: string;
  purpose: string;
  recipient_reference: string;
  maker_id: string;
  checker_id: string | null;
  approver_id: string | null;
};
export type Workspace = {
  refunds: {
    id: string;
    donation_id: string;
    requester_id: string;
    reason: string;
    status: string;
  }[];
  summary: { total: number; projects: number; gifts: number };
  documents: { id: string; organization_id: string; created_at: string }[];
  user: { id: string; email?: string };
  roles: string[];
  mfaRequired: boolean;
  profile: {
    display_name: string;
    language: Language;
    marketing_opt_in: boolean;
  } | null;
  organizations: Organization[];
  campaigns: Campaign[];
  donations: Donation[];
  updates: Update[];
  policies: Policy[];
  notifications: Notice[];
  favorites: { campaign_id: string }[];
  disbursements: Disbursement[];
  settlements: { donation_id: string; bank_reference: string }[];
  audit: {
    id: number;
    action: string;
    entity_id: string;
    created_at: string;
  }[];
  ledger: {
    id: string;
    entry_id: string;
    campaign_id: string;
    giving_type: string;
    account: string;
    debit: number;
    credit: number;
  }[];
  complaints: {
    id: string;
    body: string;
    status: string;
    resolution: string | null;
  }[];
  flags: {
    id: string;
    campaign_id: string;
    reason: string;
    resolved_by: string | null;
  }[];
};
export const formatMoney = (minor: number, language: Language = "en") =>
  `KSh ${new Intl.NumberFormat(language === "sw" ? "sw-KE" : "en-KE", { maximumFractionDigits: 2 }).format(minor / 100)}`;
export function minorAmount(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 10000 || n > 100000000 || n % 100 !== 0)
    throw new Error(
      "Enter a whole-shilling amount between KSh 100 and KSh 1,000,000",
    );
  return n;
}
export function mpesaPhone(value: unknown) {
  const digits = String(value)
    .replace(/[\s+()-]/g, "")
    .replace(/^0/, "254");
  const phone = /^[17]\d{8}$/.test(digits) ? `254${digits}` : digits;
  if (!/^254[17]\d{8}$/.test(phone))
    throw new Error("Enter a valid Kenyan mobile number");
  return phone;
}
export function validUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
