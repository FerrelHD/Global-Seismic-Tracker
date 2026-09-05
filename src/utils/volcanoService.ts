import { VolcanoActivity } from '../types/seismic';
import { supabase } from './supabase';
import { INDONESIA_ACTIVE_VOLCANOES } from '../data/volcanoes';

export async function fetchVolcanoActivity(): Promise<VolcanoActivity[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('volcano_activity')
        .select(`
          *,
          ash_plumes (*)
        `)
        .order('alert_level', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((v: any) => ({
          ...v,
          ash_plume: v.ash_plumes?.[0] || undefined,
        })) as VolcanoActivity[];
      }
    }
  } catch (err) {
    console.warn('Supabase volcano_activity query failed, using curated telemetry:', err);
  }

  // Graceful fallback to verified PVMBG / VONA observatory telemetry
  return INDONESIA_ACTIVE_VOLCANOES;
}
