## Goal
Tie Doctor → Patient → Pharmacist together with real-time status, stock visibility, emergency medicine broadcasts, and patient reminders triggered on dispense.

## Database changes (one migration)

1. **`prescriptions` extensions**
   - Add `verified_at timestamptz`, `verified_by uuid` (pharmacist who scanned).
   - Extend `prescription_status` enum: keep `issued`, `dispensed`; add `verified`.
   - Trigger: when status flips to `dispensed`, auto-create `medications` rows from `items` for the patient (so reminders activate only after pickup) and notify doctor with pharmacist name.

2. **`medicine_requests`** (emergency requests)
   - `id, doctor_id, medicine_name, dosage, notes, status (open/fulfilled), created_at, fulfilled_by, fulfilled_at`.
   - RLS: doctors insert/read own; pharmacists read all + update.
   - Trigger on insert → broadcast notification to every pharmacist.

3. **Notify doctor on dispense** (replace existing function)
   - Include pharmacist's `full_name` in body; notify doctor (currently only patient).

## Frontend changes

1. **Doctor `/doctor/prescriptions`** — add timestamp column, status badge (issued/verified/dispensed), pharmacist name when dispensed. Real-time subscribe to `prescriptions` for own `doctor_id`.

2. **Doctor dashboard** — "Request medicine" panel posting to `medicine_requests`.

3. **Pharmacy `/pharmacy/scan`** — after scan, show doctor name + credentials (role), prescribed items, stock check vs. `pharmacy_availability`, and two buttons: "Verify" (status=verified) and "Mark distributed" (status=dispensed).

4. **Pharmacy `/pharmacy/requests`** (new route) — list open `medicine_requests`, mark fulfilled.

5. **Patient `/patient/find-pharmacy`** (new route) — for each prescription item, list pharmacies with that medicine in stock (join `pharmacy_availability.medicines` with `pharmacy_medicines` by name match against rx items).

6. **Patient reminders** — `DoseReminder` already polls `medications`. Since dispense trigger inserts medications with default `schedule_times`, reminders auto-start. Add a small toast on the dispensed notification.

7. **Real-time** — enable realtime publication for `prescriptions` and `medicine_requests`; subscribe in doctor + pharmacy pages.

## Status flow
`issued` (doctor creates) → `verified` (pharmacist scans & confirms stock) → `dispensed` (handed to patient → triggers medications + doctor notification + patient reminder activation).

## Files
- New migration
- New: `src/routes/pharmacy.requests.tsx`, `src/routes/patient.find-pharmacy.tsx`
- Edit: `src/routes/doctor.prescriptions.tsx`, `src/routes/doctor.tsx` (request medicine panel), `src/routes/pharmacy.scan.tsx`, `src/components/medi/RoleSidebar.tsx` (add new nav items)
