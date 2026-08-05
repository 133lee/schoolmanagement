GET /admin/settings/notifications 200 in 2.6s (compile: 2.6s, render: 53ms)
[INFO] 2026-01-28T01:55:44.206Z - Auth: Request authenticated
Context: {
"event": "Request authenticated",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"success": true,
"path": "/api/sms/balance",
"role": "ADMIN"
}
[INFO] 2026-01-28T01:55:44.208Z - API Request: GET /api/sms/balance
Context: {
"method": "GET",
"path": "/api/sms/balance",
"userId": "cmk9u2bre0001rsx9zo0r0chb"
}
[ERROR] 2026-01-28T01:55:44.209Z - API Error occurred
Context: {
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"endpoint": "/api/sms/balance"
}
Error: UnauthorizedError: You do not have permission to check SMS balance
Stack: UnauthorizedError: You do not have permission to check SMS balance
at SMSService.checkBalance (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**b7db206d.\_.js:3820:19)
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**b7db206d._.js:3910:181
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_599a4e2d._.js:1812:26
at GET (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**b7db206d.\_.js:3921:7)
at AsyncLocalStorage.run (node:async_hooks:335:14)
at AppRouteRouteModule.do (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:37945)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47941
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:185:36
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NoopTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18093)
at ProxyTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18854)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:103
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NextTracerImpl.trace (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:28)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47780
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45275
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45232
at AsyncLocalStorage.run (node:async_hooks:346:14)
at AppRouteRouteModule.handle (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45186)
GET /api/sms/balance 500 in 860ms (compile: 845ms, render: 16ms)
[INFO] 2026-01-28T01:55:44.313Z - Auth: Request authenticated
Context: {
"event": "Request authenticated",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"success": true,
"path": "/api/sms/logs",
"role": "ADMIN"
}
[INFO] 2026-01-28T01:55:44.315Z - API Request: GET /api/sms/logs
Context: {
"method": "GET",
"path": "/api/sms/logs",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"filters": {
"status": null,
"provider": null
},
"pagination": {
"page": 1,
"pageSize": 10
}
}
[ERROR] 2026-01-28T01:55:44.317Z - API Error occurred
Context: {
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"endpoint": "/api/sms/logs"
}
Error: UnauthorizedError: You do not have permission to view SMS logs
Stack: UnauthorizedError: You do not have permission to view SMS logs
at SMSService.getSMSLogs (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**b7db206d._.js:3770:19)
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_bc9bc0bf._.js:3926:180
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**599a4e2d.\_.js:1812:26
at GET (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**bc9bc0bf._.js:3937:7)
at AsyncLocalStorage.run (node:async_hooks:335:14)
at AppRouteRouteModule.do (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:37945)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47941
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:185:36
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NoopTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18093)
at ProxyTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18854)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:103
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NextTracerImpl.trace (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:28)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47780
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45275
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45232
at AsyncLocalStorage.run (node:async_hooks:346:14)
at AppRouteRouteModule.handle (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45186)
GET /api/sms/logs?pageSize=10 500 in 966ms (compile: 948ms, render: 18ms)
[INFO] 2026-01-28T01:55:44.337Z - Auth: Request authenticated
Context: {
"event": "Request authenticated",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"success": true,
"path": "/api/sms/balance",
"role": "ADMIN"
}
[INFO] 2026-01-28T01:55:44.338Z - API Request: GET /api/sms/balance
Context: {
"method": "GET",
"path": "/api/sms/balance",
"userId": "cmk9u2bre0001rsx9zo0r0chb"
}
[ERROR] 2026-01-28T01:55:44.338Z - API Error occurred
Context: {
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"endpoint": "/api/sms/balance"
}
Error: UnauthorizedError: You do not have permission to check SMS balance
Stack: UnauthorizedError: You do not have permission to check SMS balance
at SMSService.checkBalance (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_b7db206d._.js:3820:19)
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**b7db206d.\_.js:3910:181
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**599a4e2d._.js:1812:26
at GET (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_b7db206d._.js:3921:7)
at AsyncLocalStorage.run (node:async*hooks:335:14)
at AppRouteRouteModule.do (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:37945)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47941
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:185:36
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NoopTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18093)
at ProxyTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18854)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:103
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NextTracerImpl.trace (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:28)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47780
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45275
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45232
at AsyncLocalStorage.run (node:async_hooks:346:14)
at AppRouteRouteModule.handle (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45186)
GET /api/sms/balance 500 in 16ms (compile: 4ms, render: 11ms)
[INFO] 2026-01-28T01:55:44.349Z - Auth: Request authenticated
Context: {
"event": "Request authenticated",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"success": true,
"path": "/api/sms/logs",
"role": "ADMIN"
}
[INFO] 2026-01-28T01:55:44.350Z - API Request: GET /api/sms/logs
Context: {
"method": "GET",
"path": "/api/sms/logs",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"filters": {
"status": null,
"provider": null
},
"pagination": {
"page": 1,
"pageSize": 10
}
}
[ERROR] 2026-01-28T01:55:44.351Z - API Error occurred
Context: {
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"endpoint": "/api/sms/logs"
}
Error: UnauthorizedError: You do not have permission to view SMS logs
Stack: UnauthorizedError: You do not have permission to view SMS logs
at SMSService.getSMSLogs (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_b7db206d.*.js:3770:19)
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**bc9bc0bf.\_.js:3926:180
at C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]**599a4e2d._.js:1812:26
at GET (C:\Projects\rebuild-school\school-app-2\.next\dev\server\chunks\[root-of-the-server]\_\_bc9bc0bf._.js:3937:7)
at AsyncLocalStorage.run (node:async_hooks:335:14)
at AppRouteRouteModule.do (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:37945)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47941
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:185:36
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NoopTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18093)
at ProxyTracer.startActiveSpan (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:18854)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:103
at NoopContextManager.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:7062)
at ContextAPI.with (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\@opentelemetry\api\index.js:1:518)
at NextTracerImpl.trace (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\server\lib\trace\tracer.js:154:28)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:47780
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45275
at AsyncLocalStorage.run (node:async_hooks:346:14)
at C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45232
at AsyncLocalStorage.run (node:async_hooks:346:14)
at AppRouteRouteModule.handle (C:\Projects\rebuild-school\school-app-2\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45186)
GET /api/sms/logs?pageSize=10 500 in 25ms (compile: 18ms, render: 8ms)
[INFO] 2026-01-28T01:57:27.458Z - Auth: Request authenticated
Context: {
"event": "Request authenticated",
"userId": "cmk9u2bre0001rsx9zo0r0chb",
"success": true,
"path": "/api/sms/test",
"role": "ADMIN"
}
[INFO] 2026-01-28T01:57:27.459Z - API Request: GET /api/sms/test
Context: {
"method": "GET",
"path": "/api/sms/test",
"userId": "cmk9u2bre0001rsx9zo0r0chb"
}
[ERROR] 2026-01-28T01:57:28.593Z - Failed to check SMS balance
Error: undefined: undefined
GET /api/sms/test 200 in 1553ms (compile: 391ms, render: 1162ms)

The logs show your app is hitting permission issues on the new SMS-related endpoints (`/api/sms/balance` and `/api/sms/logs`), throwing `UnauthorizedError: You do not have permission to check SMS balance` (or view logs). This happens even though the request is authenticated as an ADMIN user (`role: "ADMIN"`).

The `/api/sms/test` endpoint succeeds (200) but logs a vague "Failed to check SMS balance" with `Error: undefined: undefined` — likely because the test tries to call the same restricted balance check internally.

### Root Cause Analysis

Your `SMSService` has explicit permission/authorization checks that are failing:

- In `SMSService.checkBalance()`: Throws `UnauthorizedError` if the current user/context lacks permission.
- Similarly in `SMSService.getSMSLogs()`.

This is **not** an Africa's Talking API issue (yet) — it's your own app's auth logic blocking access before even querying the provider.

Common reasons for this in a Next.js/Prisma setup with role-based access:

1. **Role/permission mismatch** — Even though `role: "ADMIN"`, there might be finer-grained checks (e.g., `canCheckSMSBalance` flag, specific ACL, or a `permissions` array on the user/role that doesn't include "sms:balance:read" or similar).
2. **Context/user object incomplete** — The `context` passed to `SMSService` might not fully load the user's roles/permissions (e.g., missing eager-load in Prisma query).
3. **Middleware/route guard** — The API route handler might have additional checks beyond basic auth.
4. **Config/env issue** — If balance/logs features are "feature-flagged" or disabled for non-super-admins.
5. **For `/api/sms/test`** — It probably calls `checkBalance()` internally, catches the error poorly (hence `undefined: undefined`), but still returns 200 (maybe as a fallback for testing connectivity).

### Fix Steps (Prioritized)

1. **Locate & Relax/Remove the Permission Check (Quick Debug)**

   - Open `SMSService` (likely in `services/sms.service.ts` or similar, around line 3820 for `checkBalance` based on stack).
   - Look for something like:
     ```typescript
     if (
       !context.user?.roles?.includes("super_admin") ||
       !context.permissions?.includes("sms.balance")
     ) {
       throw new UnauthorizedError(
         "You do not have permission to check SMS balance"
       );
     }
     ```
   - Temporarily comment it out or force `true` to test if the underlying Africa's Talking call works.
   - Do the same for `getSMSLogs` (around line 3770).

2. **Properly Assign Permissions to ADMIN Role**

   - In your Prisma schema or role management (e.g., `User` or `Role` model), ensure ADMIN has the needed perms.
   - Example Prisma query fix in your auth middleware or user fetch:
     ```typescript
     const user = await prisma.user.findUnique({
       where: { id: userId },
       include: { roles: { include: { permissions: true } } }, // or however your model is
     });
     ```
   - Then in `SMSService`, check:
     ```typescript
     const hasPermission = user.roles.some(role => role.name === 'ADMIN' || role.permissions.some(p => p.name === 'sms.balance.read'));
     if (!hasPermission) throw new UnauthorizedError(...);
     ```

3. **Implement Africa's Talking Balance Check Correctly**
   Once permissions are fixed, the real balance fetch uses Africa's Talking's **Application Data / Balance** endpoint (not a dedicated SMS-only one; it's app-level, covering SMS credits among others).

   - **Endpoint**: `GET https://api.africastalking.com/version1/user` (live) or `https://api.sandbox.africastalking.com/version1/user` (sandbox).
   - **Headers**:
     - `apiKey: YOUR_API_KEY`
     - `Accept: application/json`
   - **Query param**: `?username=YOUR_USERNAME` (sometimes required).
   - **Response example**:

     ```json
     {
       "balance": "KES 1234.56"
     }
     ```

     (It's the overall app balance, deducted per SMS sent. For Zambia, it'll show in ZMW or equivalent.)

   - In Node.js (using fetch or axios; their SDK has `fetchApplicationData()`):

     ```typescript
     // In SMSService.checkBalance()
     async checkBalance(context) {
       // ... permission check here ...

       const username = process.env.AFRICASTALKING_USERNAME;
       const apiKey = process.env.AFRICASTALKING_API_KEY;

       const response = await fetch(
         `https://api.africastalking.com/version1/user?username=${username}`,
         {
           method: 'GET',
           headers: {
             'apiKey': apiKey,
             'Accept': 'application/json',
           },
         }
       );

       if (!response.ok) {
         throw new Error(`AT balance fetch failed: ${response.statusText}`);
       }

       const data = await response.json();
       return data.balance; // e.g., "ZMW 500.00"
     }
     ```

   - Using official SDK (recommended):

     ```typescript
     import Africastalking from "africastalking";

     const at = Africastalking({
       apiKey: process.env.AFRICASTALKING_API_KEY!,
       username: process.env.AFRICASTALKING_USERNAME!,
     });

     const balance = await at.fetchApplicationData(); // Returns { balance: "ZMW XXX" }
     ```

4. **For SMS Logs**

   - Your app likely wants delivery logs (status: delivered/failed/etc.).
   - Africa's Talking provides **delivery reports via webhooks** (set callback URL in dashboard) or **fetches inbox/replies**, but no direct "get all sent logs" endpoint for historical bulk sends (you track them yourself).
   - Recommendation: Create a `SMSLog` Prisma model to store each send attempt + webhook updates.
   - Then `getSMSLogs` queries your DB (filtered/paginated), not AT.
   - Fix permission similarly.

5. **Test Flow After Fixes**
   - Restart dev server.
   - Hit `/admin/settings/notifications` → should load without 500s on balance/logs.
   - Test `/api/sms/test` → should succeed and show real balance if implemented.
   - Add logging around the permission check to debug: `console.log('User permissions:', context.user.permissions);`

If you share snippets from `SMSService.ts` (especially `checkBalance` and `getSMSLogs`), or your auth middleware, I can give exact line-by-line fixes. Otherwise, start with step 1 — that's blocking everything SMS-related right now.

Once fixed, we can add full sending + logging + balance display in the UI (e.g., show "SMS Credits: ZMW 450.20" on the notifications page). Let me know what you find or paste code! 🚀

The errors in your logs stem from **authorization failures** in `SMSService`:

- `checkBalance()` throws `UnauthorizedError: You do not have permission to check SMS balance` because `canSendSMS(context)` returns `false`.
- `getSMSLogs()` throws similarly via `canViewSMSLogs(context)`.
- `/api/sms/test` likely calls `checkBalance()` (or similar), catches the error poorly (hence `undefined: undefined`), but returns 200 anyway.

Looking at `sms.service.ts`:

```typescript
private canSendSMS(context: ServiceContext): boolean {
  return requireMinimumRole(context, Role.TEACHER);
}

private canViewSMSLogs(context: ServiceContext): boolean {
  return requireMinimumRole(context, Role.TEACHER);
}
```

And in `checkBalance()`:

```typescript
if (!this.canSendSMS(context)) {
  throw new UnauthorizedError(
    "You do not have permission to check SMS balance"
  );
}
```

Your request is authenticated with `role: "ADMIN"`, but the checks use `requireMinimumRole(context, Role.TEACHER)`.

### Why It's Failing

`requireMinimumRole` (from your auth lib) likely enforces a **hierarchy** like:

```typescript
// Pseudocode of what requireMinimumRole probably does
function requireMinimumRole(ctx: AuthContext, minRole: Role): boolean {
  const roleHierarchy = { STUDENT: 0, PARENT: 1, TEACHER: 2, ADMIN: 3 }; // example
  return roleHierarchy[ctx.role] >= roleHierarchy[minRole];
}
```

If your `role: "ADMIN"` is correctly set but the function returns `false` for ADMIN on min TEACHER, possible issues:

- **Role enum mismatch** — `Role.ADMIN` might not be higher than `Role.TEACHER` in the ordering logic.
- **Context.role not populated correctly** — The `context` passed to the service might have `role: undefined` or a string that doesn't match `Role.ADMIN` enum (e.g., lowercase mismatch).
- **requireMinimumRole** is strict and doesn't consider ADMIN >= TEACHER — some implementations require exact role or explicit perms.

Your logs show `role: "ADMIN"`, so the auth middleware is attaching it, but the service-level check fails.

### Quick Fixes (Choose One or Combine)

1. **Make ADMIN always pass teacher-level checks** (Recommended – simplest & logical)
   Update the permission methods in `sms.service.ts`:

   ```typescript
   private canSendSMS(context: ServiceContext): boolean {
     return requireMinimumRole(context, Role.TEACHER) || context.role === Role.ADMIN;
   }

   private canViewSMSLogs(context: ServiceContext): boolean {
     return requireMinimumRole(context, Role.TEACHER) || context.role === Role.ADMIN;
   }
   ```

   - This explicitly allows ADMIN (who should have full access) to bypass the min-teacher check.
   - For `testConnection()` you already restrict to ADMIN only — that's fine.

2. **Fix hierarchy in requireMinimumRole** (If you control that function)
   Ensure ADMIN ranks above TEACHER. In your auth lib (`@/lib/auth/authorization.ts` probably):

   ```typescript
   // Example improved version
   export function requireMinimumRole(
     context: AuthContext,
     minRole: Role
   ): boolean {
     const hierarchy: Record<Role, number> = {
       [Role.STUDENT]: 1,
       [Role.PARENT]: 2,
       [Role.TEACHER]: 3,
       [Role.ADMIN]: 4, // highest
     };
     return hierarchy[context.role ?? Role.STUDENT] >= hierarchy[minRole];
   }
   ```

3. **Bypass for debugging** (Temporary – to confirm underlying AT call works)
   Comment out the auth checks in `checkBalance` and `getSMSLogs`:

   ```typescript
   // if (!this.canSendSMS(context)) { ... }  // comment this block
   ```

   Then restart dev server and retry `/api/sms/balance`. If it succeeds and returns real balance (e.g., "ZMW 123.45"), the issue is purely auth — restore checks after.

### Balance Check Implementation Notes

Your `africasTalking.service.ts` uses raw `fetch` to `https://api.africastalking.com/version1/user?username=...` — this is **correct** based on Africa's Talking docs (it's the account/user balance endpoint, covering SMS credits).

Response is like:

```json
{
  "UserData": {
    "balance": "ZMW 456.78",
    "currency": "ZMW" // sometimes included, sometimes inferred
  }
}
```

Your parsing handles it well (`data.UserData.balance`).

But the official Node.js SDK (`africastalking` npm package) has a cleaner method:

```typescript
import Africastalking from "africastalking";

const at = Africastalking({ username: "...", apiKey: "..." });
const data = await at.fetchApplicationData(); // returns { balance: "ZMW XXX" }
```

If you want to switch (optional, cleaner + handles sandbox/live automatically):

- `npm install africastalking`
- Refactor `checkBalance()` to use the SDK.

### Next Steps After Fix

1. Apply fix #1 above → restart server.
2. Retest:
   - `/api/sms/balance` → should return balance object.
   - `/api/sms/logs` → should return paginated logs (empty if none sent yet).
   - `/admin/settings/notifications` → UI should load balance/logs without 500s.
3. Send a test SMS via your UI or `/api/sms/test` to confirm full flow (logs created, status updated).
4. Seed templates if not done: Call `smsService.seedDefaultTemplates({ role: Role.ADMIN, userId: '...' })` (or add a button in admin UI).
5. For production: Set up delivery webhook in Africa's Talking dashboard (point to your `/api/sms/webhook` endpoint if you add one) to update `status` to DELIVERED/FAILED via `smsLogRepository.updateStatus()`.

If you paste your `requireMinimumRole` implementation or the exact Prisma User/Role query in auth context, I can pinpoint the mismatch better. Otherwise, the explicit ADMIN || minRole fix should resolve it quickly.

Let me know the result after trying — we can then add webhook handling or bulk report card sending next! 🚀
