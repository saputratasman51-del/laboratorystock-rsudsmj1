const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL / Anon Key belum dikonfigurasi. Periksa file .env");
}

const baseHeaders: Record<string, string> = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  "Content-Type": "application/json",
};

type DbError = { message: string } | null;
type SelectResult<T> = { data: T[] | null; error: DbError };

interface OrderOpt {
  column?: string;
  ascending?: boolean;
}

interface SelectOpts {
  order?: OrderOpt;
  eq?: [string, string | number];
  single?: boolean;
}

class SupabaseClient {
  private base: string;

  constructor(url: string) {
    this.base = `${url.replace(/\/+$/, "")}/rest/v1`;
  }

  table(name: string) {
    const client = this;
    const tbl = name;

    return {
      async select(columns = "*", opts?: SelectOpts): Promise<SelectResult<any>> {
        const url = new URL(`${client.base}/${tbl}`);
        url.searchParams.set("select", columns);

        if (opts?.eq) {
          const [col, val] = opts.eq;
          url.searchParams.set(`${col}=eq`, String(val));
        }

        if (opts?.order) {
          const dir = opts.order.ascending === false ? "desc" : "asc";
          url.searchParams.set("order", `${opts.order.column ?? "id"}.${dir}`);
        }

        const res = await fetch(url.toString(), { headers: baseHeaders });
        if (!res.ok) {
          const txt = await res.text();
          return { data: null, error: { message: txt } };
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [data];
        if (opts?.single) return { data: arr[0] ?? null, error: null } as unknown as SelectResult<any> & { data: any };
        return { data: arr, error: null };
      },

      async upsert(rows: any[], opts?: { onConflict?: string }): Promise<{ error: DbError }> {
        const url = new URL(`${client.base}/${tbl}`);
        const headers: Record<string, string> = { ...baseHeaders };
        if (opts?.onConflict) {
          headers["Prefer"] = `resolution=merge-duplicates,params=${opts.onConflict}`;
        } else {
          headers["Prefer"] = "resolution=merge-duplicates";
        }

        const res = await fetch(url.toString(), {
          method: "POST",
          headers,
          body: JSON.stringify(rows),
        });
        if (!res.ok) {
          const txt = await res.text();
          return { error: { message: txt } };
        }
        return { error: null };
      },

      async update(patch: Record<string, unknown>, matchCol: string, matchVal: string): Promise<{ error: DbError }> {
        const url = new URL(`${client.base}/${tbl}`);
        url.searchParams.set(`${matchCol}=eq`, String(matchVal));

        const res = await fetch(url.toString(), {
          method: "PATCH",
          headers: baseHeaders,
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const txt = await res.text();
          return { error: { message: txt } };
        }
        return { error: null };
      },

      async delete(opts?: { eq?: [string, string | number]; in?: [string, (string | number)[]] }): Promise<{ error: DbError }> {
        const url = new URL(`${client.base}/${tbl}`);
        if (opts?.eq) {
          const [col, val] = opts.eq;
          url.searchParams.set(`${col}=eq`, String(val));
        }
        if (opts?.in) {
          const [col, vals] = opts.in;
          url.searchParams.set(`${col}=in`, `(${vals.join(",")})`);
        }

        const res = await fetch(url.toString(), {
          method: "DELETE",
          headers: baseHeaders,
        });
        if (!res.ok) {
          const txt = await res.text();
          return { error: { message: txt } };
        }
        return { error: null };
      },
    };
  }
}

export const supabase = new SupabaseClient(supabaseUrl);
export type { DbError };