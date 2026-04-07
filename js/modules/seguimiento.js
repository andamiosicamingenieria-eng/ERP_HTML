/**
 * ICAM 360 - Panel de Seguimiento
 */
window.ModSeguimiento = (() => {

    async function render() {
        const mc = document.getElementById('module-content');
        
        // Cargar datos de Supabase
        const contratos = (await DB.getAll('ops_contratos', { orderBy: 'folio', ascending: false })) || [];
        const todasHS = (await DB.getAll('ops_hs', { orderBy: 'fecha', ascending: false })) || [];
        
        const hoy = new Date();
        const activos = (contratos || []).filter(c => 
            ['activo','entrega_parcial','borrador'].includes(c.estatus) && 
            c.tipo_contrato === 'renta'
        );

        const vencidos = activos.filter(c => c.fecha_vencimiento && new Date(c.fecha_vencimiento + 'T12:00:00') < hoy);
        const proximos = activos.filter(c => {
            if (!c.fecha_vencimiento) return false;
            const dias = diasRestantes(c.fecha_vencimiento);
            return dias >= 0 && dias <= 7;
        });
        const ok = activos.filter(c => {
            if (!c.fecha_vencimiento) return true;
            return diasRestantes(c.fecha_vencimiento) > 7;
        });

        mc.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="border-left:4px solid var(--danger)">
                <div class="stat-label">Vencidos</div>
                <div class="stat-value text-danger">${vencidos.length}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--warning)">
                <div class="stat-label">Próximos (≤7d)</div>
                <div class="stat-value text-warning">${proximos.length}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--success)">
                <div class="stat-label">Activos OK</div>
                <div class="stat-value text-success">${ok.length}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--primary)">
                <div class="stat-label">Total Renta</div>
                <div class="stat-value">${activos.length}</div>
            </div>
        </div>

        ${vencidos.length ? `
        <div class="section-header mt-4"><div class="section-title text-danger">🚨 Contratos Vencidos</div></div>
        <div class="seguimiento-grid mb-4">${vencidos.map(c => cardContrato(c, todasHS)).join('')}</div>` : ''}

        ${proximos.length ? `
        <div class="section-header mt-4"><div class="section-title text-warning">⏳ Próximos a Vencer</div></div>
        <div class="seguimiento-grid mb-4">${proximos.map(c => cardContrato(c, todasHS)).join('')}</div>` : ''}

        <div class="section-header mt-4"><div class="section-title">📦 Inventario en Campo</div></div>
        <div class="seguimiento-grid">
            ${activos.length ? activos.map(c => cardContrato(c, todasHS)).join('') : '<div class="empty-state">No hay contratos activos.</div>'}
        </div>`;

        attachEvents();
    }

    function cardContrato(c, todasHS) {
        const dias = c.fecha_vencimiento ? diasRestantes(c.fecha_vencimiento) : null;
        const diasClass = dias === null ? '' : dias < 0 ? 'badge-danger' : dias <= 7 ? 'badge-warning' : 'badge-success';
        const diasTexto = dias === null ? 'Sin fecha' : dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d restantes`;

        const estatusEntrega = calcularEstatusEntrega(c, todasHS);

        return `
        <div class="contrato-card shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="text-xs text-muted mb-1">${c.folio}</div>
                    <div class="font-bold text-main" style="font-size:0.95rem">${c.razon_social || '—'}</div>
                </div>
                <div class="badge ${diasClass}">${diasTexto}</div>
            </div>
            
            <div class="flex gap-2 mb-3" style="flex-wrap:wrap; font-size:0.75rem">
                <span class="badge badge-gray">👤 ${c.vendedor || 'Sin agente'}</span>
                ${getBadgeEntrega(estatusEntrega)}
            </div>

            <div class="flex justify-between items-center mt-4">
                <div class="text-xs text-muted">Total: <strong>$${Number(c.monto_total || 0).toLocaleString()}</strong></div>
                <div class="flex gap-1">
                    <button class="btn btn-secondary btn-sm" onclick="App.navigate('contratos')">📊 Ver</button>
                    <button class="btn btn-success btn-sm btn-cerrar-contrato" data-id="${c.id}">✓</button>
                </div>
            </div>
        </div>`;
    }

    function calcularEstatusEntrega(contrato, todasHS) {
        const itemsReq = contrato.items || [];
        if (!itemsReq.length) return 'sin_items';

        const hsContrato = todasHS.filter(h => h.contrato_folio === contrato.folio);
        if (!hsContrato.length) return 'sin_entrega';

        const entregado = {};
        hsContrato.forEach(h => {
            (h.items || []).forEach(it => {
                entregado[it.producto_id] = (entregado[it.producto_id] || 0) + (parseFloat(it.cantidad_hs) || 0);
            });
        });

        let completos = true;
        let algo = false;
        itemsReq.forEach(req => {
            const ent = entregado[req.producto_id] || 0;
            if (ent < req.cantidad) completos = false;
            if (ent > 0) algo = true;
        });

        if (completos) return 'total';
        if (algo) return 'parcial';
        return 'sin_entrega';
    }

    function getBadgeEntrega(estatus) {
        const map = {
            'total':       '<span class="badge badge-success">📦 Total</span>',
            'parcial':     '<span class="badge badge-warning">📦 Parcial</span>',
            'sin_entrega': '<span class="badge badge-danger">📦 Sin entrega</span>',
            'sin_items':   '<span class="badge badge-gray">📦 Sin equipos</span>'
        };
        return map[estatus] || map['sin_entrega'];
    }

    function attachEvents() {
        document.querySelectorAll('.btn-cerrar-contrato').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                if (confirm('¿Cerrar contrato y marcar como recolectado?')) {
                    await DB.update('ops_contratos', id, { estatus: 'recolectado' });
                    App.toast('Contrato actualizado', 'success');
                    render();
                }
            });
        });
    }

    function diasRestantes(f) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const venc = new Date(f + 'T00:00:00');
        return Math.ceil((venc - hoy) / 86400000);
    }

    return { render };
})();
