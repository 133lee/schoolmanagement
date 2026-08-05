# ⚠️ IMPORTANT: Restart Development Server

## The Issue

After adding new Prisma models (TimetableConfiguration, TimetableSlot, ClassSubject), the Prisma client was regenerated successfully, but **Next.js is caching the old Prisma client**.

**Error**:
```
Cannot read properties of undefined (reading 'findUnique')
at prisma.timetableConfiguration.findUnique()
```

This happens because `prisma.timetableConfiguration` doesn't exist in the cached client.

## The Fix

**Stop and restart your Next.js development server:**

### Option 1: Terminal Command
1. Press `Ctrl+C` in your terminal where `npm run dev` is running
2. Wait for the server to stop completely
3. Run `npm run dev` again

### Option 2: Full Clean Restart (Recommended)
```bash
# Stop the dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Optionally clear node_modules cache (if issue persists)
rm -rf node_modules/.cache

# Restart dev server
npm run dev
```

### Option 3: Using npm scripts (if available)
```bash
npm run clean  # If you have a clean script
npm run dev
```

## Verification

After restarting, the server should:
1. ✅ Load the new Prisma client with TimetableConfiguration
2. ✅ Accept POST requests to `/api/admin/timetable/configuration`
3. ✅ Save doublePeriodConfigs successfully

## What Changed

**New Prisma Models Added**:
- `TimetableConfiguration` (with `doublePeriodConfigs` JSON field)
- `TimetableSlot` (for generated timetable entries)
- `ClassSubject` (for curriculum with periodsPerWeek)

**Generated Client Updated**:
- `generated/prisma/client.ts` now includes these models
- Repository can now call `prisma.timetableConfiguration.findUnique()`
- Service can save and retrieve double period configurations

## Next Steps

After restarting the dev server:

1. Go to **Admin → Timetable → Configuration**
2. Configure school times and periods
3. **Enable double periods** for subjects (e.g., Science, Workshop)
4. Click **Save Configuration** - should now work! ✅
5. Generate timetable to test the solver

## Troubleshooting

If the error persists after restarting:

1. **Verify Prisma client was generated**:
   ```bash
   npx prisma generate
   ```

2. **Check the model exists**:
   ```bash
   grep "TimetableConfiguration" generated/prisma/client.ts
   ```

3. **Clear all caches**:
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   npx prisma generate
   npm run dev
   ```

4. **Check database sync**:
   ```bash
   npx prisma db push
   ```

## Why This Happens

Next.js caches the Prisma client in development for faster hot reloading. When the Prisma schema changes and `prisma generate` creates a new client, Next.js doesn't automatically reload it. The dev server must be manually restarted to use the new client.

## Prevention

In the future, whenever you:
- Add/remove Prisma models
- Change model fields
- Run `prisma generate` or `prisma db push`

**Always restart the dev server** to ensure Next.js uses the latest Prisma client.
