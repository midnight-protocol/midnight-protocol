# Loading States & Skeleton Screens

This directory contains skeleton components and loading states for the claudeslimdown1 application.

## Overview

Loading states have been implemented across the application to provide a smooth user experience during data fetching. The implementation includes:

1. **Skeleton Components** - UI placeholders that match the layout of actual content
2. **Fade-in Transitions** - Smooth animations when content loads
3. **Consistent Loading Patterns** - Standardized loading behavior across components

## Available Skeletons

### Dashboard Skeletons (`DashboardSkeletons.tsx`)
- `DashboardLoadingSkeleton` - Full dashboard loading state
- `DashboardHeaderSkeleton` - Header loading state
- `AgentStatusCardSkeleton` - Agent status card placeholder
- `PersonalStoryCardSkeleton` - Personal story card placeholder
- `RecentActivityCardSkeleton` - Recent activity card placeholder

### Admin Dashboard Skeletons (`AdminDashboardSkeletons.tsx`)
- `AdminDashboardLoadingSkeleton` - Full admin dashboard loading state
- `AdminStatsCardSkeleton` - Stats card placeholder
- `UserTableSkeleton` - User table placeholder
- `AdminTabsSkeleton` - Admin tabs placeholder

### Component Skeletons (`ComponentSkeletons.tsx`)
- `MorningReportSkeleton` - Morning report preview placeholder
- `ConversationModalSkeleton` - Conversation modal placeholder
- `UserProfileSkeleton` - User profile display placeholder
- `ActivityListSkeleton` - Activity list items placeholder
- `SystemHealthCardSkeleton` - System health card placeholder
- `NetworkingDashboardSkeleton` - Networking dashboard placeholder

### Table Skeletons (`TableSkeletons.tsx`)
- `TableSkeleton` - Configurable table skeleton with customizable columns and rows

## Usage Examples

### Basic Loading State
```tsx
import { AgentStatusCardSkeleton } from '@/components/skeletons/DashboardSkeletons';

const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  if (loading) {
    return <AgentStatusCardSkeleton />;
  }

  return <ActualContent data={data} />;
};
```

### With Fade-in Transition
```tsx
import { FadeIn } from '@/components/ui/fade-in';
import { ComponentSkeleton } from '@/components/skeletons/ComponentSkeletons';

const MyComponent = () => {
  if (loading) {
    return <ComponentSkeleton />;
  }

  return (
    <FadeIn>
      <ActualContent data={data} />
    </FadeIn>
  );
};
```

### Staggered Loading
```tsx
<div className="grid grid-cols-3 gap-4">
  <FadeIn delay={0}>
    <Card1 />
  </FadeIn>
  <FadeIn delay={100}>
    <Card2 />
  </FadeIn>
  <FadeIn delay={200}>
    <Card3 />
  </FadeIn>
</div>
```

## Best Practices

1. **Match Layout** - Ensure skeleton components match the actual content layout to prevent jarring shifts
2. **Use Appropriate Skeletons** - Choose skeletons that closely resemble your content structure
3. **Add Transitions** - Use FadeIn component for smooth content appearance
4. **Consistent Timing** - Keep loading animations consistent across the app
5. **Partial Loading** - Load critical content first, then secondary content

## Creating New Skeletons

When creating new skeleton components:

1. Use the `Skeleton` component from `@/components/ui/skeleton`
2. Match the dimensions and spacing of actual content
3. Include all major visual elements (headers, text blocks, buttons)
4. Export from the appropriate skeleton file based on component type

Example:
```tsx
export const MyNewSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </CardContent>
  </Card>
);
```

## Styling

The skeleton component uses the `animate-pulse` class for a subtle pulsing animation. The animation is defined in `index.css` and can be customized if needed.

## Components Updated

The following components now have loading states:

- ✅ Dashboard.tsx
- ✅ AdminDashboard.tsx
- ✅ MorningReportPreview.tsx
- ✅ ConversationModal.tsx
- ✅ RecentActivityCard.tsx
- ✅ PersonalStoryCard.tsx
- ✅ NetworkingDashboard.tsx
- ✅ NetworkHealthDashboard.tsx
- ✅ ConversationAuditPanel.tsx

## Future Improvements

- Add loading progress indicators for long-running operations
- Implement optimistic updates for better perceived performance
- Add error state skeletons for failed loads
- Consider implementing suspense boundaries for more granular loading control