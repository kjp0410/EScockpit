// Vue 2 实现数据监控页面逻辑
window.monitorApp = new Vue({
    el: '#app',
    data: {
        // 筛选项
        sites: [
            '北京朝阳储能电站',
            '上海浦东储能电站',
            '广州天河储能电站',
            '深圳南山储能电站'
        ],
        deviceTypes: ['PCS', 'BMS', '电池包'],
        dataPoints: [
            { tag: "currentCombinedTotalActiveEnergy", description: "当前组合有功总电能", unit: "kWh" },
            { tag: "currentForwardTotalActiveEnergy", description: "当前正向有功总电能", unit: "kWh" },
            { tag: "currentReverseTotalActiveEnergy", description: "当前反向有功总电能", unit: "kWh" },
            { tag: "currentCombinedTotalReactiveEnergy", description: "当前组合无功总电能", unit: "kVarh" },
            { tag: "currentForwardTotalReactiveEnergy", description: "当前正向总无功电能", unit: "kVarh" },
            { tag: "currentReverseTotalReactiveEnergy", description: "当前反向总无功电能", unit: "kVarh" },
            { tag: "aPhaseVoltage", description: "A相电压", unit: "V" },
            { tag: "bPhaseVoltage", description: "B相电压", unit: "V" },
            { tag: "cPhaseVoltage", description: "C相电压", unit: "V" },
            { tag: "aPhaseCurrent", description: "A相电流", unit: "A" },
            { tag: "bPhaseCurrent", description: "B相电流", unit: "A" },
            { tag: "cPhaseCurrent", description: "C相电流", unit: "A" },
            { tag: "aphaseActivePower", description: "A相有功功率", unit: "kW" },
            { tag: "bphaseActivePower", description: "B相有功功率", unit: "kW" },
            { tag: "cphaseActivePower", description: "C相有功功率", unit: "kW" },
            { tag: "activePower", description: "总有功功率", unit: "kW" },
            { tag: "aphaseReactivePower", description: "A相无功功率", unit: "kVar" },
            { tag: "bphaseReactivePower", description: "B相无功功率", unit: "kVar" },
            { tag: "cphaseReactivePower", description: "C相无功功率", unit: "kVar" },
            { tag: "totalReactivePower", description: "总无功功率", unit: "kVar" },
            { tag: "aPhaseApparentPower", description: "A相视在功率", unit: "kVA" },
            { tag: "bPhaseApparentPower", description: "B相视在功率", unit: "kVA" },
            { tag: "cPhaseApparentPower", description: "C相视在功率", unit: "kVA" },
            { tag: "totalApparentPower", description: "总视在功率", unit: "kVA" },
            { tag: "aphasePowerFactor", description: "A相功率因数", unit: "" },
            { tag: "bphasePowerFactor", description: "B相功率因数", unit: "" },
            { tag: "cphasePowerFactor", description: "C相功率因数", unit: "" },
            { tag: "totalPowerFactor", description: "总功率因数", unit: "" },
            { tag: "frequency", description: "频率", unit: "Hz" }
        ],
        selectedSite: '北京朝阳储能电站',
        selectedDeviceType: 'PCS',
        selectedDataPoint: '全部数据点',
        recordsPerPage: 10,
        lastUpdateTime: '',
        tableRows: [],
        // 历史弹窗
        showHistoryModal: false,
        historyPoint: null,
        historyData: [],
        historyChart: null,
        // 侧边栏
        sidebarOpen: false,
        batterySubmenuOpen: false
    },
    methods: {
        // 生成模拟表格数据
        generateRecentData(pointTag, count = 5) {
            const now = new Date();
            const data = [];
            // 随机选择一个站点和设备类型
            const site = this.selectedSite;
            const deviceType = this.selectedDeviceType;
            for (let i = 0; i < count; i++) {
                const timestamp = new Date(now.getTime() - (i * 5000));
                let value;
                if (pointTag.includes("Voltage")) {
                    value = (220 + (Math.random() * 2 - 1)).toFixed(1);
                } else if (pointTag.includes("Current")) {
                    value = (10 + (Math.random() * 1 - 0.5)).toFixed(2);
                } else if (pointTag.includes("ActivePower")) {
                    value = (50 + (Math.random() * 10 - 5)).toFixed(1);
                } else if (pointTag.includes("Energy")) {
                    value = (1000 + i * 0.1).toFixed(1);
                } else if (pointTag.includes("PowerFactor")) {
                    value = (0.9 + (Math.random() * 0.1 - 0.05)).toFixed(2);
                } else if (pointTag === "frequency") {
                    value = (50 + (Math.random() * 0.2 - 0.1)).toFixed(2);
                } else {
                    value = (Math.random() * 100).toFixed(1);
                }
                data.push({
                    tag: pointTag,
                    value: value,
                    site: site,
                    deviceType: deviceType,
                    timestamp: timestamp,
                    description: (this.dataPoints.find(p => p.tag === pointTag) || {}).description || '',
                    unit: (this.dataPoints.find(p => p.tag === pointTag) || {}).unit || ''
                });
            }
            return data;
        },
        // 刷新表格
        updateTable() {
            let filteredPoints = this.dataPoints;
            if (this.selectedDataPoint !== '全部数据点') {
                filteredPoints = filteredPoints.filter(p => p.tag === this.selectedDataPoint);
            }
            let rows = [];
            filteredPoints.forEach(point => {
                rows = rows.concat(this.generateRecentData(point.tag, this.recordsPerPage));
            });
            // 按时间降序
            rows.sort((a, b) => b.timestamp - a.timestamp);
            this.tableRows = rows.slice(0, this.recordsPerPage);
            this.lastUpdateTime = this.formatDateTime(new Date());
        },
        // 打开历史弹窗
        openHistory(row) {
            this.historyPoint = row;
            this.showHistoryModal = true;
            this.generateHistoryData(row.tag);
            this.$nextTick(this.renderHistoryChart);
        },
        // 生成历史数据
        generateHistoryData(pointTag, hours = 24) {
            const now = new Date();
            const data = [];
            const point = this.dataPoints.find(p => p.tag === pointTag);
            const unit = point ? point.unit : '';
            const totalPoints = (hours * 60 * 60) / 5;
            for (let i = 0; i < totalPoints; i++) {
                const timestamp = new Date(now.getTime() - (i * 5000));
                let value;
                if (pointTag.includes("Voltage")) {
                    value = (220 + (Math.random() * 2 - 1)).toFixed(1);
                } else if (pointTag.includes("Current")) {
                    value = (10 + (Math.random() * 1 - 0.5)).toFixed(2);
                } else if (pointTag.includes("ActivePower")) {
                    value = (50 + (Math.random() * 10 - 5)).toFixed(1);
                } else if (pointTag.includes("Energy")) {
                    value = (1000 + i * 0.1).toFixed(1);
                } else if (pointTag.includes("PowerFactor")) {
                    value = (0.9 + (Math.random() * 0.1 - 0.05)).toFixed(2);
                } else if (pointTag === "frequency") {
                    value = (50 + (Math.random() * 0.2 - 0.1)).toFixed(2);
                } else {
                    value = (Math.random() * 100).toFixed(1);
                }
                data.push({
                    timestamp: timestamp,
                    value: parseFloat(value),
                    unit: unit
                });
            }
            this.historyData = data.reverse();
        },
        // 渲染历史图表
        renderHistoryChart() {
            if (!this.showHistoryModal) return;
            const ctx = document.getElementById('history-chart').getContext('2d');
            if (this.historyChart) this.historyChart.destroy();
            const labels = this.historyData.map(r => `${r.timestamp.getHours().toString().padStart(2, '0')}:${r.timestamp.getMinutes().toString().padStart(2, '0')}:${r.timestamp.getSeconds().toString().padStart(2, '0')}`);
            const values = this.historyData.map(r => r.value);
            this.historyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: this.historyPoint.unit,
                        data: values,
                        borderColor: '#2c3e50',
                        backgroundColor: 'rgba(44, 62, 80, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { beginAtZero: false, ticks: { font: { size: 10 } } },
                        x: { ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }
                    }
                }
            });
        },
        // 关闭历史弹窗
        closeHistoryModal() {
            this.showHistoryModal = false;
        },
        // 格式化时间
        formatDateTime(date) {
            const d = new Date(date);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${hours}:${minutes}:${seconds}`;
        },
        // 侧边栏
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        toggleBatterySubmenu() {
            this.batterySubmenuOpen = !this.batterySubmenuOpen;
        },
        exportData() {
            alert('数据导出功能待实现');
            // 这里可以添加实际的导出逻辑
        }
    },
    mounted() {
        this.updateTable();
    }
}); 