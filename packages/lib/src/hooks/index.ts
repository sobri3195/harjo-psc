import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmergencyReport, UserRole } from '@harjo/types';
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

export const useEmergencyReports = () => {
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
    queryKey: ['emergency-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        type: row.type,
        severity: row.severity,
        victimCount: row.victim_count,
        description: row.description,
        latitude: row.latitude ?? 0,
        longitude: row.longitude ?? 0,
        status: row.status,
        createdAt: row.created_at
      })) as EmergencyReport[];
    }
  });
};

export const useDispatch = () =>
  useMutation({
    mutationFn: async (emergencyId: string) => {
      const { data, error } = await supabase.functions.invoke('dispatch-nearest-ambulance', { body: { emergencyId } });
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

export const useNotifications = () =>
  useQuery({
    queryKey: ['notification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_queue').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

export const useOfflineSync = () => {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      enqueue: async (payload: unknown) => {
        await supabase.from('sync_queue').insert({ payload, status: 'pending' });
      },
      flush: async () => {
        await supabase.functions.invoke('sync-offline-actions');
        await queryClient.invalidateQueries({ queryKey: ['sync-queue'] });
      }
    }),
    [queryClient]
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
