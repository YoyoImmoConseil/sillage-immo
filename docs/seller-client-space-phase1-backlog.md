# Seller Client Space Phase 1 Backlog

## Objective
Deliver the first production-grade seller portal slice that is useful before mandate, secure by design, and independent from unverified third-party capabilities.

This backlog now tracks the hardening of an already implemented core slice, not a greenfield build.

Phase 1 must ship:
- secure seller access
- invitation redemption
- seller dashboard shell
- advisor contact visibility
- latest valuation visibility
- seller project status visibility

Phase 1 must not depend on:
- MyNotary API
- SweepBright visit or visit-comment KPIs
- Loupe comparables as a mandatory feature
- WhatsApp-specific flows

## Current status in code

### Already present
- `/espace-client/invitation`
- `/espace-client/login`
- `/espace-client`
- `/espace-client/projets/[projectId]`
- seller auth callback via `app/espace-client/auth/confirm/route.ts`
- seller portal reads via `services/clients/seller-portal.service.ts`
- admin invitation creation and advisor assignment from the project detail page

### Remaining phase-1 hardening
- resend/copy/revoke invitation from admin without manual API inspection
- cleaner advisor contact and booking visibility in admin
- better seller landing page when multiple projects exist
- seller sign-out and session comfort
- explicit confirmation of the access model used in phase 1

## Phase 1 perimeter

### In scope
- invitation acceptance flow
- seller authentication binding to `client_profiles.auth_user_id`
- portal-safe access model
- seller dashboard route tree
- project summary card
- assigned advisor card
- latest valuation card
- project status timeline block
- generic contact actions: email, phone
- optional appointment CTA using a configured external link

### Out of scope
- signed mandate API retrieval
- seller document upload by the client
- reminder automation
- seller AI chat in the authenticated portal
- editorial/news module
- SweepBright operational KPIs
- household multi-member access

## Target routes

### Public routes
- `/espace-client/invitation`
  - validates token presence
  - displays invitation state: valid, expired, revoked, already used
  - starts auth handoff

- `/espace-client/login`
  - seller login entrypoint only
  - supports the chosen provider strategy for portal users

### Authenticated routes
- `/espace-client`
  - dashboard home
  - redirects to the active seller project if only one exists

- `/espace-client/projets/[projectId]`
  - seller project overview page

## Screens

### Screen 1: invitation acceptance
Purpose:
- convert an admin-generated invitation into a seller-bound authenticated profile

UI content:
- invitation validity state
- invited email
- provider guidance
- continue button

Required backend behavior:
- verify raw token against `client_project_invitations.token_hash`
- reject expired and revoked invites
- mark acceptance only after successful auth/profile binding

### Screen 2: seller dashboard home
Purpose:
- provide a useful landing page immediately after login

UI blocks:
- welcome block
- project status summary
- latest valuation summary
- assigned advisor summary
- next recommended action

Data sources:
- `client_profiles`
- `client_projects`
- `seller_projects`
- latest seller valuation source

### Screen 3: seller project overview
Purpose:
- provide one canonical page for the seller journey

UI blocks:
- project status timeline
- valuation block
- advisor contact block
- property summary block
- contact / appointment CTA block

Data sources:
- `seller_projects`
- `project_properties`
- `properties`
- `seller_project_advisor_history` for current assignment context
- `client_project_events`

## Backend backlog

### Access and identity
1. Create seller invitation redemption service
- validate token
- resolve `client_profile_id` and `client_project_id`
- expose invite status without exposing `token_hash`

2. Create seller auth linking flow
- separate seller callback logic from `app/auth/callback/route.ts`
- bind the authenticated seller to `client_profiles.auth_user_id`
- ensure invited email matches authenticated email

3. Add seller session guard
- server-side function to resolve current seller portal context
- reject users without linked `client_profile`

### Seller data read APIs
4. Create seller dashboard read service
- list accessible projects for the current seller
- include current seller project summary

5. Create seller project detail read service
- fetch project status
- fetch latest valuation
- fetch current advisor
- fetch linked property summary

6. Add appointment CTA resolution
- if a seller property or advisor has a valid booking URL, expose it
- otherwise expose a generic request-contact fallback

## Database backlog

### Must-do before portal rollout
1. Replace current blanket client-space RLS
- remove `using (true)` / `with check (true)` policies
- add row-scoped seller policies or keep portal reads behind a BFF until policies are ready

2. Add seller valuation history table
- `seller_project_valuations`
- one row per valuation snapshot
- fields:
  - `seller_project_id`
  - provider
  - valuation price, low, high
  - valuation payload metadata
  - created_at
  - source lead / source analysis ids

3. Extend invitation lifecycle
- support lookup by token hash
- support accepted-at update with atomic binding
- optionally add `accepted_by_auth_user_id`

### Optional in phase 1
4. Add advisor booking/contact metadata
- either extend `admin_profiles`
- or add advisor-contact metadata in `seller_projects.metadata`

## Admin backlog

### Required admin changes
1. Improve invitation operations
- resend invitation
- copy invite link
- display invite state cleanly in admin UI

2. Improve advisor visibility
- show advisor name, email, phone
- show whether a booking link is configured

3. Improve seller project status controls
- provide controlled status transitions
- ensure client-facing labels remain business-readable

4. Improve valuation visibility in admin
- display latest valuation freshness
- allow manual refresh from Loupe where applicable

## Suggested implementation slices

### Slice A: security foundation
- seller invitation validation
- seller auth callback
- seller portal guard
- safe access model

Definition of done:
- a valid invite can produce a linked seller account
- a non-invited seller cannot read portal data

Status:
- implemented in the current portal slice

### Slice B: dashboard shell
- `/espace-client`
- current project summary
- latest valuation
- current advisor

Definition of done:
- first login lands on a useful page
- no placeholder-only dashboard

Status:
- implemented, with UX hardening still useful for multi-project accounts

### Slice C: project overview
- `/espace-client/projets/[projectId]`
- project status
- property summary
- contact actions
- appointment CTA

Definition of done:
- seller can understand the state of their project and how to contact Sillage

Status:
- implemented, with appointment/contact polish still open

### Slice D: admin finishing work
- resend/copy invitation
- advisor contact display
- cleaner status handling

Definition of done:
- admin can operate the new portal flow without DevTools or manual DB work

Status:
- still the main remaining phase-1 gap

## Reuse map

### Reuse directly
- `services/clients/client-profile.service.ts`
- `services/clients/client-project.service.ts`
- `services/clients/seller-project.service.ts`
- `services/valuation/loupe-client.ts`
- `services/valuation/loupe-valuation.service.ts`
- `services/properties/sweepbright-sync.service.ts`

### Reuse with redesign
- `services/clients/client-project-invitation.service.ts`
- `db/migrations/20260318_015_create_client_space_lot1.sql`
- `app/auth/callback/route.ts`

### Do not reuse as-is
- current client-space RLS policies
- current public invite flow assumption
- any admin-only auth logic for seller access

## Blockers
- advisor booking URLs must be stored and exposed consistently
- stricter portal-safe RLS is available in repo, but the phase-1 runtime model should remain documented as BFF-first reads

## Recommendation
Continue from the current seller portal slice by finishing Slice D and the remaining UX hardening.

This is the highest-leverage move because it makes the existing portal operational without reopening out-of-scope topics:
- MyNotary
- seller document upload
- advanced CRM KPIs
- recurring automation

Once this hardening is complete, phase 2 can focus on valuation history, reactivation loops, and richer engagement.
