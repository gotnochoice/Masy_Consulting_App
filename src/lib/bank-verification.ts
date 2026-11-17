export type NigerianBank = { name: string; code: string };

// Bank codes conflict across third-party lists (digital banks especially), so this pulls the
// live list from Paystack's own API rather than hardcoding one that could quietly go stale.
export async function listNigerianBanks(): Promise<NigerianBank[] | { error: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { error: "Bank verification isn't set up yet. Ask your developer to add a PAYSTACK_SECRET_KEY." };
  }
  try {
    const res = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${secretKey}` },
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    if (!res.ok || !data?.status) return { error: "Couldn't load the bank list right now." };
    return (data.data as { name: string; code: string }[]).map((b) => ({ name: b.name, code: b.code }));
  } catch (err) {
    console.error("[bank-verification] list banks failed:", err);
    return { error: "Couldn't reach the bank verification service right now." };
  }
}

// Resolves a Nigerian bank account number to the account holder's name via Paystack, so the
// employee only has to type the number once and confirm it's theirs -- same role as every other
// integration this app wraps (AI, blob storage): fail with a clear, specific message rather than
// crash when the key isn't configured, and never guess a name.
export async function resolveBankAccountName(
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string } | { error: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { error: "Bank verification isn't set up yet. Ask your developer to add a PAYSTACK_SECRET_KEY." };
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return { error: data?.message || "Couldn't verify that account number. Double-check it and the bank." };
    }
    return { accountName: data.data.account_name as string };
  } catch (err) {
    console.error("[bank-verification] resolve failed:", err);
    return { error: "Couldn't reach the bank verification service right now. Try again in a moment." };
  }
}

// Loose match: ignores case, extra whitespace, and word order (bank APIs often return
// "SURNAME FIRSTNAME" while the legal name on file is "Firstname Surname").
export function namesReasonablyMatch(legalName: string, bankName: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .sort();
  const a = normalize(legalName);
  const b = normalize(bankName);
  if (a.length === 0 || b.length === 0) return false;
  const overlap = a.filter((word) => b.includes(word)).length;
  return overlap >= Math.min(a.length, b.length, 2);
}
