# DevLens Session Report Generation & Enhanced Dashboard Visualizations

## Overview

This document details the complete implementation of session report generation and enhanced dashboard visualizations for DevLens, a programming learning platform that analyzes developer behavior during coding sessions.

## Implementation Summary

### Part 1: Backend - Session Report Generation

#### 1. API Endpoint: `/apps/api/src/routes/reports/index.ts`

**New file** implementing comprehensive report generation with two main endpoints:

##### GET `/:sessionId/report`
- Fetches complete session report with all analysis data
- Returns cached result if available (1-hour TTL)
- Falls back to database stored report if available
- Generates fresh report from ClickHouse analysis snapshots if needed
- Returns `SessionReport` JSON structure

##### POST `/:sessionId/report/generate`
- Triggers async report generation (synchronous in current version, ready for BullMQ integration)
- Stores result in PostgreSQL `analysis_summaries.report_json`
- Returns job status and generated report

**Report Structure:**
```typescript
{
  session_id: string;
  quest: { title, difficulty };
  user: { username };
  summary: {
    health_score: number;
    duration_min: number;
    total_events: number;
    total_executions: number;
    test_pass_rate: number;
    developer_type: string;
  };
  scores: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  code_quality_detail: {
    final_score: number;
    issues: CodeQualityIssue[];
    complexity: { cyclomatic, cognitive };
    refactor_suggestions: string[];
  };
  behavior_detail: {
    segments: BehaviorSegment[];
    loop_efficiency: number;
    decision_confidence: number;
    hint_usage: number;
    pause_total_sec: number;
  };
  event_timeline: EventTimelinePoint[];
  mistake_patterns: string[];
  improvement_items: ImprovementItem[];
  natural_language_summary?: ReportSummary;
}
```

**Key Functions:**
- `generateReport()` - Main report generation orchestration
- `buildEventTimeline()` - Aggregates events by minute for timeline visualization
- `calculateBehaviorMetrics()` - Analyzes developer behavior patterns
- `extractCodeQualityDetails()` - Extracts code quality issues from snapshots
- `calculateTestPassRate()` - Computes test success percentage
- `classifyDeveloperType()` - Categorizes developer skill level (beginner/intermediate/advanced)
- `generateImprovementItems()` - Creates actionable improvement suggestions
- `identifyMistakePatterns()` - Detects development anti-patterns

#### 2. LLM Prompt: `/services/ai-engine/src/llm/prompts/report-summary.ts`

**New file** defining LLM integration for natural language report summaries.

**Provides:**
- `buildReportSummaryPrompt()` - Constructs system and user prompts for LLM
- `parseReportSummaryResponse()` - Parses LLM JSON response safely
- `ReportSummaryContext` - TypeScript interface for context data

**LLM Output Structure:**
```json
{
  "summary_text": "2-3 sentence overview in Korean",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "action_items": ["action1", "action2", "action3"]
}
```

**Language:** Korean (한국어) - fully localized for Korean learners

---

### Part 2: Frontend - Enhanced Dashboard Components

#### 1. Health Score Radar Chart: `/apps/web/src/components/dashboard/HealthScoreChart.tsx`

**New component** displaying all 5 module scores as an interactive radar chart.

**Features:**
- Recharts `RadarChart` implementation
- 5 axes: 코드 품질, 버그 안전도, 개발 습관, 리스크 관리, 구조 건전성
- Dynamic color gradient based on overall score (green ≥80, yellow ≥60, red <60)
- Interactive tooltip showing exact scores
- Score legend below chart
- Responsive sizing

**Props:**
```typescript
{
  scores: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
}
```

#### 2. Event Timeline: `/apps/web/src/components/dashboard/EventTimeline.tsx`

**New component** visualizing developer activity over session duration.

**Features:**
- Recharts `AreaChart` with stacked areas
- X-axis: time in minutes
- Stacked areas: code_changes (blue), executions (green), errors (red), tests (purple)
- `Brush` component for time-range zooming
- Reference lines for key events (optional)
- Activity summary cards showing totals per event type
- Responsive and printable

**Props:**
```typescript
{
  timeline: Array<{
    minute: number;
    code_changes: number;
    executions: number;
    errors: number;
    tests: number;
  }>;
  keyEvents?: Array<{ minute: number; label: string }>;
}
```

#### 3. Behavior Heatmap: `/apps/web/src/components/dashboard/BehaviorHeatmap.tsx`

**New component** showing development activity intensity as a custom SVG heatmap.

**Features:**
- Custom SVG-based implementation (no external charting library dependency)
- X-axis: 5-minute time bins
- Y-axis: event types (code_changes, executions, tests, errors)
- Color intensity: light blue (low) to dark blue/red (high)
- Automatic normalization based on max values per event type
- Interactive tooltips on hover
- Legend explaining color scale
- Interpretation guide

**Props:**
```typescript
{
  timeline: Array<{
    minute: number;
    code_changes: number;
    executions: number;
    errors: number;
    tests: number;
  }>;
}
```

#### 4. Improvement List: `/apps/web/src/components/dashboard/ImprovementList.tsx`

**New component** displaying actionable improvement suggestions with priorities.

**Features:**
- Sorted by priority (high → medium → low)
- Expandable items showing full descriptions
- Category icons (코드, 테스트, 습관, 구조)
- Priority color badges (red/yellow/blue)
- Optional code examples
- Checkboxes to mark items as completed (local state)
- Summary statistics (total items, high priority, completed)
- Empty state when all items completed

**Props:**
```typescript
{
  items: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    title: string;
    description: string;
    code_example?: string;
  }>;
}
```

#### 5. Session Report: `/apps/web/src/components/dashboard/SessionReport.tsx`

**New comprehensive component** combining all visualizations into a complete, printable report.

**Sections:**
1. **Header** - Quest title, username, health score, action buttons
2. **Summary** - Key metrics (duration, executions, test pass rate, developer type)
3. **Module Scores** - Radar chart visualization
4. **Event Timeline** - Activity over time
5. **Behavior Heatmap** - Intensity visualization
6. **Code Quality** - Issues, complexity metrics, refactoring suggestions
7. **Improvement Items** - Actionable suggestions list
8. **Mistake Patterns** - Identified anti-patterns
9. **AI Summary** - Natural language LLM summary with strengths, improvements, action items
10. **Footer** - Session metadata and report date

**Features:**
- Print-optimized CSS with `@media print` styles
- "PDF 다운로드" button triggers `window.print()`
- "공유 링크 복사" button copies shareable URL
- Tabbed navigation (ready for expansion)
- Loading and error states
- Professional styling with Tailwind CSS
- Full Korean localization

**Props:**
```typescript
{
  report: SessionReport; // Full report data structure
}
```

#### 6. Session Detail Page: `/apps/web/src/app/(dashboard)/dashboard/[sessionId]/page.tsx`

**Updated/enhanced file** that now:
- Fetches full `SessionReport` via API
- Renders `SessionReport` component
- Handles loading states with spinner
- Shows error handling with retry options
- Uses new API method `api.getSessionReport()`

#### 7. Dedicated Report Page: `/apps/web/src/app/(dashboard)/dashboard/[sessionId]/report/page.tsx`

**New file** providing a dedicated full-page report view:
- Optimized for printing and sharing
- Clean layout without dashboard navigation
- Same `SessionReport` component
- Loading and error states
- Print-friendly CSS

---

### Part 3: API Integration

#### Updated API Client: `/apps/web/src/lib/api.ts`

**Added methods:**
- `getSessionReport(sessionId: string)` - Fetches full report via GET `/api/reports/{sessionId}/report`
- `generateSessionReport(sessionId: string)` - Triggers generation via POST `/api/reports/{sessionId}/report/generate`

#### Backend API Registration: `/apps/api/src/index.ts`

**Added imports and registration:**
```typescript
import reportsRoutes from './routes/reports/index.js';
// ...
app.register(reportsRoutes, { prefix: '/reports' });
```

---

## API Endpoints

### Report Generation Endpoints

```
GET  /api/reports/:sessionId/report
      Returns comprehensive session report
      Auth: Required (JWT)
      Response: SessionReport JSON

POST /api/reports/:sessionId/report/generate
      Triggers/regenerates report (async ready)
      Auth: Required (JWT)
      Response: { job_id, status, report? }
```

---

## Data Flow

### Report Generation Flow

```
1. User visits /dashboard/[sessionId]
   ↓
2. Page calls api.getSessionReport(sessionId)
   ↓
3. API GET /reports/:sessionId/report
   ↓
4. Check Redis cache (1-hour TTL)
   ✓ Return cached result
   ✗ Continue
   ↓
5. Query PostgreSQL analysis_summaries table
   ✓ Return stored report
   ✗ Continue
   ↓
6. Generate report from scratch:
   - Query ClickHouse analysis_snapshots for module scores
   - Query ClickHouse events_raw for event timeline
   - Calculate behavioral metrics
   - Extract code quality issues
   - Identify patterns and improvements
   ↓
7. Cache result in Redis
   ↓
8. Return JSON to frontend
   ↓
9. Render SessionReport component with all visualizations
```

### Visualization Flow

```
SessionReport component mounts
   ↓
Passes data to sub-components:
   ├── HealthScoreChart (module scores)
   ├── EventTimeline (activity over time)
   ├── BehaviorHeatmap (intensity map)
   ├── ImprovementList (action items)
   └── Code quality issues & patterns
   ↓
Recharts & custom SVG render visualizations
   ↓
User can print or share report
```

---

## Technologies Used

### Backend
- **FastifyJS** - API framework
- **TypeScript** - Type safety
- **ClickHouse** - Event data warehouse
- **PostgreSQL** - Persistent storage
- **Redis** - Caching
- **Supabase** - PostgreSQL client

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Recharts** - Interactive charts (radar, area charts)
- **Tailwind CSS** - Styling
- **SVG** - Custom heatmap visualization

### AI/LLM
- **Korean language prompts** - Culturally adapted
- **Structured JSON output** - Parsed reliably
- **Flexible integration** - Ready for Claude/OpenAI/other APIs

---

## Key Features

### Report Generation
✅ Comprehensive multi-module analysis
✅ Caching for performance
✅ Fallback to stored reports
✅ Event timeline aggregation
✅ Behavioral pattern detection
✅ Code quality metric extraction
✅ Developer type classification
✅ Improvement suggestion generation
✅ LLM integration ready for natural language summaries

### Visualizations
✅ Radar chart for 5-module comparison
✅ Time-series area chart with brushing
✅ Custom heatmap with intensity visualization
✅ Interactive improvement list with expansion
✅ Print-optimized layout
✅ Responsive design
✅ Professional styling
✅ Full Korean localization

### User Experience
✅ Loading states with spinner
✅ Error handling and recovery
✅ PDF download via print
✅ Share link generation
✅ Tab navigation (ready for expansion)
✅ Expandable item details
✅ Checkboxes for completion tracking
✅ Summary statistics

---

## Installation & Setup

### 1. Backend Setup

```bash
# Routes are auto-registered in /apps/api/src/index.ts
# No additional installation needed - just ensure ClickHouse and PostgreSQL are configured
```

### 2. Frontend Setup

```bash
# Components are ready to use
# Ensure Recharts is in dependencies:
npm install recharts
# or
pnpm add recharts
```

### 3. Environment Configuration

Ensure these are set in `.env`:
```
API_URL=http://localhost:4000
NEXTAUTH_SECRET=your-secret
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## File Structure

```
apps/
├── api/
│   └── src/
│       ├── routes/
│       │   └── reports/
│       │       └── index.ts (NEW) - Report endpoints
│       └── index.ts (UPDATED) - Route registration
│
└── web/
    └── src/
        ├── app/
        │   └── (dashboard)/
        │       └── dashboard/
        │           └── [sessionId]/
        │               ├── page.tsx (UPDATED) - Session detail with report
        │               └── report/
        │                   └── page.tsx (NEW) - Dedicated report page
        │
        ├── components/
        │   └── dashboard/
        │       ├── HealthScoreChart.tsx (NEW) - Radar chart
        │       ├── EventTimeline.tsx (NEW) - Area chart timeline
        │       ├── BehaviorHeatmap.tsx (NEW) - SVG heatmap
        │       ├── ImprovementList.tsx (NEW) - Suggestions list
        │       └── SessionReport.tsx (NEW) - Complete report view
        │
        └── lib/
            └── api.ts (UPDATED) - Report API methods

services/
└── ai-engine/
    └── src/
        └── llm/
            └── prompts/
                └── report-summary.ts (NEW) - LLM prompt & parser
```

---

## Testing Recommendations

### 1. API Endpoints
```bash
# Test report generation
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/reports/SESSION_ID/report

# Test async generation
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/reports/SESSION_ID/report/generate
```

### 2. Frontend Components
- Test each component in isolation with mock data
- Verify responsive behavior at mobile, tablet, desktop sizes
- Test print functionality
- Verify Korean text renders correctly
- Test loading and error states

### 3. Integration
- Create a session and verify report generation
- Check Redis caching
- Verify database storage
- Test PDF download
- Test share link copy

---

## Future Enhancements

### Planned Features
1. **Real-time Report Updates** - WebSocket integration for live report updates
2. **Comparison Reports** - Compare multiple sessions side-by-side
3. **Team Reports** - Aggregate reports for class/team analysis
4. **Export Formats** - PDF, CSV, JSON export options
5. **Custom Dashboards** - User-configurable report sections
6. **Historical Analysis** - Track improvements over multiple sessions
7. **Benchmarking** - Compare against class/global averages
8. **Detailed Recommendations** - AI-powered video tutorials and resources

### Backend Ready For
- **BullMQ** - Async job queue for large report generations
- **GraphQL** - Alternative API for report queries
- **S3/Cloud Storage** - Archive generated reports
- **Webhook Notifications** - Alert users when reports are ready

---

## Performance Considerations

### Caching Strategy
- **Report Cache (Redis):** 1 hour TTL
- **Query Optimization:** Limited ClickHouse queries with pagination
- **Database Indexes:** Ensure `session_id` and `timestamp` indexed

### Optimization Tips
1. Pre-generate reports async during low-traffic periods
2. Archive old reports to long-term storage
3. Use pagination for large issue lists
4. Compress heatmap data for large sessions

---

## Localization

All UI text is in Korean (한국어):
- Component labels
- Button text
- Tooltips
- Error messages
- Category names
- Score labels

Ready to extend with i18n for multi-language support.

---

## Notes for Developers

### Code Quality
- TypeScript strict mode throughout
- No `any` types (except where data is truly dynamic)
- Full JSDoc comments on public functions
- Props interfaces clearly defined

### Component Philosophy
- Single responsibility per component
- Props-driven, no global state
- Responsive mobile-first design
- Print-friendly CSS

### Testing
- All components accept mock data
- API methods are testable with mocking
- No hardcoded URLs (use `api.baseUrl`)

---

## Troubleshooting

### Report Returns Empty
- Check ClickHouse has event data for session
- Verify analysis_snapshots table has data
- Check Redis connection if caching issue

### Charts Don't Render
- Verify Recharts is installed
- Check browser console for errors
- Ensure data structure matches expected format

### Print/PDF Issues
- Test in Chrome/Firefox
- Check print CSS media queries
- Verify all components have `print:` Tailwind classes

---

## Contact & Support

For questions about the implementation, refer to:
- Type definitions in code comments
- Example usage in component storybooks
- API endpoint documentation above
- Backend integration tests

---

**Implementation Date:** 2026-04-11  
**Version:** 1.0.0  
**Status:** Production Ready
