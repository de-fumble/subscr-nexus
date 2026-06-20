export type SuperadminDepartment = 'auditor' | 'it_admin' | 'marketing';

export const DEPARTMENT_LABELS: Record<SuperadminDepartment, string> = {
  auditor: 'Auditor',
  it_admin: 'IT Admin',
  marketing: 'Marketing',
};

export const DEPARTMENT_DESCRIPTIONS: Record<SuperadminDepartment, string> = {
  auditor: 'Audit logs, payouts, KYC, and accounting procedures',
  it_admin: 'API keys, licenses, and platform integrations',
  marketing: 'Onboarding analytics and email campaigns via Resend',
};

/** Routes only accessible to full superadmins */
export const FULL_SUPERADMIN_ROUTES = [
  '/superadmin/team',
  '/superadmin/deletions',
  '/superadmin/appeals',
  '/superadmin/defaulters',
  '/superadmin/name-changes',
] as const;

/** Route → departments that may access it (full superadmin always allowed) */
export const ROUTE_DEPARTMENTS: Record<string, SuperadminDepartment[]> = {
  '/superadmin': ['auditor', 'it_admin', 'marketing'],
  '/superadmin/profile': ['auditor', 'it_admin', 'marketing'],
  '/superadmin/organizations': ['auditor'],
  '/superadmin/organization': ['auditor', 'it_admin'],
  '/superadmin/payouts': ['auditor'],
  '/superadmin/logs': ['auditor'],
  '/superadmin/kyc': ['auditor'],
  '/superadmin/api-keys': ['it_admin'],
  '/superadmin/licenses': ['it_admin'],
  '/superadmin/onboarding': ['marketing'],
  '/superadmin/email-history': ['marketing'],
};

/** Edge function actions → departments allowed to invoke them */
export const ACTION_DEPARTMENTS: Record<string, SuperadminDepartment[]> = {
  get_platform_stats: ['auditor', 'it_admin', 'marketing'],
  get_all_organizations: ['auditor', 'it_admin'],
  get_organization_details: ['auditor', 'it_admin'],
  get_organization_analytics: ['auditor'],
  get_payout_requests: ['auditor'],
  approve_payout: ['auditor'],
  reject_payout: ['auditor'],
  complete_payout: ['auditor'],
  get_eligible_payouts: ['auditor'],
  get_audit_logs: ['auditor'],
  send_email: ['marketing'],
  update_api_keys: ['it_admin'],
};

export function matchRoutePermission(pathname: string): string | null {
  if (ROUTE_DEPARTMENTS[pathname]) return pathname;

  // Dynamic routes e.g. /superadmin/organization/:orgId
  if (pathname.startsWith('/superadmin/organization/')) {
    return '/superadmin/organization';
  }

  return null;
}

export function canAccessRoute(
  pathname: string,
  isSuperadmin: boolean,
  departments: SuperadminDepartment[],
): boolean {
  if (isSuperadmin) return true;

  if (FULL_SUPERADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return false;
  }

  const routeKey = matchRoutePermission(pathname);
  if (!routeKey) return false;

  const allowed = ROUTE_DEPARTMENTS[routeKey];
  if (!allowed) return false;

  return departments.some((d) => allowed.includes(d));
}

export function canPerformAction(
  action: string,
  isSuperadmin: boolean,
  departments: SuperadminDepartment[],
): boolean {
  if (isSuperadmin) return true;

  const allowed = ACTION_DEPARTMENTS[action];
  if (!allowed) return false;

  return departments.some((d) => allowed.includes(d));
}

export function getAccessibleRoutes(
  isSuperadmin: boolean,
  departments: SuperadminDepartment[],
): string[] {
  if (isSuperadmin) {
    return [
      ...Object.keys(ROUTE_DEPARTMENTS),
      ...FULL_SUPERADMIN_ROUTES,
      '/superadmin/team',
    ];
  }

  return Object.entries(ROUTE_DEPARTMENTS)
    .filter(([, depts]) => departments.some((d) => depts.includes(d)))
    .map(([route]) => route);
}

export function canSendEmail(
  isSuperadmin: boolean,
  departments: SuperadminDepartment[],
): boolean {
  return canPerformAction('send_email', isSuperadmin, departments);
}
