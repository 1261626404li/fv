let ws;
let currentPatient = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    connectWebSocket();

    document.getElementById('patientForm').addEventListener('submit', handleRegistration);

    // 检查是否有保存的挂号信息
    const savedPatient = localStorage.getItem('currentPatient');
    if (savedPatient) {
        currentPatient = JSON.parse(savedPatient);
        showQueueStatus();
        requestQueueStatus();
    }
});

// WebSocket连接
// WebSocket连接
function connectWebSocket() {

    const wsUrl = "ws://https://fv-xhhv.onrender.com/";
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
        console.log('WebSocket连接成功');
        document.getElementById('connectionStatus').textContent = '已连接';
        document.getElementById('statusIndicator').classList.remove('disconnected');
        document.getElementById('submitBtn').disabled = false;

        ws.send(JSON.stringify({
            type: 'register_client',
            clientType: 'patient'
        }));

        if (currentPatient) {
            requestQueueStatus();
        }
    };

    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };

    ws.onclose = function() {
        console.log('WebSocket连接断开');
        document.getElementById('connectionStatus').textContent = '连接断开';
        document.getElementById('statusIndicator').classList.add('disconnected');
        document.getElementById('submitBtn').disabled = true;

        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket错误:', error);
    };
}

// 处理消息
function handleMessage(message) {
    switch (message.type) {
        case 'registration_success':
            currentPatient = message.patient;
            localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
            showQueueStatus();
            updateQueueDisplay();
            break;

        case 'queue_status':
            if (currentPatient && message.patient.id === currentPatient.id) {
                currentPatient = message.patient;
                localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
                updateQueueDisplay(message.estimatedTime);
            }
            break;

        case 'patient_updated':
            if (currentPatient && message.data.id === currentPatient.id) {
                currentPatient = message.data;
                localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
                updateQueueDisplay();

                // 状态变化通知
                if (message.data.status === '就诊中') {
                    showNotification('请您前往就诊！', '您的号码已被叫号，请立即前往诊室就诊。');
                } else if (message.data.status === '已完成') {
                    showNotification('就诊完成', '感谢您的就诊，祝您早日康复！');
                }
            }
            break;

        case 'patient_removed':
            if (currentPatient && message.data.patientId === currentPatient.id) {
                alert('您的挂号已被取消');
                newRegistration();
            }
            break;
    }
}

// 处理挂号提交
function handleRegistration(e) {
    e.preventDefault();

    if (ws.readyState !== WebSocket.OPEN) {
        alert('网络连接断开，请稍后重试');
        return;
    }

    const patient = {
        name: document.getElementById('patientName').value,
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        phone: document.getElementById('phone').value,
        idCard: document.getElementById('idCard').value,
        department: document.getElementById('department').value,
        registrationType: document.getElementById('registrationType').value,
        symptoms: document.getElementById('symptoms').value
    };

    ws.send(JSON.stringify({
        type: 'add_patient',
        patient: patient
    }));

    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = '提交中...';
}

// 显示排队状态
function showQueueStatus() {
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('queueStatus').classList.add('active');
}

// 更新排队显示
function updateQueueDisplay(estimatedMinutes) {
    if (!currentPatient) return;

    document.getElementById('queueNumberDisplay').textContent = currentPatient.queueNumber + '号';
    document.getElementById('statusDepartment').textContent = currentPatient.department;
    document.getElementById('statusType').textContent = currentPatient.registrationType;

    // 更新状态徽章
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = currentPatient.status;
    statusBadge.className = 'status-badge';

    if (currentPatient.status === '等待中') {
        statusBadge.classList.add('status-waiting');
    } else if (currentPatient.status === '就诊中') {
        statusBadge.classList.add('status-consulting');
    } else if (currentPatient.status === '已完成') {
        statusBadge.classList.add('status-completed');
    }

    // 更新预计等待时间
    if (estimatedMinutes !== undefined && currentPatient.status === '等待中') {
        if (estimatedMinutes === 0) {
            document.getElementById('estimatedWait').textContent = '即将就诊';
        } else {
            document.getElementById('estimatedWait').textContent = `约 ${estimatedMinutes} 分钟`;
        }
    } else if (currentPatient.status === '就诊中') {
        document.getElementById('estimatedWait').textContent = '请立即就诊';
    } else if (currentPatient.status === '已完成') {
        document.getElementById('estimatedWait').textContent = '已完成';
    } else {
        document.getElementById('estimatedWait').textContent = '-';
    }

    // 更新患者信息
    document.getElementById('infoName').textContent = currentPatient.name;
    document.getElementById('infoGender').textContent = currentPatient.gender;
    document.getElementById('infoAge').textContent = currentPatient.age + '岁';
    document.getElementById('infoPhone').textContent = currentPatient.phone;
}

// 请求队列状态
function requestQueueStatus() {
    if (currentPatient && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'get_queue_status',
            patientId: currentPatient.id
        }));
    }
}

// 定期更新状态
setInterval(() => {
    if (currentPatient && currentPatient.status !== '已完成') {
        requestQueueStatus();
    }
}, 10000); // 每10秒更新一次

// 新挂号
function newRegistration() {
    currentPatient = null;
    localStorage.removeItem('currentPatient');

    document.getElementById('registrationForm').style.display = 'block';
    document.getElementById('queueStatus').classList.remove('active');

    document.getElementById('patientForm').reset();
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').textContent = '提交挂号';
}

// 显示通知
function showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
    } else {
        alert(`${title}\n${message}`);
    }
}

// 请求通知权限
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
