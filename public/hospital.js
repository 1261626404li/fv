document.addEventListener("DOMContentLoaded", () => {
    const statusElement = document.querySelector("#server-status");

    if (!statusElement) {
        console.error("请检查 HTML 是否包含 id='server-status'");
        return;
    }

    const wsUrl = "wss://fv-xhhv.onrender.com"; // 改成你的 Render WSS 地址
    const ws = new WebSocket(wsUrl);

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

    // 接收消息
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case "new_patient":
            case "patient_added":
                console.log("新患者挂号:", message.patient);
                if (typeof updatePatientQueue === "function") {
                    updatePatientQueue(message.patient);
                }
                break;

            case "patient_updated":
                console.log("患者状态更新:", message.patient);
                if (typeof updatePatientStatus === "function") {
                    updatePatientStatus(message.patient);
                }
                break;

            default:
                console.log("收到其他消息:", message);
        }
    };
});