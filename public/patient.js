// patient.js - 修改后的版本
const wsUrl = "wss://fv-xhhv.onrender.com";  // 改成你的 Render WSS 地址
const ws = new WebSocket(wsUrl);

const statusElement = document.querySelector("#server-status");
const submitBtn = document.getElementById('submitBtn');

ws.onopen = () => {
    console.log("WebSocket 已连接");
    statusElement.textContent = "服务器已连接";
    statusElement.style.color = "green";
};

ws.onclose = () => {
    console.log("WebSocket 已断开");
    statusElement.textContent = "服务器已断开";
    statusElement.style.color = "red";
};

ws.onerror = (err) => {
    console.error("WebSocket 错误:", err);
};

// 提交按钮事件
submitBtn.addEventListener("click", () => {
    const patient = {
        name: document.querySelector("#name").value,
        age: document.querySelector("#age").value,
        gender: document.querySelector("#gender").value,
        phone: document.querySelector("#phone").value,
        department: document.querySelector("#department").value,
        status: "等待",
        queue_number: parseInt(document.querySelector("#queue_number").value) || 0
    };

    // 禁用按钮
    submitBtn.disabled = true;
    submitBtn.textContent = "提交中...";

    // 发送消息给后端，类型改为后端已处理的 'new_patient'
    ws.send(JSON.stringify({
        type: 'new_patient',
        patient: patient
    }));
});

// 接收后端消息
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'new_patient':
        case 'patient_added':
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = "提交挂号";
            // 可在这里更新页面队列显示
            console.log("患者已添加:", message.patient);
            break;
        // 处理其他类型消息...
    }
};