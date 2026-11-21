import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Subscribe to realtime changes on a table filtered by a column, and refetch
 * the matching rows. Returns { data, loading, error, refresh }.
 */
export function useRealtime<T extends { id: string }>(opts: {
  table: string;
  filterColumn?: string;
  filterValue?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
}) {
  const { table, filterColumn, filterValue, select = "*", orderBy } = opts;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function refresh() {
    let q = supabase.from(table).select(select);
    if (filterColumn && filterValue) q = q.eq(filterColumn, filterValue);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await q;
    if (error) {
      setError(error.message);
    } else {
      setData((data as unknown as T[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`rt_${table}_${filterValue ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filterColumn && filterValue
            ? { filter: `${filterColumn}=eq.${filterValue}` }
            : {}),
        },
        () => {
          refresh();
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterColumn, filterValue, select]);

  return { data, loading, error, refresh };
}

export const useRealtimeQuery = useRealtime;
