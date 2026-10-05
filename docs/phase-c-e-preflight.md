# Phase C-E Preflight Validation Checklist

## Overview
Comprehensive pre-flight validation checklist for Phase C (Auth/Tenant/RLS testing) and Phase E (Provider testing). This document contains 100+ validation checkpoints to ensure system readiness before proceeding to Phase F.

## Phase C: Authentication, Tenant Context, and RLS Testing

### C.1 Supabase Database Configuration (15 checkpoints)

#### C.1.1 Environment Setup
- [ ] SUPABASE_URL environment variable is set
- [ ] SUPABASE_SERVICE_KEY environment variable is set
- [ ] Service key starts with correct prefix (`sbp_` or `svc_`)
- [ ] Supabase project is created and active
- [ ] Project region is appropriate for data residency requirements
- [ ] Supabase project has backup enabled
- [ ] Backup retention period is set to 30+ days
- [ ] Point-in-time recovery is enabled
- [ ] Network restrictions are configured if needed

#### C.1.2 Database Connection
- [ ] Admin client can connect to Supabase
- [ ] Connection pool is configured (default: 10 connections)
- [ ] Connection timeout is set (default: 30s)
- [ ] Connection logs show successful authentication
- [ ] Database version is supported (>= 13.x)
- [ ] PostGIS extension is installed if geospatial features needed
- [ ] UUID extension is enabled

### C.2 Authentication & User Management (18 checkpoints)

#### C.2.1 User Authentication
- [ ] Email/password authentication is configured
- [ ] Email confirmation is enabled
- [ ] Password reset functionality is working
- [ ] Session duration is set appropriately (default: 24 hours)
- [ ] JWT expiry is configured (default: 3600s)
- [ ] Refresh token strategy is implemented
- [ ] OAuth 2.0 providers are configured (if needed)
- [ ] Multi-factor authentication is available
- [ ] Rate limiting on login attempts is enabled
- [ ] Failed login attempts are logged

#### C.2.2 User Roles and Permissions
- [ ] User roles are defined in database
- [ ] Role hierarchy is implemented
- [ ] Role assignment logic is tested
- [ ] Permission matrix is documented
- [ ] Least privilege principle is applied
- [ ] Admin users have separate roles
- [ ] Service account roles are created
- [ ] Role inheritance rules are validated

### C.3 Tenant Context Management (16 checkpoints)

#### C.3.1 Tenant Setup
- [ ] Tenant table schema is correct
- [ ] Tenant creation logic is implemented
- [ ] Tenant initialization includes all required fields
- [ ] Tenant metadata is properly stored
- [ ] Tenant features flags are configured
- [ ] Tenant quotas are defined and enforced
- [ ] Tenant status tracking is implemented
- [ ] Tenant deactivation logic is implemented

#### C.3.2 Tenant Isolation
- [ ] Tenant_id is present in all tenant-scoped tables
- [ ] Tenant context is extracted from JWT
- [ ] Tenant context is validated on every request
- [ ] Cross-tenant queries return no data
- [ ] Tenant context persists through request lifecycle
- [ ] Service-to-service calls include tenant context
- [ ] Logging includes tenant_id for audit trail
- [ ] Error messages don't leak tenant information

### C.4 Row-Level Security (RLS) Policies (25 checkpoints)

#### C.4.1 RLS Enable and Foundation
- [ ] RLS is enabled on all tenant-scoped tables
- [ ] RLS is disabled on system tables (where appropriate)
- [ ] Policy enforcement is tested
- [ ] RLS performance impact is acceptable (<5% overhead)
- [ ] RLS policies are version controlled
- [ ] Policy rollback procedure is documented
- [ ] Policy changes trigger audit events

#### C.4.2 Read Policies
- [ ] Users can only read their own tenant data
- [ ] Public data is accessible (if applicable)
- [ ] Service accounts have appropriate read access
- [ ] Read policies are tested with test data
- [ ] Aggregate queries respect RLS boundaries
- [ ] Pagination works correctly with RLS
- [ ] Empty result sets are properly handled

#### C.4.3 Insert Policies
- [ ] Users can only insert records in their tenant
- [ ] Tenant_id is automatically set from context
- [ ] Insert validation prevents cross-tenant writes
- [ ] Audit trail captures inserts
- [ ] Duplicate detection works across tenants

#### C.4.4 Update Policies
- [ ] Users can only update records in their tenant
- [ ] Tenant_id cannot be changed via update
- [ ] Update history is tracked
- [ ] Concurrent updates are handled safely
- [ ] Soft deletes respect RLS policies

#### C.4.5 Delete Policies
- [ ] Users can only delete records in their tenant
- [ ] Delete audit trail is created
- [ ] Cascade delete policies are safe
- [ ] Deleted records cannot be accessed
- [ ] Soft delete is preferred over hard delete

#### C.4.6 Policy Testing
- [ ] RLS bypass works for admin/system accounts
- [ ] Policies are tested with multiple roles
- [ ] Edge cases are tested (null tenant_id, special roles)
- [ ] Performance tests include RLS overhead
- [ ] Policy changes don't break existing queries

### C.5 Database Migrations (12 checkpoints)

#### C.5.1 Migration Setup
- [ ] Migration system is configured (e.g., Supabase migrations)
- [ ] Migration naming convention is consistent
- [ ] Migration ordering is correct
- [ ] Rollback procedures are tested
- [ ] Migration history is tracked
- [ ] Initial schema migration is complete

#### C.5.2 Migration Validation
- [ ] All migrations run successfully
- [ ] Schema matches expected structure
- [ ] Indexes are created for performance
- [ ] Constraints are properly defined
- [ ] Triggers are functional
- [ ] Audit tables are initialized

### C.6 Security & Encryption (14 checkpoints)

#### C.6.1 Data Encryption
- [ ] Encryption at rest is enabled
- [ ] TLS 1.3 is used for data in transit
- [ ] Certificate is valid and non-expired
- [ ] Sensitive fields are encrypted (passwords, tokens)
- [ ] Encryption keys are managed by AWS KMS or similar
- [ ] Key rotation policy is documented
- [ ] Encryption algorithm is industry-standard (AES-256)

#### C.6.2 Credential Management
- [ ] Service keys are stored in secure environment
- [ ] API keys are not logged
- [ ] Keys are rotated on schedule
- [ ] Expired keys are removed
- [ ] Key access is logged
- [ ] Secrets are not committed to version control
- [ ] Secret scanning is enabled on repository

## Phase E: Provider Testing

### E.1 Inngest Configuration (12 checkpoints)

#### E.1.1 Inngest Setup
- [ ] INNGEST_EVENT_KEY environment variable is set
- [ ] Event key format is correct (`signkey-...`)
- [ ] Inngest SDK is installed and compatible
- [ ] Event signing is enabled
- [ ] Inngest dashboard is accessible
- [ ] Event retention is configured

#### E.1.2 Event Publishing
- [ ] Events publish successfully
- [ ] Event batching is working
- [ ] Event schema validation passes
- [ ] Events appear in Inngest dashboard
- [ ] Event replay is functional
- [ ] Dead letter queue is configured

### E.2 OpenAI API (10 checkpoints)

#### E.2.1 OpenAI Configuration
- [ ] OPENAI_API_KEY environment variable is set
- [ ] API key format is correct (`sk-...`)
- [ ] OpenAI SDK version is up-to-date
- [ ] API endpoint is reachable
- [ ] Rate limiting is respected
- [ ] API quotas are set appropriately

#### E.2.2 OpenAI Functionality
- [ ] Completion requests work
- [ ] Chat completion works
- [ ] Embedding requests work
- [ ] Error handling is implemented
- [ ] Timeout handling is implemented

### E.3 Anthropic API (10 checkpoints)

#### E.3.1 Anthropic Configuration
- [ ] ANTHROPIC_API_KEY environment variable is set
- [ ] API key format is correct (`sk-ant-...`)
- [ ] Anthropic SDK version is up-to-date
- [ ] API endpoint is reachable
- [ ] Rate limiting is respected
- [ ] API quotas are set appropriately

#### E.3.2 Anthropic Functionality
- [ ] Message requests work
- [ ] Streaming responses work
- [ ] Vision capabilities work (if needed)
- [ ] Error handling is implemented
- [ ] Timeout handling is implemented

### E.4 Ollama Configuration (8 checkpoints)

#### E.4.1 Ollama Setup
- [ ] OLLAMA_BASE_URL environment variable is set
- [ ] Ollama server is running
- [ ] Network connectivity is verified
- [ ] Models are downloaded and available

#### E.4.2 Ollama Functionality
- [ ] Model inference works
- [ ] Response streaming works
- [ ] Error handling is implemented
- [ ] Fallback logic is in place

### E.5 Provider Integration Testing (15 checkpoints)

#### E.5.1 Integration Tests
- [ ] Each provider has unit tests
- [ ] Error scenarios are tested
- [ ] Timeout scenarios are tested
- [ ] Authentication failures are handled
- [ ] Invalid request handling is tested

#### E.5.2 Provider Switching
- [ ] Providers can be switched at runtime
- [ ] Fallback providers work
- [ ] Provider selection logic is tested
- [ ] Provider performance is monitored
- [ ] Health checks are implemented for each provider

## General Validation (26 checkpoints)

### G.1 Credential Validation
- [ ] All required credentials are provided
- [ ] Credentials have valid formats
- [ ] Credentials grant necessary permissions
- [ ] Credentials are not expired
- [ ] Credentials are not shared
- [ ] Credential rotation schedule is defined
- [ ] Backup credentials are available

### G.2 Network and Connectivity
- [ ] Firewalls allow required connections
- [ ] VPN is connected (if required)
- [ ] Proxy settings are correct
- [ ] DNS resolution works
- [ ] Latency to all providers is acceptable
- [ ] Bandwidth is sufficient

### G.3 Logging and Monitoring
- [ ] Structured logging is configured
- [ ] Log level is appropriate
- [ ] Logs are queryable
- [ ] Sensitive data is not logged
- [ ] Log retention is configured
- [ ] Alerts are configured for errors
- [ ] Metrics are exported

### G.4 Documentation
- [ ] Credentials are documented (without exposing them)
- [ ] Configuration is documented
- [ ] Known issues are documented
- [ ] Troubleshooting guide is available
- [ ] Emergency contacts are listed

### G.5 Sign-off
- [ ] All checkpoints are completed
- [ ] Any failures are documented
- [ ] Mitigations for failures are in place
- [ ] Sign-off from security team is obtained
- [ ] Sign-off from operations team is obtained

## Preflight Status

**Date Started:** ________________
**Date Completed:** ________________

**Completed By:** ________________ (Name)
**Title:** ________________
**Signature:** ________________

**Reviewed By:** ________________ (Name)
**Title:** ________________
**Signature:** ________________

### Total Checkpoints: 146
**Checkpoints Passed:** _______ / 146
**Checkpoints Failed:** _______

**Status:** 
- [ ] All checkpoints passed - Ready for Phase F
- [ ] Some checkpoints failed - Review required
- [ ] Major failures - Do not proceed to Phase F

**Comments:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

**Action Items for Failed Checkpoints:**
1. ___________________________________
2. ___________________________________
3. ___________________________________
4. ___________________________________
5. ___________________________________

---

**Approval to Proceed to Phase F:**

Authorized by: ________________
Date: ________________
Signature: ________________
