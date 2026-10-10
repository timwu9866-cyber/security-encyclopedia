# 节点覆盖对照:security-encyclopedia vs 对抗赛 scene3d_v3

参考来源(只读):`/workspace/topology/scene3d_v3/src/models.js`(32 种样式 / 6 大类)。
场景实际用到的样式按 `网络靶场2.5D场景_v3.html` 里的出现次数统计,32 种全部在用(SRV-APP 314、TERM-PC 106、TERM-WS 50 …… NET-ACC 3)。
承载设备(carriers)按类型映射到 NET-FW / NET-CORE / NET-AGG / NET-ACC。

结论(v6 的 37 种 → v7 的 53 种):**已覆盖 16 / 近似覆盖 11 / 缺失 5**。近似和缺失的 16 种在 v7 已全部补做,补完后 32/32 都有一一对应的模型。

| 对方代码 | 名称 | 对方大类 | 场景用量 | v6 状态 | v6 替代 | v7 对应 |
|---|---|---|---|---|---|---|
| NET-CORE | 核心交换机 | 网络设备 | 3 | 已覆盖 | coreswitch | coreswitch |
| NET-AGG | 汇聚交换机 | 网络设备 | 3 | 近似 | switch / coreswitch | **aggswitch**(新) |
| NET-ACC | 接入交换机 | 网络设备 | 3 | 已覆盖 | switch | switch |
| NET-RTR | 出口路由器 | 网络设备 | 6 | 已覆盖 | router | router |
| NET-FW | 防火墙 | 网络设备 | 3 | 已覆盖(我们归安全类) | firewall | firewall |
| NET-LB | 负载均衡 | 网络设备 | 12 | 已覆盖 | lb | lb |
| NET-VPN | VPN 网关 | 网络设备 | 17 | 已覆盖(我们归安全类) | vpngw | vpngw |
| SEC-WAF | Web 应用防火墙 | 安全设备 | 8 | 已覆盖 | waf | waf |
| SEC-NTA | 全流量探针 | 安全设备 | 12 | 近似 | idsips | **nta**(新) |
| SEC-HIDS | 主机安全 / 审计 | 安全设备 | 16 | 缺失 | — | **hids**(新) |
| SEC-BAS | 堡垒机 | 安全设备 | 7 | 已覆盖 | bastion | bastion |
| SRV-WEB | Web 前端服务器 | 服务器存储 | 30 | 已覆盖 | websrv | websrv |
| SRV-APP | 应用服务器 | 服务器存储 | 314 | 近似 | websrv | **appsrv**(新) |
| SRV-DB | 数据库服务器 | 服务器存储 | 22 | 已覆盖 | dbsrv | dbsrv |
| SRV-CACHE | 缓存 Redis | 服务器存储 | 16 | 近似 | dbsrv | **cache**(新) |
| SRV-STOR | 存储节点 | 服务器存储 | 36 | 已覆盖 | storage | storage |
| SRV-OBJ | 对象存储 | 服务器存储 | 9 | 近似 | storage | **objstore**(新) |
| SRV-MAIL | 邮件服务器 | 服务器存储 | 11 | 已覆盖 | mailsrv | mailsrv |
| SRV-DNS | DNS 服务器 | 服务器存储 | 15 | 已覆盖(我们归网络类) | dns | dns |
| SRV-MQ | 中间件 / 消息队列 | 服务器存储 | 10 | 缺失 | — | **mq**(新) |
| CN-MASTER | K8s 主控节点 | 云原生 | 10 | 近似 | container | **k8smaster**(新) |
| CN-NODE | K8s 计算节点 | 云原生 | 24 | 近似 | container | **k8snode**(新) |
| CN-REG | 镜像 / 制品仓库 | 云原生 | 10 | 缺失 | — | **registry**(新) |
| CN-APP | 容器化应用 | 云原生 | 19 | 近似 | container | **cnapp**(新) |
| TERM-PC | 办公 PC | 终端接入 | 106 | 已覆盖 | pc | pc |
| TERM-WS | 研发工作站 | 终端接入 | 50 | 近似 | pc | **workstation**(新) |
| TERM-OPS | 运维终端 | 终端接入 | 19 | 近似 | laptop | **opsterm**(新) |
| TERM-PRT | 网络打印机 | 终端接入 | 8 | 已覆盖 | printer | printer |
| TERM-BR | 分公司终端(自助机) | 终端接入 | 23 | 缺失 | — | **kiosk**(新) |
| TERM-3P | 第三方终端 | 终端接入 | 13 | 近似 | tablet | **term3p**(新) |
| IOT-GW | IoT 网关 | 物联网 | 12 | 缺失 | — | **iotgw**(新) |
| IOT-SEN | IoT 传感器 | 物联网 | 21 | 已覆盖 | sensor | sensor |

**新增大类「云原生 cn」**:主色夜 `#ff9a3c`、日 `#c4600f`(橙)。
- 加这一类的原因:对方单独列了云原生 4 种(K8s 控制面、计算节点、镜像仓库、容器应用),场景里一共用了 63 个。它们的攻击面(控制面接管、容器逃逸、供应链投毒)和传统服务器明显不同。
- 选色:避开了已有的绿、蓝、黄、紫、粉、红,也避开了状态色白、红、青(防护)。
- 原来归在服务器类的 `container`(容器集群)一并移到云原生类。

我们有、对方没有的 21 种:ap、laptop、mobile、tablet、voip、idsips、honeypot、soc、behavior、sandbox、cloud、container、ipcam、plc、hmi、pos、attacker、botnet、c2、internet、insider。

**v7 各类数量**:网络 7 / 办公 10 / 安全 11 / 服务器 9 / 云原生 5 / IoT 6 / 威胁 5,共 53 种。
另外把 mobile、tablet、ipcam 加细了:mobile 加了图标格、摄像头、侧键和底部指示条;tablet 加了图标格、前摄和底座槽;ipcam 加了安装螺孔、球铰、镜头圈、红外灯阵和散热条。
