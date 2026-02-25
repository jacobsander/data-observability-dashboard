# 📦 Web Tracking Data Quality Dashboard - Complete Code Bundle

## 🎯 Project Overview

A React-based monitoring dashboard for tracking data quality with animated UI, drill-down capabilities, and dark gradient theme.

### Key Features:
- Overall health score with dynamic color-coded indicators
- Event-level quality metrics with trend indicators
- Drill-down to parameter-level quality details
- Smooth animations and hover effects
- Dark gradient background theme

---

## 🛠 Tech Stack

- **React** with TypeScript
- **React Router** (`react-router` package - NOT `react-router-dom`)
- **Motion** (`motion/react`) for animations
- **Lucide React** for icons
- **Tailwind CSS v4** with dark slate theme

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router": "^7.13.0",
    "motion": "^12.23.24",
    "lucide-react": "^0.487.0"
  }
}
```

**Installation command:**
```bash
npm install react-router motion lucide-react
```

---

## 📁 File Structure

```
src/
└── app/
    ├── App.tsx
    ├── routes.ts
    ├── pages/
    │   ├── Dashboard.tsx
    │   └── EventDetail.tsx
    └── components/
        ├── HealthScore.tsx
        ├── EventScorecard.tsx
        └── ParameterQualityCard.tsx
```

---

## 💻 Complete Code Files

### 1. `/src/app/App.tsx`

```tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}
```

---

### 2. `/src/app/routes.ts`

```tsx
import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { EventDetail } from "./pages/EventDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/event/:eventName",
    Component: EventDetail,
  },
]);
```

---

### 3. `/src/app/pages/Dashboard.tsx`

```tsx
import { HealthScore } from "../components/HealthScore";
import { EventScorecard } from "../components/EventScorecard";

export function Dashboard() {
  // Mock data for the dashboard
  const overallHealthScore = 87;
  
  const eventData = [
    { name: "session_start", percentage: 95.2, previousPercentage: 93.8 },
    { name: "page_view", percentage: 92.7, previousPercentage: 94.1 },
    { name: "item_view", percentage: 88.4, previousPercentage: 85.2 },
    { name: "add_to_cart", percentage: 79.6, previousPercentage: 81.3 },
    { name: "begin_checkout", percentage: 84.3, previousPercentage: 82.7 },
    { name: "purchase", percentage: 81.9, previousPercentage: 80.5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Web Tracking Data Quality Dashboard</h1>
          <p className="mt-2 text-slate-300">Monitor the health and quality of your tracking events</p>
        </div>

        {/* Overall Health Score */}
        <div className="mb-8">
          <HealthScore score={overallHealthScore} />
        </div>

        {/* Event Scorecards */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Event Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventData.map((event, index) => (
              <EventScorecard
                key={event.name}
                eventName={event.name}
                percentage={event.percentage}
                previousPercentage={event.previousPercentage}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
```

---

### 4. `/src/app/pages/EventDetail.tsx`

```tsx
import { useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { ParameterQualityCard } from "../components/ParameterQualityCard";

export function EventDetail() {
  const { eventName } = useParams<{ eventName: string }>();

  // Mock parameter quality data
  const parameterData: Record<string, { name: string; quality: number; coverage: number }[]> = {
    session_start: [
      { name: "environment", quality: 98.5, coverage: 99.2 },
      { name: "page_type", quality: 94.3, coverage: 96.7 },
      { name: "channel_flow", quality: 89.7, coverage: 92.1 },
      { name: "language", quality: 97.2, coverage: 98.8 },
    ],
    page_view: [
      { name: "environment", quality: 96.8, coverage: 98.5 },
      { name: "page_type", quality: 91.2, coverage: 94.3 },
      { name: "channel_flow", quality: 88.4, coverage: 90.7 },
      { name: "language", quality: 95.6, coverage: 97.2 },
    ],
    item_view: [
      { name: "environment", quality: 92.3, coverage: 95.8 },
      { name: "page_type", quality: 87.5, coverage: 89.2 },
      { name: "channel_flow", quality: 84.2, coverage: 86.9 },
      { name: "language", quality: 91.8, coverage: 94.5 },
    ],
    add_to_cart: [
      { name: "environment", quality: 85.4, coverage: 88.1 },
      { name: "page_type", quality: 78.9, coverage: 82.3 },
      { name: "channel_flow", quality: 74.6, coverage: 77.2 },
      { name: "language", quality: 83.2, coverage: 86.7 },
    ],
    begin_checkout: [
      { name: "environment", quality: 89.7, coverage: 92.4 },
      { name: "page_type", quality: 82.3, coverage: 85.9 },
      { name: "channel_flow", quality: 79.8, coverage: 83.1 },
      { name: "language", quality: 87.5, coverage: 90.2 },
    ],
    purchase: [
      { name: "environment", quality: 86.9, coverage: 89.8 },
      { name: "page_type", quality: 80.7, coverage: 84.2 },
      { name: "channel_flow", quality: 77.3, coverage: 80.5 },
      { name: "language", quality: 85.1, coverage: 88.6 },
    ],
  };

  const parameters = parameterData[eventName || ""] || [];
  const avgQuality = parameters.reduce((sum, p) => sum + p.quality, 0) / parameters.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white capitalize">
            {eventName?.replace(/_/g, " ")} Event
          </h1>
          <p className="mt-2 text-slate-300">Parameter quality breakdown</p>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Average Parameter Quality</p>
              <p className="text-4xl font-bold text-white">{avgQuality.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Total Parameters</p>
              <p className="text-4xl font-bold text-white">{parameters.length}</p>
            </div>
          </div>
        </div>

        {/* Parameter Quality Cards */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Parameter Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parameters.map((param) => (
              <ParameterQualityCard
                key={param.name}
                parameterName={param.name}
                quality={param.quality}
                coverage={param.coverage}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 5. `/src/app/components/HealthScore.tsx`

```tsx
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface HealthScoreProps {
  score: number;
}

export function HealthScore({ score }: HealthScoreProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 90) {
      return {
        label: "Excellent",
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else if (score >= 70) {
      return {
        label: "Good",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else if (score >= 50) {
      return {
        label: "Warning",
        icon: AlertCircle,
        color: "text-yellow-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else {
      return {
        label: "Critical",
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    }
  };

  const status = getHealthStatus(score);
  const Icon = status.icon;

  return (
    <div className={`${status.bgColor} ${status.borderColor} border-2 rounded-lg p-8 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-2">Overall Health Score</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-bold text-green-500 transition-transform duration-300 hover:scale-110 inline-block cursor-default">{score}%</span>
            <Icon className={`${status.color} w-12 h-12`} />
          </div>
          <p className={`${status.color} mt-2 font-medium`}>{status.label}</p>
        </div>
      </div>
    </div>
  );
}
```

---

### 6. `/src/app/components/EventScorecard.tsx`

```tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";

interface EventScorecardProps {
  eventName: string;
  percentage: number;
  previousPercentage?: number;
  index?: number;
}

export function EventScorecard({ eventName, percentage, previousPercentage, index = 0 }: EventScorecardProps) {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-emerald-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrend = () => {
    if (!previousPercentage) return null;
    
    const diff = percentage - previousPercentage;
    if (diff > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-500",
        value: `+${diff.toFixed(1)}%`,
      };
    } else if (diff < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-500",
        value: `${diff.toFixed(1)}%`,
      };
    } else {
      return {
        icon: Minus,
        color: "text-gray-400",
        value: "0%",
      };
    }
  };

  const trend = getTrend();
  const TrendIcon = trend?.icon;

  return (
    <Link to={`/event/${eventName}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        whileHover={{ scale: 1.05 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm hover:shadow-lg hover:border-slate-600 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">{eventName}</h3>
          {trend && TrendIcon && (
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
          {percentage}%
        </div>
        <div className="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${
              percentage >= 90
                ? "bg-green-500"
                : percentage >= 70
                ? "bg-emerald-500"
                : percentage >= 50
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </motion.div>
    </Link>
  );
}
```

---

### 7. `/src/app/components/ParameterQualityCard.tsx`

```tsx
interface ParameterQualityCardProps {
  parameterName: string;
  quality: number;
  coverage: number;
}

export function ParameterQualityCard({ parameterName, quality, coverage }: ParameterQualityCardProps) {
  const getQualityColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-400";
    if (percentage >= 70) return "text-emerald-400";
    if (percentage >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
      <h3 className="text-lg font-medium text-white mb-4 capitalize">
        {parameterName.replace(/_/g, " ")}
      </h3>
      
      <div className="space-y-4">
        {/* Quality Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Quality</span>
            <span className={`font-bold ${getQualityColor(quality)}`}>
              {quality.toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getBarColor(quality)} transition-all duration-500`}
              style={{ width: `${quality}%` }}
            />
          </div>
        </div>

        {/* Coverage Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Coverage</span>
            <span className={`font-bold ${getQualityColor(coverage)}`}>
              {coverage.toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getBarColor(coverage)} transition-all duration-500`}
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ⚠️ Important Notes for Cursor

1. **Use `react-router` NOT `react-router-dom`** - This is critical for compatibility
2. **Import Motion correctly**: `import { motion } from "motion/react"`
3. **Tailwind CSS v4** is assumed - ensure Tailwind is configured in your project
4. **All data is currently mocked** - Replace with real API calls as needed

---

## 🎨 Design System

**Color Scheme:**
- Background: Dark gradient (`from-slate-900 via-slate-800 to-slate-900`)
- Cards: `bg-slate-800` with `border-slate-700`
- Text: `text-white`, `text-slate-300`, `text-slate-400`
- Status Colors:
  - Excellent/Good: `green-500`, `emerald-500`
  - Warning: `yellow-500`
  - Critical: `red-500`

**Animations:**
- Staggered fade-in on page load (0.1s delay per card)
- Scale on hover (1.05x for cards, 1.10x for health score)
- Smooth transitions (300-500ms)

---

## 🚀 Next Steps for Development

1. **Replace mock data** with real API endpoints
2. **Add authentication** if needed
3. **Implement time-range filters** for historical data
4. **Add data export functionality** (CSV/PDF)
5. **Create additional drill-down levels** for more granular data
6. **Add real-time updates** with WebSockets
7. **Implement alerting** for critical health scores

---

## 📊 Data Structure Reference

### Event Data Structure
```typescript
interface EventData {
  name: string;
  percentage: number;
  previousPercentage?: number;
}
```

### Parameter Data Structure
```typescript
interface ParameterData {
  name: string;
  quality: number;
  coverage: number;
}
```

---

## 🎯 User Journey

1. **Landing on Dashboard**
   - User sees overall health score at the top
   - 6 event cards display below with quality percentages
   - Cards animate in with stagger effect
   - Hover over cards to see scale animation

2. **Drill-down to Event Details**
   - Click any event card to navigate to detail page
   - See average parameter quality and total parameter count
   - View individual parameter quality and coverage metrics
   - Use back button to return to dashboard

---

## 🔧 Customization Guide

### Adding New Events
Edit `Dashboard.tsx` and add to the `eventData` array:
```tsx
{ name: "new_event", percentage: 85.0, previousPercentage: 82.0 }
```

### Adding New Parameters
Edit `EventDetail.tsx` and add to the `parameterData` object:
```tsx
new_event: [
  { name: "param1", quality: 90.0, coverage: 95.0 },
  { name: "param2", quality: 85.0, coverage: 88.0 },
]
```

### Changing Health Score Thresholds
Edit `HealthScore.tsx` and modify the `getHealthStatus` function conditions.

### Modifying Color Scheme
Update Tailwind classes throughout components. Main colors to change:
- `slate-900`, `slate-800`, `slate-700` (backgrounds)
- `green-500`, `emerald-500`, `yellow-500`, `red-500` (status colors)

---

Good luck building in Cursor! 🚀
