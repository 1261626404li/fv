// server.js - MySQL 版本
const WebSocket = require("ws");
const mysql = require("mysql2");

// ====== 配置 MySQL 连接 ======
const db = mysql.createConnection({
  host: "gz-cdb-adv3exr5.sql.tencentcdb.com",  // 例如 172.16.0.11
  user: "root",          // 例如 cdb577682
  password: "414811246Li",        // 数据库用户密码
  database: "hospital",        // 数据库名
  port: 26251                   // MySQL 默认端口
});

// 测试数据库连接
db.connect(err => {
  if (err) {
    console.error("数据库连接失败:", err);
  } else {
    console.log("数据库连接成功");
  }
});

// ====== WebSocket 服务器 ======
const wss = new WebSocket.Server({ port: 4000 });
let clients = [];

wss.on("connection", ws => {
  clients.push(ws);
  console.log("新客户端连接");

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);

      // 新增患者
      if (data.type === "new_patient") {
        const p = data.patient;
        const sql = `
          INSERT INTO patients 
          (name, gender, age, phone, department, status, queue_number) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [p.name, p.gender, p.age, p.phone, p.department, p.status, p.queue_number], (err, result) => {
          if (err) {
            console.error("插入患者失败:", err);
          } else {
            p.id = result.insertId;  // 获取自增 ID
            broadcast({ type: "new_patient", patient: p });
          }
        });
      }

      // 更新患者状态
      if (data.type === "update_status") {
        const sql = `UPDATE patients SET status=? WHERE id=?`;
        db.query(sql, [data.status, data.id], (err) => {
          if (err) console.error("更新状态失败:", err);
          else broadcast({ type: "patient_updated", patient: { id: data.id, status: data.status } });
        });
      }

    } catch (err) {
      console.error("消息处理错误:", err);
    }
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
    console.log("客户端断开连接");
  });
});

// 广播消息给所有客户端
function broadcast(data) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(data));
    }
  });
}

console.log("WebSocket服务器运行在 ws://localhost:3000");