# Feature Specification: Authentication & Login Screen

Based on reference screenshot [`reference/screenshots/login.png`](file:///home/nauer/Area51/rabbitdash/reference/screenshots/login.png).

---

## 1. Classic Login Screen Overview

The classic RabbitMQ Management UI presents an unstyled, minimalist centered authentication prompt when an unauthenticated user accesses the web interface.

### 1.1 Visual Elements & Form Controls
- **Branding**: Official RabbitMQ orange & gray logo centered above the form.
- **Form Fields**:
  - `Username:` Text input field with red asterisk (`*`) indicating required field.
  - `Password:` Masked password input field with red asterisk (`*`).
  - Browser password manager integration (1Password / Bitwarden / browser autofill badges).
- **Actions**:
  - `Login` button: Centered dark gray button (`#4d4d4d`) submitting credentials.
- **Behavior & Flow**:
  - Validates credentials against the RabbitMQ HTTP API endpoint `/api/whoami` using HTTP Basic Authentication (`Authorization: Basic <base64>`) or session cookie.
  - Upon success: Redirects user to the Overview dashboard (`/#/`).
  - Upon failure: Displays inline error message (e.g., `User can not log in` or HTTP 401 unauthorized alert).

---

## 2. Authentication Mechanics in RabbitMQ

### 2.1 Backend Auth Verification
1. **Endpoint**: `GET /api/whoami`
2. **Request Headers**: `Authorization: Basic base64(username:password)`
3. **Response Payload**:
```json
{
  "name": "admin",
  "tags": ["administrator"],
  "auth_backend": "rabbit_auth_backend_internal"
}
```
4. **Session Persistence**:
   - Classic UI uses HTTP Basic Auth headers or basic auth session cookies (`auth` cookie).
   - In modern single-page apps (SPAs), credentials or tokens are securely stored in session storage or HTTP-only cookies with automatic token refresh.

### 2.2 Permissions Verification on Login
Once authenticated, the UI queries the user's permissions and tags:
- `administrator`: Full access to all tabs (Overview, Connections, Channels, Exchanges, Queues, Admin).
- `monitoring`: Can view all nodes, connections, and metrics, but cannot modify policies or users.
- `policymaker`: Can view and modify policies and limits.
- `management`: Standard access; restricted to authorized virtual hosts only.
- `none`: Denied access to the management UI.

---

## 3. RabbitDash Modern Login & Connection Experience

The modern login screen provides an enterprise-ready, developer-friendly gateway to one or more RabbitMQ instances.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      [ RabbitDash Logo ]                    │
│                 Modern RabbitMQ Control Plane               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Cluster Connection                                    │  │
│  │ [ Production Cluster (https://rmq.prod.acme.com)   ▼ ]│  │
│  │                                                       │  │
│  │ Server Endpoint                                       │  │
│  │ [ https://rmq.prod.acme.com:15672                   ] │  │
│  │                                                       │  │
│  │ Username                                              │  │
│  │ [ admin                                             ] │  │
│  │                                                       │  │
│  │ Password                                              │  │
│  │ [ ••••••••••••••••••••••                          👁 ] │  │
│  │                                                       │  │
│  │ [x] Remember this cluster profile                     │  │
│  │                                                       │  │
│  │ [               Sign In to RabbitMQ                 ] │  │
│  │                                                       │  │
│  │ ──────────────────────  OR  ────────────────────────  │  │
│  │                                                       │  │
│  │ [ Single Sign-On (OIDC / OAuth2 / Okta)             ] │  │
│  │                                                       │  │
│  │ Quick Connect:                                        │  │
│  │ [ Local Dev (:15672) ]   [ Staging ]   [ Demo Mode ]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│       RabbitMQ 3.12+ Compatible • TLS 1.3 Supported         │
└─────────────────────────────────────────────────────────────┘
```

### Modern Features & Enhancements

1. **Multi-Cluster Connection Profiles**:
   - Unlike the old UI (which can only point to the host serving the static files), RabbitDash can connect to:
     - Local Docker / Dev instances (`http://localhost:15672`).
     - Remote staging and production clusters via configured proxy or direct CORS-enabled endpoints.
     - Saved connection profiles stored locally with encrypted credentials or API tokens.
2. **Interactive Connection Tester**:
   - "Test Connection" indicator before submitting, checking network reachability and latency to the target RabbitMQ host.
3. **SSO / OAuth2 / OIDC Integration**:
   - Native support for modern RabbitMQ OAuth2 plugins (UAA, Keycloak, Okta, Azure AD).
4. **Password Visibility Toggle & Strength**:
   - Eye icon to reveal/mask password; inline error handling with shake animation on invalid credentials.
5. **Offline Demo Mode**:
   - One-click "Explore Demo Mode" using mock data, allowing frontend exploration without an active RabbitMQ server running.
6. **Dark / Light Theme on Auth Screen**:
   - Respects OS color scheme with manual override toggle on the login page.
