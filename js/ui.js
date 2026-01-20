// js/ui.js
export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // ซ่อนหน้าจอทำข้อสอบด้วย (กันอาการค้าง)
    const contentTest = document.getElementById('content-test');
    if (contentTest) contentTest.classList.add('hidden');

    document.querySelectorAll('.nav-tab').forEach(el => {
        el.classList.remove('text-purple-600', 'border-purple-500', 'bg-purple-50');
        el.classList.add('text-gray-600', 'border-transparent');
    });

    const content = document.getElementById(`content-${tabId}`);
    if (content) content.classList.remove('hidden');
}

export function drawSpiderChart(scores) {
    const svg = document.getElementById('spider-chart');
    if(!svg) return;
    
    const center = 225;
    const maxRadius = 140; 
    
    const categories = [
        { key: 'numerical', name: 'จำนวน & คำนวณ', score: scores.numerical || 0 },
        { key: 'algebraic', name: 'พีชคณิต', score: scores.algebraic || 0 },
        { key: 'visual', name: 'มิติสัมพันธ์', score: scores.visual || 0 },
        { key: 'data', name: 'ข้อมูล & สถิติ', score: scores.data || 0 },
        { key: 'logical', name: 'ตรรกะ', score: scores.logical || 0 },
        { key: 'applied', name: 'การประยุกต์', score: scores.applied || 0 }
    ];
    
    const totalAxes = categories.length;
    let html = '';
    
    // 1. วาดเส้น Grid (แบ่งเป็น 5 ระดับตาม Level 1-5)
    for (let r = 20; r <= 100; r += 20) {
        const radius = (r / 100) * maxRadius;
        let points = [];
        categories.forEach((_, i) => {
            const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
            points.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
        });
        html += `<polygon points="${points.join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2 2"/>`;
    }

    // 2. วาดแกนและข้อความ
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;
        html += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
        
        const textRadius = maxRadius + 35; 
        const lx = center + Math.cos(angle) * textRadius;
        const ly = center + Math.sin(angle) * textRadius;
        html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" style="font-size: 13px; font-weight: 700; fill: #64748b; font-family: 'Sarabun'">${cat.name}</text>`;
    });

    // 3. วาดพื้นที่คะแนน (Mastery Polygon)
    let dataPoints = [];
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        
        // กำหนดรัศมีขั้นต่ำ 10% เพื่อไม่ให้กราฟหายไปเลย และกันไม่ให้เกิน 100%
        const displayScore = Math.max(10, Math.min(cat.score, 100));
        const radius = (displayScore / 100) * maxRadius;
        dataPoints.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
    });
    
    // ใช้สีทองสไตล์หอจดหมายเหตุ พร้อม Drop Shadow
    html += `<polygon points="${dataPoints.join(' ')}" fill="rgba(197, 160, 89, 0.4)" stroke="#c5a059" stroke-width="3" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 3px rgba(197, 160, 89, 0.5))"/>`;

    // 4. วาดจุดคะแนน (Dots)
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        const displayScore = Math.max(10, Math.min(cat.score, 100));
        const radius = (displayScore / 100) * maxRadius;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        html += `<circle cx="${x}" cy="${y}" r="5" fill="#c5a059" stroke="white" stroke-width="2"/>`;
    });

    svg.innerHTML = html;
}
