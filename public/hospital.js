// hospital.js - 修改后的版本
const wsUrl = "wss://fv-xhhv.onrender.com";  // 改成你的 Render WSS 地址
const ws = new WebSocket(wsUrl);

const statusElement = document.querySelector("#server-status");

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

// 接收后端消息
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'new_patient':
        case 'patient_added':
            // 更新医院端队列显示
            console.log("新患者挂号:", message.patient);
            // TODO: 更新页面表格或列表
            break;
        case 'patient_updated':
            console.log("患者状态更新:", message.patient);
            // TODO: 更新状态显示
            break;
        // 处理其他类型消息...
    }
};