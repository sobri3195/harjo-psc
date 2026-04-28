import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AmbulanceStatus,
  DispatchNearestAmbulanceInput,
  DispatchNearestAmbulanceOutput,
  EmergencyReport,
  EmergencySeverity,
  EmergencyStatus,
  PushNotificationInput,
  SyncOfflineActionInput,
  UpdateAmbulanceLocationInput,
  UserRole,
  VoiceToTextInput
} from '@harjo/types';
import { supabase } from '../supabase/client';

const realtimeTables = [
  'emergency_reports',
  'ambulance_tracking',
  'emergency_dispatches',
  'locations',
  'patient_monitoring',
  'team_chat',
  'alert_broadcasts',
  'notification_queue'
] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const severityRank: Record<EmergencySeverity, number> = { kritis: 4, berat: 3, sedang: 2, ringan: 1 };
const localSyncQueueKey = 'harjo.sync_queue.v1';

type RealtimeEmergencyOptions = {
  onCritical?: (report: EmergencyReport) => void;
};

type TrackingMarker = {
  ambulanceId: string;
  latitude: number;
  longitude: number;
  status: AmbulanceStatus;
  lastSeen: string;
  isOffline: boolean;
  rawUpdatedAt: string;
};

type TimelineStatus = 'Reported' | 'Dispatching' | 'Assigned' | 'En Route' | 'On Scene' | 'Transporting' | 'Completed';

export type EmergencyTimelineItem = {
  status: TimelineStatus;
  at: string;
  source: 'emergency_reports' | 'emergency_dispatches';
};

export const useAuth = () =>
  useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => (await supabase.auth.getSession()).data.session
  });

export const useUserRole = () =>
  useQuery({
    queryKey: ['user-role'],
    queryFn: async (): Promise<UserRole | null> => {
      const { data } = await supabase.auth.getUser();
      return (data.user?.app_metadata?.role as UserRole | undefined) ?? null;
    }
  });

export const useGeolocation = () =>
  useQuery({
    queryKey: ['geolocation'],
    queryFn: async () =>
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 8000
        });
      }),
    staleTime: 15000
  });

const mapEmergencyReport = (row: Record<string, unknown>): EmergencyReport => ({
  id: String(row.id),
  reporterId: (row.reporter_id as string | null) ?? null,
  type: String(row.type ?? 'unknown'),
  severity: (row.severity as EmergencySeverity) ?? 'ringan',
  victimCount: Number(row.victim_count ?? 1),
  description: row.description ? String(row.description) : undefined,
  latitude: Number(row.latitude ?? 0),
  longitude: Number(row.longitude ?? 0),
  status: (row.status as EmergencyStatus) ?? 'reported',
  createdAt: String(row.created_at)
});

const sortEmergencyReports = (reports: EmergencyReport[]) =>
  [...reports].sort((a, b) => {
    const severityDiff = severityRank[b.severity] - severityRank[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

export const useEmergencyReports = (page = 1, pageSize = 20) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('emergency-reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, () => {
        queryClient.invalidateQueries({ queryKey: ['emergency-reports'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['emergency-reports', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('emergency_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []).map((row) => mapEmergencyReport(row as Record<string, unknown>));
    }
  });
};

export const useRealtimeEmergencyReports = (options?: RealtimeEmergencyOptions) => {
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ['emergency-reports', 'realtime'],
    queryFn: async () => {
      const { data, error } = await supabase.from('emergency_reports').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return sortEmergencyReports((data ?? []).map((row) => mapEmergencyReport(row as Record<string, unknown>)));
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('rt-emergency-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_reports' }, (payload) => {
        const report = mapEmergencyReport(payload.new as Record<string, unknown>);
        queryClient.setQueryData<EmergencyReport[]>(['emergency-reports', 'realtime'], (current) =>
          sortEmergencyReports([...(current ?? []), report])
        );
        if (report.severity === 'kritis') {
          options?.onCritical?.(report);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_reports' }, (payload) => {
        const report = mapEmergencyReport(payload.new as Record<string, unknown>);
        queryClient.setQueryData<EmergencyReport[]>(['emergency-reports', 'realtime'], (current) =>
          sortEmergencyReports((current ?? []).map((item) => (item.id === report.id ? report : item)))
        );
        if (report.severity === 'kritis') {
          options?.onCritical?.(report);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [options, queryClient]);

  return reportsQuery;
};

export const useDispatchNearestAmbulance = () => {
  const queryClient = useQueryClient();

  return useMutation<DispatchNearestAmbulanceOutput, Error, DispatchNearestAmbulanceInput>({
    mutationFn: async (payload: DispatchNearestAmbulanceInput) => {
      const { data, error } = await supabase.functions.invoke<DispatchNearestAmbulanceOutput>('dispatch-nearest-ambulance', { body: payload });
      if (error) throw error;
      return data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['emergency-reports', 'realtime'] });
      const previousReports = queryClient.getQueryData<EmergencyReport[]>(['emergency-reports', 'realtime']);
      queryClient.setQueryData<EmergencyReport[]>(['emergency-reports', 'realtime'], (current) =>
        (current ?? []).map((report) =>
          report.id === payload.emergency_report_id
            ? {
                ...report,
                status: 'dispatching'
              }
            : report
        )
      );
      return { previousReports };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(['emergency-reports', 'realtime'], context.previousReports);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['emergency-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['emergency-dispatches'] });
    }
  });
};

export const useSendPushNotification = () =>
  useMutation({
    mutationFn: async (payload: PushNotificationInput) => {
      const { data, error } = await supabase.functions.invoke('send-push-notification', { body: payload });
      if (error) throw error;
      return data;
    }
  });

export const useVoiceToText = () =>
  useMutation({
    mutationFn: async (payload: VoiceToTextInput) => {
      const { data, error } = await supabase.functions.invoke('voice-to-text', { body: payload });
      if (error) throw error;
      return data;
    }
  });

export const useUpdateAmbulanceLocation = () =>
  useMutation({
    mutationFn: async (payload: UpdateAmbulanceLocationInput) => {
      const { data, error } = await supabase.functions.invoke('update-ambulance-location', { body: payload });
      if (error) throw error;
      return data;
    }
  });

export const useAmbulanceTracking = () => {
  const [lastRefetchAt, setLastRefetchAt] = useState(Date.now());

  return useQuery({
    queryKey: ['ambulance-tracking'],
    queryFn: async () => {
      const now = Date.now();
      if (now - lastRefetchAt < 1800) {
        await wait(1800 - (now - lastRefetchAt));
      }
      setLastRefetchAt(Date.now());
      const { data, error } = await supabase.from('ambulance_tracking').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 4500
  });
};

const toTrackingMarker = (row: Record<string, unknown>): TrackingMarker => {
  const updatedAt = String(row.updated_at ?? row.timestamp ?? new Date().toISOString());
  const lastSeenMs = new Date(updatedAt).getTime();
  return {
    ambulanceId: String(row.ambulance_id),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: (row.status as AmbulanceStatus) ?? 'available',
    lastSeen: new Date(lastSeenMs).toISOString(),
    isOffline: Date.now() - lastSeenMs > 30_000,
    rawUpdatedAt: updatedAt
  };
};

export const useRealtimeAmbulanceTracking = (throttleMs = 1200) => {
  const [markers, setMarkers] = useState<Record<string, TrackingMarker>>({});
  const pendingRef = useRef<Record<string, TrackingMarker>>({});
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const flushPending = () => {
      if (!Object.keys(pendingRef.current).length) return;
      setMarkers((prev) => ({ ...prev, ...pendingRef.current }));
      pendingRef.current = {};
      timeoutRef.current = null;
    };

    const channel = supabase
      .channel('rt-ambulance-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_tracking' }, (payload) => {
        const marker = toTrackingMarker(payload.new as Record<string, unknown>);
        pendingRef.current[marker.ambulanceId] = marker;
        if (!timeoutRef.current) {
          timeoutRef.current = window.setTimeout(flushPending, throttleMs);
        }
      })
      .subscribe();

    const heartbeat = window.setInterval(() => {
      setMarkers((current) => {
        const next = { ...current };
        for (const [ambulanceId, marker] of Object.entries(next)) {
          next[ambulanceId] = {
            ...marker,
            isOffline: Date.now() - new Date(marker.rawUpdatedAt).getTime() > 30_000
          };
        }
        return next;
      });
    }, 5_000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      window.clearInterval(heartbeat);
      void supabase.removeChannel(channel);
    };
  }, [throttleMs]);

  return {
    markers: Object.values(markers).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
  };
};

export const useEmergencyTimeline = (emergencyId?: string) =>
  useQuery({
    queryKey: ['emergency-timeline', emergencyId],
    enabled: Boolean(emergencyId),
    queryFn: async (): Promise<EmergencyTimelineItem[]> => {
      const reportResp = await supabase
        .from('emergency_reports')
        .select('id, status, created_at, dispatched_at, updated_at')
        .eq('id', emergencyId as string)
        .single();
      if (reportResp.error) throw reportResp.error;

      const dispatchResp = await supabase
        .from('emergency_dispatches')
        .select('status, assigned_at, started_at, arrived_at, completed_at, updated_at')
        .eq('emergency_id', emergencyId as string)
        .order('assigned_at', { ascending: true });
      if (dispatchResp.error) throw dispatchResp.error;

      const report = reportResp.data;
      const timeline: EmergencyTimelineItem[] = [
        { status: 'Reported', at: String(report.created_at), source: 'emergency_reports' }
      ];

      if (report.status === 'dispatching') timeline.push({ status: 'Dispatching', at: String(report.updated_at ?? report.dispatched_at ?? report.created_at), source: 'emergency_reports' });
      if (['ambulance_assigned', 'en_route', 'on_scene', 'transporting', 'completed'].includes(String(report.status))) {
        timeline.push({ status: 'Assigned', at: String(report.dispatched_at ?? report.updated_at ?? report.created_at), source: 'emergency_reports' });
      }

      for (const dispatch of dispatchResp.data ?? []) {
        if (dispatch.assigned_at) timeline.push({ status: 'Assigned', at: String(dispatch.assigned_at), source: 'emergency_dispatches' });
        if (['accepted', 'en_route'].includes(String(dispatch.status))) timeline.push({ status: 'En Route', at: String(dispatch.started_at ?? dispatch.updated_at ?? dispatch.assigned_at), source: 'emergency_dispatches' });
        if (['arrived', 'on_scene'].includes(String(dispatch.status))) timeline.push({ status: 'On Scene', at: String(dispatch.arrived_at ?? dispatch.updated_at ?? dispatch.assigned_at), source: 'emergency_dispatches' });
        if (String(dispatch.status) === 'transporting') timeline.push({ status: 'Transporting', at: String(dispatch.updated_at ?? dispatch.assigned_at), source: 'emergency_dispatches' });
        if (['completed', 'cancelled'].includes(String(dispatch.status))) timeline.push({ status: 'Completed', at: String(dispatch.completed_at ?? dispatch.updated_at ?? dispatch.assigned_at), source: 'emergency_dispatches' });
      }

      if (report.status === 'en_route') timeline.push({ status: 'En Route', at: String(report.updated_at ?? report.dispatched_at ?? report.created_at), source: 'emergency_reports' });
      if (report.status === 'on_scene') timeline.push({ status: 'On Scene', at: String(report.updated_at ?? report.dispatched_at ?? report.created_at), source: 'emergency_reports' });
      if (report.status === 'transporting') timeline.push({ status: 'Transporting', at: String(report.updated_at ?? report.dispatched_at ?? report.created_at), source: 'emergency_reports' });
      if (report.status === 'completed') timeline.push({ status: 'Completed', at: String(report.updated_at ?? report.dispatched_at ?? report.created_at), source: 'emergency_reports' });

      return timeline
        .filter((item, index, all) => all.findIndex((x) => x.status === item.status && x.at === item.at) === index)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    }
  });

export const usePatientMonitoring = (emergencyId?: string) =>
  useQuery({
    queryKey: ['patient-monitoring', emergencyId],
    queryFn: async () => {
      const q = supabase.from('patient_monitoring').select('*').order('recorded_at', { ascending: false });
      const { data, error } = emergencyId ? await q.eq('emergency_id', emergencyId) : await q;
      if (error) throw error;
      return data ?? [];
    }
  });

export const useTeamChat = (emergencyId?: string) =>
  useQuery({
    queryKey: ['team-chat', emergencyId],
    enabled: Boolean(emergencyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_chat')
        .select('*')
        .eq('emergency_id', emergencyId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });

export const useNotifications = (page = 1, pageSize = 50) =>
  useQuery({
    queryKey: ['notification-queue', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    }
  });

export const useOfflineSync = () => {
  const queryClient = useQueryClient();
  const [conflicts, setConflicts] = useState<Array<{ idempotency_key: string; conflict: string }>>([]);

  const readLocalQueue = (): SyncOfflineActionInput[] => {
    const raw = localStorage.getItem(localSyncQueueKey);
    return raw ? (JSON.parse(raw) as SyncOfflineActionInput[]) : [];
  };

  const writeLocalQueue = (items: SyncOfflineActionInput[]) => {
    localStorage.setItem(localSyncQueueKey, JSON.stringify(items));
  };

  return useMemo(
    () => ({
      conflicts,
      enqueue: async (action: SyncOfflineActionInput) => {
        if (!navigator.onLine) {
          const queue = readLocalQueue();
          writeLocalQueue([...queue, action]);
          return { queued: true };
        }

        const { error } = await supabase.from('sync_queue').insert({
          action_type: action.action_type,
          payload: action.payload,
          client_action_id: action.idempotency_key,
          status: 'pending'
        });
        if (error) throw error;
        return { queued: false };
      },
      flush: async (actions?: SyncOfflineActionInput[]) => {
        const payload = actions ?? readLocalQueue();
        if (!payload.length) return { synced: 0, conflicts: [] as Array<{ idempotency_key: string; conflict: string }> };
        const { data, error } = await supabase.functions.invoke<{ results: Array<{ idempotency_key: string; success: boolean; status: string; conflict?: string }> }>('sync-offline-actions', {
          body: { actions: payload }
        });
        if (error) throw error;

        const conflictRows = (data?.results ?? [])
          .filter((result) => !result.success && result.conflict)
          .map((result) => ({ idempotency_key: result.idempotency_key, conflict: result.conflict as string }));
        setConflicts(conflictRows);

        const successful = new Set((data?.results ?? []).filter((row) => row.success).map((row) => row.idempotency_key));
        writeLocalQueue(payload.filter((item) => !successful.has(item.idempotency_key)));

        await queryClient.invalidateQueries({ queryKey: ['sync-queue'] });
        return { synced: successful.size, conflicts: conflictRows };
      }
    }),
    [conflicts, queryClient]
  );
};

export const useRealtimeSubscriptions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = realtimeTables.map((table) =>
      supabase
        .channel(`rt-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          queryClient.invalidateQueries();
        })
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [queryClient]);
};
