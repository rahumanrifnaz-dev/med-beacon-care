## MediCare+ — Production Build Plan

Rename the app to **MediCare+** and ship the full-stack platform on Lovable Cloud.

### Phase 1 — Foundation & broken-link fixes (this turn)
1. Enable Lovable Cloud (Supabase under the hood).
2. Rename branding to MediCare+ in Logo, landing, meta, login.
3. Create the missing routes so navigation works: `/signup`, `/forgot-password`, `/reset-password`, `/doctor`, `/pharmacy`, `/_authenticated` guard.
4. Database schema:
   - `profiles` (id → auth.users, full_name, role, doctor_id nullable, phone)
   - `user_roles` enum + table (patient / doctor / pharmacist) with `has_role()` SECURITY DEFINER
   - `verification_documents` (user_id, file_path, kind, status: pending/approved/rejected, reviewed_at)
   - `medications` (id, patient_id, common_name, brand_name, color, shape, dose, schedule_times[], created_by_doctor)
   - `medication_logs` (med_id, patient_id, scheduled_at, status: taken/skipped/snoozed/missed, source: patient/doctor)
   - `prescriptions` (doctor_id, patient_id, items jsonb, qr_token unique, status)
   - `notifications` (user_id, type, title, body, action_required, snooze_until, read)
   - Storage bucket `verification-docs` (private) with RLS.
5. RLS on every table; `has_role()` for role checks; doctor can read patient rows only when `profiles.doctor_id = auth.uid()`.

### Phase 2 — Auth + verification flow
6. Signup flow: email/password + Google. Patient signs up directly (active). Doctor & Pharmacist signup forces upload of job-confirmation document → status `pending` → cannot access portal until admin-approved (auto-approved in demo with a clear "Pending review" state shown).
7. `_authenticated` layout route; role-based redirect post-login to /patient | /doctor | /pharmacy.
8. Forgot/reset password pages wired to Supabase.

### Phase 3 — Medications with elder-friendly UI
9. Display **common name** big ("Heart pill") + brand small ("Lisinopril 10mg") + bold color dot + shape icon.
10. Seed mapping of common conditions → friendly names + colors.

### Phase 4 — Notifications with OK / Skip / Later (1h)
11. In-app notification center + toast on due doses pulled from a `useDueDoses` poller.
12. Three actions write to `medication_logs`: OK→taken, Skip→skipped, Later→snoozed (sets `snooze_until = now + 1h`, re-fires).
13. Important-step notifications: new prescription, doctor logged a dose for you, refill low, verification approved.

### Phase 5 — Doctor ↔ Patient linking (1:N, N:1)
14. Patient can request/select one doctor (write `profiles.doctor_id`). Switching requires unlinking first.
15. Doctor dashboard lists all linked patients.
16. Doctor can open a patient's medication page and tap "Mark taken" — writes a `medication_logs` row with `source='doctor'`.

### Phase 6 — QR system
17. Doctor creates prescription → generates `qr_token` → renders QR (qrcode.react).
18. Pharmacist `/pharmacy/scan` page uses camera (html5-qrcode) to scan → fetches prescription by token → verify & dispense flow.
19. Patient page shows their prescription QR for in-person pickup as backup.

### Technical notes
- Stack: TanStack Start + Cloud (Supabase). Server functions via `createServerFn` for sensitive ops; browser client for auth/realtime.
- Libs to add: `qrcode.react`, `html5-qrcode`, `zod`, `@supabase/supabase-js` (auto with Cloud).
- RLS-first: every policy uses `has_role()` or ownership checks; no client-side role gating only.
- Notifications use Supabase realtime channel on `notifications` table.

I'll execute Phase 1 immediately after approval, then continue through Phase 6 in follow-up turns since each phase is substantial.
