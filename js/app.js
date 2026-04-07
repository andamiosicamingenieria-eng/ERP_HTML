/**
 * ICAM 360 - App Principal
 * Enrutador SPA, navegación, toasts, roles de usuario
 */

// ── Configuración de módulos ───────────────────────────────
const MODULES = {
    dashboard:   { title: 'Dashboard',              breadcrumb: 'ICAM 360 / Dashboard',              render: renderDashboard             },
    clientes:    { title: 'Clientes',               breadcrumb: 'Catálogos / Clientes',              render: () => ModClientes.render()   },
    productos:   { title: 'Productos',              breadcrumb: 'Catálogos / Productos',             render: () => ModProductos.render()  },
    contratos:   { title: 'Contratos',              breadcrumb: 'Operaciones / Contratos',           render: () => ModContratos.render()  },
    seguimiento: { title: 'Seguimiento',            breadcrumb: 'Operaciones / Seguimiento',         render: () => ModSeguimiento.render() },
    subarr:      { title: 'Sub-Arrendamiento',      breadcrumb: 'Operaciones / Sub-Arrendamiento',   render: () => ModSubArr.render()     },
    pagos:       { title: 'Cobranza y Pagos',       breadcrumb: 'Operaciones / Cobranza',            render: () => ModPagos.render()      },
    hs:          { title: 'Hojas de Salida',        breadcrumb: 'Logística / Hojas de Salida',       render: () => ModHS.render()         },
    he:          { title: 'Hojas de Entrada',       breadcrumb: 'Logística / Hojas de Entrada',      render: () => ModHE.render()         },
    inventario:  { title: 'Inventario',             breadcrumb: 'Almacén / Inventario',              render: () => ModInventario.render() },
    fabricacion: { title: 'Fabricación',            breadcrumb: 'Taller / Fabricación',              render: () => ModFabricacion.render() },
};

// ── Estado de la App ───────────────────────────────────────
let currentModule = 'dashboard';

// ── APP Global API ─────────────────────────────────────────
window.App = {
    navigate(module) {
        if (!MODULES[module]) return;
        currentModule = module;

        // Actualizar sidebar
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.module === module);
        });

        // Actualizar header
        document.getElementById('header-title').textContent = MODULES[module].title;
        document.getElementById('header-breadcrumb').textContent = MODULES[module].breadcrumb;

        // Render
        const mc = document.getElementById('module-content');
        mc.innerHTML = `<div class="loading-center"><div class="spinner"></div><span>Cargando…</span></div>`;
        setTimeout(async () => {
            try {
                const renderResult = MODULES[module].render();
                if (renderResult instanceof Promise) {
                    await renderResult;
                }
            } catch (e) {
                console.error('Error en módulo:', e);
                mc.innerHTML = `<div class="alert alert-danger"><span>Error al cargar el módulo: ${e.message}</span></div>`;
            }
        }, 50);
    },

    toast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
            danger:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
};

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
    const contratos  = ModContratos  ? ModContratos.getContratos()  : [];
    const clientes   = ModClientes   ? ModClientes.getClientes()    : [];
    const inventario = ModInventario ? ModInventario.getStock()     : {};

    const hoy    = new Date();
    const activos = contratos.filter(c => c.estatus === 'activo').length;
    const vencidos = contratos.filter(c => {
        if (!c.fecha_vencimiento) return false;
        return new Date(c.fecha_vencimiento + 'T12:00:00') < hoy;
    }).length;
    const totalDisp = Object.values(inventario).reduce((s, v) => s + v, 0);

    const mc = document.getElementById('module-content');
    mc.innerHTML = `
    <!-- Bienvenida -->
    <div class="card mb-4" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); border: none; color: white;">
        <div class="card-body" style="padding: 2rem;">
            <div class="flex justify-between items-center">
                <div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">Bienvenido a ICAM 360</h2>
                    <p style="opacity: 0.85; font-size: 0.9rem;">Sistema ERP de Gestión de Andamios — ${new Date().toLocaleDateString('es-MX', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
                </div>
                <div style="opacity: 0.3;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
            </div>
        </div>
    </div>

    <!-- KPIs -->
    <div class="stats-grid">
        <div class="stat-card" style="cursor:pointer" onclick="App.navigate('contratos')">
            <div class="stat-icon" style="background:var(--primary-light);color:var(--primary)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="stat-label">Total Contratos</div>
            <div class="stat-value">${contratos.length}</div>
            <div class="stat-change up">↑ Ver todos</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.navigate('seguimiento')">
            <div class="stat-icon" style="background:var(--success-light);color:var(--success)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="stat-label">Contratos Activos</div>
            <div class="stat-value" style="color:var(--success)">${activos}</div>
            <div class="stat-change up">↑ Ver seguimiento</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.navigate('seguimiento')">
            <div class="stat-icon" style="background:var(--danger-light);color:var(--danger)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="stat-label">Vencidos</div>
            <div class="stat-value" style="color:var(--danger)">${vencidos}</div>
            <div class="stat-change down">${vencidos > 0 ? '⚠ Requieren atención' : '✓ Sin vencidos'}</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.navigate('clientes')">
            <div class="stat-icon" style="background:var(--purple-light);color:var(--purple)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="stat-label">Clientes</div>
            <div class="stat-value">${clientes.length}</div>
            <div class="stat-change up">↑ Ver clientes</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.navigate('inventario')">
            <div class="stat-icon" style="background:var(--info-light);color:var(--info)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            </div>
            <div class="stat-label">Total Piezas Disponibles</div>
            <div class="stat-value">${totalDisp.toLocaleString('es-MX')}</div>
            <div class="stat-change up">↑ Ver inventario</div>
        </div>
    </div>

    <!-- Accesos rápidos -->
    <div class="section-header mt-4">
        <div class="section-title">Acciones Rápidas</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem">
        ${[
            { label: '+ Nuevo Contrato', module: 'contratos', color: 'var(--primary)', icon: '📄' },
            { label: '+ Nueva Hoja de Salida', module: 'hs', color: 'var(--success)', icon: '🚛' },
            { label: '+ Nueva Hoja de Entrada', module: 'he', color: 'var(--info)', icon: '📥' },
            { label: 'Ver Seguimiento', module: 'seguimiento', color: 'var(--warning)', icon: '📊' },
            { label: 'Inventario', module: 'inventario', color: 'var(--purple)', icon: '📦' },
            { label: 'Fabricación', module: 'fabricacion', color: '#64748b', icon: '🔧' },
        ].map(a => `
        <div onclick="App.navigate('${a.module}')" style="
            background: white;
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            cursor: pointer;
            transition: var(--transition);
            text-align: center;
            box-shadow: var(--shadow-sm);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow)'"
           onmouseout="this.style.transform='';this.style.boxShadow='var(--shadow-sm)'">
            <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">${a.icon}</div>
            <div style="font-size: 0.8rem; font-weight: 600; color: ${a.color}">${a.label}</div>
        </div>`).join('')}
    </div>

    <!-- Últimos contratos -->
    ${contratos.length ? `
    <div class="section-header mt-6">
        <div class="section-title">Contratos Recientes</div>
    </div>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Tipo</th><th>Estatus</th><th>Importe</th><th>Vencimiento</th></tr></thead>
            <tbody>
            ${contratos.slice(0, 5).map(c => {
                const badgeTipo = { renta:'badge-info', venta:'badge-purple', renovacion:'badge-primary', venta_perdida:'badge-danger', cancelacion:'badge-gray' };
                const badgeEst  = { activo:'badge-success', entrega_parcial:'badge-warning', recolectado:'badge-success', borrador:'badge-gray', cancelado:'badge-gray' };
                return `<tr onclick="App.navigate('contratos')" style="cursor:pointer">
                    <td class="td-mono">${c.folio}</td>
                    <td>${c.razon_social || '—'}</td>
                    <td><span class="badge ${badgeTipo[c.tipo_contrato]||'badge-gray'}">${(c.tipo_contrato||'').replace('_',' ')}</span></td>
                    <td><span class="badge ${badgeEst[c.estatus]||'badge-gray'}">${(c.estatus||'').replace('_',' ')}</span></td>
                    <td class="td-mono">$${Number(c.monto_total||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                    <td style="color:${c.fecha_vencimiento && new Date(c.fecha_vencimiento+'T12:00:00') < hoy ? 'var(--danger)' : 'var(--text-secondary)'}">
                        ${c.fecha_vencimiento ? new Date(c.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-MX') : '—'}
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>
    </div>` : ''}

    <!-- Modo Demo aviso -->
    ${DEMO_MODE ? `
    <div class="alert alert-warning mt-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span><strong>Modo Demo activo.</strong> Los datos son de ejemplo. Para conectar con tu base de datos real, actualiza <code style="background:rgba(0,0,0,0.1);padding:1px 4px;border-radius:3px">js/supabase-client.js</code> con tu URL y clave de Supabase.</span>
    </div>` : ''}`;
}

// ── Inicialización ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Conectar navegación del sidebar
    document.querySelectorAll('.nav-item[data-module]').forEach(el => {
        el.addEventListener('click', () => App.navigate(el.dataset.module));
    });

    // Actualizar badge de modo demo/conectado
    const badge = document.getElementById('conn-badge');
    if (!DEMO_MODE) {
        badge.textContent = '● Supabase Conectado';
        badge.className = 'badge badge-success';
    } else {
        badge.textContent = '● Modo Demo';
        badge.className = 'badge badge-warning';
    }

    // Cargar módulo inicial
    App.navigate('dashboard');
});
