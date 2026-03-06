let ws;
let patients = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    connectWebSocket();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

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

// WebSocket连接
// WebSocket连接
function connectWebSocket() {

    const wsUrl = "ws://localhost:4000";
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
        console.log('WebSocket连接成功');
        document.getElementById('connectionStatus').textContent = '已连接';
        document.getElementById('statusIndicator').classList.remove('disconnected');

        // 注册为医院端
        ws.send(JSON.stringify({
            type: 'register_client',
            clientType: 'hospital'
        }));
    };

    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };

    ws.onclose = function() {
        console.log('WebSocket连接断开');
        document.getElementById('connectionStatus').textContent = '连接断开';
        document.getElementById('statusIndicator').classList.add('disconnected');

        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket错误:', error);
    };
}

// 处理消息
function handleMessage(message) {
    switch (message.type) {
        case 'init_data':
            patients = message.patients;
            renderQueue();
            break;

        case 'patient_added':
            patients.push(message.data);
            renderQueue();
            showNotification(`新患者挂号：${message.data.name} - ${message.data.department}`);
            break;

        case 'patient_updated':
            const index = patients.findIndex(p => p.id === message.data.id);
            if (index !== -1) {
                patients[index] = message.data;
                renderQueue();
            }
            break;

        case 'patient_removed':
            const removeIndex = patients.findIndex(p => p.id === message.data.patientId);
            if (removeIndex !== -1) {
                patients.splice(removeIndex, 1);
                renderQueue();
            }
            break;
    }
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
                <button class="btn-action btn-call" onclick="callPatient(${patient.id})">叫号就诊</button>
                <button class="btn-action btn-cancel" onclick="cancelRegistration(${patient.id})">取消挂号</button>
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
            </div>
            ${actions}
        </div>
    `;
}

// 叫号
function callPatient(id) {
    const patient = patients.find(p => p.id === id);
    if (patient && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'call_patient',
            patientId: id
        }));
        showNotification(`正在呼叫：${patient.name}（${patient.queueNumber}号）`);
    }
}

// 完成就诊
function completeConsultation(id) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'complete_consultation',
            patientId: id
        }));
    }
}

// 取消挂号
function cancelRegistration(id) {
    if (confirm('确定要取消该挂号吗？')) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'cancel_registration',
                patientId: id
            }));
        }
    }
}

// 更新统计信息
function updateStats() {
    const total = patients.length;
    const waiting = patients.filter(p => p.status === '等待中').length;
    const consulting = patients.filter(p => p.status === '就诊中').length;
    const completed = patients.filter(p => p.status === '已完成').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('waitingCount').textContent = waiting;
    document.getElementById('consultingCount').textContent = consulting;
    document.getElementById('completedCount').textContent = completed;
}

// 显示通知
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('医院管理系统', { body: message });
    }
}

// 请求通知权限
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
