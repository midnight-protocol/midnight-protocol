import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  CheckCircle,
  MessageSquare,
  User,
  Share2,
  Copy,
  Settings,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ConversationModal } from "@/components/ConversationModal";
import { ActivityListSkeleton } from "@/components/skeletons/ComponentSkeletons";

interface RecentActivityCardProps {
  userStatus: string;
  agentName: string;
  userId?: string;
  className?: string;
}

interface Activity {
  id: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
}

const RecentActivityCardComponent = ({
  userStatus,
  agentName,
  userId,
  className = "",
}: RecentActivityCardProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showConversationModal, setShowConversationModal] = useState(false);

  const fetchActivities = useCallback(
    async (loadMore = false) => {
      if (!userId) return;

      setLoading(true);
      try {
        const newOffset = loadMore ? offset : 0;
        const activities = []; //todo

        if (loadMore) {
          setActivities((prev) => [...prev, ...activities]);
        } else {
          setActivities(activities);
        }

        setOffset(newOffset + activities.length);
        setHasMore(activities.length === 20);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        toast.error("Failed to load activities");
        // Set empty state on error
        setActivities([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [userId, offset]
  );

  useEffect(() => {
    if (userId) {
      fetchActivities();
    }
  }, [userId, filter, fetchActivities]);

  const handleRefresh = useCallback(() => {
    setOffset(0);
    fetchActivities();
    toast.success("Activities refreshed");
  }, [fetchActivities]);

  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case "agent_named":
        return User;
      case "onboarding_completed":
      case "story_generated":
        return FileText;
      case "conversation_viewed":
        return MessageSquare;
      case "settings_updated":
        return Settings;
      default:
        return Activity;
    }
  }, []);

  const getActivityDescription = useCallback(
    (activity: Activity) => {
      const data = activity.activity_data || {};

      switch (activity.activity_type) {
        case "agent_named":
          return `Agent named "${data.agent_name || agentName}"`;
        case "onboarding_started":
          return "Started onboarding interview";
        case "onboarding_completed":
          return `Completed onboarding (${data.total_messages || 0} messages)`;
        case "story_generated":
          return "Personal story generated";
        case "profile_approved":
          return "Profile approved - agent is now active!";
        case "conversation_viewed":
          return `Viewed conversation with ${
            data.other_agent_name || "another agent"
          }`;
        case "settings_updated":
          return "Updated settings";
        default:
          return activity.activity_type.replace(/_/g, " ");
      }
    },
    [agentName]
  );

  const formatActivityTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const minutesAgo = differenceInMinutes(new Date(), date);

    if (minutesAgo < 1) return "Just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  }, []);

  const groupActivitiesByDate = useCallback((activities: Activity[]) => {
    const groups: { [key: string]: Activity[] } = {};

    activities.forEach((activity) => {
      const date = new Date(activity.created_at);
      let key: string;

      if (isToday(date)) {
        key = "Today";
      } else if (isYesterday(date)) {
        key = "Yesterday";
      } else {
        key = format(date, "MMMM d");
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  }, []);

  const filteredActivities = useMemo(
    () =>
      filter === "all"
        ? activities
        : activities.filter((a) => a.activity_type === filter),
    [filter, activities]
  );

  const groupedActivities = useMemo(
    () => groupActivitiesByDate(filteredActivities),
    [groupActivitiesByDate, filteredActivities]
  );

  // Show a default message if no userId
  if (!userId) {
    return (
      <Card
        className={`bg-terminal-bg/30 border-terminal-green/30 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-terminal-green font-mono flex items-center">
            <Activity className="mr-2 h-4 w-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-terminal-text-muted text-sm">
            Complete onboarding to see your activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-terminal-bg/30 border-terminal-green/30 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-green font-mono flex items-center">
            <Activity className="mr-2 h-4 w-4" /> Recent Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="agent_named">Agent Named</SelectItem>
                <SelectItem value="onboarding_completed">Onboarding</SelectItem>
                <SelectItem value="conversation_viewed">
                  Conversations
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && activities.length === 0 ? (
          <ActivityListSkeleton />
        ) : filteredActivities.length === 0 ? (
          <div className="text-terminal-text-muted text-sm">
            {filter === "all"
              ? "No activities yet. Complete onboarding to get started!"
              : `No ${filter.replace(/_/g, " ")} activities found.`}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <div className="text-terminal-text-muted text-xs font-mono mb-2">
                  {date}
                </div>
                <div className="space-y-2">
                  {dateActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.activity_type);
                    const isConversation =
                      activity.activity_type === "conversation_viewed";
                    const conversationId =
                      activity.activity_data?.conversation_id;

                    return (
                      <div
                        key={activity.id}
                        className={`flex items-start gap-3 p-2 rounded hover:bg-terminal-bg/20 transition-colors ${
                          isConversation && conversationId
                            ? "cursor-pointer"
                            : ""
                        }`}
                        onClick={() => {
                          if (isConversation && conversationId) {
                            setSelectedConversationId(conversationId);
                            setShowConversationModal(true);
                          }
                        }}
                      >
                        <Icon className="w-4 h-4 text-terminal-green mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-terminal-text text-sm">
                            {getActivityDescription(activity)}
                            {isConversation && (
                              <span className="text-terminal-cyan text-xs ml-2">
                                (Click to view)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-terminal-text-muted" />
                            <span className="text-terminal-text-muted text-xs">
                              {formatActivityTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <Button
                onClick={() => fetchActivities(true)}
                variant="outline"
                className="w-full mt-4 text-xs"
                disabled={loading}
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {userId && selectedConversationId && (
        <ConversationModal
          isOpen={showConversationModal}
          onClose={() => {
            setShowConversationModal(false);
            setSelectedConversationId(null);
          }}
          conversationId={selectedConversationId}
          userId={userId}
        />
      )}
    </Card>
  );
};

export const RecentActivityCard = memo(RecentActivityCardComponent);
