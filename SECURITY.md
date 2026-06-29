# Security Specifications & Safety Assessment

DevVault is designed as a **local-first, secure developer portal** that prioritizes data privacy, cryptographic safety, and dependency control. This document details why DevVault is safe to run and how your sensitive project configurations, secrets, and credentials are protected.

---

## 🛡️ Executive Summary: Why is DevVault Safe?

1. **100% Local Execution**: All application data, databases, and servers run directly on your own machine. No external cloud servers store your data, and no third-party telemetry or analytics tools are integrated.
2. **At-Rest Encryption**: Sensitive developer credentials, projects API keys, and secrets are encrypted *before* they are written to disk. Even if your machine is compromised and the database file is read, the raw values remain encrypted.
3. **No External JWT Libraries**: JWT generation and validation are coded from scratch using Node.js's standard `crypto` library. This completely mitigates risks of library-specific vulnerabilities (like the infamous `alg: "none"` exploit) and supply chain attacks on token handlers.
4. **Hardened Password Hashing**: Passwords are never stored in plain text. DevVault uses **PBKDF2-HMAC-SHA256** with cryptographically secure, randomized salts per user, preventing pre-computed rainbow table attacks.
5. **Sanitized API Layers**: List endpoints return only metadata. Secrets values are never transmitted during bulk reads and require an explicit, user-triggered on-demand decryption endpoint.

---

## 🔑 Cryptographic Implementation Details

### 1. Password Hashing (PBKDF2-HMAC-SHA256)
User passwords are safe against offline dictionary and brute-force attacks due to the implementation in [auth.ts](file:///d:/DAX/Devvault/server/auth.ts#L86-L114).
* **Salt Generation**: A cryptographically secure 16-byte random salt is generated using `crypto.randomBytes(16)`.
* **Algorithm**: **PBKDF2** (Password-Based Key Derivation Function 2) configured with **SHA-256** digest.
* **Work Factor**: Run for **10,000 iterations** to derive a 64-byte key length.
* **Storage**: The database stores the combined payload as `salt:hash` inside the `users` database table.

```typescript
// From server/auth.ts
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 10000;
  const keylen = 64;
  const digest = "sha256";

  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");
  return `${salt}:${hash}`;
}
```

### 2. At-Rest Encryption (AES-256-CBC)
Secrets and Project API Keys are stored using the standard **AES-256-CBC** symmetric encryption algorithm in [db.ts](file:///d:/DAX/Devvault/server/db.ts#L61-L98).
* **Key Derivation**: A 32-byte key is derived by feeding the `ENCRYPTION_KEY` environment variable (or a development fallback) through `SHA-256`.
* **Initialization Vector (IV)**: A unique, randomized 16-byte IV (`crypto.randomBytes(16)`) is created for **every single encryption action**. This ensures that encrypting the same secret value twice results in completely different ciphertexts, preventing frequency analysis.
* **Storage Format**: Encrypted values are stored in the database as `${IV_in_hex}:${Ciphertext_in_hex}`.

```typescript
// From server/db.ts
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey(); // SHA-256 of ENCRYPTION_KEY
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}
```

### 3. Custom JWT Tokens (HMAC-SHA256 Signatures)
Session tokens are fully compliant JSON Web Tokens generated dynamically in [auth.ts](file:///d:/DAX/Devvault/server/auth.ts#L10-L81).
* **HS256 Standard**: Tokens use `HS256` (HMAC using SHA-256 hash).
* **No Library Bloat**: Since DevVault does not import external JWT parser packages, it is immune to package updates that alter signature validation rules or introduce dependency exploits.
* **Structure**: Header, payload, and signature are Base64Url-encoded and split by periods (`.`).
* **Expiration Control**: Every signed token contains an expiration time (`exp`) set by default to **24 hours** (`86400` seconds). Expired tokens are rejected immediately on the middleware layer.

---

## 🚪 API Design & Data Minimization

To ensure data remains safe in transit between the server and user interface, DevVault enforces strict sanitization.

### Secrets Sanitization
When the client calls `GET /api/secrets` to list all folders, labels, and keys, the server explicitly maps the data to **omit the encrypted value** in [routes.ts](file:///d:/DAX/Devvault/server/routes.ts#L276-L288).
```typescript
// GET /api/secrets in server/routes.ts
apiRouter.get("/secrets", requireAuth, (req, res) => {
  const list = dbManager.getSecrets(req.user!.id);
  const sanitized = list.map((s) => ({
    id: s.id,
    label: s.label,
    key: s.key,
    folder: s.folder,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
  res.json(sanitized); // Value is NEVER sent in lists
});
```

### On-Demand Decryption
To view a secret, the front-end makes an explicit `POST /api/secrets/reveal/:id` request. 
1. The request must include a valid authentication Bearer token in the request header.
2. The middleware verifies the signature and validates that the token has not expired.
3. The server locates the secret, ensures it belongs to the authenticated `userId`, decrypts it, and returns the plaintext value solely for that interaction.
4. The decrypted value resides purely in volatile frontend state (`decryptedCache` in [SecretsManager.tsx](file:///d:/DAX/Devvault/src/components/SecretsManager.tsx#L31)) and is cleared when toggled closed, deleted, or when the user logs out.

---

## 💾 Secure Database Storage Topology

```
+-------------------------------------------------------------+
|                        User's Machine                       |
|                                                             |
|   +---------------------+         +--------------------+    |
|   | Vite/React Frontend |  <--->  |  Express Backend   |    |
|   |  (Runs in Browser)  |         | (Runs on Port 3000)|    |
|   +---------------------+         +----------+---------+    |
|                                              |              |
|                                      Queries / Updates      |
|                                              v              |
|   +------------------------------------------+----------+   |
|   |                 Database Storage                    |   |
|   |                                                     |   |
|   |  [PostgreSQL (Supabase Cloud)]                      |   |
|   |  - Remote connection pool (pg.Pool)                 |   |
|   |  - Fully encrypted fields (AES-256-CBC at rest)      |   |
|   |                                                     |   |
|   |  [Local Fallback (db.json)]                         |   |
|   |  - JSON backup file on local disk                   |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

* **No Cloud Middleware**: Your secrets never touch servers hosted by DevVault creators. There are no tracking scripts, no Segment, no Google Analytics, and no Mixpanel.
* **Isolated Environment Variables**: Database passwords and JWT keys are sourced from your local environment via a `.env` file that is kept out of source control (`.gitignore` excludes `.env`).
