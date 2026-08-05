# Security Technical Debt

## JWT Storage Vulnerability (XSS Risk)

**Status**: Documented Technical Debt
**Priority**: High
**Deferred Date**: 2026-01-06
**Estimated Effort**: 2-3 days

---

## Current Implementation

### Problem

The application currently stores JWT tokens in `localStorage`, which is vulnerable to XSS (Cross-Site Scripting) attacks. Any malicious JavaScript code injected into the application can access the token and impersonate users.

### Affected Files

- `lib/api-client.ts` - Token retrieval from localStorage
- `app/(auth)/login/page.tsx` - Token storage after login
- `app/api/auth/login/route.ts` - Token generation and response
- 31 files using `localStorage.getItem('auth_token')`

### Current Code Examples

**Token Storage (login page)**
```typescript
// app/(auth)/login/page.tsx:54
localStorage.setItem("auth_token", data.data.token);
localStorage.setItem("user", JSON.stringify(data.data.user));
```

**Token Retrieval (API client)**
```typescript
// lib/api-client.ts:11-14
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}
```

---

## Recommended Solution

### Approach: httpOnly Cookies

Migrate from localStorage to httpOnly cookies for JWT storage:

1. **Server sets cookie** - Login route returns Set-Cookie header instead of JSON token
2. **Browser auto-includes** - Cookies sent automatically with each request
3. **JavaScript cannot access** - httpOnly flag prevents XSS token theft

### Implementation Plan

#### Phase 1: Backend Changes

**Update Login Route**
- Modify `app/api/auth/login/route.ts`
- Generate JWT token (no change)
- Set httpOnly cookie instead of returning in body
- Return user data only (no token in response)

**Update Auth Middleware**
- Modify `lib/auth/verify-token.ts`
- Read token from cookies instead of Authorization header
- Maintain backward compatibility during migration

#### Phase 2: Frontend Changes

**Update Login Page**
- Remove `localStorage.setItem("auth_token", ...)`
- Cookie will be set automatically by browser
- Keep user data storage for profile display

**Update API Client**
- Remove `getAuthToken()` function (31 usages)
- Remove Authorization header logic
- Cookies included automatically by browser

**Update Protected Route Logic**
- Remove `localStorage.getItem('auth_token')` checks
- Verify auth state via server-side cookie presence
- May need new `/api/auth/verify` endpoint

#### Phase 3: Migration & Cleanup

**Add Logout Endpoint**
- Create `app/api/auth/logout/route.ts`
- Clear httpOnly cookie
- Previously: Client just deleted localStorage

**Update All Hooks**
- Remove `getAuthToken()` calls from 7 hooks
- Rely on automatic cookie inclusion
- Update error handling (401 still redirects to login)

---

## Migration Checklist

### Backend
- [ ] Update `app/api/auth/login/route.ts` to set httpOnly cookie
- [ ] Update `lib/auth/verify-token.ts` to read from cookies
- [ ] Create `app/api/auth/logout/route.ts` to clear cookie
- [ ] Add CSRF protection (since using cookies)
- [ ] Configure cookie security flags (Secure, SameSite)

### Frontend
- [ ] Remove token storage in `app/(auth)/login/page.tsx`
- [ ] Remove `getAuthToken()` from `lib/api-client.ts`
- [ ] Remove Authorization header logic
- [ ] Update 7 hooks to remove token checks
- [ ] Test authentication flow end-to-end
- [ ] Update logout functionality

### Testing
- [ ] Test login flow with new cookies
- [ ] Test API requests with automatic cookie inclusion
- [ ] Test logout and cookie clearing
- [ ] Test unauthorized access redirects
- [ ] Test across browsers (Chrome, Firefox, Safari, Edge)

---

## Security Considerations

### Cookie Configuration

```typescript
// Recommended cookie settings
const cookieOptions = {
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: true,          // HTTPS only (production)
  sameSite: 'lax',      // CSRF protection
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/',            // Available to all routes
};
```

### CSRF Protection

When using cookies for authentication, implement CSRF protection:
- Generate CSRF token on login
- Include in non-GET requests
- Verify on server side

### Development vs Production

- **Development**: `secure: false` (HTTP allowed)
- **Production**: `secure: true` (HTTPS required)

---

## Why This Was Deferred

### Decision Context

During Phase 2.4 of production hardening, the team chose to defer JWT migration in favor of:
1. Completing validation schemas (41 schemas implemented)
2. Focusing on feature development
3. Addressing this as planned technical debt

### Trade-offs

**Deferring Pros:**
- Ship features faster
- Complete other production hardening first
- Lower immediate risk with other security measures in place

**Deferring Cons:**
- XSS vulnerability remains
- Larger migration surface area over time
- User sessions vulnerable to token theft

---

## Timeline Estimate

- **Backend Changes**: 1 day
- **Frontend Changes**: 1 day
- **Testing & Bug Fixes**: 0.5 days
- **Total**: 2-3 days

---

## Related Documentation

- Current auth implementation: `features/auth/auth.service.ts`
- Token verification: `lib/auth/verify-token.ts`
- API client: `lib/api-client.ts`
- Login page: `app/(auth)/login/page.tsx`

---

## Decision Log

**2026-01-06**: JWT migration deferred during production hardening sprint. Team chose to document as technical debt and prioritize feature development. Security risk accepted with plan to address in next hardening sprint.
