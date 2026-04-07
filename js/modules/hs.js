/**
 * ICAM 360 - Módulo Hojas de Salida (ops_hs + ops_hs_items)
 * Los ítems se pre-cargan desde el contrato seleccionado
 */
window.ModHS = (() => {
    let hsData = [];
    let filtro = '';

    function render() {
        const mc = document.getElementById('module-content');
        mc.innerHTML = `
        <div class="page-toolbar">
            <div class="page-toolbar-left">
                <div class="search-box">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="hs-search" type="text" placeholder="Folio HS, folio contrato, cliente…" value="${filtro}">
                </div>
            </div>
            <div class="page-toolbar-right">
                <button class="btn btn-primary" id="btn-nueva-hs">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nueva Hoja de Salida
                </button>
            </div>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Folio HS</th>
                        <th>Contrato</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Piezas Total</th>
                        <th>Estatus</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="hs-tbody">
                    <tr><td colspan="7"><div class="loading-center"><div class="spinner"></div></div></td></tr>
                </tbody>
            </table>
        </div>`;

        document.getElementById('hs-search').addEventListener('input', e => { filtro = e.target.value; renderTabla(); });
        document.getElementById('btn-nueva-hs').addEventListener('click', () => abrirModal());
        cargarHS();
    }

    async function cargarHS() {
        const raw = await DB.getAll('ops_hs', { orderBy: 'folio', ascending: false });
        hsData = raw || dataSeed();
        renderTabla();
    }

    function dataSeed() {
        return [
            { id: 1, folio: 'HS-001', contrato_folio: '20001', razon_social: 'CONSTRUCTORA TORRES DEL NORTE SA DE CV', fecha: '2026-03-15', total_piezas: 50, estatus: 'entregado', items: [{codigo:'AND-001',nombre:'Andamio Tubular 1.56x1.00m',cantidad:40,ya_entregado:0},{codigo:'TAB-001',nombre:'Tablón de Madera 3.00m',cantidad:30,ya_entregado:0}] },
            { id: 2, folio: 'HS-002', contrato_folio: '20002', razon_social: 'EDIFICACIONES MONTERREY SA DE CV', fecha: '2026-03-28', total_piezas: 20, estatus: 'entregado', items: [{codigo:'AND-001',nombre:'Andamio Tubular 1.56x1.00m',cantidad:20,ya_entregado:0}] },
        ];
    }

    function renderTabla() {
        const tbody = document.getElementById('hs-tbody');
        if (!tbody) return;
        const f = filtro.toLowerCase();
        const data = hsData.filter(h =>
            (h.folio||'').toLowerCase().includes(f) ||
            (h.contrato_folio||'').toLowerCase().includes(f) ||
            (h.razon_social||'').toLowerCase().includes(f)
        );
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <h3>Sin Hojas de Salida</h3><p>Crea la primera HS vinculada a un contrato.</p>
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
                <td>${badgeEstatusHS(h.estatus)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="ModHS.verDetalle(${h.id})">Ver detalle</button>
                </td>
            </tr>`).join('');
    }

    function abrirModal(contratoIdPresel = null) {
        const contratos = ModContratos ? ModContratos.getContratos() : [];
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-hs';
        overlay.innerHTML = `
        <div class="modal modal-xl">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Nueva Hoja de Salida (HS)</div>
                    <div class="modal-subtitle">Los ítems se cargan automáticamente desde el contrato</div>
                </div>
                <button class="modal-close" onclick="document.getElementById('modal-hs').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-row cols-3">
                    <div class="form-group">
                        <label class="form-label">Folio HS</label>
                        <input id="hs-folio" class="form-control td-mono" value="${nextFolioHS()}" readonly style="background:var(--bg-elevated)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contrato <span class="required">*</span></label>
                        <select id="hs-contrato" class="form-control">
                            <option value="">— Selecciona contrato —</option>
                            ${contratos.filter(c => ['activo','entrega_parcial','borrador'].includes(c.estatus)).map(c =>
                                `<option value="${c.id}" ${contratoIdPresel===c.id?'selected':''}>${c.folio} — ${c.razon_social}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha de Salida</label>
                        <input id="hs-fecha" type="date" class="form-control" value="${hoyISO()}">
                    </div>
                </div>

                <div class="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Selecciona un contrato para cargar automáticamente sus ítems pendientes de entrega.</span>
                </div>

                <div id="hs-items-zona" style="display:none">
                    <div style="font-weight:700;margin-bottom:.75rem;color:var(--text-main)">Detalle de Piezas a Entregar</div>
                    <table class="items-table-mini">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>En Contrato</th>
                                <th>Ya Entregado</th>
                                <th>Pendiente</th>
                                <th>Stock Disp.</th>
                                <th>A Entregar Ahora</th>
                            </tr>
                        </thead>
                        <tbody id="hs-items-tbody"></tbody>
                    </table>
                </div>

                <div class="form-group mt-4">
                    <label class="form-label">Notas</label>
                    <textarea id="hs-notas" class="form-control" placeholder="Observaciones, condiciones de entrega…"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-hs').remove()">Cancelar</button>
                <button class="btn btn-primary" id="btn-guardar-hs">Guardar Hoja de Salida</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        const selContrato = document.getElementById('hs-contrato');
        selContrato.addEventListener('change', () => cargarItemsContrato(selContrato.value));
        if (contratoIdPresel) cargarItemsContrato(String(contratoIdPresel));
        document.getElementById('btn-guardar-hs').addEventListener('click', guardarHS);
    }

    function cargarItemsContrato(contratoId) {
        const items = ModContratos.getItems(parseInt(contratoId));
        const zona = document.getElementById('hs-items-zona');
        const tbody = document.getElementById('hs-items-tbody');
        if (!items.length) { zona.style.display = 'none'; return; }
        zona.style.display = 'block';

        // Simular stock disponible del inventario
        const inv = ModInventario ? ModInventario.getStock() : {};

        tbody.innerHTML = items.map((it, i) => {
            const stock = inv[it.producto_id] || 999;
            const pendiente = it.cantidad - (it.ya_entregado || 0);
            return `<tr>
                <td class="td-mono">${it.codigo}</td>
                <td>${it.nombre}</td>
                <td class="td-mono">${it.cantidad}</td>
                <td class="td-mono">${it.ya_entregado || 0}</td>
                <td class="td-mono" style="font-weight:700;color:${pendiente>0?'var(--warning)':'var(--success)'}">${pendiente}</td>
                <td class="td-mono" style="color:${stock<pendiente?'var(--danger)':'var(--success)'}">
                    <span class="badge ${stock<pendiente?'badge-danger':'badge-success'}">${stock}</span>
                </td>
                <td>
                    <input type="number" class="form-control hs-cant-item" data-idx="${i}" data-max="${pendiente}" data-stock="${stock}"
                        value="${pendiente}" min="0" max="${Math.min(pendiente, stock)}" style="width:80px;font-size:0.78rem"
                        ${stock === 0 ? 'disabled style="background:var(--danger-light)"' : ''}>
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.hs-cant-item').forEach(inp => {
            inp.addEventListener('input', () => {
                const max = parseInt(inp.dataset.max);
                const stock = parseInt(inp.dataset.stock);
                const v = parseInt(inp.value) || 0;
                if (v > stock) {
                    inp.style.borderColor = 'var(--danger)';
                    inp.style.background = 'var(--danger-light)';
                } else {
                    inp.style.borderColor = '';
                    inp.style.background = '';
                }
            });
        });
    }

    async function guardarHS() {
        const contratoId = parseInt(document.getElementById('hs-contrato').value);
        if (!contratoId) { App.toast('Selecciona un contrato', 'danger'); return; }

        // Validar stock
        let error = false;
        document.querySelectorAll('.hs-cant-item').forEach(inp => {
            if (parseInt(inp.value) > parseInt(inp.dataset.stock)) error = true;
        });
        if (error) { App.toast('Cantidad supera el stock disponible', 'danger'); return; }

        const contratos = ModContratos.getContratos();
        const c = contratos.find(x => x.id === contratoId);

        const items = [];
        const contItems = ModContratos.getItems(contratoId);
        document.querySelectorAll('.hs-cant-item').forEach((inp, i) => {
            const it = contItems[i];
            if (it && parseInt(inp.value) > 0) {
                items.push({ ...it, cantidad_hs: parseInt(inp.value) });
            }
        });

        const nuevaHS = {
            id: Math.max(0, ...hsData.map(h => h.id)) + 1,
            folio: document.getElementById('hs-folio').value,
            contrato_folio: c?.folio,
            razon_social: c?.razon_social,
            fecha: document.getElementById('hs-fecha').value,
            total_piezas: items.reduce((s, i) => s + i.cantidad_hs, 0),
            estatus: 'entregado',
            notas: document.getElementById('hs-notas').value,
            items,
        };

        hsData.push(nuevaHS);
        await DB.insert('ops_hs', nuevaHS);
        document.getElementById('modal-hs').remove();
        App.toast(`Hoja de Salida ${nuevaHS.folio} registrada`, 'success');
        renderTabla();
    }

    function verDetalle(hsId) {
        const h = hsData.find(x => x.id === hsId);
        if (!h) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-hs-detalle';
        overlay.innerHTML = `
        <div class="modal modal-lg">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Hoja de Salida — ${h.folio}</div>
                    <div class="modal-subtitle">${h.razon_social} | Contrato: ${h.contrato_folio}</div>
                </div>
                <button class="modal-close" onclick="document.getElementById('modal-hs-detalle').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-row cols-3" style="margin-bottom:1rem">
                    <div><span class="stat-label">Fecha de Salida</span><div>${fmtFecha(h.fecha)}</div></div>
                    <div><span class="stat-label">Total Piezas</span><div class="td-mono">${h.total_piezas} pzas</div></div>
                    <div><span class="stat-label">Estatus</span><div>${badgeEstatusHS(h.estatus)}</div></div>
                </div>
                <table class="items-table-mini">
                    <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad Entregada</th></tr></thead>
                    <tbody>${(h.items||[]).map(i => `<tr>
                        <td class="td-mono">${i.codigo}</td>
                        <td>${i.nombre}</td>
                        <td class="td-mono">${i.cantidad_hs || i.cantidad}</td>
                    </tr>`).join('')}</tbody>
                </table>
                ${h.notas ? `<div class="alert alert-info mt-4"><span>${h.notas}</span></div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-hs-detalle').remove()">Cerrar</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    function nextFolioHS() {
        if (!hsData.length) return 'HS-003';
        const nums = hsData.map(h => parseInt((h.folio||'').replace(/\D/g,'')) || 0);
        return `HS-${String(Math.max(...nums) + 1).padStart(3,'0')}`;
    }

    function fmtFecha(f) { if (!f) return '—'; return new Date(f + 'T12:00:00').toLocaleDateString('es-MX'); }
    function hoyISO() { return new Date().toISOString().split('T')[0]; }
    function badgeEstatusHS(e) {
        const map = { entregado:'badge-success', parcial:'badge-warning', pendiente:'badge-gray', venta_perdida:'badge-danger' };
        return `<span class="badge ${map[e]||'badge-gray'}">${(e||'—').replace('_',' ')}</span>`;
    }

    return { render, abrirDesdeContrato: (id) => { abrirModal(id); }, getHS: () => hsData };
})();
