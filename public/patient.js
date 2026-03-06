document.addEventListener("DOMContentLoaded", () => {
    // DOM 元素
    const statusElement = document.querySelector("#server-status");
    const submitBtn = document.getElementById("submitBtn");

    if (!statusElement || !submitBtn) {
        console.error("请检查 HTML 是否包含 id='server-status' 和 id='submitBtn'");
        return;
    }

    // WebSocket 连接
    const wsUrl = "wss://fv-xhhv.onrender.com"; // 改成你的 Render 公网 WSS 地址
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

    // 提交按钮点击事件
    submitBtn.addEventListener("click", () => {
        if (ws.readyState !== WebSocket.OPEN) {
            alert("WebSocket 未连接，稍后重试");
            return;
        }

        const patient = {
            name: document.querySelector("#name")?.value || "",
            age: parseInt(document.querySelector("#age")?.value) || 0,
            gender: document.querySelector("#gender")?.value || "",
            phone: document.querySelector("#phone")?.value || "",
            department: document.querySelector("#department")?.value || "",
            status: "等待",
            queue_number: parseInt(document.querySelector("#queue_number")?.value) || 0
        };

        submitBtn.disabled = true;
        submitBtn.textContent = "提交中...";

        ws.send(JSON.stringify({
            type: "new_patient", // 与后端匹配
            patient: patient
        }));

        console.log("发送患者数据:", patient);
    });

    // 接收后端消息
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case "new_patient":
            case "patient_added":
                // 恢复按钮
                submitBtn.disabled = false;
                submitBtn.textContent = "提交挂号";

                // 更新页面队列显示（保留你原来的函数）
                if (typeof updatePatientQueue === "function") {
                    updatePatientQueue(message.patient);
                }

                console.log("患者已添加:", message.patient);
                break;

            case "patient_updated":
                if (typeof updatePatientStatus === "function") {
                    updatePatientStatus(message.patient);
                }
                break;

            default:
                console.log("收到其他消息:", message);
        }
    };
});