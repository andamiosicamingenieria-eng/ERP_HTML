/**
 * ICAM 360 - Módulo de Contratos (ops_contratos + ops_contratos_items)
 * Tipos: renta, venta, renovacion, venta_perdida, cancelacion
 * Genera PDF genérico con jsPDF
 */
window.ModContratos = (() => {

    let contratos = [];
    let filtro = '';
    let filtroTipo = '';
    let filtroEstatus = '';
    let expandedId = null;

    // Items seed por contrato
    const contratosItems = {};

    function render() {
        const mc = document.getElementById('module-content');
        mc.innerHTML = `
        <div class="page-toolbar">
            <div class="page-toolbar-left">
                <div class="search-box">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="cont-search" type="text" placeholder="Folio, cliente, agente…" value="${filtro}">
                </div>
                <select id="cont-tipo-filter" class="form-control" style="width:auto">
                    <option value="">Todos los tipos</option>
                    <option value="renta">Renta</option>
                    <option value="venta">Venta</option>
                    <option value="renovacion">Renovación</option>
                    <option value="venta_perdida">Venta Perdida</option>
                    <option value="cancelacion">Cancelación</option>
                </select>
                <select id="cont-est-filter" class="form-control" style="width:auto">
                    <option value="">Todos los estatus</option>
                    <option value="borrador">Borrador</option>
                    <option value="activo">Activo</option>
                    <option value="entrega_parcial">Entrega Parcial</option>
                    <option value="recolectado">Recolectado</option>
                    <option value="renovacion">Renovación</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            <div class="page-toolbar-right">
                <button class="btn btn-primary" id="btn-nuevo-cont">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo Contrato
                </button>
            </div>
        </div>
        <div class="table-wrapper">
            <table id="cont-table">
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Importe</th>
                        <th>Saldo</th>
                        <th>Pago</th>
                        <th>Estatus</th>
                        <th>Vencimiento</th>
                    </tr>
                </thead>
                <tbody id="cont-tbody"></tbody>
            </table>
        </div>`;

        document.getElementById('cont-search').addEventListener('input', e => { filtro = e.target.value; renderTabla(); });
        document.getElementById('cont-tipo-filter').addEventListener('change', e => { filtroTipo = e.target.value; renderTabla(); });
        document.getElementById('cont-est-filter').addEventListener('change', e => { filtroEstatus = e.target.value; renderTabla(); });
        document.getElementById('btn-nuevo-cont').addEventListener('click', () => abrirModal());

        cargarContratos();
    }

    async function cargarContratos() {
        const raw = await DB.getAll('ops_contratos', { orderBy: 'folio', ascending: false });
        contratos = raw || dataSeed();
        // Seed items
        contratos.forEach(c => { if (!contratosItems[c.id]) contratosItems[c.id] = itemsSeed(c); });
        renderTabla();
    }

    function dataSeed() {
        const hoy = new Date();
        const fmtDate = d => d.toISOString().split('T')[0];
        const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
        return [
            { id: 1, folio: '20001', cliente_id: 1, tipo_contrato: 'renta', estatus: 'activo', fecha_contrato: fmtDate(addDays(hoy,-45)), fecha_inicio_real: fmtDate(addDays(hoy,-40)), fecha_vencimiento: fmtDate(addDays(hoy,20)), dias_renta: 60, monto_total: 85000, vendedor: 'Carlos Hdz', razon_social: 'CONSTRUCTORA TORRES DEL NORTE SA DE CV' },
            { id: 2, folio: '20002', cliente_id: 2, tipo_contrato: 'renta', estatus: 'entrega_parcial', fecha_contrato: fmtDate(addDays(hoy,-10)), fecha_inicio_real: fmtDate(addDays(hoy,-5)), fecha_vencimiento: fmtDate(addDays(hoy,3)), dias_renta: 30, monto_total: 42000, vendedor: 'Ana Martínez', razon_social: 'EDIFICACIONES MONTERREY SA DE CV' },
            { id: 3, folio: '20003', cliente_id: 4, tipo_contrato: 'venta', estatus: 'activo', fecha_contrato: fmtDate(addDays(hoy,-5)), fecha_inicio_real: null, fecha_vencimiento: null, dias_renta: null, monto_total: 320000, vendedor: 'Carlos Hdz', razon_social: 'INMOBILIARIA NUEVA ÉPOCA SC' },
            { id: 4, folio: '20004', cliente_id: 1, tipo_contrato: 'renovacion', estatus: 'activo', fecha_contrato: fmtDate(hoy), fecha_inicio_real: fmtDate(hoy), fecha_vencimiento: fmtDate(addDays(hoy,60)), dias_renta: 60, monto_total: 90000, vendedor: 'Carlos Hdz', razon_social: 'CONSTRUCTORA TORRES DEL NORTE SA DE CV' },
        ];
    }

    function itemsSeed(c) {
        const prods = ModProductos ? ModProductos.getProductos() : [];
        if (!prods.length) return [];
        return [
            { id: 1, producto_id: 1, codigo: 'AND-001', nombre: 'Andamio Tubular 1.56x1.00m', cantidad: 50, precio_unitario: 85 },
            { id: 2, producto_id: 3, codigo: 'TAB-001', nombre: 'Tablón de Madera 3.00m', cantidad: 30, precio_unitario: 35 },
        ];
    }

    function renderTabla() {
        const tbody = document.getElementById('cont-tbody');
        if (!tbody) return;
        const f = filtro.toLowerCase();
        let data = contratos.filter(c =>
            (c.folio || '').includes(f) ||
            (c.razon_social || '').toLowerCase().includes(f) ||
            (c.vendedor || '').toLowerCase().includes(f)
        );
        if (filtroTipo) data = data.filter(c => c.tipo_contrato === filtroTipo);
        if (filtroEstatus) data = data.filter(c => c.estatus === filtroEstatus);

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>Sin contratos</h3><p>Crea el primer contrato presionando "Nuevo Contrato".</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => {
            const rowHTML = `
            <tr>
                <td class="td-mono">${c.folio}</td>
                <td><strong style="color:var(--text-main)">${c.razon_social || '—'}</strong></td>
                <td>${badgeTipo(c.tipo_contrato)}</td>
                <td class="td-mono">$${Number(c.monto_total||0).toLocaleString('es-MX')}</td>
                <td class="td-mono" style="color:${((c.monto_total||0)-(c.anticipo||0))>0?'var(--danger)':'var(--text-muted)'}">
                    $${Number((c.monto_total||0)-(c.anticipo||0)).toLocaleString('es-MX')}
                </td>
                <td>${badgePago(c.estatus_pago)}</td>
                <td>${badgeEstatus(c.estatus)}</td>
                <td style="font-size:0.85rem">${c.fecha_vencimiento ? `<span style="color:${colorVencimiento(c.fecha_vencimiento)};font-weight:600">${fmtFecha(c.fecha_vencimiento)}</span>` : '—'}</td>
            </tr>`;

            const detailHTML = expandedId === c.id ? `
            <tr class="row-detail-container" data-for="${c.id}">
                <td colspan="8">
                    <div class="row-detail">
                        ${renderDetalle(c)}
                    </div>
                </td>
            </tr>` : '';

            return rowHTML + detailHTML;
        }).join('');

        // Clicks en filas
        document.querySelectorAll('.cont-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = parseInt(row.dataset.id);
                expandedId = expandedId === id ? null : id;
                renderTabla();
            });
        });

        // Botones dentro del detalle
        document.querySelectorAll('.btn-pdf-contrato').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); generarPDF(parseInt(btn.dataset.id)); });
        });
        document.querySelectorAll('.btn-edit-contrato').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); abrirModal(parseInt(btn.dataset.id)); });
        });
    }

    function renderDetalle(c) {
        const items = contratosItems[c.id] || [];
        return `
        <div class="form-row cols-3" style="margin-bottom:1rem">
            <div><span class="stat-label">Folio Raíz</span><div class="td-mono">${c.folio_raiz || c.folio}</div></div>
            <div><span class="stat-label">Días de Renta</span><div>${c.dias_renta || '—'} días</div></div>
            <div><span class="stat-label">Precio/Día</span><div class="td-mono">$${Number(c.precio_por_dia || (c.monto_total && c.dias_renta ? c.monto_total/c.dias_renta : 0)).toLocaleString('es-MX',{minimumFractionDigits:2})}</div></div>
        </div>
        <div style="font-weight:600;color:var(--text-secondary);font-size:0.775rem;text-transform:uppercase;margin-bottom:.5rem">Ítems del Contrato</div>
        <table class="items-table-mini">
            <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Precio/día</th><th>Importe</th></tr></thead>
            <tbody>${items.map(i => `<tr>
                <td class="td-mono">${i.codigo}</td>
                <td>${i.nombre}</td>
                <td>${i.cantidad}</td>
                <td class="td-mono">$${Number(i.precio_unitario||0).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                <td class="td-mono">$${Number((i.cantidad||0)*(i.precio_unitario||0)).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin ítems registrados</td></tr>'}</tbody>
        </table>
        <div class="flex gap-2 mt-4">
            <button class="btn btn-secondary btn-sm btn-edit-contrato" data-id="${c.id}">✏ Editar</button>
            <button class="btn btn-secondary btn-sm btn-pdf-contrato" data-id="${c.id}">📄 Generar PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="ModHS.abrirDesdeContrato(${c.id})">🚛 + HS</button>
            <button class="btn btn-secondary btn-sm" onclick="ModHE.abrirDesdeContrato(${c.id})">📥 + HE</button>
        </div>`;
    }

    // ── Modal Crear/Editar Contrato ───────────────────
    async function abrirModal(contratoId = null) {
        // Asegurar que los catálogos estén cargados si se entra directo
        if (ModClientes && ModClientes.getClientes().length === 0) await ModClientes.cargar();
        if (ModProductos && ModProductos.getProductos().length === 0) await ModProductos.cargar();

        const c = contratoId ? contratos.find(x => x.id === contratoId) : null;
        const clientes = ModClientes ? ModClientes.getClientes() : [];
        const productos = ModProductos ? ModProductos.getProductos() : [];
        const items = contratoId ? (contratosItems[contratoId] || []) : [];

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-contrato';
        overlay.innerHTML = `
        <div class="modal modal-xl">
            <div class="modal-header">
                <div>
                    <div class="modal-title">${c ? `Editar Contrato ${c.folio}` : 'Nuevo Contrato'}</div>
                    <div class="modal-subtitle">Complete todos los campos del contrato</div>
                </div>
                <button class="modal-close" onclick="document.getElementById('modal-contrato').remove()">✕</button>
            </div>
            <div class="modal-body">

                <!-- TIPO DE CONTRATO con alerta especial -->
                <div class="form-row cols-3" style="margin-bottom:1.25rem">
                    <div class="form-group">
                        <label class="form-label">Tipo de Contrato <span class="required">*</span></label>
                        <select id="c-tipo" class="form-control">
                            <option value="renta" ${c?.tipo_contrato==='renta'?'selected':''}>🏗 Renta</option>
                            <option value="venta" ${c?.tipo_contrato==='venta'?'selected':''}>🛒 Venta</option>
                            <option value="renovacion" ${c?.tipo_contrato==='renovacion'?'selected':''}>🔄 Renovación</option>
                            <option value="venta_perdida" ${c?.tipo_contrato==='venta_perdida'?'selected':''}>⚠ Venta por Pérdida</option>
                            <option value="cancelacion" ${c?.tipo_contrato==='cancelacion'?'selected':''}>❌ Cancelación</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Folio</label>
                        <input id="c-folio" class="form-control td-mono" placeholder="Auto-generado" value="${c?.folio || nextFolio()}" ${c?'readonly':''}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estatus</label>
                        <select id="c-estatus" class="form-control">
                            ${['borrador','activo','entrega_parcial','recolectado','renovacion','cancelado'].map(s =>
                                `<option value="${s}" ${c?.estatus===s?'selected':''}>${s.replace('_',' ').toUpperCase()}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div id="alerta-venta-perdida" class="alert alert-warning" style="display:none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>⚠ <strong>Venta por Pérdida:</strong> Al guardar se generará automáticamente una HE y HS para afectar el inventario.</span>
                </div>

                <div class="form-row cols-2">
                    <div class="form-group">
                        <label class="form-label">Cliente <span class="required">*</span></label>
                        <select id="c-cliente" class="form-control">
                            <option value="">— Selecciona cliente —</option>
                            ${clientes.map(cl => `<option value="${cl.id}" ${c?.cliente_id===cl.id?'selected':''}>${cl.razon_social}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Agente de Ventas</label>
                        <input id="c-vendedor" class="form-control" placeholder="Nombre del agente" value="${c?.vendedor||''}">
                    </div>
                </div>

                <div class="form-row cols-4">
                    <div class="form-group">
                        <label class="form-label">Fecha de Contrato</label>
                        <input id="c-fecha-contrato" type="date" class="form-control" value="${c?.fecha_contrato || hoyISO()}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha de Inicio Real</label>
                        <input id="c-fecha-inicio" type="date" class="form-control" value="${c?.fecha_inicio_real||''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Días de Renta</label>
                        <input id="c-dias" type="number" class="form-control" placeholder="30" value="${c?.dias_renta||''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Vencimiento (calculado)</label>
                        <input id="c-vencimiento" type="date" class="form-control" readonly style="background:var(--bg-elevated)" value="${c?.fecha_vencimiento||''}">
                    </div>
                </div>

                <div class="form-row cols-3">
                    <div class="form-group">
                        <label class="form-label">Monto Total ($)</label>
                        <input id="c-monto" type="number" step="0.01" class="form-control" placeholder="0.00" value="${c?.monto_total||''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Anticipo ($)</label>
                        <input id="c-anticipo" type="number" step="0.01" class="form-control" placeholder="0.00" value="${c?.anticipo||''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Precio por Día ($)</label>
                        <input id="c-precio-dia" type="number" step="0.01" class="form-control" readonly style="background:var(--bg-elevated)" value="">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Dirección de Servicio</label>
                    <textarea id="c-dir" class="form-control">${c?.direccion_servicio||''}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea id="c-notas" class="form-control">${c?.notas||''}</textarea>
                </div>

                <hr class="divider">

                <!-- ITEMS DEL CONTRATO -->
                <div class="flex justify-between items-center mb-3">
                    <div style="font-weight:700;color:var(--text-main)">Ítems del Contrato</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-add-item">+ Agregar Item</button>
                </div>
                <div id="cont-items-container">
                    <table class="items-table-mini">
                        <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio/Día</th><th>Importe</th><th></th></tr></thead>
                        <tbody id="cont-items-tbody">
                            ${items.map((it, idx) => renderItemRow(it, idx, productos)).join('')}
                        </tbody>
                    </table>
                </div>

            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-contrato').remove()">Cancelar</button>
                <button class="btn btn-primary" id="btn-guardar-cont">Guardar Contrato</button>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        // Calc vencimiento dinámico
        const calcVenc = () => {
            const inicio = document.getElementById('c-fecha-inicio').value;
            const dias = parseInt(document.getElementById('c-dias').value);
            if (inicio && dias) {
                const d = new Date(inicio + 'T12:00:00');
                d.setDate(d.getDate() + dias);
                document.getElementById('c-vencimiento').value = d.toISOString().split('T')[0];
            }
            const monto = parseFloat(document.getElementById('c-monto').value) || 0;
            if (monto && dias) document.getElementById('c-precio-dia').value = (monto / dias).toFixed(2);
        };
        document.getElementById('c-fecha-inicio').addEventListener('change', calcVenc);
        document.getElementById('c-dias').addEventListener('input', calcVenc);
        document.getElementById('c-monto').addEventListener('input', calcVenc);

        // Alerta venta perdida
        document.getElementById('c-tipo').addEventListener('change', e => {
            document.getElementById('alerta-venta-perdida').style.display = e.target.value === 'venta_perdida' ? 'flex' : 'none';
        });

        // Agregar item
        document.getElementById('btn-add-item').addEventListener('click', () => {
            const tb = document.getElementById('cont-items-tbody');
            const idx = tb.children.length;
            const row = document.createElement('tr');
            row.innerHTML = renderItemRow({ id: null, producto_id: '', cantidad: 1, precio_unitario: 0 }, idx, productos);
            tb.appendChild(row);
            attachItemEvents(row, productos);
        });

        // Attach events a items existentes
        document.querySelectorAll('#cont-items-tbody tr').forEach(row => attachItemEvents(row, productos));

        // Guardar
        document.getElementById('btn-guardar-cont').addEventListener('click', () => guardar(c?.id, items));
        if (c) calcVenc();
    }

    function renderItemRow(item, idx, productos) {
        return `
        <td>
            <select class="form-control item-prod" data-idx="${idx}" style="font-size:0.78rem">
                <option value="">— Producto —</option>
                ${(productos||[]).map(p => `<option value="${p.id}" data-precio="${p.precio_lista||0}" ${parseInt(item.producto_id)===p.id?'selected':''}>${p.codigo} — ${p.nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="number" class="form-control item-cant" value="${item.cantidad||1}" min="1" style="width:80px;font-size:0.78rem"></td>
        <td><input type="number" class="form-control item-precio" value="${item.precio_unitario||0}" step="0.01" style="width:100px;font-size:0.78rem"></td>
        <td class="td-mono item-total">$${Number((item.cantidad||0)*(item.precio_unitario||0)).toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
        <td><button type="button" class="btn btn-ghost btn-sm btn-del-item" style="color:var(--danger)">✕</button></td>`;
    }

    function attachItemEvents(row, productos) {
        const selProd = row.querySelector('.item-prod');
        const inCant  = row.querySelector('.item-cant');
        const inPrec  = row.querySelector('.item-precio');
        const tdTotal = row.querySelector('.item-total');
        const btnDel  = row.querySelector('.btn-del-item');

        const calcTotal = () => {
            const cant = parseFloat(inCant.value) || 0;
            const prec = parseFloat(inPrec.value) || 0;
            tdTotal.textContent = '$' + (cant * prec).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        };

        selProd?.addEventListener('change', () => {
            const opt = selProd.options[selProd.selectedIndex];
            if (opt.dataset.precio) inPrec.value = opt.dataset.precio;
            calcTotal();
        });
        inCant?.addEventListener('input', calcTotal);
        inPrec?.addEventListener('input', calcTotal);
        btnDel?.addEventListener('click', () => { row.remove(); });
    }

    async function guardar(id = null, prevItems = []) {
        const clienteId = parseInt(document.getElementById('c-cliente').value);
        if (!clienteId) { App.toast('Selecciona un cliente', 'danger'); return; }

        const tipo = document.getElementById('c-tipo').value;
        const clientes = ModClientes.getClientes();
        const cliente = clientes.find(c => c.id === clienteId);

        // Recoger items
        const items = [];
        document.querySelectorAll('#cont-items-tbody tr').forEach(row => {
            const sel = row.querySelector('.item-prod');
            const cant = row.querySelector('.item-cant');
            const prec = row.querySelector('.item-precio');
            if (sel && cant && prec && sel.value) {
                const opt = sel.options[sel.selectedIndex];
                items.push({
                    producto_id: parseInt(sel.value),
                    codigo: opt.text.split(' — ')[0],
                    nombre: opt.text.split(' — ')[1] || '',
                    cantidad: parseFloat(cant.value) || 0,
                    precio_unitario: parseFloat(prec.value) || 0,
                });
            }
        });

        const payload = {
            folio: document.getElementById('c-folio').value.trim(),
            cliente_id: clienteId,
            razon_social: cliente?.razon_social || '',
            tipo_contrato: tipo,
            estatus: document.getElementById('c-estatus').value,
            fecha_contrato: document.getElementById('c-fecha-contrato').value || null,
            fecha_inicio_real: document.getElementById('c-fecha-inicio').value || null,
            dias_renta: parseInt(document.getElementById('c-dias').value) || null,
            // fecha_vencimiento se omite porque es autogenerada en la BD
            monto_total: parseFloat(document.getElementById('c-monto').value) || 0,
            anticipo: parseFloat(document.getElementById('c-anticipo').value) || 0,
            vendedor: document.getElementById('c-vendedor').value.trim() || null,
            direccion_servicio: document.getElementById('c-dir').value.trim() || null,
            notas: document.getElementById('c-notas').value.trim() || null,
            items: items,
            estatus_pago: (parseFloat(document.getElementById('c-anticipo').value) || 0) >= (parseFloat(document.getElementById('c-monto').value) || 0) ? 'liquidado' : ((parseFloat(document.getElementById('c-anticipo').value) || 0) > 0 ? 'parcial' : 'pendiente')
        };

        if (id) {
            const res = await DB.update('ops_contratos', id, payload);
            if (res.error) {
                App.toast('Error al actualizar: ' + res.error, 'danger');
                return;
            }
            const idx = contratos.findIndex(c => c.id === id);
            contratos[idx] = { ...contratos[idx], ...payload };
            contratosItems[id] = items;
            App.toast('Contrato actualizado', 'success');
        } else {
            const res = await DB.insert('ops_contratos', payload);
            if (res.error) {
                App.toast('Error al guardar: ' + res.error, 'danger');
                return;
            }
            // Sincronizar con el ID real de la BD
            const nuevo = { ...res }; 
            contratos.push(nuevo);
            contratosItems[nuevo.id] = items;

            // Lógica de Venta por Pérdida
            if (tipo === 'venta_perdida') {
                await procesarVentaPerdida(nuevo, items);
            }
            App.toast('Contrato creado', 'success');
        }

        document.getElementById('modal-contrato').remove();
        expandedId = null;
        renderTabla();
    }

    async function procesarVentaPerdida(contrato, items) {
        // Generar folio HS automática
        const folioHS = `HSP-${contrato.folio}`;
        const folioHE = `HEP-${contrato.folio}`;

        // Registrar HS automática (pérdida = salida definitiva)
        const hs = {
            folio: folioHS,
            contrato_id: contrato.id,
            tipo: 'venta_perdida',
            fecha: contrato.fecha_contrato,
            notas: `HS automática por Venta por Pérdida del contrato ${contrato.folio}`,
            items,
        };
        await DB.insert('ops_hs', hs);

        App.toast(`⚠ Venta por Pérdida: HS ${folioHS} generada automáticamente`, 'warning');
    }

    // ── Generación de PDF ─────────────────────────────
    function generarPDF(contratoId) {
        const c = contratos.find(x => x.id === contratoId);
        if (!c) return;
        const items = contratosItems[contratoId] || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 220, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('ICAM 360', 14, 14);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('ERP de Andamios — Contrato de Renta/Venta', 14, 22);
        doc.text(`Folio: ${c.folio}`, 160, 14);

        // Datos contrato
        doc.setTextColor(0, 0, 0);
        let y = 40;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Información del Contrato', 14, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const datos = [
            ['Cliente:', c.razon_social || '—'],
            ['Tipo:', c.tipo_contrato?.toUpperCase() || '—'],
            ['Estatus:', c.estatus?.toUpperCase() || '—'],
            ['Fecha de Contrato:', fmtFecha(c.fecha_contrato)],
            ['Inicio de Renta:', fmtFecha(c.fecha_inicio_real)],
            ['Vencimiento:', fmtFecha(c.fecha_vencimiento)],
            ['Días de Renta:', c.dias_renta ? `${c.dias_renta} días` : '—'],
            ['Monto Total:', `$${Number(c.monto_total||0).toLocaleString('es-MX', {minimumFractionDigits:2})}`],
            ['Anticipo:', `$${Number(c.anticipo||0).toLocaleString('es-MX', {minimumFractionDigits:2})}`],
            ['Saldo:', `$${Number((c.monto_total||0)-(c.anticipo||0)).toLocaleString('es-MX', {minimumFractionDigits:2})}`],
            ['Agente:', c.vendedor || '—'],
        ];

        datos.forEach(([lbl, val]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(lbl, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(val, 70, y);
            y += 7;
        });

        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Detalle de Ítems', 14, y);
        y += 8;

        // Tabla de items
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 4, 182, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Código', 16, y);
        doc.text('Descripción', 45, y);
        doc.text('Cant.', 130, y);
        doc.text('P/Día', 150, y);
        doc.text('Importe', 170, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        items.forEach(it => {
            doc.text(it.codigo || '', 16, y);
            const nombre = it.nombre || '';
            doc.text(nombre.length > 40 ? nombre.substring(0, 40) + '…' : nombre, 45, y);
            doc.text(String(it.cantidad || 0), 130, y);
            doc.text(`$${Number(it.precio_unitario||0).toFixed(2)}`, 150, y);
            doc.text(`$${Number((it.cantidad||0)*(it.precio_unitario||0)).toLocaleString('es-MX',{minimumFractionDigits:2})}`, 170, y);
            y += 7;
        });

        // Footer
        y = 270;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`ICAM 360 — Documento generado el ${new Date().toLocaleDateString('es-MX')}`, 14, y);
        doc.text('Este es un documento genérico. La plantilla oficial estará disponible próximamente.', 14, y + 5);

        doc.save(`Contrato_${c.folio}.pdf`);
        App.toast(`PDF del contrato ${c.folio} descargado`, 'success');
    }

    // ── Utilidades ────────────────────────────────────
    function nextFolio() {
        if (!contratos.length) return '20001';
        return String(Math.max(...contratos.map(c => parseInt(c.folio) || 20000)) + 1);
    }
    function hoyISO() { return new Date().toISOString().split('T')[0]; }
    function fmtFecha(f) { if (!f) return '—'; return new Date(f + 'T12:00:00').toLocaleDateString('es-MX'); }
    function colorVencimiento(f) {
        const dias = Math.ceil((new Date(f + 'T12:00:00') - new Date()) / 86400000);
        if (dias < 0) return 'var(--danger)';
        if (dias <= 5) return 'var(--warning)';
        return 'var(--success)';
    }
    function badgeTipo(t) {
        const map = { renta:'badge-info', venta:'badge-purple', renovacion:'badge-primary', venta_perdida:'badge-danger', cancelacion:'badge-gray' };
        return `<span class="badge ${map[t]||'badge-gray'}">${(t||'—').replace('_',' ')}</span>`;
    }
    function badgeEstatus(e) {
        const map = { activo:'badge-success', entrega_parcial:'badge-warning', recolectado:'badge-success', borrador:'badge-gray', renovacion:'badge-primary', cancelado:'badge-gray' };
        return `<span class="badge ${map[e]||'badge-gray'}">${(e||'—').replace('_',' ')}</span>`;
    }

    function badgePago(p) {
        const map = { pendiente:'badge-danger', parcial:'badge-warning', liquidado:'badge-success' };
        return `<span class="badge ${map[p]||'badge-danger'}">${(p||'pendiente').toUpperCase()}</span>`;
    }

    return { render, getContratos: () => contratos, getItems: id => contratosItems[id] || [], generarPDF };
})();
