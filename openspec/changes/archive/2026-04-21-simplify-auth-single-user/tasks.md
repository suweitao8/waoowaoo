## 1. Root User Setup

- [x] 1.1 Create seed script or startup check to ensure root user exists in database
- [x] 1.2 Add environment variable flag `SINGLE_USER_MODE=true` to enable simplified auth

## 2. Auto-Login Implementation

- [x] 2.1 Create API endpoint `/api/auth/auto-login` to handle automatic root user authentication
- [x] 2.2 Update middleware to detect unauthenticated users and trigger auto-login
- [x] 2.3 Ensure auto-login preserves redirect to originally requested page

## 3. Hide Login/Registration Pages

- [x] 3.1 Update signin page to redirect to workspace when SINGLE_USER_MODE is enabled
- [x] 3.2 Update signup page to redirect to workspace when SINGLE_USER_MODE is enabled
- [x] 3.3 Update Navbar to hide signin/signup links for unauthenticated users when SINGLE_USER_MODE is enabled

## 4. Simplify Settings Page

- [x] 4.1 Remove billing records tab from profile page
- [x] 4.2 Remove billing-related sidebar navigation item
- [x] 4.3 Remove logout button from profile page sidebar
- [x] 4.4 Update profile page to show only API configuration section

## 5. Navigation Updates

- [x] 5.1 Ensure root path redirects directly to workspace (already done)
- [x] 5.2 Remove any remaining references to login/signup in navigation

## 6. Testing & Verification

- [x] 6.1 Test auto-login flow: access protected page -> auto-login -> access granted
- [x] 6.2 Test settings page: verify only API config is visible
- [x] 6.3 Test navigation: verify no login/signup links appear
- [x] 6.4 Test session persistence: refresh page maintains session
