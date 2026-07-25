export interface LeakRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
}

export const LEAK_RULES: LeakRule[] = [
  {
    id: "private_key",
    name: "SSH/PEM Private Key",
    pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
    severity: "critical",
    explanation: "Exposing a private key can grant complete server access or lead to cryptographic hijacking.",
    suggestion: "Remove this key from code files and refer to it dynamically using secure paths."
  },
  {
    id: "openai_key",
    name: "OpenAI API Key",
    pattern: /sk-[a-zA-Z0-9]{48}|sk-proj-[a-zA-Z0-9_-]{80,}/g,
    severity: "high",
    explanation: "Exposed OpenAI keys enable unauthorized AI API usage and billing depletion.",
    suggestion: "Revoke the key immediately in OpenAI dashboard and replace it with a system environment variable."
  },
  {
    id: "google_key",
    name: "Google API Key",
    pattern: /AIzaSy[a-zA-Z0-9_-]{33}/g,
    severity: "high",
    explanation: "Allows attackers to make billed Google Cloud API requests under your account.",
    suggestion: "Restrict this key's usage inside the Google Cloud Console to specific APIs or domains."
  },
  {
    id: "github_token",
    name: "GitHub Access Token",
    pattern: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/g,
    severity: "high",
    explanation: "Gives administrative access to your private GitHub repos, settings, or orgs.",
    suggestion: "Delete this token from your GitHub developer settings immediately."
  },
  {
    id: "stripe_key",
    name: "Stripe Live Key",
    pattern: /sk_live_[a-zA-Z0-9]{24}|rk_live_[a-zA-Z0-9]{24}/g,
    severity: "critical",
    explanation: "Grants administrative access to your live Stripe payment accounts, transactions, and user billing lists.",
    suggestion: "Deactivate this key in Stripe Dashboard and generate a new key."
  },
  {
    id: "stripe_test_key",
    name: "Stripe Sandbox Key",
    pattern: /sk_test_[a-zA-Z0-9]{24}|rk_test_[a-zA-Z0-9]{24}/g,
    severity: "medium",
    explanation: "Provides access to Stripe sandbox/test mode resources.",
    suggestion: "Mask this key and keep sandbox test accounts clean from actual user data."
  },
  {
    id: "jwt_token",
    name: "JSON Web Token (JWT)",
    pattern: /eyJhbGciOi[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g,
    severity: "medium",
    explanation: "Exposes active authorization sessions. Attackers can hijack accounts or admin sessions.",
    suggestion: "Use short expiration durations and invalidate active keys."
  },
  {
    id: "postgres_uri",
    name: "PostgreSQL Database URL",
    pattern: /postgres(ql)?:\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/g,
    severity: "critical",
    explanation: "Exposes username, password, port, and DB name in plain connection strings.",
    suggestion: "Revoke password immediately and whitelist connecting server IP blocks."
  },
  {
    id: "mongo_uri",
    name: "MongoDB Connection URI",
    pattern: /mongodb(\+srv)?:\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/g,
    severity: "critical",
    explanation: "Allows attackers to modify collections, drop databases, and scrape user structures.",
    suggestion: "Replace the password immediately and bind connections to local IP blocks."
  },
  {
    id: "mysql_uri",
    name: "MySQL Connection URI",
    pattern: /mysql:\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/g,
    severity: "critical",
    explanation: "Exposes plain text database administrative credentials.",
    suggestion: "Modify connection credentials and encrypt connection strings."
  },
  {
    id: "aws_id",
    name: "AWS Access Key ID",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "high",
    explanation: "Exposes the identity identifier of an AWS account/credentials.",
    suggestion: "Check IAM configs to deactivate the exposed key."
  },
  {
    id: "env_key",
    name: ".env Configuration Key",
    pattern: /(PASSWORD|SECRET|API_KEY|TOKEN|CREDENTIALS|API_SECRET)\s*=\s*(?!your-|placeholder|foo|bar|test)[a-zA-Z0-9_\-.~!@#$%^&*()_+]{8,}/gi,
    severity: "medium",
    explanation: "Plaintext variable assignment of credentials inside a config file.",
    suggestion: "Ensure this configuration file is included in your .gitignore list."
  }
];

export interface ScanResult {
  ruleId: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low";
  lineNumber: number;
  matchedText: string;
  explanation: string;
  suggestion: string;
}

export function scanTextContent(text: string): ScanResult[] {
  if (!text) return [];
  const lines = text.split("\n");
  const results: ScanResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i];

    for (const rule of LEAK_RULES) {
      // Reset pattern index
      rule.pattern.lastIndex = 0;

      let match;
      while ((match = rule.pattern.exec(lineContent)) !== null) {
        const matchedText = match[0];

        // Exclude common placeholders and test strings
        const lowerMatch = matchedText.toLowerCase();
        if (
          lowerMatch.includes("your-") ||
          lowerMatch.includes("placeholder") ||
          lowerMatch.includes("api-key-here") ||
          lowerMatch.includes("super-secure-") ||
          lowerMatch.includes("secret-key-")
        ) {
          continue;
        }

        // Avoid adding duplicate matches on the same line for the same rule
        const isDuplicate = results.some(
          (r) => r.lineNumber === i + 1 && r.ruleId === rule.id && r.matchedText === matchedText
        );
        if (isDuplicate) continue;

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          lineNumber: i + 1,
          matchedText,
          explanation: rule.explanation,
          suggestion: rule.suggestion
        });
      }
    }
  }

  return results;
}

export function getWhitelist(): string[] {
  try {
    const listStr = localStorage.getItem("devvault_leak_whitelist");
    if (!listStr) return [];
    return JSON.parse(listStr);
  } catch (e) {
    return [];
  }
}

export function isWhitelisted(matchedText: string): boolean {
  const whitelist = getWhitelist();
  return whitelist.includes(matchedText);
}

export function addToWhitelist(matchedText: string) {
  try {
    const list = getWhitelist();
    if (!list.includes(matchedText)) {
      list.push(matchedText);
      localStorage.setItem("devvault_leak_whitelist", JSON.stringify(list));
    }
  } catch (e) {
    console.error("Failed to add to whitelist:", e);
  }
}

export function removeFromWhitelist(matchedText: string) {
  try {
    const list = getWhitelist();
    const newList = list.filter((item) => item !== matchedText);
    localStorage.setItem("devvault_leak_whitelist", JSON.stringify(newList));
  } catch (e) {
    console.error("Failed to remove from whitelist:", e);
  }
}
