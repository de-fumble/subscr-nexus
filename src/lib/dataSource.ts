export type DashboardDataSource = "paystack" | "local";

const STORAGE_KEY = "dashboard_data_source";

export function getDashboardDataSource(): DashboardDataSource {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "local" || value === "paystack" ? value : "paystack";
  } catch {
    return "paystack";
  }
}

export function setDashboardDataSource(source: DashboardDataSource): void {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // no-op
  }
}
