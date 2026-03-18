/**
 * Admin pages – re-export for App and other consumers.
 * Route /admin uses default export (Dashboard).
 */
export { default } from './DashboardPage';
export { default as AdminDashboardPage } from './DashboardPage';
export { AdminUsersPage } from './UsersPage';
export { AdminCardsPage } from './CardsPage';
export { AdminCategoriesPage } from './CategoriesPage';
export { AdminOrdersPage } from './OrdersPage';
export { AdminBlindBoxesPage } from './BlindBoxesPage';
export { AdminBlindBoxDetailPage } from './BlindBoxDetailPage';
export { AdminRateConfigPage } from './RateConfigPage';
export { AdminWithdrawPage } from './WithdrawPage';
export { AdminTransactionsPage } from './TransactionsPage';
export { AdminReportPage } from './ReportPage';
export { AdminRolesPage } from './RolesPage';
