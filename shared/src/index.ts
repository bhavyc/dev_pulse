// Enums
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MonitorStatus {
  PENDING = 'PENDING',
  UP = 'UP',
  DOWN = 'DOWN',
}

export enum IncidentStatus {
  INVESTIGATING = 'INVESTIGATING',
  IDENTIFIED = 'IDENTIFIED',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export enum AlertChannelType {
  EMAIL = 'EMAIL',
}

export enum AlertType {
  DOWN = 'DOWN',
  RECOVERY = 'RECOVERY',
}

// Data Transfer Objects & Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDto {
  id: string;
  name: string;
  slug: string;
  role: UserRole;
  createdAt: string;
}

export interface MonitorDto {
  id: string;
  teamId: string;
  name: string;
  url: string;
  httpMethod: HttpMethod;
  checkIntervalSeconds: number;
  timeoutSeconds: number;
  expectedStatusCodes: number[];
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  isActive: boolean;
  isPaused: boolean;
  currentStatus: MonitorStatus;
  lastCheckedAt?: string | null;
  uptimePercentage: number;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorCheckDto {
  id: string;
  monitorId: string;
  statusCode?: number | null;
  responseTimeMs?: number | null;
  isSuccess: boolean;
  errorMessage?: string | null;
  timingDetails?: {
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    total?: number;
  } | null;
  checkedAt: string;
}

export interface IncidentDto {
  id: string;
  monitorId: string;
  monitorName?: string;
  title: string;
  failureReason: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
  updates?: IncidentUpdateDto[];
}

export interface IncidentUpdateDto {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
}

export interface StatusPageDto {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  isPublic: boolean;
  monitors?: {
    monitorId: string;
    name: string;
    currentStatus: MonitorStatus;
    uptimePercentage: number;
    displayOrder: number;
  }[];
  activeIncidents?: IncidentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOverviewDto {
  totalMonitors: number;
  operationalServices: number;
  downServices: number;
  overallUptimePercentage: number;
  averageResponseTimeMs: number;
  totalIncidents: number;
  totalChecks24h: number;
  successfulChecks24h: number;
  failedChecks24h: number;
}
