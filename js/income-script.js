/**
 * 收益报表脚本 - 基于Vue实现
 */
document.addEventListener('DOMContentLoaded', function() {
    const app = new Vue({
        el: '#app',
        data: {
            // 从 income.html 获取的基础数据
            currentSite: '北京朝阳储能电站', // 可动态获取
            lastUpdateTime: '-', // 初始值，将在refreshData中更新
            
            // 收益概览数据 (结构来自 income.html)
            overview: {
                daily: {
                    value: 0,
                    trend: 0,
                    up: true
                },
                monthly: {
                    value: 0,
                    trend: 0,
                    up: true
                },
                yearly: {
                    value: 0,
                    trend: 0,
                    up: true
                },
                total: {
                    value: 0
                }
            },
            
            // 时间范围选择 (结构来自 income.html)
            timeRange: {
                active: 'day', // 默认选择'日'
                startDate: '-', // 初始值
                endDate: '-'
            },
            
            // 收益日历数据 (结构来自 income.html)
            calendar: {
                month: '-', // 初始值
                days: [] // 将在mounted中初始化
            },
            
            // 收益详细数据 (结构来自 income.html)
            incomeData: [], // 将在refreshData中填充
            totalItems: 0, // 总条目数
            
            // 图表实例引用
            trendChart: null,
            businessChart: null,

             // 侧边栏子菜单状态
            batterySubmenuOpen: false,

            // Vue data additions/modifications
            trendChartLabels: [],
            trendChartData: [],
            businessChartLabels: ['峰谷价差', '需求响应', '调频服务', '其它'], // 固定标签
            businessChartData: [],
            // 新增用于自定义日期选择
            showCustomDateInputs: false,
            customStartDate: '',
            customEndDate: '',
            previousTimeRangeActive: 'week', // 记录取消自定义时恢复的状态
        },
        
        methods: {
            // 切换电池管理子菜单 (来自 order-separated.html 的逻辑)
            toggleBatterySubmenu() {
                this.batterySubmenuOpen = !this.batterySubmenuOpen;
                const submenu = document.getElementById('battery-submenu');
                const chevron = document.getElementById('battery-chevron');
                if (submenu && chevron) { // 确保元素存在
                     submenu.classList.toggle('open', this.batterySubmenuOpen);
                     chevron.classList.toggle('rotate-180', this.batterySubmenuOpen);
                }
            },

            // 切换时间范围
            changeTimeRange(range) {
                if (range === 'custom') {
                    // 记录当前范围，并显示自定义输入
                    this.previousTimeRangeActive = this.timeRange.active;
                    this.showCustomDateInputs = true;
                    // 初始化日期输入为当前范围或默认值
                    const today = new Date();
                    this.customStartDate = this.timeRange.startDate && this.timeRange.startDate !== '-' ? this.timeRange.startDate : this.formatDate(today);
                    this.customEndDate = this.timeRange.endDate && this.timeRange.endDate !== '-' ? this.timeRange.endDate : this.formatDate(today);
                    // 暂时激活 custom 按钮，但不加载数据
                    this.timeRange.active = 'custom'; 
                } else {
                    // 对于非自定义范围，隐藏输入框并加载数据
                    this.showCustomDateInputs = false;
                    this.timeRange.active = range;
                    this.updateUIDateRangeDisplay(range); 
                    this.fetchAndUpdateChartData(range); 
                }
            },
            
            // 更新UI显示的日期范围
            updateUIDateRangeDisplay(range) {
                 let start, end;
                 const today = new Date();
                 // (保留之前的日期计算逻辑)
                 switch(range) {
                     case 'day':
                         start = end = this.formatDate(today);
                         break;
                     case 'week':
                         // 创建新的Date对象进行计算，避免修改原始today
                         let weekStart = new Date(today);
                         weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // 星期一
                         let weekEnd = new Date(weekStart);
                         weekEnd.setDate(weekStart.getDate() + 6); // 星期日
                         start = this.formatDate(weekStart);
                         end = this.formatDate(weekEnd);
                         break;
                     case 'month':
                         start = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
                         end = this.formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                         break;
                     case 'year':
                         start = this.formatDate(new Date(today.getFullYear(), 0, 1));
                         end = this.formatDate(new Date(today.getFullYear(), 11, 31));
                         break;
                     case 'custom':
                         // 模拟选择本周
                         let customWeekStart = new Date(today);
                         customWeekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
                         let customWeekEnd = new Date(customWeekStart);
                         customWeekEnd.setDate(customWeekStart.getDate() + 6); 
                         start = this.formatDate(customWeekStart);
                         end = this.formatDate(customWeekEnd);
                         break;
                     default:
                         start = end = this.formatDate(today);
                 }
                 this.timeRange.startDate = start;
                 this.timeRange.endDate = end;
            },
            
            // 获取/模拟并更新图表数据
            fetchAndUpdateChartData(range) {
                // 如果是自定义范围，可以使用 this.timeRange.startDate 和 this.timeRange.endDate
                let startDate = this.timeRange.startDate;
                let endDate = this.timeRange.endDate;
                
                // --- 模拟数据获取逻辑 --- 
                let trendLabels = [];
                let trendDataPoints = [];
                let businessDataPoints = [];
                
                // 示例：根据范围生成不同的模拟数据
                if (range === 'day') {
                    trendLabels = ['00','02','04','06','08','10','12','14','16','18','20','22'];
                    trendDataPoints = Array.from({length: 12}, () => Math.floor(Math.random() * 500 + 50));
                    businessDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * 1000 + 100));
                } else if (range === 'week') {
                    trendLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                    trendDataPoints = Array.from({length: 7}, () => Math.floor(Math.random() * 2000 + 500));
                    businessDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * 5000 + 500));
                } else if (range === 'month') {
                    trendLabels = ['W1', 'W2', 'W3', 'W4']; // Simplified month view
                    trendDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * 10000 + 2000));
                    businessDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * 20000 + 2000));
                } else if (range === 'year') { 
                    trendLabels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
                    trendDataPoints = Array.from({length: 12}, () => Math.floor(Math.random() * 50000 + 10000));
                    businessDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * 100000 + 10000));
                } else if (range === 'custom') {
                    // 根据 startDate 和 endDate 生成标签和数据
                    // 这是一个简化的模拟：假设按天显示，最多显示30天
                    const startDt = new Date(startDate);
                    const endDt = new Date(endDate);
                    const diffTime = Math.abs(endDt - startDt);
                    const diffDays = Math.min(30, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); // 最多30天
                    
                    trendLabels = [];
                    trendDataPoints = [];
                    businessDataPoints = Array.from({length: 4}, () => Math.floor(Math.random() * diffDays * 300 + 1000)); // 业务数据模拟
                    
                    for (let i = 0; i < diffDays; i++) {
                         const currentDt = new Date(startDt);
                         currentDt.setDate(startDt.getDate() + i);
                         trendLabels.push(this.formatDate(currentDt).substring(5)); // mm-dd
                         trendDataPoints.push(Math.floor(Math.random() * 1500 + 200)); // 每日趋势数据模拟
                    }
                }
                // --- 结束模拟数据 --- 
                
                // 更新Vue data中的图表数据
                this.trendChartLabels = trendLabels;
                this.trendChartData = trendDataPoints;
                this.businessChartData = businessDataPoints; 
                
                // 在下一个Tick更新图表DOM
                this.$nextTick(() => {
                    this.updateCharts();
                });
            },
            
            // 刷新数据 - 只更新概览和表格
            refreshData() {
                this.lastUpdateTime = this.formatDateTime(new Date());
                
                // 模拟更新概览数据
                this.overview = {
                     daily: { value: Math.random() * 3000 + 2000, trend: (Math.random() * 20 - 10).toFixed(1), up: Math.random() > 0.5 },
                     monthly: { value: Math.random() * 100000 + 50000, trend: (Math.random() * 15 - 5).toFixed(1), up: Math.random() > 0.6 },
                     yearly: { value: Math.random() * 800000 + 400000, trend: (Math.random() * 25).toFixed(1), up: true },
                     total: { value: 1245680.75 + Math.random() * 50000 }
                 };
                
                 // 模拟更新表格数据
                 this.incomeData = Array.from({length: 7}, (_, i) => {
                     const date = new Date();
                     date.setDate(date.getDate() - i);
                     const total = Math.random() * 1000 + 1500;
                     return {
                         date: this.formatDate(date),
                         total: total,
                         peakValley: total * (0.4 + Math.random() * 0.2),
                         frequency: total * (0.2 + Math.random() * 0.2),
                         demand: total * (0.1 + Math.random() * 0.1),
                         change: (Math.random() * 20 - 10),
                         up: Math.random() > 0.5
                     };
                 });
                 this.totalItems = this.incomeData.length;
            },

            // 初始化图表 - 使用空数据结构
            initCharts() {
                this.initTrendChart();
                this.initBusinessChart();
            },
            
            // 初始化收益趋势图 - 只设置结构
            initTrendChart() {
                const trendCtx = document.getElementById('trendChart');
                if (!trendCtx) {
                     console.error('Canvas element with id "trendChart" not found');
                     return;
                }
                
                 // 先销毁旧图表实例（如果存在且有效）
                 if (this.trendChart instanceof Chart) {
                    this.trendChart.destroy();
                 } else if (this.trendChart) {
                    // console.warn('this.trendChart exists but is not a Chart instance, will be overwritten.');
                 }
                
                try {
                    this.trendChart = new Chart(trendCtx, {
                        type: 'line',
                        data: { 
                            labels: [], // 初始为空
                            datasets: [{
                                label: '收益 (元)', // 修改标签
                                data: [],    // 初始为空
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                tension: 0.4,
                                fill: true,
                                pointBackgroundColor: '#ffffff',
                                pointBorderColor: '#3b82f6',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        label: (context) => {
                                            let label = context.dataset.label || '';
                                            if (label) { label += ': '; }
                                            if (context.parsed.y !== null) {
                                                label += this.formatCurrency(context.parsed.y);
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: { font: { size: 10 } }
                                },
                                y: {
                                    beginAtZero: false,
                                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                                    ticks: {
                                        font: { size: 10 },
                                        callback: (value) => '¥' + value.toLocaleString('zh-CN')
                                    }
                                }
                            }
                        }
                    });
                } catch (e) {
                     console.error('创建收益趋势图失败:', e);
                }
            },
            
            // 初始化业务类型收益对比图 - 只设置结构
            initBusinessChart() {
                const businessCtx = document.getElementById('businessComparisonChart');
                 if (!businessCtx) {
                     console.error('Canvas element with id "businessComparisonChart" not found');
                     return;
                 }
                
                 // 先销毁旧图表实例
                 if (this.businessChart instanceof Chart) {
                    this.businessChart.destroy();
                 } else if (this.businessChart) {
                    // console.warn('this.businessChart exists but is not a Chart instance, will be overwritten.');
                 }

                try {
                    this.businessChart = new Chart(businessCtx, {
                        type: 'pie',
                        data: {
                            labels: this.businessChartLabels, // 使用 data 属性中的固定标签
                            datasets: [{
                                label: '收益分布',
                                data: [], // 初始为空
                                backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(107, 114, 128, 0.7)'],
                                borderColor: 'rgba(255, 255, 255, 0.8)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: { 
                                        boxWidth: 12, 
                                        font: { size: 11 }
                                     }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            let label = context.label || '';
                                            let value = context.parsed || 0;
                                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                            if (label) {
                                                label += ': ';
                                            }
                                             label += this.formatCurrency(value) + ' (' + percentage + ')';
                                            return label;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('创建业务类型收益饼图失败:', e);
                }
            },

            // 更新图表 - 使用 Vue data 中的图表数据
            updateCharts() {
                // 更新收益趋势图数据
                if (this.trendChart && this.trendChart.data) {
                    this.trendChart.data.labels = this.trendChartLabels;
                    this.trendChart.data.datasets[0].data = this.trendChartData;
                    this.trendChart.update();
                } else {
                     // console.warn("Trend chart instance not ready for update");
                }

                // 更新业务类型饼图数据
                if (this.businessChart && this.businessChart.data) {
                    this.businessChart.data.datasets[0].data = this.businessChartData;
                    this.businessChart.update();
                } else {
                     // console.warn("Business chart instance not ready for update");
                }
            },
            
            // 初始化收益日历 (移除 level 相关逻辑)
            initCalendar() {
                this.calendar.month = '2023年8月'; // 示例月份
                const daysInMonth = 31; // 示例天数
                const firstDayOfMonth = 2; // 示例，8月1日是周二
                const days = [];

                // 添加上个月的占位日期
                for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push({ day: '', amount: null, inCurrentMonth: false, isToday: false });
                }

                // 添加本月日期
                for (let i = 1; i <= daysInMonth; i++) {
                    // 模拟收益数据
                    const amount = i <= 15 ? (1800 + Math.floor(Math.random() * 800)) : null; 
                    days.push({
                        day: i,
                        amount: amount,
                        inCurrentMonth: true,
                        isToday: i === 15 // 假设今天是15号
                    });
                }

                 // 添加下个月的占位日期
                 const remainingSlots = 42 - days.length;
                 for (let i = 0; i < remainingSlots; i++) {
                     days.push({ day: '', amount: null, inCurrentMonth: false, isToday: false });
                 }

                this.calendar.days = days;
            },

            // 获取日历单元格样式类 (移除 level 相关逻辑)
            getCalendarDayClass(day) {
                 const classes = ['calendar-day']; // Base class
                 if (day.isToday) {
                     classes.push('font-bold text-blue-600 border-blue-300'); // 突出显示今天，加个边框
                 }
                 if (!day.inCurrentMonth) {
                     classes.push('text-gray-300'); // 非本月日期颜色变浅
                 }
                 // 添加一个基础的边框和背景，避免没有收益时完全透明
                 classes.push('border border-gray-100 bg-white'); 
                 return classes.join(' ');
             },

            // 导出Excel
            exportExcel() {
                alert('导出Excel功能待实现');
            },

            // 导出PDF
            exportPDF() {
                alert('导出PDF功能待实现');
            },
            
            // --- 辅助函数 ---
             formatCurrency(value, minimumFractionDigits = 2) {
                if (value === null || value === undefined) return '-';
                 return new Intl.NumberFormat('zh-CN', { 
                     style: 'decimal', // 使用 decimal 避免自动添加货币符号
                     minimumFractionDigits: minimumFractionDigits,
                     maximumFractionDigits: 2
                 }).format(value);
             },
            
            formatPercent(value) {
                 if (value === null || value === undefined) return '-';
                 return `${Math.abs(value)}%`;
             },

            formatDate(date) {
                 const d = new Date(date);
                 const year = d.getFullYear();
                 const month = String(d.getMonth() + 1).padStart(2, '0');
                 const day = String(d.getDate()).padStart(2, '0');
                 return `${year}-${month}-${day}`;
            },

            formatDateTime(date) {
                 const d = new Date(date);
                 const hours = String(d.getHours()).padStart(2, '0');
                 const minutes = String(d.getMinutes()).padStart(2, '0');
                 const seconds = String(d.getSeconds()).padStart(2, '0');
                 return `${this.formatDate(d)} ${hours}:${minutes}:${seconds}`;
             },

            // 应用自定义日期范围
            applyCustomDateRange() {
                 // 基本验证
                 if (!this.customStartDate || !this.customEndDate) {
                     alert('请选择开始和结束日期');
                     return;
                 }
                 if (new Date(this.customStartDate) > new Date(this.customEndDate)) {
                     alert('开始日期不能晚于结束日期');
                     return;
                 }
                 
                 // 更新 timeRange 显示
                 this.timeRange.startDate = this.customStartDate;
                 this.timeRange.endDate = this.customEndDate;
                 this.timeRange.active = 'custom'; // 保持 custom 激活状态
                 
                 // 加载自定义范围的数据
                 this.fetchAndUpdateChartData('custom'); // 传递 'custom' 或实际日期
                 
                 // 隐藏输入框
                 this.showCustomDateInputs = false;
            },

            // 取消自定义日期选择
            cancelCustomDateRange() {
                 this.showCustomDateInputs = false;
                 // 恢复到之前的激活状态
                 if (this.previousTimeRangeActive !== 'custom') {
                      this.changeTimeRange(this.previousTimeRangeActive); 
                 } else {
                      // 如果之前也是 custom，则恢复到默认，例如 week
                      this.changeTimeRange('week'); 
                 }
            },
        },
        
        mounted() {
             // 初始化侧边栏状态
             const batteryManagement = document.getElementById('battery-management');
             if (batteryManagement) {
                 batteryManagement.addEventListener('click', this.toggleBatterySubmenu);
             }
             this.toggleBatterySubmenu(); // Set initial state based on data
             
            // 刷新概览和表格的初始数据
             this.refreshData(); 
             // 初始化日历
             this.initCalendar();
            
             // 初始化图表结构
             this.initCharts();
             // 加载默认时间范围 ('week') 的图表数据
             this.changeTimeRange('week'); 
             
             // 响应式布局调整
             // this.adjustLayout = () => { 
             //     const width = window.innerWidth;
             //     const dashboardContent = this.$el.querySelector('.dashboard-content-scrollable'); // Use scrollable class selector
             //     if (dashboardContent) {
             //     }
             // };
             //this.adjustLayout();
             //window.addEventListener('resize', this.adjustLayout);
             
        },
        

        beforeDestroy() {
             // 清理图表实例
             if (this.trendChart instanceof Chart) {
                 this.trendChart.destroy();
             }
             if (this.businessChart instanceof Chart) {
                 this.businessChart.destroy();
             }
             // 移除事件监听器
             window.removeEventListener('resize', this.adjustLayout);
             const batteryManagement = document.getElementById('battery-management');
             if (batteryManagement) {
                  batteryManagement.removeEventListener('click', this.toggleBatterySubmenu);
             }
        }
    });
}); 