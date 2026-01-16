# 🔒 Security Notice

## ⚠️ IMPORTANT: First-Time Setup

If you just cloned this repository or are setting up for the first time, **YOU MUST** complete these security steps:

### 1. Remove Sensitive Files from Git History

The `.env` file was accidentally committed in the past. Even though it's now in `.gitignore`, it still exists in Git history.

**Run these commands:**
```bash
# Remove .env from Git tracking
git rm --cached .env

# Commit the change
git commit -m "security: Remove .env from repository"

# Push to remote
git push origin main
```

### 2. Rotate ALL Credentials Immediately

Since the credentials were exposed in Git history, you **MUST** change them all:

#### MongoDB
1. Go to MongoDB Atlas
2. Change your database password
3. Update `MONGODB_URI` in your `.env` file

#### Cloudinary
1. Go to Cloudinary Dashboard
2. Regenerate API Secret
3. Update `CLOUDINARY_API_SECRET` in your `.env` file

#### LINE
1. Go to LINE Developers Console
2. Issue a new Channel Access Token
3. Update `LINE_CHANNEL_ACCESS_TOKEN` in your `.env` file

#### Google Gemini
1. Go to Google AI Studio
2. Create a new API key
3. Update `VITE_GEMINI_API_KEY` in your `.env` file

### 3. Migrate Existing Passwords

If you have existing users in the database with plain-text passwords:

```bash
node scripts/migrate-passwords.js
```

This will hash all existing passwords using bcrypt.

---

## 🛡️ Security Best Practices

### For Developers

1. **Never commit `.env` files**
   - Always use `.env.example` as a template
   - Add `.env` to `.gitignore` (already done)

2. **Use environment variables**
   - Never hardcode secrets in code
   - Use `process.env.VARIABLE_NAME`

3. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   ```

4. **Review code before committing**
   - Check for accidentally included secrets
   - Use tools like `git-secrets` or `truffleHog`

### For Deployment

1. **Use environment variables in production**
   - On Render/Heroku: Set via dashboard
   - On VPS: Use `.env` file with proper permissions

2. **Enable HTTPS**
   - Use SSL/TLS certificates
   - Redirect HTTP to HTTPS

3. **Set up monitoring**
   - Monitor failed login attempts
   - Set up alerts for unusual activity

4. **Regular backups**
   - Backup MongoDB database regularly
   - Store backups securely

---

## 📋 Security Checklist

Before deploying to production:

- [ ] All credentials rotated
- [ ] `.env` file removed from Git history
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Database passwords hashed (run migration)
- [ ] Admin password changed from default
- [ ] MongoDB network access restricted
- [ ] Cloudinary upload preset secured
- [ ] Error messages don't expose sensitive info
- [ ] CORS configured properly

---

## 🚨 If You Suspect a Breach

1. **Immediately rotate all credentials**
2. **Check database for unauthorized changes**
3. **Review server logs**
4. **Notify affected users**
5. **Update security measures**

---

## 📞 Report Security Issues

If you discover a security vulnerability, please email: [your-email@example.com]

**Do NOT** open a public issue for security vulnerabilities.

---

Last updated: 2026-01-15
