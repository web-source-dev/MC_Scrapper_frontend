import { isBlockedSignupDomain } from "./disposableEmails";
import { normalizePhone, phoneError } from "./phone";

export { normalizePhone, phoneError };

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;
export const EMAIL_MAX = 254;
export const NAME_MAX = 80;
export const COMPANY_MAX = 120;
export const PHONE_MAX_CHARS = 20;

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,24})+$/;
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "1234567890",
  "qwerty1234",
  "letmein123",
  "welcome123",
  "admin12345",
  "changeme123",
  "mcscrapper",
  "dispatcher",
]);

export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
};

export type FieldErrors = Partial<Record<"name" | "company" | "phone" | "email" | "password" | "confirm" | "otp", string>>;

export function normalizeEmail(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizePersonName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX);
}

export function normalizeCompany(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, COMPANY_MAX);
}

export function phoneDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export function emailError(value: string, requiredLabel = "Enter your work email", blockDisposable = true) {
  const email = normalizeEmail(value);
  if (!email) return requiredLabel;
  if (email.length > EMAIL_MAX) return `Use an email under ${EMAIL_MAX} characters`;
  const [local, domain] = email.split("@");
  if (!local || !domain || email.includes("..") || local.startsWith(".") || local.endsWith(".")) {
    return "That doesn't look like a valid email address";
  }
  if (!EMAIL_RE.test(email)) return "That doesn't look like a valid email address";
  if (blockDisposable && isBlockedSignupDomain(domain)) {
    return "Use a work or personal email, not a temporary or test inbox";
  }
  return null;
}

export function nameError(value: string) {
  const name = normalizePersonName(value);
  if (!name) return "Enter your full name";
  if (name.length < 2) return "Enter at least 2 characters";
  const letters = name.match(/\p{L}/gu) || [];
  if (letters.length < 2) return "Enter your full name";
  if (!/^[\p{L} .'-]+$/u.test(name)) return "Use letters, spaces, hyphens, or apostrophes";
  return null;
}

export function companyError(value: string) {
  const company = normalizeCompany(value);
  if (!company) return "Enter your company name";
  if (company.length < 2) return "Enter at least 2 characters";
  if (!/\p{L}/u.test(company)) return "Enter a company name";
  return null;
}

export function passwordChecks(password: string): PasswordChecks {
  const value = String(password || "");
  return {
    length: value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9\s]/.test(value),
  };
}

export function passwordStrength(password: string) {
  const checks = passwordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 2) return { score, label: "Weak" as const };
  if (score <= 4) return { score, label: "Fair" as const };
  return { score, label: "Strong" as const };
}

function passwordContainsIdentity(password: string, identity: { email?: string; name?: string; company?: string }) {
  const lower = String(password || "").toLowerCase();
  const local = normalizeEmail(identity.email || "").split("@")[0] || "";
  if (local.length >= 4 && lower.includes(local)) return true;
  const nameKey = normalizePersonName(identity.name || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  if (nameKey.length >= 4 && lower.includes(nameKey)) return true;
  const companyKey = normalizeCompany(identity.company || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  if (companyKey.length >= 4 && lower.includes(companyKey)) return true;
  return false;
}

export function passwordError(password: string, identity: { email?: string; name?: string; company?: string } = {}) {
  const value = String(password || "");
  if (!value) return "Create a password";
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (value.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer`;
  const checks = passwordChecks(value);
  if (!checks.lower) return "Add a lowercase letter";
  if (!checks.upper) return "Add an uppercase letter";
  if (!checks.number) return "Add a number";
  if (!checks.symbol) return "Add a symbol, such as ! @ # $";
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return "Choose a password that is harder to guess";
  if (passwordContainsIdentity(value, identity)) return "Don't use your name, company, or email in the password";
  return null;
}

export function confirmPasswordError(password: string, confirm: string) {
  if (!String(confirm || "")) return "Re-enter your password";
  if (String(password || "") !== String(confirm || "")) return "Passwords do not match";
  return null;
}

export function loginEmailError(value: string) {
  return emailError(value, "Enter your email", false);
}

export function loginPasswordError(value: string) {
  const password = String(value || "");
  if (!password) return "Enter your password";
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer`;
  return null;
}

export function validateSignup(input: {
  name: string;
  company: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const phoneMessage = phoneError(input.phone);
  const values = {
    name: normalizePersonName(input.name),
    company: normalizeCompany(input.company),
    phone: phoneMessage ? String(input.phone || "").trim().slice(0, PHONE_MAX_CHARS) : normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    password: String(input.password || ""),
  };
  const errors: FieldErrors = {};
  const name = nameError(values.name);
  const company = companyError(values.company);
  const email = emailError(values.email);
  const password = passwordError(values.password, values);
  const confirm = confirmPasswordError(values.password, input.confirmPassword);
  if (name) errors.name = name;
  if (company) errors.company = company;
  if (phoneMessage) errors.phone = phoneMessage;
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (confirm) errors.confirm = confirm;
  return { ok: Object.keys(errors).length === 0, errors, values };
}

export function validateLogin(input: { email: string; password: string }) {
  const values = {
    email: normalizeEmail(input.email),
    password: String(input.password || ""),
  };
  const errors: FieldErrors = {};
  const email = loginEmailError(values.email);
  const password = loginPasswordError(values.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return { ok: Object.keys(errors).length === 0, errors, values };
}

export const PASSWORD_RULES: Array<{ key: keyof PasswordChecks; label: string }> = [
  { key: "length", label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters` },
  { key: "upper", label: "Uppercase letter" },
  { key: "lower", label: "Lowercase letter" },
  { key: "number", label: "Number" },
  { key: "symbol", label: "Symbol, such as ! @ # $" },
];
