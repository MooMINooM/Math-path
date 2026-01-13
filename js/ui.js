// js/ui.js
export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(el => {
        el.classList.remove('text-purple-600', 'border-purple-500', 'bg-purple-50');
        el.classList.add('text-gray-600', 'border-transparent');
    });

    const content = document.getElementById(`content-${tabId}`);
    const btn = document.querySelector(`button[data-tab="${tabId}"]`);
    
    if (content) content.classList.remove('hidden');
    if (btn) {
        btn.classList.add('text-purple-600', 'border-purple-500', 'bg-purple-50');
        btn.classList.remove('text-gray-600', 'border-transparent');
    }
}

export function drawSpiderChart(scores) {
    const svg = document.getElementById('spider-chart');
    if(!svg) return;
    
    const center = 225;
    const maxRadius = 180;
    const categories = [
        { name: 'ง่าย', score: scores.easy || 0 },
        { name: 'ปานกลาง', score: scores.medium || 0 },
        { name: 'ยาก', score: scores.hard || 0 }
    ];
    
    let html = '';
    
    // Draw grid
    for (let r = 20; r <= 100; r += 20) {
        const radius = (r / 100) * maxRadius;
        let points = [];
        categories.forEach((_, i) => {
            const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
            points.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
        });
        html += `<polygon points="${points.join(' ')}" fill="none" stroke="#e5e7eb" stroke-width="2"/>`;
        if (r === 100) html += `<text x="${center + 10}" y="${center - radius - 10}" class="text-xs fill-gray-500" font-family="Mali">${r}%</text>`;
    }

    // Axes and Labels
    categories.forEach((cat, i) => {
        const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;
        html += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#d1d5db" stroke-width="2"/>`;
        
        const lx = center + Math.cos(angle) * (maxRadius + 30);
        const ly = center + Math.sin(angle) * (maxRadius + 30);
        html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" class="text-sm font-bold fill-purple-600" font-family="Mali">${cat.name}</text>`;
    });

    // Data Polygon
    let dataPoints = [];
    categories.forEach((cat, i) => {
        const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
        const radius = (cat.score / 100) * maxRadius;
        dataPoints.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
    });
    html += `<polygon points="${dataPoints.join(' ')}" fill="rgba(168, 85, 247, 0.3)" stroke="#a855f7" stroke-width="3"/>`;

    // Data Dots
    categories.forEach((cat, i) => {
        const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
        const radius = (cat.score / 100) * maxRadius;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        html += `<circle cx="${x}" cy="${y}" r="6" fill="#a855f7" stroke="white" stroke-width="2"/>`;
    });

    svg.innerHTML = html;
}