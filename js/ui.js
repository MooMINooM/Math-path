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
    
    // ตั้งค่าจุดศูนย์กลางและรัศมี (ลด radius ลงเล็กน้อยเพื่อให้ text ไม่ตกขอบ)
    const center = 225;
    const maxRadius = 160; 
    
    // กำหนด 6 แกนสมรรถภาพ
    const categories = [
        { key: 'numerical', name: 'จำนวน & คำนวณ', score: scores.numerical || 0 },
        { key: 'algebraic', name: 'พีชคณิต', score: scores.algebraic || 0 },
        { key: 'visual', name: 'มิติสัมพันธ์', score: scores.visual || 0 },
        { key: 'data', name: 'ข้อมูล & สถิติ', score: scores.data || 0 },
        { key: 'logical', name: 'ตรรกะ', score: scores.logical || 0 },
        { key: 'applied', name: 'การประยุกต์', score: scores.applied || 0 }
    ];
    
    const totalAxes = categories.length; // 6
    let html = '';
    
    // 1. วาดเส้น Grid (วงรอบๆ ทีละ 20%)
    for (let r = 20; r <= 100; r += 20) {
        const radius = (r / 100) * maxRadius;
        let points = [];
        categories.forEach((_, i) => {
            // คำนวณมุม: เริ่มที่ -90 องศา (ด้านบนสุด) แล้ววนตามเข็มนาฬิกา
            const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
            points.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
        });
        
        // วาดเส้น Polygon จางๆ
        html += `<polygon points="${points.join(' ')}" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>`; 
        
        // ใส่ตัวเลข % บอกระดับ (เฉพาะวงนอกสุด)
        if (r === 100) {
            html += `<text x="${center + 5}" y="${center - radius + 15}" class="text-[10px] fill-gray-400" font-family="Mali">${r}%</text>`;
        }
    }

    // 2. วาดแกนและชื่อกำกับ (Axes & Labels)
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;
        
        // เส้นแกนประ
        html += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="4 4"/>`;
        
        // คำนวณตำแหน่งข้อความ (ดันออกไปจากปลายแกนอีกนิดหน่อย)
        const textRadius = maxRadius + 35;
        const lx = center + Math.cos(angle) * textRadius;
        const ly = center + Math.sin(angle) * textRadius;
        
        html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" class="text-sm font-bold fill-gray-600" font-family="Mali">${cat.name}</text>`;
    });

    // 3. วาดพื้นที่ข้อมูล (Data Polygon) - สีม่วงโปร่งใส
    let dataPoints = [];
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        // แปลง score เต็ม 100 เป็นรัศมี
        const radius = (cat.score / 100) * maxRadius;
        dataPoints.push(`${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`);
    });
    
    html += `<polygon points="${dataPoints.join(' ')}" fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" stroke-width="3"/>`;

    // 4. วาดจุดข้อมูล (Data Dots) - จุดกลมๆ ตามมุม
    categories.forEach((cat, i) => {
        const angle = (Math.PI * 2 * i / totalAxes) - (Math.PI / 2);
        const radius = (cat.score / 100) * maxRadius;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        html += `<circle cx="${x}" cy="${y}" r="5" fill="#a855f7" stroke="white" stroke-width="2"/>`;
    });

    svg.innerHTML = html;
}
