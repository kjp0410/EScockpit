// Use Vue 2 syntax
const app = new Vue({
    el: '#app', // Specify mount point here for Vue 2
    data() {
        return {
            cabinets: [
                { id: 'cab1', name: '电池柜 A' },
                { id: 'cab2', name: '电池柜 B' }
                // Add more cabinets as needed
            ],
            selectedCabinet: 'cab2', // 默认选择电池柜 B
            availablePacks: [], // Will be populated based on selectedCabinet
            batteryPacks: [
                { id: 'pack1', name: '电池包 #1 (SN: BP001)', cabinetId: 'cab1' },
                { id: 'pack2', name: '电池包 #2 (SN: BP002)', cabinetId: 'cab1' },
                { id: 'pack3', name: '电池包 #3 (SN: BP003)', cabinetId: 'cab1' },
                { id: 'pack4', name: '电池包 #1 (SN: BP004)', cabinetId: 'cab2' },
                { id: 'pack5', name: '电池包 #2 (SN: BP005)', cabinetId: 'cab2' }
            ],
            selectedPack: null, // 初始设为null，在created钩子中自动选择
            lastUpdateTime: 'N/A',
            statusOverview: {
                status: '正常',
                soc: 85.2,
                soh: 98.5,
                voltage: 3.5,
                current: 0.02, // Positive for charging, negative for discharging
                avgTemp: 32.5,
                maxTemp: 35.1,
                minTemp: 30.2,
                // 添加单体电压相关字段
                minVolt: 3.55,
                maxVolt: 3.65,
                // 添加内阻相关字段
                resistance: 23.5,
                minResistance: 20.2,
                maxResistance: 25.1,
                // 添加循环次数相关字段
                cycleCount: 128,
                remainingCycles: 1872,
                // 添加温度字段用于温度卡片
                temperature: 32.5
            },
            batteryCells: [], // To be populated, e.g., { id: 1, voltage: 3.65, temp: 31.8, status: 'normal' }
            historyChartType: 'voltage', // 'voltage' or 'temperature'
            historyTimeRange: 'day', // 'day', 'week', 'month'
            balanceRecords: [], // To be populated, e.g., { time: '...', duration: '...', reason: '...', status: 'completed' }
            balancePagination: {
                currentPage: 1,
                totalPages: 1,
                itemsPerPage: 5
            },
            voltageChartInstance: null,
            temperatureChartInstance: null,
            isLoading: false,
            isSidebarOpen: false, // Control sidebar visibility for mobile
            isMobile: window.innerWidth < 768, // 是否为移动设备
        };
    },
    computed: {
        selectedPackName() {
            const pack = this.batteryPacks.find(p => p.id === this.selectedPack);
            return pack ? pack.name : '未知电池包';
        },
        paginatedBalanceRecords() {
            const start = (this.balancePagination.currentPage - 1) * this.balancePagination.itemsPerPage;
            const end = start + this.balancePagination.itemsPerPage;
            return this.balanceRecords.slice(start, end);
        },
        statusInfo() {
            let indicatorClass = 'status-normal';
            let textClass = 'text-green-600';
            let text = this.statusOverview.status || '未知';

            if (text === '预警') {
                indicatorClass = 'status-warning';
                textClass = 'text-yellow-600';
            } else if (text === '告警') {
                indicatorClass = 'status-alert';
                textClass = 'text-red-600';
            }
            return { indicatorClass, textClass, text };
        },
        historyTimeRangeText() {
            switch(this.historyTimeRange) {
                case 'day': return '24小时';
                case 'week': return '7天';
                case 'month': return '30天';
                default: return '';
            }
        }
    },
    methods: {
        toggleSidebar() {
            this.isSidebarOpen = !this.isSidebarOpen;
            
            // 移动设备下，切换侧边栏和遮罩层
            if (this.isMobile) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                
                if (sidebar) {
                    sidebar.classList.toggle('open');
                }
                
                if (overlay) {
                    overlay.classList.toggle('active');
                }
            }
            
            this.$nextTick(() => {
                this.adjustLayout();
            });
        },
        adjustLayout() {
            // 检测设备类型
            this.isMobile = window.innerWidth < 768;
            
            // 调整图表大小
            if (this.voltageChartInstance) {
                this.voltageChartInstance.resize();
            }
            if (this.temperatureChartInstance) {
                this.temperatureChartInstance.resize();
            }
            
            // 调整主内容区域布局
            const content = document.querySelector('.content-container');
            if (content) {
                if (this.isMobile) {
                    content.classList.remove('ml-60');
                } else {
                    content.classList.add('ml-60');
                }
            }
        },
        updatePackList() {
            console.log('Cabinet changed to:', this.selectedCabinet);
            // 首先清空已选择的电池包
            this.selectedPack = null;
            
            // 更新可用的电池包列表
            this.availablePacks = this.batteryPacks.filter(pack => pack.cabinetId === this.selectedCabinet);
            console.log('Available packs updated:', this.availablePacks.length, 'packs found');
            
            // 确保在DOM更新后再设置selectedPack和获取数据
            this.$nextTick(() => {
                // Optionally, auto-select the first pack in the new list and fetch data
                if (this.availablePacks.length > 0) {
                    this.selectedPack = this.availablePacks[0].id;
                    console.log('Auto-selected first pack in new cabinet:', this.selectedPack);
                    this.fetchBatteryData(); // 在确保下拉框更新后才获取数据
                } else {
                    // Clear data or show 'no packs' message
                    this.statusOverview = {}; // Clear overview
                    this.batteryCells = []; // Clear cells
                    console.warn('No packs available in selected cabinet');
                }
            });
        },
        fetchBatteryData() {
             console.log('Fetching data for selected pack:', this.selectedPack);
             if (!this.selectedPack) {
                 console.warn("No pack selected, cannot fetch data.");
                 return;
             }
             // Rename original fetch function to avoid naming conflict
             this.fetchDataForSelectedPackInternal();
        },
        fetchDataForSelectedPackInternal() {
            console.log(`正在获取电池包 ${this.selectedPack} 的数据...`);
            
            // 确保图表DOM元素存在并初始化图表（如果还没有）
            const initChartsIfNeeded = () => {
                if (!this.voltageChartInstance || !this.temperatureChartInstance) {
                    if (document.getElementById('socSohChart') && document.getElementById('voltTempChart')) {
                        console.log('图表DOM元素存在但实例未初始化，正在初始化...');
                        this.initCharts();
                        return true; // 图表已初始化
                    } else {
                        console.error('找不到图表DOM元素，无法初始化图表');
                        return false; // 无法初始化图表
                    }
                }
                return true; // 图表已经初始化
            };
            
            this.isLoading = true;
            
            // 立即生成电池单体数据，不依赖于模拟API调用
            const packIndex = this.batteryPacks.findIndex(p => p.id === this.selectedPack) + 1;
            this.populateBatteryCells(packIndex);
            console.log(`已生成 ${this.batteryCells.length} 个电池单体数据`);
            
            // 模拟API调用获取其他数据
            setTimeout(() => {
                this.lastUpdateTime = new Date().toLocaleString();
                // 生成基于所选电池包的示例数据
                this.statusOverview = {
                    status: packIndex % 3 === 0 ? '告警' : (packIndex % 2 === 0 ? '预警' : '正常'),
                    soc: parseFloat((80 + packIndex * 1.5).toFixed(1)),
                    soh: parseFloat((97 + packIndex * 0.2).toFixed(1)),
                    voltage: parseFloat((570 + packIndex * 5.1).toFixed(1)),
                    current: parseFloat((packIndex * 3.1 - 5).toFixed(1)),
                    avgTemp: parseFloat((30 + packIndex * 0.8).toFixed(1)),
                    maxTemp: parseFloat((33 + packIndex * 0.9).toFixed(1)),
                    minTemp: parseFloat((29 + packIndex * 0.5).toFixed(1)),
                    minVolt: parseFloat((3.5 + packIndex * 0.01).toFixed(3)),
                    maxVolt: parseFloat((3.65 + packIndex * 0.01).toFixed(3)),
                    resistance: parseFloat((20 + packIndex * 1.5).toFixed(1)),
                    minResistance: parseFloat((18 + packIndex * 0.8).toFixed(1)),
                    maxResistance: parseFloat((22 + packIndex * 1.2).toFixed(1)),
                    cycleCount: Math.floor(100 + packIndex * 15),
                    remainingCycles: Math.floor(2000 - packIndex * 50),
                    temperature: parseFloat((31 + packIndex * 0.7).toFixed(1))
                };
                
                // 生成均衡记录数据
                this.populateBalanceRecords(packIndex);
                console.log(`已生成 ${this.balanceRecords.length} 条均衡记录`);
                
                console.log("正在尝试更新历史图表...");
                
                // 确保图表初始化，然后才更新图表数据
                if (initChartsIfNeeded()) {
                    console.log("图表实例已就绪，更新图表数据");
                    this.updateHistoryCharts();
                }
                
                this.isLoading = false;
                console.log(`电池包 ${this.selectedPack} 的数据更新完成`);
            }, 300); // 缩短模拟延迟时间
        },
        populateBatteryCells(packIndex = 1) {
            const cells = [];
            const numCells = 16; 
            for (let i = 1; i <= numCells; i++) {
                const voltage = (3.60 + (Math.random() - 0.5) * 0.1 + (packIndex * 0.01)).toFixed(3);
                const temp = (30 + (Math.random() - 0.4) * 5 + (packIndex * 0.2)).toFixed(1);
                let status = 'normal';
                if (voltage > 3.75 || voltage < 3.45 || temp > 38) {
                    status = 'alert';
                } else if (voltage > 3.70 || voltage < 3.50 || temp > 35) {
                    status = 'warning';
                }
                 // 根据随机条件添加一些警告/告警状态
                 if (Math.random() < 0.02 * packIndex) status = 'alert';
                 else if (Math.random() < 0.05 * packIndex) status = 'warning';

                cells.push({ id: i, voltage: parseFloat(voltage), temp, status });
            }
            
            // 标记电压最高和最低的单体
            if (cells.length > 0) {
                // 找出电压最高和最低的单体
                let minVoltCell = cells[0];
                let maxVoltCell = cells[0];
                
                for (let i = 1; i < cells.length; i++) {
                    if (cells[i].voltage < minVoltCell.voltage) {
                        minVoltCell = cells[i];
                    }
                    if (cells[i].voltage > maxVoltCell.voltage) {
                        maxVoltCell = cells[i];
                    }
                }
                
                // 更新最高和最低电压单体的状态
                minVoltCell.status = 'warning'; // 对应 cell-min 类
                maxVoltCell.status = 'alert';   // 对应 cell-max 类
                
                // 更新状态概览中的最高/最低电压值
                this.statusOverview.minVolt = minVoltCell.voltage.toFixed(3);
                this.statusOverview.maxVolt = maxVoltCell.voltage.toFixed(3);
            }
            
            this.batteryCells = cells;
        },
         populateBalanceRecords(packIndex = 1) {
            const records = [];
            const numRecords = 7 + packIndex; // Vary number of records
            for (let i = 0; i < numRecords; i++) {
                const startTime = new Date(Date.now() - i * 2 * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000); // Recent times
                const durationMinutes = Math.floor(Math.random() * 50 + 10);
                const balanceTypes = ['主动均衡', '被动均衡', '维护均衡'];
                const statuses = ['已完成', '进行中'];
                
                // 随机生成均衡的单体范围
                const startCell = Math.floor(Math.random() * 10) + 1;
                const endCell = Math.min(16, startCell + Math.floor(Math.random() * 5) + 1);
                const cellsRange = `单体 ${startCell} - ${endCell}`;
                
                // 生成电压差值
                const diffBefore = Math.floor(Math.random() * 50) + 30; // 30-80 mV
                const diffAfter = Math.floor(diffBefore * (Math.random() * 0.6 + 0.1)); // 减少10%-70%
                
                records.push({
                    id: `bal-${packIndex}-${i}`,
                    time: startTime.toLocaleString(),
                    duration: `${durationMinutes} 分钟`,
                    reason: ['常规均衡', '压差过大', '温差过大', 'SOH维护'][Math.floor(Math.random() * 4)],
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    // 添加新字段，用于匹配HTML模板
                    type: balanceTypes[Math.floor(Math.random() * balanceTypes.length)],
                    cells: cellsRange,
                    diffBefore: diffBefore,
                    diffAfter: diffAfter
                });
            }
            this.balanceRecords = records;
            this.balancePagination.totalPages = Math.ceil(records.length / this.balancePagination.itemsPerPage);
            this.balancePagination.currentPage = 1; // Reset to first page
        },
        getCellClass(status) {
            switch (status) {
                case 'warning': return 'cell-min';
                case 'alert': return 'cell-max';
                default: return 'cell-normal';
            }
        },
        getStatusClass(status) {
             switch (status) {
                case '预警': return 'status-warning';
                case '告警': return 'status-alert';
                default: return 'status-normal';
             }
        },
        getBalanceStatusClass(status) {
            return status === '已完成' ? 'status-completed' : 'status-inprogress';
        },
        changeHistoryChartType(type) {
            if (this.historyChartType !== type) {
                this.historyChartType = type;
                this.updateHistoryCharts();
            }
        },
        changeHistoryTimeRange(range) {
            if (this.historyTimeRange !== range) {
                console.log(`Changing history time range from ${this.historyTimeRange} to ${range}`);
                this.historyTimeRange = range;
                
                // 检查图表实例是否就绪，如果不存在则先初始化
                if (!this.voltageChartInstance || !this.temperatureChartInstance) {
                    console.log("Charts not ready, initializing them first");
                    this.initCharts();
                    // 图表初始化后，安排一个短暂延迟再更新数据
                    setTimeout(() => {
                        if (this.voltageChartInstance && this.temperatureChartInstance) {
                            this.updateHistoryCharts();
                        } else {
                            console.warn("Charts still not ready after initialization, please try again");
                        }
                    }, 100);
                } else {
                    this.updateHistoryCharts();
                }
            }
        },
        initCharts() {
            this.initVoltageChart();
            this.initTemperatureChart();
            this.updateHistoryCharts(); // Initial data load
        },
        initVoltageChart() {
            const ctx = document.getElementById('socSohChart')?.getContext('2d');
            if (!ctx) {
                 console.error("SOC/SOH chart canvas not found");
                 return;
            }
            if (this.voltageChartInstance) {
                this.voltageChartInstance.destroy();
            }
            this.voltageChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] }, // Populate in updateHistoryCharts
                options: this.getChartOptions('SOC/SOH (%)')
            });
        },
        initTemperatureChart() {
            const ctx = document.getElementById('voltTempChart')?.getContext('2d');
             if (!ctx) {
                 console.error("initTemperatureChart: Temperature chart canvas context not found!");
                 return;
             }
             console.log("initTemperatureChart: Found Temperature chart canvas context.");
            if (this.temperatureChartInstance) {
                this.temperatureChartInstance.destroy();
            }
            this.temperatureChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] }, // Populate in updateHistoryCharts
                options: this.getChartOptions('温度 (°C)')
            });
        },
        updateHistoryCharts() {
            console.log(`Updating charts for range: ${this.historyTimeRange}, type: ${this.historyChartType}`);
            
            // 增强图表实例的检查和初始化逻辑
            if (!this.voltageChartInstance || !this.temperatureChartInstance) {
                console.warn("Chart instances not ready for update.");
                
                // 如果图表DOM存在，尝试初始化图表
                if (document.getElementById('socSohChart') && document.getElementById('voltTempChart')) {
                    console.log("Initializing charts before update...");
                    this.initCharts();
                    
                    // 安排稍后再更新
                    setTimeout(() => {
                        if (this.voltageChartInstance && this.temperatureChartInstance) {
                            console.log("Charts initialized, updating now");
                            this.updateHistoryCharts();
                        }
                    }, 150);
                    return;
                }
                return;
            }

            // 如果图表实例存在但已被销毁，重新初始化
            if (this.voltageChartInstance.canvas === null || this.temperatureChartInstance.canvas === null) {
                console.warn("Chart canvases have been detached, reinitializing...");
                this.initCharts();
                
                // 延迟后再次尝试更新
                setTimeout(() => this.updateHistoryCharts(), 100);
                return;
            }

            try {
                // Simulate fetching data based on range and type
                const { labels, socData, tempData } = this.generateChartData(this.historyTimeRange);

                // 用try-catch包装图表更新逻辑
                try {
                    // Update SOC/SOH Chart
                    this.voltageChartInstance.data.labels = labels;
                    this.voltageChartInstance.data.datasets = [
                        {
                            label: 'SOC',
                            data: socData.soc,
                            borderColor: 'rgba(59, 130, 246, 0.8)', // blue-500
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: true,
                        },
                        {
                            label: 'SOH',
                            data: socData.soh,
                            borderColor: 'rgba(16, 185, 129, 0.8)', // green-500
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: true,
                        }
                    ];
                    this.voltageChartInstance.update();
                    
                    // Update Temperature Chart
                    this.temperatureChartInstance.data.labels = labels;
                    this.temperatureChartInstance.data.datasets = [
                        {
                            label: '最高温度',
                            data: tempData.max,
                            borderColor: 'rgba(239, 68, 68, 0.8)', // red-500
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: true,
                        },
                        {
                            label: '平均温度',
                            data: tempData.avg,
                            borderColor: 'rgba(59, 130, 246, 0.8)', // blue-500
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: true,
                        },
                        {
                            label: '最低温度',
                            data: tempData.min,
                            borderColor: 'rgba(16, 185, 129, 0.8)', // green-500
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: true,
                        }
                    ];
                    this.temperatureChartInstance.update();
                    
                    console.log(`Charts updated successfully for range: ${this.historyTimeRange}`);
                } catch (error) {
                    console.error("Error updating charts:", error);
                    // 如果更新失败，尝试重新初始化图表
                    this.initCharts();
                }
            } catch (error) {
                console.error("Error in updateHistoryCharts:", error);
            }
        },
        generateChartData(range) {
            let labels = [];
            let numPoints = 0;
            const now = new Date();
            const formatTime = (date) => date.getHours() + ':' + ('0' + date.getMinutes()).slice(-2);
            const formatDate = (date) => (date.getMonth() + 1) + '/' + date.getDate();

            switch (range) {
                case 'day':
                    numPoints = 24; // Hourly data for the last 24 hours
                    for (let i = numPoints -1 ; i >= 0; i--) {
                        labels.push(formatTime(new Date(now.getTime() - i * 60 * 60 * 1000)));
                    }
                    break;
                case 'week':
                    numPoints = 7; // Daily data for the last 7 days
                     for (let i = numPoints -1 ; i >= 0; i--) {
                         labels.push(formatDate(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
                    }
                    break;
                case 'month':
                    numPoints = 30; // Daily data for the last 30 days
                     for (let i = numPoints -1 ; i >= 0; i--) {
                         labels.push(formatDate(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
                    }
                    break;
            }

            const generateData = (base, variation, points) => {
                 const data = [];
                 for (let i = 0; i < points; i++) {
                    data.push((base + (Math.random() - 0.5) * variation).toFixed(2));
                 }
                 return data;
             };
             const generateRangeData = (base, variation, points) => {
                 const avgData = [];
                 const maxData = [];
                 const minData = [];
                 let currentBase = base;
                 for (let i = 0; i < points; i++) {
                    currentBase += (Math.random() - 0.5) * (variation * 0.1); // Slight drift
                    const avg = (currentBase + (Math.random() - 0.5) * variation).toFixed(2);
                    const max = (parseFloat(avg) + Math.random() * (variation / 2)).toFixed(2);
                    const min = (parseFloat(avg) - Math.random() * (variation / 2)).toFixed(2);
                    avgData.push(avg);
                    maxData.push(max);
                    minData.push(min);
                 }
                 return { avg: avgData, max: maxData, min: minData };
             };

            // 生成SOC和SOH数据
            const socData = {
                soc: [],
                soh: []
            };
            
            let currentSoc = 85; // 初始SOC值
            let currentSoh = 97; // 初始SOH值
            
            for (let i = 0; i < numPoints; i++) {
                // SOC每个时间点有波动，但保持在合理范围内
                currentSoc += (Math.random() - 0.4) * 2; // 偏向放电趋势
                currentSoc = Math.max(20, Math.min(100, currentSoc)); // 限制在20-100之间
                socData.soc.push(currentSoc.toFixed(1));
                
                // SOH缓慢下降
                currentSoh -= Math.random() * 0.05; // 极缓慢减少
                currentSoh = Math.max(70, Math.min(100, currentSoh)); // 限制在70-100之间
                socData.soh.push(currentSoh.toFixed(1));
            }

            const tempData = generateRangeData(32, 5, numPoints);

            return { labels, socData, tempData };
        },

        getChartOptions(yLabel) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                 scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            color: '#6b7280', // gray-500
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10 // Limit number of visible ticks
                        }
                    },
                    y: {
                        grid: {
                             color: '#e5e7eb', // gray-200
                             borderDash: [3, 3]
                        },
                        ticks: {
                             font: { size: 10 },
                             color: '#6b7280' // gray-500
                        },
                         title: {
                             display: true,
                             text: yLabel,
                             font: { size: 10 },
                             color: '#6b7280' // gray-500
                         }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                             font: { size: 10 },
                             color: '#374151', // gray-700
                             boxWidth: 10,
                             padding: 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: { size: 12 },
                        bodyFont: { size: 10 },
                        padding: 8,
                        cornerRadius: 4,
                        // Callbacks for custom tooltip content if needed
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                elements: {
                     line: {
                         borderWidth: 1.5 // Default line width
                     },
                     point: {
                         radius: 0 // Hide points by default
                     }
                 }
            };
        },

        changeBalancePage(newPage) {
            if (newPage >= 1 && newPage <= this.balancePagination.totalPages) {
                this.balancePagination.currentPage = newPage;
            }
        },

        // Lifecycle Hooks
        created() {
            console.log('Battery Vue app created.');
            console.log('Initial selectedCabinet:', this.selectedCabinet);
            
            // 确保 selectedCabinet 有值
            if (!this.selectedCabinet && this.cabinets.length > 0) {
                this.selectedCabinet = this.cabinets[0].id;
                console.log('设置默认电池柜:', this.selectedCabinet);
            }
            
            // 获取当前电池柜下的所有电池包
            this.availablePacks = this.batteryPacks.filter(pack => pack.cabinetId === this.selectedCabinet);
            console.log('电池柜:', this.selectedCabinet, '下的电池包:', this.availablePacks.map(p => p.name).join(', '));
            
            // 自动选择第一个电池包
            if (this.availablePacks.length > 0) {
                this.selectedPack = this.availablePacks[0].id;
                console.log(`自动选择第一个电池包: ${this.selectedPack}`);
                
                // 确保更新电池柜和电池包下拉框的初始状态
                this.$nextTick(() => {
                    // 确保Vue已经更新了DOM
                    console.log('初始状态已更新');
                });
            } else {
                this.selectedPack = null; // 明确设置为空
                console.warn("当前电池柜下没有可用的电池包");
            }
            console.log('selectedPack after created hook logic:', this.selectedPack);
        },
        mounted() {
            console.log('Battery Vue app mounted, DOM elements ready.');
            
            // 强制初始化电池包下拉框
            if (this.selectedCabinet && !this.availablePacks.length) {
                console.log('发现电池包列表为空，重新初始化...');
                this.availablePacks = this.batteryPacks.filter(pack => pack.cabinetId === this.selectedCabinet);
                
                if (this.availablePacks.length > 0 && !this.selectedPack) {
                    this.selectedPack = this.availablePacks[0].id;
                    console.log(`强制选择电池包: ${this.selectedPack}`);
                }
            }
            
            // 使用nextTick确保DOM完全渲染后再初始化图表和加载数据
            this.$nextTick(() => {
                console.log('Vue nextTick: Initializing data and charts.');
                // 1. 确保生成电池单体数据（不需要等待API请求）
                const packIndex = this.batteryPacks.findIndex(p => p.id === this.selectedPack);
                if (packIndex === -1) {
                    console.warn("Mounted: Selected pack not found in batteryPacks array initially.");
                    // Fallback or error handling if needed
                }
                this.populateBatteryCells(packIndex >= 0 ? packIndex + 1 : 1); // Use packIndex or default
                
                // 2. 初始化图表（在DOM元素存在时）
                if (document.getElementById('socSohChart') && document.getElementById('voltTempChart')) {
                    console.log('Mounted: DOM chart elements found, initializing charts...');
                    this.initCharts(); // This will also call updateHistoryCharts initially
                    
                    // 3. 获取所有其他电池包数据 (直接调用，移除 setTimeout)
                    console.log('Mounted: Fetching battery pack overview data...');
                    this.fetchBatteryData(); 

                } else {
                    console.error('Mounted: Chart DOM elements NOT found, cannot initialize charts!');
                    // 仍然获取基本数据，但不尝试初始化图表
                    this.fetchBatteryData();
                }
                
                // 设置布局和添加事件监听
                window.addEventListener('resize', this.adjustLayout);
                this.adjustLayout();
                
                // 初始化移动菜单按钮点击事件
                const menuToggle = document.getElementById('mobile-menu-toggle');
                if (menuToggle) {
                    menuToggle.addEventListener('click', this.toggleSidebar);
                }
                
                // 初始化遮罩层点击事件（点击遮罩层关闭侧边栏）
                const overlay = document.getElementById('mobile-overlay');
                if (overlay) {
                    overlay.addEventListener('click', this.toggleSidebar);
                }
                
                // 初始化侧边栏状态
                this.isSidebarOpen = !this.isMobile;
            });
        },
        beforeUnmount() {
            console.log('Battery Vue app will unmount.');
            if (this.voltageChartInstance) {
                this.voltageChartInstance.destroy();
            }
            if (this.temperatureChartInstance) {
                this.temperatureChartInstance.destroy();
            }
            window.removeEventListener('resize', this.adjustLayout);
            
            // 清理事件监听
            const menuToggle = document.getElementById('mobile-menu-toggle');
            if (menuToggle) {
                menuToggle.removeEventListener('click', this.toggleSidebar);
            }
            
            const overlay = document.getElementById('mobile-overlay');
            if (overlay) {
                overlay.removeEventListener('click', this.toggleSidebar);
            }
        },
        // Format percentage
        formatPercent(value) {
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            return typeof value === 'number' ? `${value.toFixed(1)}%` : '--%';
        },
        // Format temperature
        formatTemp(value) {
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            return typeof value === 'number' ? `${value.toFixed(1)}°C` : '--°C';
        },
        // Format voltage
        formatVolt(value) {
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            return typeof value === 'number' ? `${value.toFixed(3)}V` : '--V';
        },
        // Format resistance
        formatResistance(value) {
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            return typeof value === 'number' ? `${value.toFixed(1)}mΩ` : '--mΩ';
        },
    },
    watch: {
        selectedPack(newId, oldId) {
            if (newId !== oldId) {
                this.fetchBatteryData(); // Call the method linked to the dropdown change
            }
        }
    }
});

// 移除旧的侧边栏事件监听代码，由Vue组件处理
document.addEventListener('DOMContentLoaded', () => {
    // 检查Vue实例是否已加载
    if (typeof app !== 'undefined') {
        console.log('Vue app ready, initializing mobile sidebar');
        
        // 为子菜单添加切换功能
        const batteryManagement = document.getElementById('battery-management');
        const batterySubmenu = document.getElementById('battery-submenu');
        const batteryChevron = document.getElementById('battery-chevron');
        
        if (batteryManagement && batterySubmenu && batteryChevron) {
            batteryManagement.addEventListener('click', () => {
                batterySubmenu.classList.toggle('open');
                batteryChevron.classList.toggle('rotate-180');
            });
        }
    }
});
document.addEventListener('DOMContentLoaded', function() {
    // 确保Vue实例已经创建并挂载完成
    setTimeout(function() {
        // 检查电池包下拉框是否为空
        const packSelect = document.querySelector('select[v-model="selectedPack"]');
        if (packSelect && packSelect.options.length <= 1) { // 只有一个选项或没有选项
            console.log('检测到电池包下拉框未初始化，正在手动初始化...');
            
            // 检查Vue实例是否可用
            if (window.app) {
                // 强制更新电池包列表
                app.availablePacks = app.batteryPacks.filter(pack => pack.cabinetId === app.selectedCabinet);
                
                // 选择第一个电池包
                if (app.availablePacks.length > 0) {
                    app.selectedPack = app.availablePacks[0].id;
                    
                    // 强制Vue更新DOM
                    app.$nextTick(function() {
                        console.log('电池包下拉框已手动初始化');
                        app.fetchBatteryData(); // 获取数据
                    });
                }
            }
        }
    }, 500); // 延迟确保Vue已完全初始化
    
    // 移动端菜单按钮点击事件
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (mobileMenuToggle && sidebar && overlay) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
    
    // 侧边栏子菜单折叠/展开功能
    const batteryManagement = document.getElementById('battery-management');
    const batterySubmenu = document.getElementById('battery-submenu');
    const batteryChevron = document.getElementById('battery-chevron');
    
    if (batteryManagement && batterySubmenu && batteryChevron) {
        batteryManagement.addEventListener('click', function() {
            batterySubmenu.classList.toggle('open');
            batteryChevron.classList.toggle('rotate-180');
        });
    }
});

// 检查Vue实例是否存在
console.log(app);
// 手动执行更新
app.availablePacks = app.batteryPacks.filter(p => p.cabinetId === app.selectedCabinet);
app.selectedPack = app.availablePacks[0].id;
