## Plan: RBAC sidebar, real-time notifications, profile management

Most of this stack already exists (profiles + role enum + user_roles + RLS + admin panel + notifications table). I'll fill the missing pieces:

### 1. Storage — avatars bucket
New migration:
- Create public `avatars` bucket
- RLS on `storage.objects`: public SELECT; authenticated users can INSERT/UPDATE/DELETE only files under a folder named with their `auth.uid()`

### 2. Dynamic sidebar (permissions map)
Refactor `src/components/medi/RoleSidebar.tsx` to a single `MENU_ITEMS` array with `roles: AppRole[]`, then filter by current user's role. Update `DashboardShell` consumers (patient/doctor/pharmacy/admin pages) to use the new helper. Sidebar already hides links the user can't see; 404s handled by existing `notFoundComponent`.

### 3. Real-time notification bell
New `src/components/medi/NotificationBell.tsx`:
- Loads unread count for current user
- Subscribes to `postgres_changes` on `notifications` filtered by `user_id=eq.{uid}`
- Shows badge with unread count
- Replace the static bell in `DashboardShell` header

### 4. Profile page
New `src/routes/settings.profile.tsx` (or enhance existing `settings.tsx`):
- Avatar upload with preview
- On new upload: upload to `avatars/{uid}/{timestamp}.{ext}`, update `profiles.avatar_url`, then delete previous file from storage
- Form to edit `full_name`, `phone`
- Uses `useAuth().refreshProfile()` after save

### 5. Notifications enable realtime
Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` and `ALTER TABLE public.notifications REPLICA IDENTITY FULL;`

### Files to create/edit
- `supabase/migrations/<new>.sql` — avatars bucket + storage policies + realtime publication
- `src/components/medi/RoleSidebar.tsx` — refactor to permissions map
- `src/components/medi/NotificationBell.tsx` — new
- `src/components/medi/DashboardShell.tsx` — use NotificationBell
- `src/routes/settings.tsx` — profile editor + avatar upload/delete

No changes to auth flow, admin verification, or existing role logic.
