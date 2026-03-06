// 患者数据存储
let patients = [];
let patientIdCounter = 1;

// 每个患者平均就诊时间（分钟）
const CONSULTATION_TIME = {
    '普通': 15,
    '专家': 30,
    '急诊': 10
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    loadFromLocalStorage();
    renderQueue();

    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
    document.getElementById('filterDepartment').addEventListener('change', renderQueue);
    document.getElementById('filterStatus').addEventListener('change', renderQueue);
});

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    document.getElementById('currentTime').textContent = timeString;
}

// 处理挂号提交
function handleRegistration(e) {
    e.preventDefault();

    const patient = {
        id: patientIdCounter++,
        name: document.getElementById('patientName').value,
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        phone: document.getElementById('phone').value,
        idCard: document.getElementById('idCard').value,
        department: document.getElementById('department').value,
        registrationType: document.getElementById('registrationType').value,
        symptoms: document.getElementById('symptoms').value,
        registrationTime: new Date().toISOString(),
        status: '等待中',
        queueNumber: patients.filter(p => p.department === document.getElementById('department').value && p.status !== '已完成').length + 1
    };

    patients.push(patient);
    saveToLocalStorage();
    renderQueue();

    document.getElementById('registrationForm').reset();
    alert(`挂号成功！\n姓名：${patient.name}\n科室：${patient.department}\n排队号：${patient.queueNumber}号`);
}

// 计算预计就诊时间
function calculateEstimatedTime(patient) {
    const sameDeptPatients = patients.filter(p =>
        p.department === patient.department &&
        p.status === '等待中' &&
        new Date(p.registrationTime) < new Date(patient.registrationTime)
    );

    let totalMinutes = 0;
    sameDeptPatients.forEach(p => {
        totalMinutes += CONSULTATION_TIME[p.registrationType];
    });

    const estimatedTime = new Date(new Date().getTime() + totalMinutes * 60000);
    return estimatedTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// 渲染队列
function renderQueue() {
    const queueList = document.getElementById('queueList');
    const filterDept = document.getElementById('filterDepartment').value;
    const filterStatus = document.getElementById('filterStatus').value;

    let filteredPatients = patients.filter(p => {
        if (filterDept && p.department !== filterDept) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        return true;
    });

    // 按挂号时间排序
    filteredPatients.sort((a, b) => new Date(a.registrationTime) - new Date(b.registrationTime));

    if (filteredPatients.length === 0) {
        queueList.innerHTML = '<div class="empty-state">暂无挂号记录</div>';
    } else {
        queueList.innerHTML = filteredPatients.map(patient => createPatientCard(patient)).join('');
    }

    updateStats();
}

// 创建患者卡片
function createPatientCard(patient) {
    const registrationTime = new Date(patient.registrationTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const estimatedTime = patient.status === '等待中' ? calculateEstimatedTime(patient) : '-';

    const statusClass = {
        '等待中': 'status-waiting',
        '就诊中': 'status-consulting',
        '已完成': 'status-completed'
    }[patient.status];

    const typeClass = {
        '普通': 'type-normal',
        '专家': 'type-expert',
        '急诊': 'type-emergency'
    }[patient.registrationType];

    let actions = '';
    if (patient.status === '等待中') {
        actions = `
            <div class="queue-item-actions">
                <button class="btn-action btn-call" onclick="callPatient(${patient.id})">叫号</button>
                <button class="btn-action btn-cancel" onclick="cancelRegistration(${patient.id})">取消</button>
            </div>
        `;
    } else if (patient.status === '就诊中') {
        actions = `
            <div class="queue-item-actions">
                <button class="btn-action btn-complete" onclick="completeConsultation(${patient.id})">完成就诊</button>
            </div>
        `;
    }

    return `
        <div class="queue-item">
            <div class="queue-item-header">
                <div>
                    <span class="queue-number">${patient.queueNumber}号</span>
                    <span class="patient-name">${patient.name}</span>
                    <span class="registration-type-badge ${typeClass}">${patient.registrationType}</span>
                </div>
                <span class="status-badge ${statusClass}">${patient.status}</span>
            </div>
            <div class="queue-item-info">
                <div class="info-item">
                    <span class="info-label">性别：</span>${patient.gender}
                </div>
                <div class="info-item">
                    <span class="info-label">年龄：</span>${patient.age}岁
                </div>
                <div class="info-item">
                    <span class="info-label">科室：</span>${patient.department}
                </div>
                <div class="info-item">
                    <span class="info-label">电话：</span>${patient.phone}
                </div>
            </div>
            ${patient.symptoms ? `<div style="font-size: 13px; color: #666; margin-top: 8px;"><span class="info-label">症状：</span>${patient.symptoms}</div>` : ''}
            <div class="queue-item-footer">
                <div>
                    <span class="info-label">挂号时间：</span>${registrationTime}
                </div>
                <div class="estimated-time">
                    ${patient.status === '等待中' ? `预计就诊：${estimatedTime}` : ''}
                </div>
            </div>
            ${actions}
        </div>
    `;
}

// 叫号
function callPatient(id) {
    const patient = patients.find(p => p.id === id);
    if (patient) {
        patient.status = '就诊中';
        saveToLocalStorage();
        renderQueue();
        alert(`正在呼叫：${patient.name}（${patient.queueNumber}号）\n请到${patient.department}就诊`);
    }
}

// 完成就诊
function completeConsultation(id) {
    const patient = patients.find(p => p.id === id);
    if (patient) {
        patient.status = '已完成';
        saveToLocalStorage();
        renderQueue();
    }
}

// 取消挂号
function cancelRegistration(id) {
    if (confirm('确定要取消该挂号吗？')) {
        const index = patients.findIndex(p => p.id === id);
        if (index !== -1) {
            patients.splice(index, 1);
            saveToLocalStorage();
            renderQueue();
        }
    }
}

// 更新统计信息
function updateStats() {
    const total = patients.length;
    const waiting = patients.filter(p => p.status === '等待中').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('waitingCount').textContent = waiting;
}

// 本地存储
function saveToLocalStorage() {
    localStorage.setItem('hospitalPatients', JSON.stringify(patients));
    localStorage.setItem('patientIdCounter', patientIdCounter);
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('hospitalPatients');
    if (saved) {
        patients = JSON.parse(saved);
    }

    const savedCounter = localStorage.getItem('patientIdCounter');
    if (savedCounter) {
        patientIdCounter = parseInt(savedCounter);
    }
}
