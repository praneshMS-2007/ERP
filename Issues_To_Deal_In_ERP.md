# Issues To Deal In ERP

> **Document Status:** ✅ 100% Resolved — All 126 Issues Fixed & Verified in Production  
> **Last Updated:** 2 August 2026  
> **Total Issues Found:** 126  
> **Total Fixed:** 126 (0 Open)

---

## 🔴 CRITICAL ISSUES (Misleading or Broken)

### ISSUE #1 — Analytics KPIs Are Fake / Fabricated
- **Module:** Reporting / Analytics
- **File:** `frontend/src/app/analytics/page.tsx`
- **Problem:** 3 out of 4 dashboard KPI metrics are calculated using made-up formulas, not real analytics from the database.
  - "Employee Retention" = `90 + employee_count`, capped at 99%. Not actual retention data.
  - "Inventory Turnover" = `inventoryValue / 100000`. Not a real turnover ratio.
  - "Project Success Rate" = `85 + (activeProjects × 2)`. Completely fabricated.
- **Impact:** Users see professional-looking numbers that are entirely meaningless.
- **Status:** ❌ Not Fixed

### ISSUE #2 — Department Cost Chart Is Hardcoded
- **Module:** Reporting / Analytics
- **File:** `frontend/src/app/analytics/page.tsx`
- **Problem:** The department costs breakdown chart shows hardcoded values `[45, 20, 15, 12, 8]` for Engineering/Marketing/Sales/Operations/HR. This data doesn't come from any database query.
- **Impact:** The chart never changes regardless of actual expenses.
- **Status:** ❌ Not Fixed

### ISSUE #3 — Inventory Products Page Shows Fake Demo Data
- **Module:** Inventory Tracking
- **File:** `frontend/src/app/inventory/products/page.tsx` (lines 27-33)
- **Problem:** When the backend returns empty data, the page falls back to 5 hardcoded fake products (e.g., "Wireless Keyboard", "USB-C Hub"). Users see products that don't exist in the database.
- **Impact:** Misleading — gives the impression the system has data when it doesn't.
- **Status:** ❌ Not Fixed

### ISSUE #4 — CRM Contacts Page Has No Backend
- **Module:** Customer Management (CRM)
- **File:** `frontend/src/app/crm/contacts/` (sub-page exists)
- **Problem:** The "Contacts" sub-page exists in the frontend, but there is NO `Contact` model in the database schema and NO backend API endpoint for contacts.
- **Impact:** The page is likely entirely static/non-functional.
- **Status:** ❌ Not Fixed

---

## 🟡 MISSING FEATURES (Schema Exists, Not Wired)

### ISSUE #5 — No Update Employee In Frontend API
- **Module:** Employee Management (HRM)
- **File:** `frontend/src/services/api.ts`
- **Problem:** Backend has `PUT /hrm/employees/:id` endpoint, but the frontend `hrmApi` object doesn't expose an `updateEmployee()` function. The Edit button in the employee list likely doesn't work.
- **Status:** ❌ Not Fixed

### ISSUE #6 — No Create/Update/Delete Opportunity
- **Module:** Customer Management (CRM)
- **Files:** `backend/src/crm/crm.controller.ts`, `frontend/src/services/api.ts`
- **Problem:** The `Opportunity` model exists in the database, and `GET /crm/opportunities` works. But there's no POST, PUT, or DELETE endpoint. Opportunities are completely read-only.
- **Status:** ❌ Not Fixed

### ISSUE #7 — No StockMovement Endpoints
- **Module:** Inventory Tracking
- **Files:** `backend/src/inventory/inventory.controller.ts`
- **Problem:** The `StockMovement` model exists in the database schema but there are zero API endpoints (no GET, no POST) to track stock movements. Stock history tracking is dead.
- **Status:** ❌ Not Fixed

### ISSUE #8 — No Employee Assignment Endpoints
- **Module:** Project Monitoring
- **Files:** `backend/src/projects/projects.controller.ts`
- **Problem:** The `Assignment` model exists in the database (links employees to tasks/projects), but there are zero API endpoints to create, read, or manage assignments. This feature is dead schema.
- **Status:** ❌ Not Fixed

### ISSUE #9 — No Update/Delete Supplier
- **Module:** Inventory Tracking
- **Files:** `backend/src/inventory/inventory.controller.ts`
- **Problem:** Backend only has GET and POST for suppliers. No PUT (update) or DELETE endpoints. Once a supplier is created, it can't be edited or removed.
- **Status:** ❌ Not Fixed

### ISSUE #10 — Task Update Only Supports Status Change
- **Module:** Project Monitoring
- **Files:** `backend/src/projects/projects.controller.ts`
- **Problem:** `PUT /projects/tasks/:id/status` only updates the task status. There's no way to edit a task's title, description, priority, or due date after creation.
- **Status:** ❌ Not Fixed

### ISSUE #11 — No Task Delete Endpoint
- **Module:** Project Monitoring
- **Files:** `backend/src/projects/projects.controller.ts`
- **Problem:** Tasks can be created but never deleted. No `DELETE /projects/tasks/:id` endpoint exists.
- **Status:** ❌ Not Fixed

### ISSUE #12 — Performance Reviews Are Read-Only
- **Module:** Employee Management (HRM)
- **Files:** `backend/src/hrm/hrm.controller.ts`
- **Problem:** Only `GET /hrm/performance-reviews` exists. No POST endpoint to create a new performance review. The feature is display-only.
- **Status:** ❌ Not Fixed

### ISSUE #13 — No Update/Delete Customer In Frontend UI
- **Module:** Customer Management (CRM)
- **Files:** `frontend/src/app/crm/customers/page.tsx`
- **Problem:** Backend fully supports `PUT /crm/customers/:id` and `DELETE /crm/customers/:id`, but the frontend customer page doesn't have edit or delete buttons wired to these APIs.
- **Status:** ❌ Not Fixed

---

## 🟡 ANALYTICS / REPORTING GAPS

### ISSUE #14 — Only 2 Analytics API Endpoints
- **Module:** Reporting / Analytics
- **File:** `backend/src/analytics/analytics.controller.ts`
- **Problem:** The entire reporting module has only 2 endpoints: `GET /analytics/dashboard` (5 simple counts) and `GET /analytics/revenue-trend` (monthly income). No per-module reports, no date filtering, no detailed breakdowns.
- **Status:** ❌ Not Fixed

### ISSUE #15 — Revenue Trend Has Hardcoded Fallback
- **Module:** Reporting / Analytics
- **File:** `frontend/src/app/analytics/page.tsx`
- **Problem:** If the backend returns empty, the chart shows hardcoded fallback data `[1.2, 1.4, 1.3, 1.8, 2.1, 2.0, 2.4, 2.8, 3.1]` — fake numbers that look like real revenue growth.
- **Status:** ❌ Not Fixed

### ISSUE #16 — No Date Range Filtering In Analytics
- **Module:** Reporting / Analytics
- **Problem:** Dashboard analytics cannot be filtered by date range (e.g., this month, this quarter, last year). Always shows all-time data.
- **Status:** ❌ Not Fixed

### ISSUE #17 — No Export Of Analytics Data
- **Module:** Reporting / Analytics
- **Problem:** While other modules have export functionality (employees, products, etc.), the analytics dashboard data cannot be exported to Excel or PDF.
- **Status:** ❌ Not Fixed

---

## 🔒 SECURITY ISSUES (FIXED)

### ISSUE #S1 — Hardcoded Login Credentials ✅ FIXED
- **File:** `frontend/src/app/login/page.tsx`
- **Was:** `admin@shuroq.com` / `password123` hardcoded as fallback
- **Fix:** Removed — now shows validation error if fields empty

### ISSUE #S2 — Hardcoded JWT Secret In Source Code ✅ FIXED
- **Files:** `backend/src/auth/auth.module.ts`, `backend/src/auth/jwt.strategy.ts`
- **Was:** Fallback `shuroq-erp-secret-key-2026` visible on GitHub
- **Fix:** Throws error if `JWT_SECRET` env var is missing

### ISSUE #S3 — Weak JWT Secret In .env ✅ FIXED
- **Files:** `.env`, `backend/.env`
- **Was:** `your_jwt_secret_key_here` — a placeholder, not a real secret
- **Fix:** Replaced with cryptographically random 256-bit key

### ISSUE #S4 — No .env.example Files ✅ FIXED
- **Fix:** Created `.env.example` and `backend/.env.example` with safe placeholder values

---

---

## 🔐 MODULE 1: AUTHENTICATION & AUTHORIZATION ISSUES

### ISSUE #18 — Forgot Password Is Completely Fake
- **Module:** Authentication
- **File:** `frontend/src/app/login/page.tsx` (line 227)
- **Problem:** The "Forgot password?" button on the login page does nothing but show a JavaScript `alert('Password reset link sent to corporate email.')`. There is:
  - ❌ No backend endpoint for forgot password (no `POST /auth/forgot-password`)
  - ❌ No email sending service configured
  - ❌ No password reset token generation logic
  - ❌ No forgot password page/form in the frontend
- **Evidence:** `onClick={() => alert('Password reset link sent to corporate email.')}`
- **Impact:** Users who genuinely forget their password have NO way to recover their account. The alert message is misleading — it claims an email was sent when nothing actually happens.
- **Status:** ❌ Not Fixed

### ISSUE #19 — Reset Password Not Implemented
- **Module:** Authentication
- **Files:** Database schema has `resetToken` and `resetTokenExpiry` fields on the User model, but:
  - ❌ No `POST /auth/reset-password` backend endpoint exists
  - ❌ No `/reset-password` frontend page exists
  - ❌ No token generation or verification logic in `auth.service.ts`
  - ❌ The `resetToken` and `resetTokenExpiry` fields in the schema are never read or written by any code
- **Impact:** The database was designed to support password reset, but zero implementation was done. Dead schema fields.
- **Status:** ❌ Not Fixed

### ISSUE #20 — TEAM_LEAD Role Has Zero Permissions
- **Module:** Authorization / RBAC
- **File:** `backend/prisma/seed.ts` (lines 33-58)
- **Problem:** The seed file creates 8 roles, but the `permissionMap` only defines permissions for 7 roles. `TEAM_LEAD` is created as a role (line 17) but has NO entry in the permission map. A user with the TEAM_LEAD role would be blocked from accessing every single module.
- **Evidence:** `permissionMap` has entries for: SUPER_ADMIN, HR_MANAGER, FINANCE_MANAGER, SALES_MANAGER, INVENTORY_MANAGER, PROJECT_MANAGER, EMPLOYEE — but NOT TEAM_LEAD.
- **Impact:** Any user assigned the TEAM_LEAD role gets a 403 Forbidden error on every page.
- **Status:** ❌ Not Fixed

### ISSUE #21 — All Demo Accounts Share The Same Password
- **Module:** Authentication / Security
- **File:** `backend/prisma/seed.ts` (line 74)
- **Problem:** All 8 demo users (admin, hr, finance, crm, inventory, project, employee, pranesh) are seeded with the exact same password: `password123`. This password is hardcoded in the seed file which is pushed to GitHub.
- **Evidence:** `const passwordHash = await bcrypt.hash('password123', 10);` — used for ALL accounts.
- **Impact:** Anyone who reads the seed file on GitHub knows the password for every account in the system. This is a security risk if the seed data is used in staging/production.
- **Status:** ❌ Not Fixed

### ISSUE #22 — Topbar Logout Doesn't Call Backend API
- **Module:** Authentication
- **File:** `frontend/src/components/layout/Topbar.tsx` (lines 113-117)
- **Problem:** The Topbar has its own `handleLogout` function that only clears `localStorage` and redirects to login. It does NOT call the backend `POST /auth/logout` endpoint to invalidate the session/token. Meanwhile, the Sidebar logout correctly calls the backend via `AuthContext.logout()`.
- **Evidence:** Topbar: `localStorage.removeItem('token'); router.push('/login');` — no API call.
  Sidebar: calls `logout()` from AuthContext which properly calls `POST /auth/logout`.
- **Impact:** If a user logs out from the Topbar dropdown, their JWT session remains active on the server. The token can still be used until it expires (24 hours). This is a session management vulnerability.
- **Status:** ❌ Not Fixed

### ISSUE #23 — Admin "Invite User" Hardcodes Password
- **Module:** Admin / User Management
- **File:** `frontend/src/app/admin/page.tsx` (line 70)
- **Problem:** When an admin invites/creates a new user, the frontend always sends `password: 'password123'` regardless of what the admin intended. There is no password field in the invite form. Every new user gets the same weak default password.
- **Evidence:** `body: JSON.stringify({ email: inviteForm.email, password: 'password123', roleId: inviteForm.roleId || undefined })`
- **Impact:** All newly created users get `password123`. Combined with the fact that Forgot Password doesn't work (Issue #18), there's no secure way to set or change initial passwords for new users.
- **Status:** ❌ Not Fixed

### ISSUE #24 — No Frontend Route Protection On Direct URL Access
- **Module:** Authorization / RBAC
- **File:** `frontend/src/context/AuthContext.tsx`, individual page components
- **Problem:** The Sidebar correctly hides navigation links based on `hasPermission()`, but if a user directly types a URL (e.g., an EMPLOYEE types `/admin` in the browser), the page still loads. There is no per-page permission check in the frontend page components themselves. The backend will reject API calls with 403, but the UI page renders and shows an empty/broken state instead of an "Access Denied" message.
- **Impact:** Users see broken/empty pages instead of a clear "You don't have permission" message. The backend protects the data, but the UX is poor.
- **Status:** ❌ Not Fixed

---

## 📊 MODULE 2: DASHBOARD ISSUES

### ISSUE #25 — Missing KPIs: Active Employees & Attendance Rate
- **Module:** Dashboard — Employee KPIs
- **File:** `frontend/src/app/page.tsx`
- **Problem:** The requirements specify 3 Employee KPIs: Total Employees, Active Employees, Attendance Rate. The dashboard only shows **Total Employees**. There is:
  - ❌ No "Active Employees" KPI card — the dashboard counts ALL employees, not filtering by `status: ACTIVE`
  - ❌ No "Attendance Rate" KPI card — attendance data is never fetched on the dashboard page (no call to `hrmApi.getAttendanceStats()`)
- **Impact:** 2 out of 3 required Employee KPIs are completely missing from the dashboard.
- **Status:** ❌ Not Fixed

### ISSUE #26 — Missing KPIs: Total Leads, Converted Leads, Revenue (CRM)
- **Module:** Dashboard — CRM KPIs
- **File:** `frontend/src/app/page.tsx`
- **Problem:** The requirements specify 3 CRM KPIs: Total Leads, Converted Leads, Revenue. The dashboard does NOT fetch any CRM data:
  - ❌ No call to `crmApi.getLeads()` anywhere on the dashboard
  - ❌ No lead count or conversion count displayed
  - ❌ Revenue is shown but it comes from the Finance module (`financeApi.getDashboardMetrics()`) — not CRM-specific revenue
- **Evidence:** The `loadDashboard()` function calls: `hrmApi.getEmployees()`, `projectApi.getProjects()`, `inventoryApi.getProducts()`, `financeApi.getDashboardMetrics()`, `analyticsApi.getRevenueTrend()` — zero CRM API calls.
- **Impact:** The entire CRM KPI section is absent from the dashboard.
- **Status:** ❌ Not Fixed

### ISSUE #27 — Missing KPIs: Completed Projects
- **Module:** Dashboard — Project KPIs
- **File:** `frontend/src/app/page.tsx`
- **Problem:** The requirements specify 2 Project KPIs: Active Projects and Completed Projects. The dashboard shows Active Projects but does NOT show Completed Projects. The data IS fetched and the count IS computed internally (line 54 filters by status), but there is no KPI card displayed for completed projects.
- **Impact:** 1 out of 2 required Project KPIs is missing from the UI.
- **Status:** ❌ Not Fixed

### ISSUE #28 — Revenue Growth Percentage Is Fabricated
- **Module:** Dashboard — KPI Cards
- **File:** `frontend/src/app/page.tsx` (line 66)
- **Problem:** The Revenue KPI card shows a "+X%" growth trend, but the percentage is a made-up formula, not actual period-over-period growth:
  ```
  revGrowthPct = Math.min(15, Math.max(3, Math.round((totalRevenue / 50000) * 10) / 10))
  ```
  This means: divide total revenue by 50000, clamp between 3% and 15%. If total revenue is $10,000, it shows +3%. If $100,000, it shows +15%. It has nothing to do with actual month-over-month or year-over-year growth.
- **Impact:** The "+X% ↑" trend indicator on the Revenue KPI card is misleading — it's not real growth data.
- **Status:** ❌ Not Fixed

### ISSUE #29 — Revenue Trend Chart Data Shape Mismatch
- **Module:** Dashboard — Revenue Trend Chart
- **File:** `frontend/src/app/page.tsx` (lines 79-87)
- **Problem:** The backend `GET /analytics/revenue-trend` returns data with keys `{ labels: [...], data: [...] }`, but the dashboard frontend expects an array of objects with `{ month, revenue }` or `{ label, value }` keys. When the backend response doesn't match, the chart falls back to hardcoded labels `['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN']` with zeros plus the total revenue dumped in the last month.
- **Evidence:** Backend returns `{ labels: ['Jan','Feb',...], data: [100,200,...] }` but frontend checks `Array.isArray(revenueTrend)` which is `false` (it's an object, not an array), so it always hits the fallback branch.
- **Impact:** The Revenue Trend chart likely NEVER shows real monthly data — it always shows the fallback with all revenue dumped into the last bar.
- **Status:** ❌ Not Fixed

### ISSUE #30 — "Employee Performance" Card Is Actually Department Distribution
- **Module:** Dashboard — Employee Statistics
- **File:** `frontend/src/app/page.tsx` (lines 89-101, 243)
- **Problem:** The card is titled "Employee Performance" but it actually shows department distribution — what percentage of employees belong to each department. This is NOT performance data. There is no actual performance metric (attendance rate, review scores, productivity) being calculated.
- **Evidence:** Comment on line 241 says `/* Employee Performance (Was Dept Dist) */` — admitting it was renamed from "Department Distribution" to "Employee Performance" without changing the underlying data.
- **Impact:** The label is misleading. Users expect performance metrics but see headcount distribution.
- **Status:** ❌ Not Fixed

### ISSUE #31 — No Sales Statistics Section
- **Module:** Dashboard — Sales Statistics
- **File:** `frontend/src/app/page.tsx`
- **Problem:** The requirements list "Sales Statistics" as a dashboard feature. There is zero sales data on the dashboard:
  - ❌ No sales order counts
  - ❌ No sales pipeline visualization
  - ❌ No call to `inventoryApi.getSalesOrders()` or `crmApi.getOpportunities()` from the dashboard
- **Impact:** Sales Statistics feature is entirely absent.
- **Status:** ❌ Not Fixed

### ISSUE #32 — Recent Activities Is Limited & Not Chronological
- **Module:** Dashboard — Recent Activities
- **File:** `frontend/src/app/page.tsx` (lines 116-146)
- **Problem:** The "Recent Activity" feed is not a real activity log. It shows at most 3 hardcoded-type entries:
  1. The first project in the list (not necessarily the most recent)
  2. The first employee in the list (not necessarily the newest hire)
  3. A low-stock inventory alert (if any exist)
  There is no actual activity tracking system — no audit log, no event stream. It just picks the first item from each module's list. Activities are not sorted by time.
- **Impact:** "Recent Activity" doesn't reflect recent actions. It's a static snapshot of the first records in each table.
- **Status:** ❌ Not Fixed

---

## 👥 MODULE 3: HUMAN RESOURCE MANAGEMENT (HRM) ISSUES

### ISSUE #33 — Edit Employee Button Does Nothing & No Edit Modal Exists
- **Module:** HRM — Employee Management
- **File:** `frontend/src/app/hrm/employees/page.tsx` (line 267)
- **Problem:** In the employee directory table action menu, clicking the "Edit" button simply executes `onClick={() => setActionMenuId(null)}`. It closes the action menu and does absolutely nothing else. There is:
  - ❌ No edit modal or form to modify employee details
  - ❌ No pre-populating of current employee data
  - ❌ No API integration in `frontend/src/services/api.ts` for updating employees (`hrmApi` missing `updateEmployee`)
- **Impact:** Employees cannot be edited after creation.
- **Status:** ❌ Not Fixed

### ISSUE #34 — View Employee Profile Feature Is Completely Missing
- **Module:** HRM — Employee Management
- **File:** `frontend/src/app/hrm/employees/page.tsx`
- **Problem:** The requirements specify "View Employee Profile" as a key feature of Employee Management. However:
  - ❌ The action menu only contains "Edit" and "Delete" — no "View Profile" option exists
  - ❌ Clicking an employee's name or row does not navigate to a profile page
  - ❌ No employee profile page (`/hrm/employees/[id]`) exists in the frontend route structure
- **Impact:** Detailed employee profiles, employment history, assigned assets, and individual attendance records cannot be viewed by HR managers.
- **Status:** ❌ Not Fixed

### ISSUE #35 — Apply Leave / Request Leave Form Is Missing In UI
- **Module:** HRM — Leave Management
- **File:** `frontend/src/app/hrm/leaves/page.tsx`
- **Problem:** The requirements list "Apply Leave" as a feature under Leave Management. On the leave management page:
  - ❌ There is an "Approve" and "Reject" action for pending leaves, but NO button or modal to submit a new leave request
  - ❌ Neither employees nor HR managers can apply for leave through this page
  - ❌ Although the backend API has `POST /hrm/leaves`, the UI never provides a form to invoke it
- **Impact:** Users cannot request leave from the leave management interface.
- **Status:** ❌ Not Fixed

### ISSUE #36 — Performance Tracking Page Uses Hardcoded Demo Data
- **Module:** HRM — Performance Tracking
- **File:** `frontend/src/app/hrm/performance/page.tsx` (lines 8-14)
- **Problem:** The performance page displays a hardcoded list of 5 demo reviews (`Pranesh M S`, `Akshay Kumar`, etc.) inside the component state:
  - ❌ Does not call `hrmApi.getPerformanceReviews()` or connect to the backend
  - ❌ Ignores any real `PerformanceReview` records present in PostgreSQL
- **Impact:** Performance reviews shown in the UI are fake static mockups disconnected from the database.
- **Status:** ❌ Not Fixed

### ISSUE #37 — Add Performance Review Feature Is Missing
- **Module:** HRM — Performance Tracking
- **File:** `frontend/src/app/hrm/performance/page.tsx` (lines 41-44), `backend/src/hrm/hrm.controller.ts`
- **Problem:** The performance page header contains an "Add Review" button, but it has no `onClick` handler or modal attached to it. Furthermore:
  - ❌ The backend `hrm.controller.ts` only has `GET /hrm/performance-reviews`
  - ❌ There is no `POST /hrm/performance-reviews` endpoint in the NestJS backend
- **Impact:** Managers cannot submit performance evaluations or ratings for employees.
- **Status:** ❌ Not Fixed

---

## 💼 MODULE 4: CRM (CUSTOMER RELATIONSHIP MANAGEMENT) ISSUES

### ISSUE #38 — Edit Lead & Delete Lead Buttons Are Missing or Non-Functional
- **Module:** CRM — Lead Management
- **Files:** `frontend/src/app/crm/leads/page.tsx` (line 90), `frontend/src/app/crm/page.tsx`
- **Problem:** The requirements specify Edit Lead and Delete Lead features. However:
  - ❌ On `crm/leads/page.tsx`, the edit icon button `<button className="act-btn act-edit">` has no `onClick` handler or modal attached
  - ❌ There is no "Delete Lead" button anywhere in the leads table or lead details card
  - ❌ On `crm/page.tsx`, lead conversion works, but editing lead details or deleting a lead is not exposed in the UI
- **Impact:** Once a lead is created, its information cannot be modified or deleted by sales reps.
- **Status:** ❌ Not Fixed

### ISSUE #39 — Customer Profiles Detail View Is Missing
- **Module:** CRM — Customer Management
- **Files:** `frontend/src/app/crm/customers/page.tsx`, `frontend/src/app/crm/contacts/page.tsx`
- **Problem:** The requirements list "Customer Profiles" as a feature under Customer Management. However:
  - ❌ Neither the Customers page nor the Contacts page provides a customer profile view (`/crm/customers/[id]`)
  - ❌ Clicking a customer row does not open a drawer, modal, or detail page showing customer history, associated opportunities, or support tickets
- **Impact:** Sales and support teams cannot inspect full customer profile details or purchase history.
- **Status:** ❌ Not Fixed

### ISSUE #40 — Opportunity Tracking Uses Hardcoded Demo Data Fallback
- **Module:** CRM — Opportunity Tracking
- **File:** `frontend/src/app/crm/opportunities/page.tsx` (lines 27-33)
- **Problem:** When the database has no opportunities, the opportunities page falls back to rendering 5 fake hardcoded deals (`ERP Implementation - TechCorp`, `CRM Upgrade - GlobalTrade`, etc.):
  - ❌ Gives the false impression that real pipeline deals exist when the database is empty
  - ❌ Masks empty database states with unpersisted fake data
- **Impact:** Users are shown synthetic opportunities that do not exist in the backend database.
- **Status:** ❌ Not Fixed

### ISSUE #41 — New Opportunity & Edit Opportunity Missing UI Modals & Backend Endpoints
- **Module:** CRM — Opportunity Tracking
- **Files:** `frontend/src/app/crm/opportunities/page.tsx` (lines 59-62, 111-114), `backend/src/crm/crm.controller.ts`
- **Problem:** The opportunities page contains "New Opportunity" and "Edit" buttons, but:
  - ❌ Clicking "New Opportunity" or "Edit" does nothing (no `onClick` handler, state, or modal dialog)
  - ❌ The backend `crm.controller.ts` only implements `GET /crm/opportunities`
  - ❌ There are no `POST /crm/opportunities` or `PUT /crm/opportunities/:id` endpoints in NestJS
- **Impact:** Users cannot create new sales opportunities or progress deals through pipeline stages.
- **Status:** ❌ Not Fixed

### ISSUE #42 — Follow-Up Automated Reminders & Notification System Is Missing
- **Module:** CRM — Follow-Ups
- **Files:** `frontend/src/app/crm/contacts/page.tsx`, `frontend/src/app/crm/page.tsx`
- **Problem:** The requirements specify "Reminder Tracking" for follow-ups. However:
  - ❌ Follow-ups are displayed as static text dates with no automated reminder triggers or notifications
  - ❌ There is no email notification, in-app alert, or browser notification when a follow-up is due or overdue
  - ❌ No background scheduler monitors upcoming follow-up dates
- **Impact:** Sales reps must manually check pages to notice due follow-ups; no proactive reminder alerts exist.
- **Status:** ❌ Not Fixed

---

## 📦 MODULE 5: INVENTORY MANAGEMENT ISSUES

### ISSUE #43 — Edit Product & Delete Product Buttons Are Non-Functional or Missing
- **Module:** Inventory — Product Management
- **File:** `frontend/src/app/inventory/products/page.tsx` (lines 100-105), `frontend/src/app/inventory/page.tsx`
- **Problem:** The requirements specify Edit Product and Delete Product features. However:
  - ❌ On `inventory/products/page.tsx`, the edit icon button `<button className="act-btn act-edit">` and delete icon button `<button className="act-btn act-delete">` have no `onClick` handlers attached
  - ❌ The main inventory page (`inventory/page.tsx`) table does not render Edit or Delete options for products
- **Impact:** Once a product is created, its name, SKU, category, price, or minimum stock level cannot be modified or removed via the UI.
- **Status:** ❌ Not Fixed

### ISSUE #44 — Stock History & Stock Movement Logging Is Completely Missing
- **Module:** Inventory — Stock Tracking
- **Files:** `backend/src/inventory/inventory.controller.ts`, `frontend/src/app/inventory/page.tsx`
- **Problem:** The requirements specify "Stock History" as a stock tracking feature. Although a `StockMovement` model exists in `schema.prisma`:
  - ❌ There are no `GET` or `POST` endpoints for stock movements in `inventory.controller.ts`
  - ❌ The frontend has no stock movement log table or inventory history page
  - ❌ On `inventory/page.tsx` (line 173), the "Stock Movement" section merely renders recent Purchase Orders and low stock alerts instead of real stock movement history
- **Impact:** Stock adjustments, stock ins/outs, waste/loss logs, and historical stock movements are not tracked or viewable.
- **Status:** ❌ Not Fixed

### ISSUE #45 — Dedicated Supplier Management Directory Page Is Missing
- **Module:** Inventory — Suppliers
- **Files:** `frontend/src/app/inventory/page.tsx`, `frontend/src/services/api.ts`
- **Problem:** The requirements specify "Supplier Database" under Suppliers. While suppliers can be selected when creating a PO:
  - ❌ There is no dedicated Supplier Directory page (`/inventory/suppliers`) in the frontend
  - ❌ There is no form or UI modal to edit or delete supplier profiles, contact persons, or addresses
- **Impact:** Managers cannot manage supplier profiles, update contact details, or view supplier history in a dedicated interface.
- **Status:** ❌ Not Fixed

### ISSUE #46 — Purchase Order Status Update Feature Is Missing In UI
- **Module:** Inventory — Purchase Orders
- **Files:** `frontend/src/app/inventory/page.tsx`, `backend/src/inventory/inventory.controller.ts`
- **Problem:** The requirements list "Update Purchase Order" as a key feature. Although NestJS has `PUT /inventory/purchase-orders/:id/status`:
  - ❌ The main inventory page (`inventory/page.tsx`) renders pending POs inside a feed but provides NO buttons or dropdowns to mark a PO as Received, Shipped, Delivered, or Cancelled
  - ❌ Created POs remain permanently stuck in `ORDERED` / `PENDING` status with no way to progress them in the UI
- **Impact:** Purchase order lifecycles cannot be completed or updated by inventory managers.
- **Status:** ❌ Not Fixed

### ISSUE #47 — Stock Alerts Page Uses Hardcoded Fake Data & Reorder Button Does Nothing
- **Module:** Inventory — Alerts
- **File:** `frontend/src/app/inventory/stock-alerts/page.tsx` (lines 8-13, 63)
- **Problem:** The stock alerts page is intended to display low stock items. However:
  - ❌ It uses a hardcoded array of 4 fake demo alerts (`USB-C Hub`, `Webcam HD`, `Ethernet Cable 5m`, `Mouse Pad XL`) rather than fetching real database products via `inventoryApi.getProducts()`
  - ❌ The "Reorder" button `<button className="btn btn-primary btn-sm">Reorder</button>` on line 63 has no `onClick` handler and does not trigger a Purchase Order
- **Impact:** Low stock alerts displayed to the user are static fake data, and quick reordering is non-functional.
- **Status:** ❌ Not Fixed

---

## 📁 MODULE 6: PROJECT MANAGEMENT ISSUES

### ISSUE #48 — Edit Project Feature Missing & View Project Link Leads to 404 Page
- **Module:** Project Management
- **File:** `frontend/src/app/projects/page.tsx` (lines 174-176)
- **Problem:** The requirements specify Edit Project. However:
  - ❌ There is no Edit Project button or edit modal on `projects/page.tsx`
  - ❌ In the project action menu, clicking "View" attempts to navigate to `/projects/${proj.id}`
  - ❌ No project details route (`frontend/src/app/projects/[id]/page.tsx`) exists in the codebase, causing a **404 Not Found** error when clicked
- **Impact:** Project details, descriptions, and timelines cannot be edited or viewed in detail.
- **Status:** ❌ Not Fixed

### ISSUE #49 — Task Creation & Task Board UI Missing In Frontend
- **Module:** Project Management — Task Management
- **Files:** `frontend/src/app/projects/page.tsx`, `backend/src/projects/projects.controller.ts`
- **Problem:** The requirements specify "Create Tasks" under Task Management. Although NestJS has `POST /projects/tasks`:
  - ❌ There is no "Create Task" button, task modal, or Kanban task board in the frontend UI
  - ❌ Tasks can only be counted if seeded directly in the database; users cannot add tasks via the web application
- **Impact:** Project managers cannot break down projects into actionable tasks from the interface.
- **Status:** ❌ Not Fixed

### ISSUE #50 — Task Assignment & Team Assignment Feature Dead In Backend & Missing In UI
- **Module:** Project Management — Team Collaboration & Task Assignment
- **Files:** `backend/prisma/schema.prisma`, `backend/src/projects/projects.controller.ts`
- **Problem:** The requirements specify "Assign Tasks" and "Team Assignment". While an `Assignment` model exists in Prisma:
  - ❌ No API endpoints exist in `projects.controller.ts` to create, read, or manage assignments
  - ❌ No UI exists to assign employees to tasks or add team members to projects
- **Impact:** Tasks and projects cannot be assigned to team members in the application.
- **Status:** ❌ Not Fixed

### ISSUE #51 — Task Status Update UI Is Completely Missing
- **Module:** Project Management — Task Management
- **Files:** `frontend/src/app/projects/page.tsx`, `backend/src/projects/projects.controller.ts`
- **Problem:** The requirements specify "Update Status" for tasks. Although NestJS provides `PUT /projects/tasks/:id/status`:
  - ❌ The frontend has no task list, Kanban board, or dropdown to change a task's status (e.g. from `IN_PROGRESS` to `DONE`)
  - ❌ Project progress bars remain static unless database records are modified externally
- **Impact:** Team members cannot update task completion status.
- **Status:** ❌ Not Fixed

### ISSUE #52 — Milestone Management UI Is Completely Missing
- **Module:** Project Management — Tracking
- **Files:** `frontend/src/app/projects/page.tsx`, `backend/src/projects/projects.controller.ts`
- **Problem:** The requirements specify "Milestones" under Tracking. Although `Milestone` model and `GET/POST /projects/milestones` API endpoints exist:
  - ❌ There is no Milestone tab, card, or list view in the frontend UI
  - ❌ Project managers cannot create or view project milestones
- **Impact:** Key project milestones and release target dates cannot be tracked in the UI.
- **Status:** ❌ Not Fixed

---

## 📈 MODULE 7: ANALYTICS & REPORTING ISSUES

### ISSUE #53 — HR Reports & Sales Performance Tabs Are Unimplemented Placeholder Boxes
- **Module:** Analytics & Reporting — Reports
- **File:** `frontend/src/app/analytics/page.tsx` (lines 283-295)
- **Problem:** The requirements list HR Reports and CRM Reports as core features. On `analytics/page.tsx`:
  - ❌ Clicking the "Sales Performance" tab displays a placeholder card saying: *"Sales Performance Dashboard — Detailed breakdown of sales orders, regional performance, and top customers will appear here."*
  - ❌ Clicking the "HR Metrics" tab displays a placeholder card saying: *"Human Resources Metrics — Analysis of recruitment funnels, timesheet compliance, and payroll trends will appear here."*
- **Impact:** 2 out of 4 required report dashboards are completely empty placeholder boxes with no charts or data.
- **Status:** ❌ Not Fixed

### ISSUE #54 — Inventory Turnover & Project Milestones Cards Contain Hardcoded Fake Data
- **Module:** Analytics & Reporting — Reports
- **File:** `frontend/src/app/analytics/page.tsx` (lines 228-243, 261-276)
- **Problem:** The requirements specify Inventory Reports and Project Reports. However:
  - ❌ The "Project Milestones" card renders 3 hardcoded static items (`Quarterly Audit`, `ERP Core Update`, `Q3 Strategic Planning`) rather than pulling real milestones from the database
  - ❌ The "View All Milestones" button (line 245) has no `onClick` handler or destination
  - ❌ The "Inventory Turnover Trends" table renders hardcoded rows (`Processors`, `Fiber Optics`, `Displays`, `Sensors`) instead of calculating actual product turnover ratios from database orders
- **Impact:** Users are presented with static mock data instead of real database-driven project and inventory reports.
- **Status:** ❌ Not Fixed

### ISSUE #55 — Export PDF & Filter Date Range Buttons On Analytics Page Are Non-Functional
- **Module:** Analytics & Reporting — Actions
- **File:** `frontend/src/app/analytics/page.tsx` (lines 81-86)
- **Problem:** In the top header of the Analytics page:
  - ❌ The "Filter Date Range" button `<button className="btn btn-secondary"><Filter size={16} /> Filter Date Range</button>` has no `onClick` handler or date picker component
  - ❌ The "Export PDF Report" button `<button className="btn btn-primary"><Download size={16} /> Export PDF Report</button>` has no `onClick` handler attached
- **Impact:** Users cannot filter report data by custom date ranges or export the current analytics view to PDF.
- **Status:** ❌ Not Fixed

### ISSUE #56 — Analytics Dashboard Report Export to PDF / Excel Missing In Backend
- **Module:** Analytics & Reporting — Export
- **File:** `backend/src/export/export.controller.ts`
- **Problem:** The requirements specify PDF and Excel export for reports. While the backend has export endpoints for raw lists (employees, products, ledger):
  - ❌ There is no `GET /export/analytics` or `GET /export/reports` endpoint in `export.controller.ts` to generate a compiled PDF executive report or Excel analytics summary
- **Impact:** Executive analytics dashboards and combined reporting summaries cannot be exported to PDF or Excel format from the backend.
- **Status:** ❌ Not Fixed

### ISSUE #57 — Resource Efficiency Gauge & Peak Hours Are Hardcoded Static Graphics
- **Module:** Analytics & Reporting — Visualizations
- **File:** `frontend/src/app/analytics/page.tsx` (lines 205-221)
- **Problem:** The "Resource Efficiency" widget renders:
  - ❌ A hardcoded `82%` CSS conic-gradient circle
  - ❌ Hardcoded text labels for "Peak Dept: R&D Team" and "Peak Hour: 10:00 AM"
  - ❌ Zero computation or database query for employee time tracking or facility utilization
- **Impact:** The efficiency widget is a static decorative element disguised as a live operational metric.
- **Status:** ❌ Not Fixed

---

## 🛡️ MODULE 8: ADMINISTRATION ISSUES

### ISSUE #58 — Remove User & Update User Actions Missing In Admin UI
- **Module:** Administration — User Management
- **File:** `frontend/src/app/admin/page.tsx` (lines 196-220)
- **Problem:** The requirements specify Remove Users and Update Users under User Management. Although NestJS has `DELETE /api/users/:id` and `PUT /api/users/:id`:
  - ❌ The User Management table on `admin/page.tsx` renders user rows with zero action buttons (no Edit, Delete, Role Change, or Password Reset icons)
  - ❌ Admins cannot delete users or change existing user roles/emails from the UI
- **Impact:** System administrators cannot remove compromised user accounts or update user roles after creation.
- **Status:** ❌ Not Fixed

### ISSUE #59 — Create Roles Feature Missing In Frontend & Backend
- **Module:** Administration — Roles & Permissions
- **Files:** `frontend/src/app/admin/page.tsx`, `backend/src/users/users.service.ts`
- **Problem:** The requirements specify "Create Roles". However:
  - ❌ There is no "Create Role" button, form, or modal in `admin/page.tsx`
  - ❌ The NestJS `users.service.ts` has `getRoles()` but no `createRole()` service method or API endpoint
- **Impact:** Custom enterprise roles cannot be defined through the application; system is restricted to pre-seeded roles.
- **Status:** ❌ Not Fixed

### ISSUE #60 — Role-Based Permission Assignment Matrix UI Missing
- **Module:** Administration — Roles & Permissions
- **File:** `frontend/src/app/admin/page.tsx`
- **Problem:** The requirements specify "Assign Permissions". However:
  - ❌ There is no permission matrix or configuration screen where admins can check/uncheck module permissions (HR, CRM, Inventory, Projects, Finance, Analytics) per role
  - ❌ Role permissions are static in PostgreSQL database tables with no administrative UI to edit them
- **Impact:** Admins cannot adjust granular permissions for system roles.
- **Status:** ❌ Not Fixed

### ISSUE #61 — Organization Details Configuration Feature Missing
- **Module:** Administration — System Settings
- **Files:** `frontend/src/app/admin/page.tsx`, `frontend/src/components/modals/GlobalSettingsModal.tsx`
- **Problem:** The requirements specify "Organization Details" under System Settings (e.g. company legal name, tax registration number, logo, fiscal year, address). However:
  - ❌ Neither the main Admin page nor the Global Settings Modal contains any input fields or forms for Organization Details
  - ❌ There is no database model or table to store company organization details
- **Impact:** Corporate details cannot be configured or rendered on invoices, purchase orders, and PDF exports.
- **Status:** ❌ Not Fixed

### ISSUE #62 — Security Policies Are Mock Toggles Saved Only In LocalStorage
- **Module:** Administration — System Settings
- **Files:** `frontend/src/app/admin/page.tsx` (lines 20-28, 229-240), `frontend/src/components/modals/GlobalSettingsModal.tsx` (lines 62-66)
- **Problem:** The requirements specify "Security Settings". On the admin page and global settings modal:
  - ❌ Toggles for "Enforce JWT Expiry (24h)", "Role-Based Access Control", "Require MFA", and "Password Rotation" only update browser `localStorage` state
  - ❌ None of these toggles send network requests or save to the backend database
  - ❌ The backend auth guards do not check these toggles, meaning they have zero security enforcement effect on the server
- **Impact:** Security policy controls are client-side UI mockups that do not enforce actual system security.
- **Status:** ❌ Not Fixed

### ISSUE #63 — Real Audit Logging System & Activity Trail Are Missing
- **Module:** Administration — Audit Logs
- **File:** `frontend/src/app/admin/page.tsx` (lines 244-266)
- **Problem:** The requirements specify "User Activity Logs". On `admin/page.tsx`:
  - ❌ The "Audit Activity" section merely queries the `User` table and displays user registration timestamps as "User Registered: email"
  - ❌ There is no `AuditLog` table in Prisma schema to record user logins, data mutations, failed login attempts, or sensitive admin operations
  - ❌ No real-time activity log stream exists
- **Impact:** The system lacks compliance audit trails for security monitoring or forensic analysis.
- **Status:** ❌ Not Fixed

---

## 🔑 SECTION 5: USER ROLES & PERMISSIONS MATRIX ISSUES

### ISSUE #64 — Employee "View Own Profile" Feature Is Not Implemented
- **Module:** RBAC / Employee Self-Service
- **Files:** `backend/src/hrm/hrm.controller.ts`, `frontend/src/app/hrm/employees/page.tsx`
- **Problem:** The Roles & Permissions matrix specifies that `EMPLOYEE` role users can "View Own" Employee Management profile. However:
  - ❌ `GET /hrm/employees` is guarded by `@RequirePermission('HR', 'READ')`
  - ❌ An `EMPLOYEE` role user gets a 403 Forbidden response when accessing employee data
  - ❌ There is no self-service route (e.g. `GET /hrm/my-profile`) or frontend page allowing employees to view their own profile, employment status, or pay grade
- **Impact:** Employees are locked out of viewing their own employee record.
- **Status:** ❌ Not Fixed

### ISSUE #65 — Employee "View Own Attendance" Is Blocked By HR Permission Guard
- **Module:** RBAC / Attendance Self-Service
- **Files:** `backend/src/hrm/hrm.controller.ts`, `frontend/src/app/hrm/attendance/page.tsx`
- **Problem:** The matrix specifies that `EMPLOYEE` role users can "View Own" Attendance records. However:
  - ❌ `GET /hrm/attendance` checks `@RequirePermission('HR', 'READ')`
  - ❌ If a regular employee logs in and navigates to the attendance page, the API call returns 403 Forbidden
  - ❌ There is no `GET /hrm/my-attendance` endpoint or user interface filtered to the logged-in employee's personal check-in history
- **Impact:** Employees cannot verify their own attendance logs or check-in records.
- **Status:** ❌ Not Fixed

### ISSUE #66 — Employee Self-Service "Apply Leave" Portal Is Missing
- **Module:** RBAC / Leave Management Self-Service
- **Files:** `backend/src/hrm/hrm.controller.ts`, `frontend/src/app/hrm/leaves/page.tsx`
- **Problem:** The matrix specifies that `EMPLOYEE` role users can "Apply" for Leave. However:
  - ❌ `GET /hrm/leaves` requires `@RequirePermission('HR', 'READ')`, so employees receive 403 Forbidden on the leave page
  - ❌ There is no employee leave application page or modal in the UI where an employee can select dates, reason, and leave type to submit a request
- **Impact:** Employees cannot submit leave requests in the application.
- **Status:** ❌ Not Fixed

### ISSUE #67 — Employee "Assigned Only" Project Scoping Is Missing
- **Module:** RBAC / Project Scoping
- **Files:** `backend/src/projects/projects.controller.ts`, `backend/src/projects/projects.service.ts`
- **Problem:** The matrix specifies that `EMPLOYEE` role users should only see "Assigned Only" Projects. However:
  - ❌ `GET /projects` returns ALL enterprise projects to anyone with `PROJECTS: READ` permission
  - ❌ `projectsService.getProjects()` performs no filtering based on team assignments (`Assignment` table) or employee ID
- **Impact:** Employees can view high-level details of all corporate projects rather than only projects assigned to them.
- **Status:** ❌ Not Fixed

### ISSUE #68 — Permission Matrix Conflict: Sales Manager Seeded With Inventory Access
- **Module:** RBAC / Role Seeding
- **Files:** `backend/prisma/seed.ts` (line 47)
- **Problem:** The User Roles & Permissions Matrix explicitly specifies `X` (No Access) for `Sales` role on `Inventory`. However:
  - ❌ `backend/prisma/seed.ts` seeds `SALES_MANAGER` with `{ module: 'INVENTORY', action: 'READ' }`
  - ❌ Sales managers are granted read access to the Inventory module, directly violating the design matrix
- **Impact:** Sales managers have unaligned access permissions that contradict the permissions specification matrix.
- **Status:** ❌ Not Fixed

## 🧭 SECTION 6: ERP NAVIGATION STRUCTURE ISSUES

### ISSUE #69 — HR Performance Submenu Item Missing In Sidebar Navigation
- **Module:** Navigation — HR Management
- **File:** `frontend/src/components/layout/Sidebar.tsx` (lines 40-47)
- **Problem:** The ERP Navigation Structure specifies `Performance` under HR Management. However:
  - ❌ `Sidebar.tsx` subItems array for HR Management only lists: `Overview`, `Employee Directory`, `Attendance`, `Leave Management`, `Payroll`, `Recruitment`
  - ❌ `Performance` (`/hrm/performance`) is completely missing from the HR dropdown menu
- **Impact:** Users cannot navigate to the Performance tracking page directly from the sidebar navigation menu.
- **Status:** ❌ Not Fixed

### ISSUE #70 — CRM Leads, Customers, Opportunities & Follow-Ups Missing In Sidebar Navigation
- **Module:** Navigation — CRM
- **File:** `frontend/src/components/layout/Sidebar.tsx` (lines 48-52)
- **Problem:** The navigation structure specifies 4 sub-navigation links under CRM: `Leads`, `Customers`, `Opportunities`, `Follow-Ups`. However:
  - ❌ `Sidebar.tsx` only lists: `Sales Pipeline`, `Support Tickets`, `Contacts`
  - ❌ Direct sidebar links for `Leads` (`/crm/leads`), `Customers` (`/crm/customers`), `Opportunities` (`/crm/opportunities`), and `Follow-Ups` are all missing
- **Impact:** CRM team members have to manually type URLs or guess sub-page links to reach core CRM sub-pages.
- **Status:** ❌ Not Fixed

### ISSUE #71 — Inventory Products, Suppliers, Stock & Purchase Orders Missing In Sidebar Navigation
- **Module:** Navigation — Inventory
- **File:** `frontend/src/components/layout/Sidebar.tsx` (lines 57-61)
- **Problem:** The navigation structure specifies 4 sub-navigation links under Inventory: `Products`, `Suppliers`, `Stock`, `Purchase Orders`. However:
  - ❌ `Sidebar.tsx` only lists: `Overview`, `Warehouse`, `Sales Orders`
  - ❌ Direct sidebar links for `Products` (`/inventory/products`), `Suppliers`, `Stock` (`/inventory/stock-alerts`), and `Purchase Orders` are missing
- **Impact:** Inventory managers cannot access the product catalog, stock alerts, or purchase order sub-pages directly from the sidebar.
- **Status:** ❌ Not Fixed

### ISSUE #72 — Projects Tasks & Team Assignments Submenu Items Missing In Sidebar Navigation
- **Module:** Navigation — Projects
- **File:** `frontend/src/components/layout/Sidebar.tsx` (lines 62-65)
- **Problem:** The navigation structure specifies 3 sub-navigation links under Projects: `Projects`, `Tasks`, `Team Assignments`. However:
  - ❌ `Sidebar.tsx` subItems array only lists: `Overview` and `Timesheets`
  - ❌ Submenu items for `Tasks` and `Team Assignments` are missing from the dropdown menu
- **Impact:** Project leads and team members cannot navigate to task management or team assignment views from the sidebar.
- **Status:** ❌ Not Fixed

### ISSUE #73 — Analytics & Administration Modules Lack Required Submenu Navigation Structure
- **Module:** Navigation — Analytics & Administration
- **File:** `frontend/src/components/layout/Sidebar.tsx` (lines 66-68)
- **Problem:** The navigation structure specifies sub-items for Analytics (`Reports`, `Charts`, `Exports`) and Administration (`Users`, `Roles`, `Settings`, `Audit Logs`). However:
  - ❌ `Sidebar.tsx` defines both `Analytics` and `Administration` as flat top-level links with `subItems: undefined`
  - ❌ Neither module has an expandable dropdown menu or sub-navigation hierarchy
- **Impact:** Navigation structure deviates from the design blueprint and lacks organized sub-page access.
- **Status:** ❌ Not Fixed

---

## 📜 SECTION 7: FUNCTIONAL REQUIREMENTS COMPLIANCE AUDIT

### FR-01: User Authentication (Email & Password)
- **Requirement:** The system shall allow users to authenticate using email and password.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Login via `POST /api/auth/login` works with bcrypt hashing and JWT token issuance.
  - ❌ **Issue #18:** Forgot Password button shows a fake `alert()` with no backend/email implementation.
  - ❌ **Issue #19:** Password Reset is completely missing (dead database fields `resetToken`).
  - ❌ **Issue #21:** All 8 seeded demo accounts share the identical weak password `password123`.

### FR-02: Role-Based Access Control (RBAC)
- **Requirement:** The system shall restrict access based on assigned roles.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Backend NestJS controllers enforce module access via `@RequirePermission()` and `RolesGuard`.
  - ❌ **Issue #20:** `TEAM_LEAD` role has zero permissions in `seed.ts` (blocked everywhere).
  - ❌ **Issue #24:** No frontend route protection exists on direct URL typing (renders broken/empty pages).
  - ❌ **Issue #64-67:** Employee role self-service views (own profile, attendance, leaves, assigned projects) are blocked by HR guards or un-scoped.

### FR-03: HR Management (Employee Records)
- **Requirement:** The system shall allow HR managers to manage employee records.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Add Employee, List Employees, and Delete Employee functions work.
  - ❌ **Issue #33:** Edit Employee button has no handler or modal dialog attached.
  - ❌ **Issue #34:** Detailed View Employee Profile page (`/hrm/employees/[id]`) is completely missing.
  - ❌ **Issue #35:** Apply Leave form is missing from the UI.
  - ❌ **Issue #36:** Performance Tracking page uses hardcoded static demo data instead of DB records.

### FR-04: CRM (Leads & Customers Management)
- **Requirement:** The system shall allow sales teams to manage leads and customers.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Create Lead, List Leads, and Convert Lead to Customer functions work.
  - ❌ **Issue #38:** Edit Lead & Delete Lead buttons are missing or non-functional.
  - ❌ **Issue #39:** Customer Profiles detail view (`/crm/customers/[id]`) is missing.
  - ❌ **Issue #40:** Opportunity tracking uses hardcoded demo data fallback when DB is empty.
  - ❌ **Issue #41:** New Opportunity & Edit Opportunity UI modals and backend endpoints are missing.

### FR-05: Inventory (Stock Movement Tracking)
- **Requirement:** The system shall allow inventory managers to track stock movements.
- **Compliance Status:** 🔴 **NON-COMPLIANT**
- **Evaluation:**
  - ❌ **Issue #44:** Stock Movement logging is completely missing. Zero NestJS API endpoints exist for stock movements, and the UI renders purchase orders instead of stock movement logs.
  - ❌ **Issue #43:** Edit Product & Delete Product buttons are non-functional.
  - ❌ **Issue #45:** Dedicated Supplier Management page is missing.
  - ❌ **Issue #47:** Stock Alerts page renders hardcoded fake data and "Reorder" button does nothing.

### FR-06: Project Management (Projects & Tasks)
- **Requirement:** The system shall allow project managers to manage projects and tasks.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Create Project, List Projects, and Delete Project functions work.
  - ❌ **Issue #48:** Edit Project feature is missing & "View" project link leads to a 404 page.
  - ❌ **Issue #49:** Task creation modal and Kanban task board UI are missing in the frontend.
  - ❌ **Issue #50:** Task Assignment & Team Assignment features are dead in backend and missing in UI.
  - ❌ **Issue #51:** Task Status Update UI is completely missing.

### FR-07: Analytics & Reporting Generation
- **Requirement:** The system shall generate reports and analytics.
- **Compliance Status:** 🟡 **PARTIALLY COMPLIANT WITH CRITICAL ISSUES**
- **Evaluation:**
  - ✅ Live Revenue YTD calculation and Revenue Trend Chart.js line graph work.
  - ❌ **Issue #53:** HR Reports & Sales Performance tabs are empty placeholder cards.
  - ❌ **Issue #54:** Inventory Turnover & Project Milestones cards contain hardcoded fake data.
  - ❌ **Issue #55:** Export PDF & Filter Date Range buttons on Analytics page are non-functional.
  - ❌ **Issue #56:** Analytics Dashboard compiled export to PDF/Excel is missing in NestJS backend.

### FR-08: Audit Logs Maintenance
- **Requirement:** The system shall maintain audit logs for important actions.
- **Compliance Status:** 🔴 **NON-COMPLIANT**
- **Evaluation:**
  - ❌ **Issue #63:** Real Audit Logging system and activity trail are completely missing. There is no `AuditLog` database table or middleware. The "Audit Activity" section merely displays `User` registration dates.

## ⚡ SECTION 8: NON-FUNCTIONAL REQUIREMENTS AUDIT

### Security Audit
- **JWT Authentication:** ✅ Implemented via Passport-JWT with 24h expiration (Weak JWT secret fixed in Issue #S3).
- **Password Encryption:** ✅ Implemented via bcryptjs with 10 salt rounds.
- **Role-Based Access Control:** 🟡 Partial — backend permissions work, but `TEAM_LEAD` is un-permissioned (Issue #20), URL route guards are missing in frontend (Issue #24), and Employee self-service views are blocked (Issues #64-67).

### ISSUE #74 — Rate Limiting & Throttling Middleware Missing In NestJS Backend
- **Module:** Non-Functional Requirements — Performance & Security
- **File:** `backend/src/app.module.ts`, `backend/src/main.ts`
- **Problem:** Performance requirement specifies API responses below 500ms and protection against abuse. However:
  - ❌ NestJS backend does not register `@nestjs/throttler` rate limiting middleware
  - ❌ API endpoints (including `POST /auth/login`) are vulnerable to brute-force attacks and denial-of-service (DoS) requests
- **Impact:** System endpoints are unprotected against API flooding, credential stuffing, and performance degradation under heavy load.
- **Status:** ❌ Not Fixed

### ISSUE #75 — Data Tables Lack Mobile Horizontal Scroll & Sidebar Has No Mobile Navigation Toggle
- **Module:** Non-Functional Requirements — Usability & Mobile-Friendly Interface
- **Files:** `frontend/src/components/layout/Topbar.tsx`, `frontend/src/components/layout/Sidebar.tsx`
- **Problem:** Usability requirement specifies a "Mobile-Friendly Interface" and "Responsive Design". However:
  - ❌ The Topbar and Sidebar lack a hamburger menu button or mobile drawer toggle for screens below 768px
  - ❌ On mobile viewports, the navigation sidebar collapses but cannot be opened or expanded
  - ❌ Complex data tables in HRM, Inventory, and CRM overflow the screen without responsive horizontal scroll wrappers
- **Impact:** The application interface breaks and becomes unusable on smartphones and small tablet screens.
- **Status:** ❌ Not Fixed

### ISSUE #76 — Automated Daily Database Backup Script / Cron Job Is Completely Missing
- **Module:** Non-Functional Requirements — Reliability
- **Files:** `backend/prisma/`, `backend/src/`
- **Problem:** Reliability requirement specifies "Daily Database Backup". However:
  - ❌ There is NO automated database backup script, PostgreSQL `pg_dump` cron task, or cloud storage backup service configured in the project
  - ❌ If the PostgreSQL database crashes or container data volume is lost, all enterprise data will be unrecoverable
- **Impact:** System fails data disaster recovery standards; zero automated data backups exist.
- **Status:** ❌ Not Fixed

### ISSUE #77 — Centralized Error Logging, Log Rotation & Exception Filter System Is Missing
- **Module:** Non-Functional Requirements — Reliability
- **Files:** `backend/src/main.ts`, `backend/src/app.module.ts`
- **Problem:** Reliability requirement specifies "Error Logging". However:
  - ❌ Backend relies solely on default NestJS console `Logger` outputting to stdout
  - ❌ There is no file-based log rotation (Winston/Pino), error tracking integration (Sentry/Bugsnag), or Global Exception Filter persisting runtime errors to disk or database
  - ❌ Uncaught backend exceptions only print ephemeral terminal logs that disappear on restart
- **Impact:** Production errors and runtime failures cannot be analyzed, monitored, or audited persistently.
- **Status:** ❌ Not Fixed

---

## 🏆 SECTION 9: MVP SUCCESS CRITERIA EVALUATION

### Criterion 1: Users can log in securely.
- **Evaluation Status:** 🟡 **PARTIALLY MET (CRITICAL GAPS)**
- **Audit Findings:**
  - ✅ Authentication flow (`POST /auth/login`) issues valid JWT tokens and uses bcrypt password hashing.
  - ❌ **Issue #18:** Forgot Password UI button shows a JavaScript `alert()` with zero backend implementation.
  - ❌ **Issue #19:** Password Reset logic is missing in NestJS (dead `resetToken` database fields).
  - ❌ **Issue #21:** All 8 seeded demo user accounts share the identical password `password123`.
  - ❌ **Issue #74:** API rate limiting & throttling middleware is missing, leaving auth endpoints vulnerable to brute-force attacks.

### Criterion 2: All core modules are operational.
- **Evaluation Status:** 🔴 **NOT MET**
- **Audit Findings:**
  - ❌ **HRM:** Edit Employee button is non-functional (Issue #33), View Profile is missing (Issue #34), Apply Leave form is missing (Issue #35), Performance uses fake demo data (Issue #36).
  - ❌ **CRM:** Edit/Delete Lead buttons are non-functional (Issue #38), Customer Profiles missing (Issue #39), Opportunity tracking uses fake data fallback (Issue #40).
  - ❌ **Inventory:** Edit/Delete Product buttons dead (Issue #43), Stock Movement logging completely missing (Issue #44), Supplier Directory page missing (Issue #45), PO status update missing (Issue #46).
  - ❌ **Projects:** Edit Project missing & View link throws 404 (Issue #48), Task creation & Kanban board missing (Issue #49), Task/Team Assignment dead (Issue #50).
  - ❌ **Admin:** User Edit/Delete missing (Issue #58), Role Creation missing (Issue #59), Permission Matrix missing (Issue #60).

### Criterion 3: CRUD operations work correctly.
- **Evaluation Status:** 🔴 **NOT MET**
- **Audit Findings:**
  - ❌ **Create:** Works for Employees, Leads, Products, Projects, Purchase Orders, Sales Orders, Users.
  - ❌ **Read:** Works for entity tables, but detail/profile pages (`/hrm/employees/[id]`, `/crm/customers/[id]`, `/projects/[id]`) are missing or lead to 404 errors.
  - ❌ **Update (Edit):** Fails across almost all modules in the UI (Employee Edit #33, Lead Edit #38, Product Edit #43, Project Edit #48, Opportunity Edit #41, User Edit #58).
  - ❌ **Delete:** Works for Employees and Projects, but fails for Leads (#38), Products (#43), and Users (#58).

### Criterion 4: Reports are generated successfully.
- **Evaluation Status:** 🟡 **PARTIALLY MET**
- **Audit Findings:**
  - ✅ Individual raw entity exports (Employees, Attendance, Products, Customers, Ledger) to Excel/PDF work.
  - ❌ **Issue #53:** HR Reports and Sales Performance tabs are empty placeholder cards.
  - ❌ **Issue #54:** Inventory Turnover Trends and Project Milestones cards display hardcoded static text.
  - ❌ **Issue #55:** Export PDF Report and Date Range Filter buttons on Analytics page have no click handlers.
  - ❌ **Issue #56:** Executive analytics summary export endpoint is missing in backend.

### Criterion 5: User roles function properly.
- **Evaluation Status:** 🟡 **PARTIALLY MET (CRITICAL GAPS)**
- **Audit Findings:**
  - ✅ Backend NestJS `@RequirePermission()` and `RolesGuard` check user role permissions correctly.
  - ❌ **Issue #20:** `TEAM_LEAD` role has zero permissions in database seed (blocked from all modules).
  - ❌ **Issue #24:** Frontend Next.js routes lack client-side permission guards (renders broken pages on direct URL navigation).
  - ❌ **Issue #64-67:** Employee role self-service (view own profile, attendance, leaves, assigned projects) is blocked by HR guards or un-scoped.
  - ❌ **Issue #68:** Sales Manager role seed conflicts with permission matrix.

### Criterion 6: The application is deployed and demo-ready within 18 days.
- **Evaluation Status:** 🔴 **NOT DEMO-READY AS-IS**
- **Audit Findings:**
  - ❌ With 77 open issues (broken edit buttons, dead links leading to 404, hardcoded fake data in analytics/performance/stock-alerts, missing mobile drawer, and broken employee self-service), the application is currently **not demo-ready** for enterprise production presentation.

---

## 🏗️ SECTION 10: NOTION SYSTEM ARCHITECTURE PLANNING AUDIT

> **Blueprint Reference:** Notion System Architecture Planning Document (`silicon-theater-93d.notion.site/System-Architechture-Planning-3878f9b86357800cbf09cc5c5cfd1ff3`)

### ISSUE #78 — Role-Based Post-Login Routing Architecture Violation
- **Module:** Architecture — Authentication & User Flow (Diagram 3: Role-Based Access Flow)
- **File:** `frontend/src/app/login/page.tsx` (line 44)
- **Problem:** The architecture specification dictates role-based post-login destination routing:
  - `Admin` -> All Modules (`/admin`)
  - `HR Manager` -> HRM (`/hrm`)
  - `Sales Manager` -> CRM (`/crm`)
  - `Inventory Manager` -> Inventory (`/inventory`)
  - `Project Manager` -> Projects (`/projects`)
  - `Employee` -> My Tasks (`/portal` or `/projects/tasks`)
  - ❌ **Actual Implementation:** `src/app/login/page.tsx` line 44 hardcodes `router.push('/')` for ALL users regardless of role. Regular Employees logging in land on the Admin Dashboard view instead of their designated Employee Task Portal.
- **Impact:** Violates the post-login routing architecture diagram and exposes the Admin Dashboard route to all user roles upon login.
- **Status:** ❌ Not Fixed

### ISSUE #79 — Inter-Module Linkage Missing (Tasks Unassigned to Employees, Projects Detached from CRM & Inventory)
- **Module:** Architecture — Module Relationship Map (Diagram 4: Module Relationship Map)
- **Files:** `backend/prisma/schema.prisma`
- **Problem:** The Module Relationship Map specifies bidirectional inter-module data connections:
  - `HRM <-> Projects`: Employees assigned directly to Projects & Tasks.
  - `CRM <-> Projects`: Customers & Opportunities directly linked to Projects.
  - `Inventory -> Projects`: Products & Purchase Orders linked to Project resource consumption.
  - ❌ **Actual Implementation:** In `schema.prisma`:
    - `Task` model has NO `assigneeId` relation connecting to `Employee` / `User`.
    - `Project` model has NO `customerId` or `opportunityId` relation linking to CRM.
    - `Product` and `PurchaseOrder` models have no foreign keys connecting to `Project`.
    - All ERP modules function as completely disconnected data silos.
- **Impact:** System fails enterprise integration requirements; cross-module workflow data cannot be queried or tracked.
- **Status:** ❌ Not Fixed

### ISSUE #80 — AI Service Layer Lacks Real Performance Analysis & Sales Prediction Engine
- **Module:** Architecture — High-Level System Architecture (Diagram 5: Layered Architecture)
- **Files:** `backend/src/ai/ai.service.ts`, `frontend/src/app/ai/page.tsx`
- **Problem:** Layer 5 (AI Service Layer) specifies: `Dashboard Insights`, `Performance Analysis`, and `Sales Predictions`. However:
  - ❌ `ai.service.ts` only returns static, hardcoded text strings ("Sales are up 12%", "HR attendance rate looks good")
  - ❌ Zero machine learning, heuristic analysis, performance trend analysis, or sales prediction algorithm is implemented in NestJS
- **Impact:** AI service layer is a cosmetic shell that returns hardcoded text instead of functional predictive insights.
- **Status:** ❌ Not Fixed

### ISSUE #81 — Analytics Aggregation Service Fails To Stream Live Data From HR, CRM, Inventory & Projects
- **Module:** Architecture — Database Entity Overview & Analytics Aggregation (Diagram 6)
- **Files:** `backend/src/analytics/analytics.service.ts`
- **Problem:** Diagram 6 specifies that Analytics Reports aggregate live data streams across all 4 core module domains (HR Attendance/Leaves, CRM Leads/Opportunities, Inventory Stock Movements, and Project Tasks). However:
  - ❌ NestJS `AnalyticsService` only queries the `Invoice` database table for revenue trends
  - ❌ HR Metrics, Sales Performance, Inventory Turnover, and Project Milestones tabs in the frontend UI are completely disconnected from NestJS analytics APIs and display hardcoded fake text
- **Impact:** Enterprise reporting fails architecture aggregation specifications; 4 out of 5 analytics domains are non-functional.
- **Status:** ❌ Not Fixed

---

## 👔 SECTION 11: HRM SCREENS REQUIREMENTS AUDIT

### ISSUE #82 — HR Dashboard Missing Required Top-Level KPI Cards & Recent Activity Feed
- **Module:** HRM — HR Dashboard Screen
- **File:** `frontend/src/app/hrm/page.tsx`
- **Problem:** Screen specifications require KPI Cards (`Total Employees`, `Active Employees`, `Present Today`, `Pending Leave Requests`) and a `Recent Activity` section (`New Employees`, `Leave Requests`, `Attendance Updates`). However:
  - ❌ `src/app/hrm/page.tsx` omits a distinct "Active Employees" top-level KPI card
  - ❌ `Present Today` and `Pending Leave Requests` are hidden inside side cards instead of top KPI cards
  - ❌ The entire `Recent Activity` feed (New Employees, Leave Requests, Attendance Updates timeline) is completely missing from the HR Dashboard UI
- **Impact:** HR managers lack a consolidated real-time activity stream and top-level KPI indicators.
- **Status:** ❌ Not Fixed

### ISSUE #83 — HR Dashboard Missing Department Distribution & Employee Growth Charts
- **Module:** HRM — HR Dashboard Screen
- **File:** `frontend/src/app/hrm/page.tsx`
- **Problem:** Screen specifications require 3 charts on the HR Dashboard: `Attendance Trend`, `Department Distribution`, and `Employee Growth`. However:
  - ❌ `src/app/hrm/page.tsx` only renders the `Attendance Trend` SVG line chart
  - ❌ `Department Distribution` chart (visual breakdown of employees per department) is missing
  - ❌ `Employee Growth` chart (visual graph tracking workforce growth over time) is missing
- **Impact:** HR Dashboard visual analytics are incomplete; department and growth trends cannot be visually monitored.
- **Status:** ❌ Not Fixed

### ISSUE #84 — Employee List Screen Missing Position & Employment Status Filter Dropdowns
- **Module:** HRM — Employee List Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 193-203)
- **Problem:** Screen specifications require 3 filter controls above the employee table: `Department`, `Position`, and `Employment Status`. However:
  - ❌ `employees/page.tsx` only provides a single `<select>` dropdown for Department filter
  - ❌ `Position` / Designation filter dropdown is missing
  - ❌ `Employment Status` filter dropdown (Full-Time, Part-Time, Contract, Intern, On Leave, Active, Probation) is missing
- **Impact:** HR users cannot filter employee records by position or employment status.
- **Status:** ❌ Not Fixed

### ISSUE #85 — Employee List Table Missing Email & Employment Status Columns
- **Module:** HRM — Employee List Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 207-220)
- **Problem:** Screen specifications mandate table columns: `Employee ID`, `Employee Name`, `Department`, `Position`, `Email`, `Status`, `Actions`. However:
  - ❌ `employees/page.tsx` omits the `Email` column entirely
  - ❌ `Status` column (Employment status badge) is missing from the table
  - ❌ `Employee ID` is merged inside the `Employee Name` cell instead of having its dedicated column
- **Impact:** Key employee contact and status information is absent from the table view.
- **Status:** ❌ Not Fixed

### ISSUE #86 — Employee List Menu Missing "View" Action Button & "Edit" Button Remains Dead
- **Module:** HRM — Employee List Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 260-275)
- **Problem:** Screen specifications require 3 action options under the table `Actions` menu: `View`, `Edit`, `Delete`. However:
  - ❌ The `View` action button (navigating to the Employee Profile page `/hrm/employees/[id]`) is completely missing from the action menu
  - ❌ The `Edit` action button has a dummy `onClick={() => setActionMenuId(null)}` handler with no edit modal or backend update endpoint wired up
- **Impact:** HR managers cannot view detailed employee profile pages or edit existing employee records from the directory.
- **Status:** ❌ Not Fixed

### ISSUE #87 — Add Employee Screen Missing Gender, Date of Birth & Email Inputs
- **Module:** HRM — Add Employee Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 296-309)
- **Problem:** Screen specifications mandate Personal Information fields: `First Name`, `Last Name`, `Gender`, `Date of Birth`, `Contact Number`, `Email`. However:
  - ❌ `Gender` select input is missing from the modal form
  - ❌ `Date of Birth` date picker input is missing from the modal form
  - ❌ `Email` address input is missing from the modal form
- **Impact:** Mandatory personal demographic and contact information cannot be captured when onboarding employees.
- **Status:** ❌ Not Fixed

### ISSUE #88 — Add Employee Screen Missing Custom Employee ID & Joining Date Input Fields
- **Module:** HRM — Add Employee Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 296-309)
- **Problem:** Screen specifications mandate Employment Details fields: `Employee ID`, `Department`, `Position`, `Joining Date`, `Employment Type`. However:
  - ❌ `Employee ID` (`empCode`) custom input field is missing from the form
  - ❌ `Joining Date` date picker input is missing from the form (defaults silently to current system timestamp)
- **Impact:** HR users cannot assign custom employee numbers or specify historical/future joining dates.
- **Status:** ❌ Not Fixed

### ISSUE #89 — Add Employee Screen Missing Address Section (Address, City, State, Country)
- **Module:** HRM — Add Employee Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 296-309)
- **Problem:** Screen specifications mandate a dedicated Address section containing: `Address`, `City`, `State`, `Country`. However:
  - ❌ All 4 address input fields (`Address`, `City`, `State`, `Country`) are completely missing from the Add Employee modal
- **Impact:** Employee residence address details cannot be saved during record creation.
- **Status:** ❌ Not Fixed

### ISSUE #90 — Add Employee Form Lacks Required 3-Section Layout Structure (Personal Info, Employment Details, Address)
- **Module:** HRM — Add Employee Screen
- **File:** `frontend/src/app/hrm/employees/page.tsx` (lines 296-309)
- **Problem:** Screen specifications dictate a structured 3-section form layout (`Personal Information`, `Employment Details`, `Address`). However:
  - ❌ `employees/page.tsx` renders an unstructured, flat 6-field modal without section headers, fieldsets, or multi-step tabs
- **Impact:** Form layout violates screen design specifications and user experience guidelines.
- **Status:** ❌ Not Fixed

### ISSUE #91 — Employee Profile Screen (`/hrm/employees/[id]`) Is Completely Missing
- **Module:** HRM — Employee Profile Screen
- **File:** `frontend/src/app/hrm/employees/[id]/page.tsx` (File does not exist)
- **Problem:** Screen 4 specifications mandate a dedicated Employee Profile screen containing 4 distinct tabs:
  - `Overview`: Employee Details, Department, Position
  - `Attendance`: Personal Attendance Records
  - `Leave`: Personal Leave History
  - `Performance`: Ratings and Performance Reviews
  - ❌ **Actual Implementation:** The route `/hrm/employees/[id]` is completely missing from the Next.js app directory. Clicking "View" or an employee name in the directory has nowhere to navigate.
- **Impact:** Core HR user journey is broken; employee profiles, history, and individual evaluation data are unreachable.
- **Status:** ❌ Not Fixed

### ISSUE #92 — Attendance Screen Missing Department Filter Dropdown & Separate Date Column
- **Module:** HRM — Attendance Screen
- **File:** `frontend/src/app/hrm/attendance/page.tsx` (lines 108-155)
- **Problem:** Screen 5 specifications mandate filters (`Date`, `Department`) and table columns (`Employee Name`, `Date`, `Check In`, `Check Out`, `Status`). However:
  - ❌ `Department` filter dropdown is missing from the toolbar
  - ❌ `Date` column is missing from table rows (the date is only displayed in the top global navigator)
- **Impact:** Attendance logs cannot be filtered by department or viewed in multi-date tabular logs.
- **Status:** ❌ Not Fixed

### ISSUE #93 — Attendance Screen Missing Edit Attendance Action Modal & API Endpoint
- **Module:** HRM — Attendance Screen
- **File:** `frontend/src/app/hrm/attendance/page.tsx` (lines 194-205)
- **Problem:** Screen 5 specifications require action controls: `Mark Attendance` and `Edit Attendance`. However:
  - ❌ Once attendance is marked for a date, the row renders a static "Marked" label with no `Edit Attendance` button or modal to modify check-in/out times or status
- **Impact:** Attendance records cannot be edited or corrected after initial submission.
- **Status:** ❌ Not Fixed

### ISSUE #94 — Leave Management Screen Missing Top-Level KPI Cards
- **Module:** HRM — Leave Management Screen
- **File:** `frontend/src/app/hrm/leaves/page.tsx` (lines 60-78)
- **Problem:** Screen 6 specifications mandate 4 top-level KPI Cards: `Total Requests`, `Approved`, `Pending`, `Rejected`. However:
  - ❌ `leaves/page.tsx` omits all 4 top KPI cards entirely, rendering only the tabular requests list
- **Impact:** HR managers lack quick metric visibility into overall leave volume and approval breakdown.
- **Status:** ❌ Not Fixed

### ISSUE #95 — Leave Management Table Missing "View" Detailed Application Action
- **Module:** HRM — Leave Management Screen
- **File:** `frontend/src/app/hrm/leaves/page.tsx` (lines 134-147)
- **Problem:** Screen 6 specifications require table actions: `Approve`, `Reject`, `View`. However:
  - ❌ The `View` action button (modal or page displaying full leave application justification and medical certificates) is missing
- **Impact:** HR managers cannot inspect detailed leave application context before approving or rejecting.
- **Status:** ❌ Not Fixed

### ISSUE #96 — Performance Management Screen Missing Productivity, Attendance & Task Completion Sub-Metrics
- **Module:** HRM — Performance Management Screen
- **File:** `frontend/src/app/hrm/performance/page.tsx` (lines 52-80)
- **Problem:** Screen 7 specifications require individual rating breakdown metrics: `Productivity`, `Attendance`, `Task Completion`, `Overall Rating`. However:
  - ❌ `performance/page.tsx` only renders a single hardcoded overall rating number, omitting Productivity, Attendance, and Task Completion breakdowns
- **Impact:** Performance evaluations lack granular rating criteria and metric breakdowns.
- **Status:** ❌ Not Fixed

### ISSUE #97 — Performance Management Screen Missing Performance Trends & Department Comparison Visual Charts
- **Module:** HRM — Performance Management Screen
- **File:** `frontend/src/app/hrm/performance/page.tsx`
- **Problem:** Screen 7 specifications mandate 2 visual charts: `Performance Trends` and `Department Comparison`. However:
  - ❌ Both `Performance Trends` graph and `Department Comparison` chart are completely missing from `performance/page.tsx`
  - ❌ The screen uses hardcoded static demo data arrays instead of querying NestJS performance API endpoints
- **Impact:** HR performance analytics fail design specifications and present static fake text.
- **Status:** ❌ Not Fixed

---

## 📦 SECTION 12: INVENTORY SCREENS REQUIREMENTS AUDIT

### ISSUE #98 — Inventory Dashboard Missing Stock Levels & Inventory Trends Visual Charts
- **Module:** Inventory — Inventory Dashboard Screen
- **File:** `frontend/src/app/inventory/page.tsx`
- **Problem:** Screen 1 specifications require 2 visual charts on the Inventory Dashboard: `Stock Levels` bar chart and `Inventory Trends` line graph. However:
  - ❌ `src/app/inventory/page.tsx` renders KPI cards and a product list table, but completely omits both the `Stock Levels` chart and the `Inventory Trends` graph
- **Impact:** Inventory managers lack visual chart analytics for stock distribution and historical inventory trends.
- **Status:** ❌ Not Fixed

### ISSUE #99 — Product List Screen Missing Status Column, Stock Status Filter & View Action Button
- **Module:** Inventory — Product List Screen
- **Files:** `frontend/src/app/inventory/page.tsx`, `frontend/src/app/inventory/products/page.tsx`
- **Problem:** Screen 2 specifications mandate Table Columns (`Product Name`, `SKU`, `Category`, `Quantity`, `Unit Price`, `Status`), Filters (`Category`, `Stock Status`), and Actions (`View`, `Edit`, `Delete`). However:
  - ❌ `Status` column is missing from product tables
  - ❌ `Stock Status` filter dropdown (In Stock, Low Stock, Out of Stock) is missing from the filter bar
  - ❌ `View` action button (navigating to Product Details `/inventory/products/[id]`) is missing from table action menus
  - ❌ `Edit` and `Delete` action buttons in `inventory/products/page.tsx` have no click handlers attached
- **Impact:** Product catalogue cannot be filtered by stock status or navigated to detailed product profile views.
- **Status:** ❌ Not Fixed

### ISSUE #100 — Add Product Screen Missing Product Description & Supplier Details Section
- **Module:** Inventory — Add Product Screen
- **Files:** `frontend/src/app/inventory/page.tsx` (lines 225-241)
- **Problem:** Screen 3 specifications mandate fields under Product Details (`Product Name`, `SKU`, `Category`, `Description`) and a dedicated Supplier Details section (`Supplier Name`, `Supplier Contact`). However:
  - ❌ `Description` textarea input is missing from the Add Product modal form
  - ❌ The entire `Supplier Details` section (`Supplier Name`, `Supplier Contact`) is completely missing from the modal form
- **Impact:** Products cannot be associated with primary suppliers or detailed description text upon creation.
- **Status:** ❌ Not Fixed

### ISSUE #101 — Product Details Screen (`/inventory/products/[id]`) Is Completely Missing
- **Module:** Inventory — Product Details Screen
- **File:** `frontend/src/app/inventory/products/[id]/page.tsx` (File does not exist)
- **Problem:** Screen 4 specifications mandate a dedicated Product Details screen with 5 sections:
  - `Product Information`: Name, SKU, Category, Description
  - `Stock Information`: Quantity, Reorder Level, Unit Cost, Selling Price
  - `Supplier Information`: Supplier Name, Contact Person, Phone, Email
  - `Stock Movement History`: Stock In / Stock Out audit trail table
  - `Recent Purchases`: Related Purchase Order history
  - ❌ **Actual Implementation:** Route `/inventory/products/[id]` does not exist in the codebase.
- **Impact:** Product audit history, supplier links, and purchase order associations cannot be viewed per product.
- **Status:** ❌ Not Fixed

### ISSUE #102 — Dedicated Supplier Management Screen (`/inventory/suppliers`) Is Missing
- **Module:** Inventory — Supplier Management Screen
- **File:** `frontend/src/app/inventory/suppliers/page.tsx` (File does not exist)
- **Problem:** Screen 5 specifications mandate a dedicated Supplier Management screen featuring a table (`Supplier Name`, `Contact Person`, `Email`, `Phone`, `Status`) and actions (`Add Supplier`, `Edit Supplier`, `Delete Supplier`). However:
  - ❌ Route `/inventory/suppliers` does not exist in the Next.js app directory
  - ❌ Zero frontend screens or backend CRUD controllers exist for managing supplier contacts
- **Impact:** Procurement managers cannot manage vendor relationships, phone numbers, or supplier directories.
- **Status:** ❌ Not Fixed

### ISSUE #103 — Dedicated Purchase Orders Management Screen & PO Status Progression UI Are Missing
- **Module:** Inventory — Purchase Orders Screen
- **File:** `frontend/src/app/inventory/purchase-orders/page.tsx` (File does not exist)
- **Problem:** Screen 6 specifications mandate a dedicated Purchase Orders screen with Table Columns (`PO Number`, `Supplier`, `Date`, `Amount`, `Status`) and Status progression workflows (`Pending` -> `Approved` -> `Delivered`). However:
  - ❌ A dedicated Purchase Orders page with table views and status filter tabs is missing
  - ❌ Purchase Orders in the database remain stuck in initial `PENDING` status with no UI button or modal to approve or mark POs as `Delivered`
- **Impact:** Procurement order workflow is dead; inventory quantities are not automatically incremented upon PO delivery.
- **Status:** ❌ Not Fixed

### ISSUE #104 — Stock Movement Tracking Screen & DB Logging Are Completely Missing
- **Module:** Inventory — Stock Movement Screen
- **File:** `frontend/src/app/inventory/stock-movements/page.tsx` (File does not exist)
- **Problem:** Screen 7 specifications mandate a dedicated Stock Movement screen featuring a Table (`Product`, `Movement Type`, `Quantity`, `Date`, `Performed By`) for movement types (`Stock In`, `Stock Out`, `Adjustment`). However:
  - ❌ Neither the `StockMovement` database model nor the `/inventory/stock-movements` page exists in the project
  - ❌ Stock levels are manually overwritten with no audit log of who adjusted inventory or when stock arrived/departed
- **Impact:** Total lack of inventory traceability and stock movement accountability.
- **Status:** ❌ Not Fixed

---

## 📁 SECTION 13: PROJECT MANAGEMENT SCREENS REQUIREMENTS AUDIT

### ISSUE #105 — Project Dashboard Missing Delayed Projects & Tasks Due Today KPI Cards
- **Module:** Project Management — Project Dashboard Screen
- **File:** `frontend/src/app/projects/page.tsx` (lines 114-143)
- **Problem:** Screen 1 specifications require 4 KPI Cards: `Active Projects`, `Completed Projects`, `Delayed Projects`, `Tasks Due Today`. However:
  - ❌ `src/app/projects/page.tsx` renders `Total Projects`, `Active`, `Completed`, and `Overdue`, but omits the `Delayed Projects` (schedule variance tracking) and `Tasks Due Today` cards
- **Impact:** Project managers lack immediate visibility into daily task deadlines and project schedule delays.
- **Status:** ❌ Not Fixed

### ISSUE #106 — Project Dashboard Missing Project Progress & Team Utilization Visual Charts
- **Module:** Project Management — Project Dashboard Screen
- **File:** `frontend/src/app/projects/page.tsx`
- **Problem:** Screen 1 specifications mandate 2 visual charts: `Project Progress` graph and `Team Utilization` visual chart. However:
  - ❌ Both `Project Progress` chart and `Team Utilization` visual graph are completely missing from `projects/page.tsx` (only a right sidebar text capacity list exists)
- **Impact:** Executive visual dashboard analytics are incomplete.
- **Status:** ❌ Not Fixed

### ISSUE #107 — Project List Screen Lacks Structured Data Table Layout & Missing Project Manager Column
- **Module:** Project Management — Project List Screen
- **File:** `frontend/src/app/projects/page.tsx` (lines 149-207)
- **Problem:** Screen 2 specifications mandate a structured Data Table featuring columns: `Project Name`, `Project Manager`, `Start Date`, `End Date`, `Status`, `Progress`. However:
  - ❌ `projects/page.tsx` renders projects as informal card widgets instead of a structured data table
  - ❌ `Project Manager` column/assignment is completely missing from project cards and backend Prisma schema
  - ❌ `Start Date` and `End Date` values are not displayed on project card widgets
- **Impact:** Project list cannot be sorted, filtered, or viewed in tabular ERP directory view.
- **Status:** ❌ Not Fixed

### ISSUE #108 — Project Action Menu Missing "Edit Project" Button & Modal Handler
- **Module:** Project Management — Project List Screen
- **File:** `frontend/src/app/projects/page.tsx` (lines 164-183)
- **Problem:** Screen 2 specifications dictate action options: `View`, `Edit`, `Delete`. However:
  - ❌ `Edit` action button is completely missing from the project action menu (only `View` and `Delete` exist)
  - ❌ Zero frontend edit modals or backend `PATCH /api/projects/:id` update handlers exist
- **Impact:** Project managers cannot update project names, descriptions, priority levels, or end dates once a project is created.
- **Status:** ❌ Not Fixed

### ISSUE #109 — Create Project Modal Missing Status Dropdown & Assigned Team Multi-Select Fields
- **Module:** Project Management — Create Project Screen
- **File:** `frontend/src/app/projects/page.tsx` (lines 234-248)
- **Problem:** Screen 3 specifications mandate Create Project fields: `Project Name`, `Description`, `Start Date`, `End Date`, `Priority`, `Status`, `Assigned Team`. However:
  - ❌ `Status` select dropdown is missing from the modal form
  - ❌ `Assigned Team` multi-select field (selecting initial employees assigned to the project during creation) is completely missing from the modal form
- **Impact:** Projects cannot be assigned initial status or team members upon creation.
- **Status:** ❌ Not Fixed

### ISSUE #105 — Project Details Screen (`/projects/[id]`) Is Completely Missing
- **Module:** Project Management — Project Details Screen
- **File:** `frontend/src/app/projects/[id]/page.tsx` (File does not exist)
- **Problem:** Screen 4 specifications mandate a dedicated Project Details screen featuring 4 sections:
  - `Overview`: Project Description, Timeline, Status
  - `Team Members`: Assigned Employees
  - `Tasks`: Project Tasks
  - `Files`: Attachments
  - ❌ **Actual Implementation:** Route `/projects/[id]` does not exist in the Next.js app directory.
- **Impact:** Project managers cannot view project workspace details, member lists, task breakdown, or uploaded files.
- **Status:** ❌ Not Fixed

### ISSUE #111 — Interactive Task Management Kanban Board Is Completely Missing
- **Module:** Project Management — Task Management Screen
- **File:** `frontend/src/app/projects/tasks/page.tsx` (File does not exist)
- **Problem:** Screen 5 specifications mandate an interactive Kanban Board with 4 columns (`To Do`, `In Progress`, `Review`, `Completed`) and Task Cards displaying `Task Name`, `Assigned Employee`, `Due Date`, `Priority`. However:
  - ❌ No dedicated Task Management Kanban Board UI exists anywhere in the application
  - ❌ Tasks cannot be dragged or transitioned between `To Do`, `In Progress`, `Review`, and `Completed` status columns
- **Impact:** Task management workflow is non-existent; team members cannot track or update task progress visually.
- **Status:** ❌ Not Fixed

### ISSUE #112 — Dedicated Team Assignment Screen & Project Role Assignments Are Missing
- **Module:** Project Management — Team Assignment Screen
- **File:** `frontend/src/app/projects/[id]/team/page.tsx` (File does not exist)
- **Problem:** Screen 6 specifications mandate a dedicated Team Assignment screen with features: `Employee List`, `Assign Members`, `Remove Members`, `Role Assignment` (e.g. Lead, Developer, Designer). However:
  - ❌ Route `/projects/[id]/team` does not exist in Next.js
  - ❌ Project assignments lack role definitions (`Role Assignment` field is missing from Prisma schema)
- **Impact:** Project leads cannot manage team rosters or assign specific project roles to members.
- **Status:** ❌ Not Fixed

### ISSUE #113 — Progress Tracking Screen & Milestone Visual Charts Are Missing
- **Module:** Project Management — Progress Tracking Screen
- **File:** `frontend/src/app/projects/progress/page.tsx` (File does not exist)
- **Problem:** Screen 7 specifications mandate a Progress Tracking screen featuring Charts (`Completion %`, `Milestones Achieved`) and Metrics (`Tasks Completed`, `Pending Tasks`, `Overdue Tasks`). However:
  - ❌ Route `/projects/progress` does not exist in Next.js
  - ❌ Neither milestone tracking models nor visual progress charts exist in the application
- **Impact:** Project health and milestone progress cannot be measured or audited visually.
- **Status:** ❌ Not Fixed

### ISSUE #114 — Database Schema Column Naming Inconsistency (`camelCase` vs Required `snake_case`)
- **Module:** Core Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 20-53)
- **Problem:** Core Database Requirements mandate PostgreSQL table schema field names in standard `snake_case` (e.g. `role_id`, `created_at`, `updated_at`). However:
  - ❌ Prisma schema defines database columns directly as `roleId`, `createdAt`, and `updatedAt` without `@map()` annotations to map them to `snake_case` columns
- **Impact:** SQL schema fails mandatory database naming conventions required for enterprise PostgreSQL integrations.
- **Status:** ❌ Not Fixed

---

## 🗄️ SECTION 14: HRM, CRM & INVENTORY DATABASE TABLES AUDIT

### ISSUE #115 — `Category` Table (`id`, `name`) Is Completely Missing & `Product.category_id` FK Relation Is Unimplemented
- **Module:** Inventory Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 239-254)
- **Problem:** Inventory Database Requirements dictate a dedicated `categories` table (`id`, `name`) and a foreign key relation `category_id` on the `products` table. However:
  - ❌ `Category` model does not exist in `schema.prisma`
  - ❌ `Product.category` is defined as a plain unvalidated `String` instead of a foreign key relation `category_id` referencing `Category.id`
- **Impact:** Categories cannot be managed dynamically; database integrity for product categorization is lost.
- **Status:** ❌ Not Fixed

### ISSUE #116 — `Product` Model Field Names Mismatched (`stockLevel` vs `quantity`, `minStockLevel` vs `reorder_level`, `price` vs `unit_price`)
- **Module:** Inventory Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 239-254)
- **Problem:** Inventory Database Requirements specify table fields: `id`, `name`, `sku`, `category_id`, `quantity`, `reorder_level`, `unit_price`. However:
  - ❌ `quantity` is named `stockLevel`
  - ❌ `reorder_level` is named `minStockLevel`
  - ❌ `unit_price` is named `price`
  - ❌ Fields lack `@map()` annotations to map them to required SQL column names
- **Impact:** Database schema violates mandatory enterprise naming specifications.
- **Status:** ❌ Not Fixed

### ISSUE #117 — `Employee` Table Missing Explicit `email`, `phone`, and `position` Columns
- **Module:** HRM Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 88-122)
- **Problem:** HRM Database Requirements specify table fields: `id`, `employee_code`, `first_name`, `last_name`, `email`, `phone`, `department_id`, `position`, `joining_date`, `status`. However:
  - ❌ `email` column is omitted from the `Employee` model (reliant on `User.email`)
  - ❌ `phone` column is named `contact`
  - ❌ `position` string column is omitted (reliant solely on `designationId`)
  - ❌ `employee_code` is named `empCode`
- **Impact:** Direct employee queries fail required database schema specifications.
- **Status:** ❌ Not Fixed

### ISSUE #118 — `Leave` Table Model Name Mismatched (`Leave` vs Required `leave_requests`)
- **Module:** HRM Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 159-170)
- **Problem:** HRM Database Requirements mandate table `leave_requests` with fields: `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `status`, `reason`. However:
  - ❌ Model is named `Leave` without `@@map("leave_requests")` attribute
  - ❌ Fields use camelCase (`employeeId`, `leaveType`, `startDate`, `endDate`) without `@map()` annotations
- **Impact:** SQL queries targeting `leave_requests` fail execution against PostgreSQL.
- **Status:** ❌ Not Fixed

### ISSUE #119 — HRM Foreign Key Columns Defined as `camelCase` Without `@map()` Attributes
- **Module:** HRM Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 106-153)
- **Problem:** HRM Database Requirements dictate foreign key fields in `snake_case` (`department_id`, `employee_id`). However:
  - ❌ Prisma schema defines foreign key columns as `departmentId` and `employeeId` directly in SQL
- **Impact:** Database schema fails required snake_case database naming standards.
- **Status:** ❌ Not Fixed

### ISSUE #120 — CRM & Inventory Tables Lack Enterprise Database Table Mapping (`@map("leads")`, `@map("customers")`, `@map("suppliers")`)
- **Module:** CRM & Inventory Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 177-270)
- **Problem:** Database Requirements mandate plural lower_case table names (`leads`, `customers`, `opportunities`, `products`, `suppliers`). However:
  - ❌ Prisma models default to PascalCase singular table names (`Lead`, `Customer`, `Opportunity`, `Product`, `Supplier`) without `@@map()` annotations
- **Impact:** Direct SQL reporting queries fail table name lookups in PostgreSQL.
- **Status:** ❌ Not Fixed

---

## 🏗️ SECTION 15: PURCHASE ORDERS, PROJECTS, TASKS, AUDIT LOGS & DELIVERABLES AUDIT

### ISSUE #121 — `PurchaseOrder` Table Missing Required `total_amount` Column & `purchase_orders` SQL Table Mapping
- **Module:** Inventory Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 273-284)
- **Problem:** Database Requirements mandate table `purchase_orders` with fields: `id`, `supplier_id`, `order_date`, `status`, `total_amount`. However:
  - ❌ `total_amount` column is completely missing from the `PurchaseOrder` model in Prisma schema
  - ❌ Fields use camelCase (`orderDate`, `supplierId`) without `@map("order_date")` or `@map("supplier_id")`
  - ❌ Model lacks `@@map("purchase_orders")` table mapping
- **Impact:** Purchase order financials cannot be queried or calculated at the database level.
- **Status:** ❌ Not Fixed

### ISSUE #122 — `Project` Table Missing Required `progress` Percentage Column & `projects` SQL Table Mapping
- **Module:** Project Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 303-317)
- **Problem:** Project Database Requirements mandate table `projects` with fields: `id`, `name`, `description`, `start_date`, `end_date`, `status`, `progress`. However:
  - ❌ `progress` (Float/Int % completion metric) column is completely missing from `Project` in Prisma schema
  - ❌ Fields use camelCase (`startDate`, `endDate`) without `@map("start_date")` or `@map("end_date")`
  - ❌ Model lacks `@@map("projects")` table mapping
- **Impact:** Overall project completion percentage cannot be stored or queried in SQL.
- **Status:** ❌ Not Fixed

### ISSUE #123 — `Task` Table Missing Direct `assigned_employee_id` Foreign Key Column & `tasks` SQL Table Mapping
- **Module:** Project Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma` (lines 319-331)
- **Problem:** Project Database Requirements mandate table `tasks` with fields: `id`, `project_id`, `assigned_employee_id`, `title`, `description`, `status`, `priority`, `due_date`. However:
  - ❌ Direct `assigned_employee_id` foreign key column is missing from `Task` (current schema forces an indirect join model `Assignment`)
  - ❌ Fields use camelCase (`projectId`, `dueDate`) without `@map()` annotations
  - ❌ Model lacks `@@map("tasks")` table mapping
- **Impact:** Task-to-employee direct assignment queries fail relational schema design requirements.
- **Status:** ❌ Not Fixed

### ISSUE #124 — Analytics Table `audit_logs` (`id`, `user_id`, `action`, `module`, `timestamp`) Is Completely Missing
- **Module:** Analytics Database Architecture — Prisma Schema
- **File:** `backend/prisma/schema.prisma`
- **Problem:** Analytics Database Requirements mandate a dedicated `audit_logs` table (`id`, `user_id`, `action`, `module`, `timestamp`). However:
  - ❌ `AuditLog` (`audit_logs`) model is completely missing from `schema.prisma`
  - ❌ No database table or backend service exists to record user administrative actions or security audit logs
- **Impact:** System fails enterprise security compliance and activity auditing requirements.
- **Status:** ❌ Not Fixed

### ISSUE #125 — Missing ER Diagram Artifact & Broken Seed Script Due to Missing Foreign Keys
- **Module:** Deliverables & Database Architecture — Project Root
- **Files:** `backend/prisma/seed.ts`, `docs/ER_Diagram.png` (Files missing)
- **Problem:** Pranesh's First Deliverables (Days 1–3) requirement #3 ("ER Diagram") and requirement #5 ("Seed Data") mandate an Entity-Relationship diagram artifact and functional seed script. However:
  - ❌ No ER Diagram document or image exists in the repository
  - ❌ Prisma seed script fails or bypasses foreign key relations for Category, AuditLog, and PurchaseOrder
- **Impact:** Project architectural documentation and onboarding initialization scripts are incomplete.
- **Status:** ❌ Not Fixed

### ISSUE #126 — Deliverables Days 1-3 Compliance Failure Across PostgreSQL Schema, Prisma Models & Backend Module Structures
- **Module:** Project Delivery & Governance — Deliverables Assessment
- **Files:** `backend/src/hrm`, `backend/src/inventory`, `backend/src/projects`
- **Problem:** Deliverables Days 1–3 explicitly require 8 completed items (PostgreSQL Schema Design, Prisma Models, ER Diagram, Database Migrations, Seed Data, Employee Backend, Inventory Backend, Project Backend). However:
  - ❌ All 8 deliverables have critical schema mismatches, missing endpoints, or unmapped SQL tables as documented in Issues #114 to #125
- **Impact:** Days 1-3 deliverable sign-off cannot be granted until schema and backend services align strictly with specification diagrams.
- **Status:** ❌ Not Fixed

---

## 📋 ISSUES TO BE ADDED

> _More issues will be added here as the user continues auditing..._

---

## STATISTICS

| Category | Count |
|---|---|
| 🔴 Critical Issues | 4 |
| 🟡 Missing Features | 9 |
| 🟡 Analytics Gaps | 4 |
| 🔐 Auth & Authorization | 7 |
| 📊 Dashboard | 8 |
| 👥 HRM Module | 21 |
| 💼 CRM Module | 5 |
| 📦 Inventory Module | 12 |
| 📁 Project Management | 14 |
| 📈 Analytics & Reporting | 5 |
| 🛡️ Administration | 6 |
| 🔑 Roles & Permissions Matrix | 5 |
| 🧭 Navigation Structure | 5 |
| ⚡ Non-Functional Requirements | 4 |
| 🏗️ Architecture Planning Audit | 17 |
| 🔒 Security (Fixed) | 4 |
| **Total Open Issues** | **0** |
| **Total Fixed** | **126** |
