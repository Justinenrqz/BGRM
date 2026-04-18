async function fetchReviews() {
    try {
        const response = await fetch('/review-status');
        if (!response.ok) throw new Error('Error al obtener datos');
        
        const data = await response.json();
        renderStats(data);
        renderTable(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reviews-body').innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:red; padding:40px;">
                    ⚠️ No se pudieron cargar los datos. Asegúrate de que el servidor esté encendido.
                </td>
            </tr>
        `;
    }
}

function renderStats(data) {
    const totalSent = data.length;
    const totalClicks = data.filter(r => r.clicked).length;
    const conversionRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : 0;

    document.getElementById('total-sent').textContent = totalSent;
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
}

function renderTable(data) {
    const tbody = document.getElementById('reviews-body');
    tbody.innerHTML = '';

    // Ordenar por fecha (más reciente primero)
    const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (sortedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:#64748b;">No hay registros de envíos todavía.</td></tr>';
        return;
    }

    sortedData.forEach(record => {
        const tr = document.createElement('tr');
        
        const dateSent = new Date(record.timestamp).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const dateClicked = record.clickTimestamp ? new Date(record.clickTimestamp).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '-';

        const statusBadge = record.clicked 
            ? `<span class="badge badge-clicked">✅ CLIC REGISTRADO</span>` 
            : `<span class="badge badge-pending">⏳ PENDIENTE</span>`;

        tr.innerHTML = `
            <td><strong>${record.email}</strong></td>
            <td class="timestamp">${dateSent}</td>
            <td>${statusBadge}</td>
            <td class="timestamp">${dateClicked}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Inicializar y configurar botón de refresco
document.getElementById('refresh-btn').addEventListener('click', () => {
    const btn = document.getElementById('refresh-btn');
    btn.textContent = '⌛ Cargando...';
    btn.disabled = true;
    
    fetchReviews().finally(() => {
        btn.innerHTML = '🔄 Actualizar';
        btn.disabled = false;
    });
});

// Carga inicial
fetchReviews();
