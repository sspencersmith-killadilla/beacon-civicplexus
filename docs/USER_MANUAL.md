# Beacon User Manual

Beacon helps a city document everything that happens during an emergency — decisions, staff time, equipment, purchases and photos — so the response is well run and the costs can be recovered from FEMA Public Assistance.

---

## 1. Getting started

### 1.1 Explore the demo
On the home page choose **Explore live demo city**. Riverbend (Demo) is read-only and contains a complete winter-freeze incident with notes, labor, equipment, materials and a finished After-Action Report.

### 1.2 Create an account
Choose **Sign in**. You can continue with Google, with a Lovable account, or with email and password. Email accounts must be confirmed from the email you receive before first sign-in.

### 1.3 Register your city
Choose **Register your city**, enter the city name, two-letter state and your name. You become the **City Admin**. Beacon creates:
- Six departments: Public Works, Fire, Police, Parks, Library, Utilities
- A starter labor and equipment rate table
- A sample "Winter Storm Uri-Style Freeze Response" incident you can explore or delete

### 1.4 Join an existing city
Ask your City Admin for the 8-character **join code**. Sign in, open **/join** (or **Join with a code** in the workspace menu), enter the code and your name. You join as a **Field Responder**; the admin can change your role.

### 1.5 Switching cities
If you belong to several cities (county partners, mutual aid), click the city name in the top bar to switch workspaces. Each city's data is completely separate.

---

## 2. Roles

| Role | What they can do |
|---|---|
| **City Admin** | Everything: city branding, members and roles, departments, rate tables, fleet, FEMA rate imports, plus all Commander abilities |
| **EOC Commander** | Open and close incidents, set FEMA declaration numbers and operational periods, review and edit logs, write the After-Action Report |
| **Field Responder** | Log field notes, photos, labor, equipment and materials; edit their own entries |
| **Finance / FEMA Auditor** | Read everything, tag FEMA categories (A–G), verify rates, manage fleet rate mapping, export CSVs |

---

## 3. Incident Command Hub
The first screen of a workspace.
- **Active incidents** (Active or Recovery) and **Archived incidents** (Closed). Click one to select it.
- **Summary cards** for the selected incident: total staff hours (regular / overtime), estimated reimbursable cost, equipment deployments, entries waiting to sync on this device, and total field entries.
- **Open incident** (Commanders and Admins): name, type (Freeze, Flood, Severe Storm, Cyber, Utility Outage, Other), FEMA declaration number, operational period and start time.
- **Open timeline, evidence & AAR** goes to the incident's detail page.

On the incident page Commanders can change the **status** (Active → Recovery → Closed; closing records the end time), the declaration number and the operational period.

---

## 4. Field Logger (mobile)
Open **Field Logger** in the top bar and pick the incident. Four tabs:

### 4.1 Field Note (ICS-214)
- **Timestamp** is captured automatically. If you change it, the entry is flagged "timestamp edited" for auditors and the original time is kept.
- **Department**, **Category** (Operational Decision, Hazard Report, Resident Assist, Utility/Road Closure, Mutual Aid)
- **Location**: GPS is captured automatically (tap **GPS** to refresh); add an address or landmark.
- **FEMA category** (optional) and **Notes / decision**
- **Photos**: add several, give each a caption and tag it Before / During / After. Photos are compressed on the phone and stamped with time and GPS.

### 4.2 Labor (Force Account Labor)
Staff member, title, department, FEMA work category, regular hours, overtime hours, hourly rate and fringe %. Tap a **Quick-fill** chip to load a standard rate.
**Total = (regular × rate + overtime × rate × 1.5) × (1 + fringe %)**

### 4.3 Equipment (Force Account Equipment)
Choose how to pick the equipment:
1. **My City's Fleet** — tap a card such as "PW-104 — Salt Spreader Truck #4". Name, FEMA cost code, schedule edition and hourly rate fill in.
2. **Search FEMA Schedule** — type a cost code (`8312`) or keyword (`generator`, `chainsaw`) or filter by category. Rates and specs are shown so you can pick the right size.
3. **Unlisted equipment** — enter make, model, capacity and HP. The entry is flagged **Pending FEMA Rate Request** for the Finance Auditor.

Then enter operator, department, FEMA category, location, **Active hours** and **Standby hours**.
- **Reimbursable Total = Active Hours × Hourly Rate.** Standby hours are recorded for internal operations only and are excluded from FEMA totals.
- Tick **Also create a matching Force Account Labor entry for this operator** to log the operator's time too. FEMA equipment rates do not include operator wages, so this is how the wages are claimed. Enter the operator's hourly rate and fringe.

### 4.4 Materials & Purchases
Vendor, item, department, quantity, unit cost, FEMA category and a receipt photo. **Total = quantity × unit cost.**

### 4.5 Working offline
Every entry is saved on the phone first, then sent.
- **Green banner — Online & Synced**: everything is saved.
- **Amber banner — Offline Mode — X entries queued locally**: entries are safe on the device. They send automatically when the signal returns, or tap **Sync now**.
- The FEMA rate list and your city's fleet are stored on the device whenever you open the workspace, so the equipment picker works without signal.
- Open Beacon once while online before heading out so it is loaded. Don't clear browser data while entries are queued.

### 4.6 Field Mode
Tap **Field Mode** in the top bar for a high-contrast dark display with larger buttons (at least 48 px) for gloves and bad weather. The setting is remembered on the device.

---

## 5. Timeline & audit trail
The **Timeline** tab lists every entry in time order with local and UTC times.
- Filter by department, entry type, FEMA category, author and date range.
- Badges show FEMA category, cost, **Rate verified**, **Timestamp edited** (with original time) and **Pending FEMA Rate Request**.
- **Auditors** (and Commanders/Admins) can tag a FEMA category and click **Verify rate**.
- **Edit** a field note (your own, or any as Commander/Auditor). Every change records who edited it and when; click **Edited by …** to see earlier versions. The original timestamp can never be changed.

---

## 6. Evidence Vault
The **Evidence Vault** tab shows all photos with timestamp, GPS and phase. Use **Before / During / After** to compare side by side, or filter to one phase.

---

## 7. After-Action Report
The **After-Action Report** tab builds the report automatically:
1. Executive Summary (editable) with incident statistics
2. Chronological ICS-214 activity and decision log
3. Departmental resource breakdown, plus a Force Account Equipment table with cost code, edition, rate source, active and standby hours, rate and eligible total
4. Estimated reimbursement by FEMA category A–G
5. Strengths, Gaps & Corrective Action Plan (editable rows with owner and target date)
6. Photo evidence appendix

Commanders click **Save edits**. Click **Print / Save as PDF** and choose "Save as PDF" in the print dialog for a clean document.

---

## 8. FEMA exports
The **FEMA Exports** tab downloads four CSV files for finance teams:
- `force_account_labor.csv`
- `force_account_equipment.csv` (includes FEMA Cost Code, Schedule Edition, Rate Source, Active Hours, Standby Hours (Non-Reimbursable), Hourly Rate, Eligible Reimbursable Total)
- `materials_and_purchases.csv`
- `ics214_activity_log.csv`

Each row includes the incident, declaration, entry time, original time and whether the time was edited.

---

## 9. City Settings (Admins; Auditors see Fleet & FEMA Rates)
- **City branding**: name, state, seal/logo URL and accent color (the stripe at the top of the app and the AAR header).
- **Invite staff**: shows the join code and the member list. Change roles or remove members.
- **Departments**: add or remove.
- **Standard rate tables**: labor and equipment quick-fill rates.
- **Fleet & FEMA Rates**:
  - **Add asset**: asset number, nickname, department and rate source:
    - *FEMA Schedule* — pick the cost code
    - *Local Rate (44 CFR 206.228)* — enter the approved local rate and justification
    - *Pending FEMA Rate Request* — enter make / model / capacity / HP
  - **Import fleet CSV**: map columns for Asset #, Name, FEMA Cost Code and Department.
  - **Import official FEMA / state DOT rate CSV** (Admins): upload the file, match the columns (Cost Code, Equipment, Specifications, Unit, Rate, Category), set the **Edition date**, check the preview and import. Imported rates are visible only to your city; importing the same edition again replaces it.

> **Important:** The built-in rate list uses representative values labeled edition 2025-07-01. Before filing a claim, import the current official FEMA Schedule of Equipment Rates and verify every rate.

Equipment entries keep the cost code, edition, rate source and rate they were logged with, so later schedule updates never change past records.

---

## 10. Tips for a FEMA-ready file
- Log as you go; don't reconstruct at the end of the shift.
- Use the correct FEMA category on every cost entry; auditors can fix it later.
- Always log the operator's labor separately from equipment.
- Record standby hours, but don't expect them in reimbursement totals.
- Photograph Before / During / After for damaged sites and debris.
- Close the incident when recovery ends, then print the AAR and export the CSVs.

## Project sites, crew tickets and contracts

- **Project sites:** on an incident's **Projects** tab, Commanders add the worksheets FEMA will write (name, project #, category, facility, location). In the Field Logger, pick the project once at the top and every entry you log is tagged to it. The Projects tab shows entries and estimated cost per site.
- **Crew Ticket:** a foreman logs the whole crew's shift once — roster, shared hours, and fleet equipment used. Beacon creates one labor entry per person and one equipment entry per unit, linked by a ticket ID.
- **Contract / Aid:** log contractors, rentals and billed mutual-aid agencies with contract/PO/ticket numbers, procurement method and an invoice photo. Visiting mutual-aid staff can also be logged as labor with their agency named.
- **Fringe profiles:** City Admins set FICA, retirement, medical, workers' comp and other percentages per department in City Settings. Labor and crew forms fill Fringe % from the department automatically.
- **Map:** the incident **Map** tab plots geotagged field notes, hazards, photos and project sites.
- **FEMA summary records:** the Exports tab downloads labor, equipment, materials and contract-work CSVs laid out like FEMA's summary record forms, grouped by project.
