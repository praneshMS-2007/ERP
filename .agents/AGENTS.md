# Project Customization Rules & Conversation Memory

- **Primary Conversation Name**: Running The ERP Application
- **Conversation IDs**: 
  - `77680dde-92e8-4132-ac9a-dbb4c4eec7fd` (ERP Web Platform Core)
  - `f2b11916-b3f4-433d-94fa-3c6af916665f` (Mobile App Launch Plan & Daily Stand-ups)
- **Project**: Shuroq Enterprise ERP Platform
- **Team Member / Lead**: PRANESH M S (Software Engineering / Mobile Lead)

## Permanent Project Context
- **Frontend Live URL**: https://erp-eight-gules.vercel.app
- **Backend API Live URL**: https://shuroq-erp-api.onrender.com/api
- **Database**: PostgreSQL hosted on Supabase Cloud
- **Core Architecture Rules**: 
  - 100% real PostgreSQL models mapped via Prisma ORM (`snake_case` tables).
  - Double-entry finance debit/credit balancing enforced.
  - Dynamic role-based sidebar navigation filtering based on user permissions.
  - Real-time RAG AI Operations assistant.
  - Zero mock data policy across all 11 ERP modules.
  - Strict application-wide date formatting: `DD/MM/YYYY`.

## Mobile Application Context (Google Play Store Launch)
- **Architecture Choice**: Option C – Flutter Native Hybrid Shell (`flutter_inappwebview` v6+)
- **Package ID / App Identifier**: `com.shuroq.erp`
- **Reference Plan Document**: `C:\Users\Pranesh\Downloads\Shuroq_ERP_Mobile_App_Plan.pdf`
- **7-Day Implementation Schedule**:
  - **Day 1 (03/09/2026)**: Flutter project setup (`com.shuroq.erp`), native branded splash, `flutter_inappwebview` with hardware acceleration & secure cookie/session persistence. Working Android APK loading live ERP dashboard.
  - **Day 2 (04/09/2026)**: In-app web history back navigation (`PopScope`), `PullToRefreshController`, network watcher (`connectivity_plus`) with offline recovery screen ("Tap to Retry").
  - **Day 3 (05/09/2026)**: PDF/Excel download manager (payslips/reports to Android Downloads) & Camera/Gallery upload handlers.
  - **Day 4 (06/09/2026)**: Firebase Cloud Messaging (FCM) push notifications & Biometric app lock (`local_auth`).
  - **Day 5 (07/09/2026)**: Cross-device QA & layout verification (DD/MM/YYYY formatting, INR `₹` currency).
  - **Day 6 (08/09/2026)**: Production keystore signing (2048-bit RSA), R8/ProGuard shrinking, Play Store visual assets & Privacy Policy URL.
  - **Day 7 (09/09/2026)**: Google Play Console Internal Testing track upload (`.aab`) & standalone universal APK rollout for internal staff.
- **Pending Corporate Prerequisites**:
  - Google Play Console Developer Account ($25 one-time registration fee).
  - Privacy Policy URL (`/privacy`).

## Daily Stand-Up Reporting Template Format
Every stand-up update must follow this structure, use DD/MM/YYYY dates, and remain concise and precise:
```text
Daily Stand-up Update – [DD/MM/YYYY]
Team Member: PRANESH M S

1. Yesterday / Completed:
* [Key milestones finished]

2. Today / Planned:
* [Key execution items for the day]

3. Progress / Results:
* [Concrete deliverable or test verification results]

4. Blockers / Challenges:
* [Technical blockers or corporate prerequisites pending]

5. Tomorrow / Next Steps:
* [Next day milestone from the roadmap]

Team Summary:
* Team members active: 1
* Key progress: [1-2 line summary]
* Demos/meetings: [Demo readiness or meeting notes]
* Leads/business generated: N/A (Internal Platform Engineering)
* Pending items: [Action items pending review/setup]
* Support required: [Required lead approvals or account access]
```
