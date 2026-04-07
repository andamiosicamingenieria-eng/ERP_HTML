/**
 * ICAM 360 - Cliente Supabase
 * Cuando tengas las credenciales, reemplaza SUPABASE_URL y SUPABASE_ANON_KEY
 */

const SUPABASE_URL = 'https://qpvhqiyxzdgtuentzwtr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdmhxaXl4emRndHVlbnR6d3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTQwMzksImV4cCI6MjA5MTA5MDAzOX0.f26AB4pjN_FPrdj-PUbTCTD8aI4yyyTqNhgK8w39Fmo';

// Modo demo: true cuando no hay credenciales reales
const DEMO_MODE = (SUPABASE_URL.includes('PLACEHOLDER'));

let _supabase = null;
if (!DEMO_MODE && window.supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Capa de abstracción de base de datos.
 * En modo Demo opera sobre datos locales en memoria.
 * En producción, usa Supabase REST API.
 */
const DB = {
    async getAll(table, opts = {}) {
        if (DEMO_MODE || !_supabase) return null;
        try {
            let q = _supabase.from(table).select('*');
            if (opts.orderBy) q = opts.ascending === false ? q.order(opts.orderBy, { ascending: false }) : q.order(opts.orderBy);
            const { data, error, status } = await q;
            
            if (error) { 
                console.error(`[DB ERROR] Tabla: ${table}`, {
                    mensaje: error.message,
                    detalles: error.details,
                    codigo: error.code,
                    status: status
                });
                return null; 
            }
            console.log(`[DB SUCCESS] ${table}: ${data.length} registros cargados.`);
            return data;
        } catch (e) { 
            console.error('[DB FATAL]', e); 
            return null; 
        }
    },

    async insert(table, payload) {
        if (DEMO_MODE || !_supabase) return null;
        try {
            const { data, error, status } = await _supabase.from(table).insert(payload).select().single();
            if (error) { 
                console.error(`[DB INSERT ERROR] Tabla: ${table}`, {
                    mensaje: error.message,
                    detalles: error.details,
                    codigo: error.code,
                    status: status,
                    payloadSent: payload
                });
                return { error: error.message }; 
            }
            return data;
        } catch (e) { 
            console.error('[DB INSERT FATAL]', e);
            return { error: e.message }; 
        }
    },

    async update(table, id, payload) {
        if (DEMO_MODE || !_supabase) return true;
        try {
            const { error, status } = await _supabase.from(table).update(payload).eq('id', id);
            if (error) { 
                console.error(`[DB UPDATE ERROR] Tabla: ${table}, ID: ${id}`, {
                    mensaje: error.message,
                    detalles: error.details,
                    codigo: error.code,
                    status: status,
                    payloadSent: payload
                });
                return { error: error.message }; 
            }
            return true;
        } catch (e) { 
            console.error('[DB UPDATE FATAL]', e);
            return { error: e.message }; 
        }
    },

    async delete(table, id) {
        if (DEMO_MODE || !_supabase) return true;
        try {
            const { error } = await _supabase.from(table).delete().eq('id', id);
            if (error) { console.warn(`[DB] delete ${table}:`, error.message); return false; }
            return true;
        } catch (e) { return false; }
    },
};
