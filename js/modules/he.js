/**
 * ICAM 360 - Módulo Hojas de Entrada (ops_he + ops_he_items)
 * Recolección de equipo — suma al inventario
 */
window.ModHE = (() => {
    let heData = [];
    let filtro = '';

    function render() {
        const mc = document.getElementById('module-content');
        mc.innerHTML = `
        <div class="page-toolbar">
            <div class="page-toolbar-left">
                <div class="search-box">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="he-search" type="text" placeholder="Folio HE, folio contrato, cliente…" value="${filtro}">
                </div>
            </div>
            <div class="page-toolbar-right">
                <button class="btn btn-primary" id="btn-nueva-he">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nueva Hoja de Entrada
                </button>
            </div>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Folio HE</th>
                        <th>Contrato</th>
                        <th>Cliente</th>
                        <th>Fecha Recolección</th>
                        <th>Piezas</th>
                        <th>Estatus</th>
                        <th>Vaciado Fab.</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="he-tbody">
                    <tr><td colspan="8"><div class="loading-center"><div class="spinner"></div></div></td></tr>
                </tbody>
            </table>
        </div>`;

        document.getElementById('he-search').addEventListener('input', e => { filtro = e.target.value; renderTabla(); });
        document.getElementById('btn-nueva-he').addEventListener('click', () => abrirModal());
        cargarHE();
    }

    async function cargarHE() {
        const raw = await DB.getAll('ops_he', { orderBy: 'folio', ascending: false });
        heData = raw || dataSeed();
        renderTabla();
    }

    function dataSeed() {
        return [
            {
                id: 1, folio: 'HE-001', contrato_folio: '20001', razon_social: 'CONSTRUCTORA TORRES DEL NORTE SA DE CV',
                fecha: '2026-04-01', total_piezas: 30, estatus: 'recibido', vaciado_fabricacion: false,
                items: [
                    { codigo:'AND-001', nombre:'Andamio Tubular 1.56x1.00m', cantidad_recolectada: 25, estado: 'pendiente_clasificacion' },
                    { codigo:'TAB-001', nombre:'Tablón de Madera 3.00m', cantidad_recolectada: 5, estado: 'pendiente_clasificacion' },
                ]
            },
        ];
    }

    function renderTabla() {
        const tbody = document.getElementById('he-tbody');
        if (!tbody) return;
        const f = filtro.toLowerCase();
        const data = heData.filter(h =>
            (h.folio||'').toLowerCase().includes(f) ||
            (h.contrato_folio||'').toLowerCase().includes(f) ||
            (h.razon_social||'').toLowerCase().includes(f)
        );
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <h3>Sin Hojas de Entrada</h3><p>Registra la primera recolección de equipo.</p>
            </div></td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(h => `
            <tr>
                <td class="td-mono">${h.folio}</td>
                <td class="td-mono">${h.contrato_folio || '—'}</td>
                <td><strong style="color:var(--text-main);font-size:0.8rem">${h.razon_social || '—'}</strong></td>
                <td>${fmtFecha(h.fecha)}</td>
                <td class="td-mono">${h.total_piezas || 0} pzas</td>
                <td>${badgeEstatusHE(h.estatus)}</td>
                <td>${h.vaciado_fabricacion
                    ? '<span class="badge badge-success">✓ Vaciado</span>'
                    : '<span class="badge badge-warning">Pendiente</span>'}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="ModHE.verDetalle(${h.id})">Ver</button>
                        ${!h.vaciado_fabricacion ? `<button class="btn btn-primary btn-sm" onclick="ModHE.procesarVaciado(${h.id})">Procesar</button>` : ''}
                    </div>
                </td>
            </tr>`).join('');
    }

    function abrirModal(contratoIdPresel = null) {
        const contratos = ModContratos ? ModContratos.getContratos() : [];
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-he';
        overlay.innerHTML = `
        <div class="modal modal-xl">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Nueva Hoja de Entrada (HE)</div>
                    <div class="modal-subtitle">Registro de recolección — el equipo regresa al almacén</div>
                </div>
                <button class="modal-close" onclick="document.getElementById('modal-he').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-row cols-3">
                    <div class="form-group">
                        <label class="form-label">Folio HE</label>
                        <input id="he-folio" class="form-control td-mono" value="${nextFolioHE()}" readonly style="background:var(--bg-elevated)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contrato <span class="required">*</span></label>
                        <select id="he-contrato" class="form-control">
                            <option value="">— Selecciona contrato —</option>
                            ${contratos.filter(c => ['activo','entrega_parcial'].includes(c.estatus)).map(c =>
                                `<option value="${c.id}" ${contratoIdPresel===c.id?'selected':''}>${c.folio} — ${c.razon_social}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha de Recolección</label>
                        <input id="he-fecha" type="date" class="form-control" value="${hoyISO()}">
                    </div>
                </div>

                <div class="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>El equipo recolectado se sumará al inventario disponible. El rol de <strong>Fabricación</strong> luego clasificará su estado.</span>
                </div>

                <div id="he-items-zona" style="display:none">
                    <div style="font-weight:700;margin-bottom:.75rem;color:var(--text-main)">Piezas a Recolectar</div>
                    <table class="items-table-mini">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>En Campo</th>
                                <th>A Recolectar Ahora</th>
                                <th>Estado Inicial</th>
                            </tr>
                        </thead>
                        <tbody id="he-items-tbody"></tbody>
                    </table>
                </div>

                <div class="form-row cols-2 mt-4">
                    <div class="form-group">
                        <label class="form-label">Operador / Chofer</label>
                        <input id="he-operador" class="form-control" placeholder="Nombre del operador">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notas</label>
                        <textarea id="he-notas" class="form-control" placeholder="Condiciones de entrega, observaciones…"></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-he').remove()">Cancelar</button>
                <button class="btn btn-primary" id="btn-guardar-he">Guardar Hoja de Entrada</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        const selContrato = document.getElementById('he-contrato');
        selContrato.addEventListener('change', () => cargarItemsContratoHE(selContrato.value));
        if (contratoIdPresel) cargarItemsContratoHE(String(contratoIdPresel));
        document.getElementById('btn-guardar-he').addEventListener('click', guardarHE);
    }

    function cargarItemsContratoHE(contratoId) {
        const items = ModContratos.getItems(parseInt(contratoId));
        const zona = document.getElementById('he-items-zona');
        const tbody = document.getElementById('he-items-tbody');
        if (!items.length) { zona.style.display = 'none'; return; }
        zona.style.display = 'block';

        tbody.innerHTML = items.map((it, i) => {
            const enCampo = it.cantidad - (it.ya_entregado || 0);
            return `<tr>
                <td class="td-mono">${it.codigo}</td>
                <td>${it.nombre}</td>
                <td class="td-mono" style="font-weight:700">${enCampo}</td>
                <td>
                    <input type="number" class="form-control he-cant-item" data-idx="${i}" min="0" max="${enCampo}"
                        value="${enCampo}" style="width:80px;font-size:0.78rem">
                </td>
                <td>
                    <select class="form-control he-estado-item" style="font-size:0.78rem">
                        <option value="pendiente_clasificacion">⏳ Pendiente Clasificación</option>
                        <option value="limpio_funcional">✅ Limpio Funcional</option>
                        <option value="sucio_funcional">🔧 Sucio Funcional</option>
                        <option value="chatarra">❌ Chatarra</option>
                    </select>
                </td>
            </tr>`;
        }).join('');
    }

    async function guardarHE() {
        const contratoId = parseInt(document.getElementById('he-contrato').value);
        if (!contratoId) { App.toast('Selecciona un contrato', 'danger'); return; }

        const contratos = ModContratos.getContratos();
        const c = contratos.find(x => x.id === contratoId);
        const contItems = ModContratos.getItems(contratoId);

        const items = [];
        document.querySelectorAll('.he-cant-item').forEach((inp, i) => {
            const it = contItems[i];
            const sel = document.querySelectorAll('.he-estado-item')[i];
            if (it && parseInt(inp.value) > 0) {
                items.push({
                    ...it,
                    cantidad_recolectada: parseInt(inp.value),
                    estado: sel?.value || 'pendiente_clasificacion',
                });
            }
        });

        const nuevaHE = {
            id: Math.max(0, ...heData.map(h => h.id)) + 1,
            folio: document.getElementById('he-folio').value,
            contrato_folio: c?.folio,
            razon_social: c?.razon_social,
            fecha: document.getElementById('he-fecha').value,
            total_piezas: items.reduce((s, i) => s + i.cantidad_recolectada, 0),
            estatus: 'recibido',
            vaciado_fabricacion: false,
            operador: document.getElementById('he-operador').value.trim() || null,
            notas: document.getElementById('he-notas').value.trim() || null,
            items,
        };

        heData.push(nuevaHE);
        await DB.insert('ops_he', nuevaHE);
        document.getElementById('modal-he').remove();
        App.toast(`Hoja de Entrada ${nuevaHE.folio} registrada`, 'success');
        renderTabla();
    }

    function verDetalle(heId) {
        const h = heData.find(x => x.id === heId);
        if (!h) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-he-detalle';
        overlay.innerHTML = `
        <div class="modal modal-lg">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Hoja de Entrada — ${h.folio}</div>
                    <div class="modal-subtitle">${h.razon_social} | Contrato: ${h.contrato_folio}</div>
                </div>
                <button class="modal-close" onclick="document.getElementById('modal-he-detalle').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-row cols-3" style="margin-bottom:1rem">
                    <div><span class="stat-label">Fecha</span><div>${fmtFecha(h.fecha)}</div></div>
                    <div><span class="stat-label">Total Piezas</span><div class="td-mono">${h.total_piezas} pzas</div></div>
                    <div><span class="stat-label">Vaciado Fabricación</span><div>${h.vaciado_fabricacion ? '<span class="badge badge-success">Completado</span>' : '<span class="badge badge-warning">Pendiente</span>'}</div></div>
                </div>
                <table class="items-table-mini">
                    <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Estado</th></tr></thead>
                    <tbody>${(h.items||[]).map(i => `<tr>
                        <td class="td-mono">${i.codigo}</td>
                        <td>${i.nombre}</td>
                        <td class="td-mono">${i.cantidad_recolectada}</td>
                        <td>${badgeEstadoPieza(i.estado)}</td>
                    </tr>`).join('')}</tbody>
                </table>
                ${h.notas ? `<div class="alert alert-info mt-4"><span>${h.notas}</span></div>` : ''}
            </div>
            <div class="modal-footer">
                ${!h.vaciado_fabricacion ? `<button class="btn btn-primary" onclick="ModHE.procesarVaciado(${h.id});document.getElementById('modal-he-detalle').remove()">Procesar Vaciado</button>` : ''}
                <button class="btn btn-secondary" onclick="document.getElementById('modal-he-detalle').remove()">Cerrar</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    function procesarVaciado(heId) {
        const h = heData.find(x => x.id === heId);
        if (!h || h.vaciado_fabricacion) return;
        // Redirigir al módulo de fabricación con esta HE preseleccionada
        App.navigate('fabricacion');
        setTimeout(() => ModFabricacion && ModFabricacion.procesarHE(heId), 300);
    }

    function nextFolioHE() {
        if (!heData.length) return 'HE-002';
        const nums = heData.map(h => parseInt((h.folio||'').replace(/\D/g,'')) || 0);
        return `HE-${String(Math.max(...nums) + 1).padStart(3,'0')}`;
    }

    function fmtFecha(f) { if (!f) return '—'; return new Date(f + 'T12:00:00').toLocaleDateString('es-MX'); }
    function hoyISO() { return new Date().toISOString().split('T')[0]; }
    function badgeEstatusHE(e) {
        const map = { recibido:'badge-success', en_transito:'badge-warning', pendiente:'badge-gray' };
        return `<span class="badge ${map[e]||'badge-gray'}">${(e||'—').replace('_',' ')}</span>`;
    }
    function badgeEstadoPieza(e) {
        const map = { pendiente_clasificacion:'badge-warning', limpio_funcional:'badge-success', sucio_funcional:'badge-info', chatarra:'badge-danger' };
        return `<span class="badge ${map[e]||'badge-gray'}">${(e||'—').replace(/_/g,' ')}</span>`;
    }

    return {
        render,
        abrirDesdeContrato: (id) => abrirModal(id),
        procesarVaciado,
        getHE: () => heData,
    };
})();
