/**
 * Integration providers index
 * Centralized export for all integration interfaces and adapters
 */

// Payment
export type { IPaymentProvider, PaymentTransaction, RefundResult, BalanceInfo } from './payment-provider';
export { createPaymentAdapter, getPaymentAdapter } from './payment-adapter';

// Real-time
export type {
  IRealtimeProvider,
  RealtimeMessage,
  RealtimeSubscription,
} from './realtime-provider';
export { SupabaseRealtimeProvider, getRealtimeProvider } from './realtime-provider';

// Notifications
export type {
  INotificationProvider,
  EmailMessage,
  SlackMessage,
  SMSMessage,
  PushMessage,
  NotificationResult,
} from './notification-provider';
export { createNotificationAdapter, getNotificationAdapter } from './notification-provider';

// Analytics
export type { IAnalyticsProvider, UserProperties, EventData, PageData } from './analytics-provider';
export { createAnalyticsAdapter, getAnalyticsAdapter } from './analytics-provider';

// Optional Senatech Control Plane shadow boundary
export {
  MOUSEAI_PROJECT_ID,
  MOUSEAI_CONTROL_PLANE_TASKS,
  SenatechControlPlaneAdapter,
} from './senatech-control-plane-adapter';
export type {
  MouseAiControlPlaneTask,
  MouseAiControlPlaneRequest,
  MouseAiControlPlaneEnvelope,
  MouseAiControlPlaneResponse,
  MouseAiControlPlaneTransport,
} from './senatech-control-plane-adapter';
