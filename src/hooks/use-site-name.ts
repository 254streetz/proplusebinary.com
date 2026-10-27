import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_SITE_NAME = 'Option Market Traders';

const BRAND_EXCEPTIONS = new Set(['propulse binary', 'propluse binary', 'propulsebinary', 'proplusebinary']);

export function useSiteName() {
  const query = useQuery({
    queryKey: ['site-name'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'site_name').maybeSingle();
      if (error) throw error;
      const configuredName = data?.value?.trim();
      if (!configuredName) return DEFAULT_SITE_NAME;
      const normalized = configuredName.toLowerCase();
      return BRAND_EXCEPTIONS.has(normalized) || !normalized.includes('option') ? DEFAULT_SITE_NAME : configuredName;
    },
  });
  return query.data ?? DEFAULT_SITE_NAME;
}
