# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Module Design (module)

**Impact:** CRITICAL
**Description:** Server module architecture is the foundation of SpacetimeDB applications. Well-designed modules are easier to maintain, test, and scale.

## 2. Table Schema & Indexing (table)

**Impact:** CRITICAL
**Description:** Table design directly impacts query performance and data integrity. Proper indexing is essential for efficient subscriptions and queries.

## 3. Reducer Patterns (reducer)

**Impact:** HIGH
**Description:** Reducers are the only way to mutate state in SpacetimeDB. Correct reducer design ensures data consistency and proper authorization.

## 4. Subscription Optimization (subscription)

**Impact:** HIGH
**Description:** Subscriptions power real-time updates. Efficient subscription patterns minimize bandwidth and improve client performance.

## 5. Client State Management (client)

**Impact:** MEDIUM-HIGH
**Description:** Client-side state management handles connection lifecycle, optimistic updates, and error recovery for responsive applications.

## 6. React Integration (react)

**Impact:** MEDIUM
**Description:** React hooks and patterns for building reactive UIs with SpacetimeDB data and reducers.

## 7. TypeScript Patterns (ts)

**Impact:** MEDIUM
**Description:** TypeScript best practices for type safety and code quality in SpacetimeDB applications.

## 8. Real-time Sync (sync)

**Impact:** LOW-MEDIUM
**Description:** Advanced patterns for handling concurrent modifications, offline support, and real-time presence.
