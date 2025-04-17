// 创建 Vue 实例
new Vue({
    el: '#app',
    data() {
        return {
            // 告警统计数据
            statistics: {
                total: 124,
                critical: 18,
                warning: 42,
                processed: 64,
                totalTrend: '+12%',
                criticalTrend: '+5%',
                warningTrend: '-8%',
                processedTrend: '+15%'
            },
            
            // 图表实例
            alarmTrendChart: null,
            
            // 时间范围筛选
            timeRange: 'day', // 'day', 'week', 'month'
            
            // 侧边栏子菜单状态
            submenuOpen: false,
            
            // 筛选和搜索
            searchQuery: '',
            filterSite: '全部站点',
            filterLevel: '全部级别',
            filterStatus: '全部状态',
            
            // 分页
            currentPage: 1,
            itemsPerPage: 8,
            totalItems: 124,
            
            // 告警列表数据
            alarms: [
                {
                    id: 'ALM-20230615-001',
                    level: 'critical',
                    levelText: '严重',
                    content: '电池温度过高',
                    site: '北京朝阳储能电站',
                    device: '电池包 #B-12',
                    time: '2023-06-15 14:32:15',
                    status: 'warning',
                    statusText: '处理中',
                    description: '电池包 #B-12 温度传感器检测到温度达到 58°C，超过安全阈值 55°C。系统已自动启动降温措施，但温度仍未降至安全范围内。请立即检查电池包冷却系统是否正常工作，并检查电池包是否存在过充或短路情况。',
                    records: [
                        {
                            engineer: '张工程师',
                            time: '2023-06-15 15:10:22',
                            content: '已远程检查冷却系统，发现水泵工作异常，已重启水泵，温度开始下降。'
                        }
                    ]
                },
                {
                    id: 'ALM-20230615-002',
                    level: 'warning',
                    levelText: '警告',
                    content: 'PCS通信异常',
                    site: '上海浦东储能电站',
                    device: 'PCS #P-03',
                    time: '2023-06-15 15:10:42',
                    status: 'warning',
                    statusText: '处理中'
                },
                {
                    id: 'ALM-20230615-003',
                    level: 'critical',
                    levelText: '严重',
                    content: '电池SOC过低',
                    site: '广州天河储能电站',
                    device: '电池包 #B-05',
                    time: '2023-06-15 16:05:33',
                    status: 'normal',
                    statusText: '已处理'
                },
                {
                    id: 'ALM-20230615-004',
                    level: 'warning',
                    levelText: '警告',
                    content: '环境湿度过高',
                    site: '北京朝阳储能电站',
                    device: '环境监测 #E-01',
                    time: '2023-06-15 16:45:18',
                    status: 'normal',
                    statusText: '已处理'
                },
                {
                    id: 'ALM-20230615-005',
                    level: 'critical',
                    levelText: '严重',
                    content: '电池单体电压异常',
                    site: '上海浦东储能电站',
                    device: '电池包 #B-08',
                    time: '2023-06-15 17:12:05',
                    status: 'info',
                    statusText: '未处理'
                },
                {
                    id: 'ALM-20230615-006',
                    level: 'warning',
                    levelText: '警告',
                    content: '充电功率波动',
                    site: '广州天河储能电站',
                    device: 'PCS #P-02',
                    time: '2023-06-15 18:30:22',
                    status: 'warning',
                    statusText: '处理中'
                },
                {
                    id: 'ALM-20230615-007',
                    level: 'warning',
                    levelText: '警告',
                    content: '电池均衡异常',
                    site: '北京朝阳储能电站',
                    device: '电池包 #B-03',
                    time: '2023-06-15 19:05:47',
                    status: 'normal',
                    statusText: '已处理'
                },
                {
                    id: 'ALM-20230615-008',
                    level: 'critical',
                    levelText: '严重',
                    content: '系统过载',
                    site: '上海浦东储能电站',
                    device: 'PCS #P-01',
                    time: '2023-06-15 20:15:33',
                    status: 'info',
                    statusText: '未处理'
                }
            ],
            
            // 站点选项
            siteOptions: ['全部站点', '北京朝阳储能电站', '上海浦东储能电站', '广州天河储能电站'],
            
            // 告警级别选项
            levelOptions: ['全部级别', '严重', '警告', '一般'],
            
            // 告警状态选项
            statusOptions: ['全部状态', '未处理', '处理中', '已处理'],
            
            // 处理结果选项
            resultOptions: ['已解决', '暂时解决', '需要后续跟进', '误报'],
            
            // 弹窗状态
            detailModalVisible: false,
            confirmModalVisible: false,
            
            // 当前选中的告警
            currentAlarm: null,
            
            // 处理表单
            handleForm: {
                result: '已解决',
                description: ''
            }
        };
    },
    
    computed: {
        // 计算筛选后的告警列表
        filteredAlarms() {
            return this.alarms.filter(alarm => {
                // 搜索条件筛选
                if (this.searchQuery && !alarm.content.includes(this.searchQuery) && 
                    !alarm.id.includes(this.searchQuery)) {
                    return false;
                }
                
                // 站点筛选
                if (this.filterSite !== '全部站点' && alarm.site !== this.filterSite) {
                    return false;
                }
                
                // 级别筛选
                if (this.filterLevel !== '全部级别' && alarm.levelText !== this.filterLevel) {
                    return false;
                }
                
                // 状态筛选
                if (this.filterStatus !== '全部状态' && alarm.statusText !== this.filterStatus) {
                    return false;
                }
                
                return true;
            });
        },
        
        // 计算当前页的告警列表
        paginatedAlarms() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredAlarms.slice(start, end);
        },
        
        // 计算总页数
        totalPages() {
            return Math.ceil(this.filteredAlarms.length / this.itemsPerPage);
        },
        
        // 显示的页码范围
        displayPageRange() {
            const start = Math.max(1, this.currentPage - 2);
            const end = Math.min(this.totalPages, start + 4);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        },
        
        // 计算分页显示文本
        paginationText() {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.filteredAlarms.length);
            return `显示 ${start}-${end} 条，共 ${this.filteredAlarms.length} 条`;
        }
    },
    
    methods: {
        // 切换侧边栏子菜单
        toggleSubmenu() {
            this.submenuOpen = !this.submenuOpen;
        },
        
        // 切换时间范围（日/周/月）
        setTimeRange(range) {
            this.timeRange = range;
            this.updateTrendChart();
        },
        
        // 更新告警趋势图表
        updateTrendChart() {
            if (!this.alarmTrendChart) return;
            
            // 根据不同时间范围设置不同的标签和数据
            let labels, data1, data2;
            
            if (this.timeRange === 'day') {
                labels = ['6月10日', '6月11日', '6月12日', '6月13日', '6月14日', '6月15日', '6月16日'];
                data1 = [3, 2, 4, 1, 2, 3, 2];
                data2 = [5, 7, 4, 6, 8, 5, 7];
            } else if (this.timeRange === 'week') {
                labels = ['第1周', '第2周', '第3周', '第4周'];
                data1 = [10, 12, 8, 15];
                data2 = [22, 18, 25, 20];
            } else {
                labels = ['1月', '2月', '3月', '4月', '5月', '6月'];
                data1 = [42, 38, 45, 40, 35, 48];
                data2 = [85, 75, 95, 88, 78, 92];
            }
            
            this.alarmTrendChart.data.labels = labels;
            this.alarmTrendChart.data.datasets[0].data = data1;
            this.alarmTrendChart.data.datasets[1].data = data2;
            this.alarmTrendChart.update();
        },
        
        // 应用筛选
        applyFilter() {
            this.currentPage = 1; // 重置为第一页
        },
        
        // 页码变化
        changePage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },
        
        // 上一页
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },
        
        // 下一页
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },
        
        // 显示告警详情
        showAlarmDetail(alarm) {
            this.currentAlarm = alarm;
            this.detailModalVisible = true;
        },
        
        // 关闭告警详情弹窗
        closeDetailModal() {
            this.detailModalVisible = false;
        },
        
        // 显示处理确认弹窗
        showConfirmModal() {
            this.closeDetailModal();
            this.confirmModalVisible = true;
            // 重置处理表单
            this.handleForm = {
                result: '已解决',
                description: ''
            };
        },
        
        // 关闭处理确认弹窗
        closeConfirmModal() {
            this.confirmModalVisible = false;
        },
        
        // 提交处理结果
        submitHandle() {
            // 模拟处理告警
            if (this.currentAlarm) {
                const index = this.alarms.findIndex(a => a.id === this.currentAlarm.id);
                if (index !== -1) {
                    // 更新告警状态
                    this.alarms[index].status = 'normal';
                    this.alarms[index].statusText = '已处理';
                    
                    // 添加处理记录
                    if (!this.alarms[index].records) {
                        this.alarms[index].records = [];
                    }
                    
                    this.alarms[index].records.push({
                        engineer: '当前用户',
                        time: new Date().toLocaleString(),
                        content: this.handleForm.description || `${this.handleForm.result}`
                    });
                    
                    // 更新统计数据
                    this.statistics.processed++;
                    
                    if (this.alarms[index].level === 'critical') {
                        this.statistics.critical--;
                    } else if (this.alarms[index].level === 'warning') {
                        this.statistics.warning--;
                    }
                }
            }
            
            // 关闭弹窗并显示成功消息
            this.closeConfirmModal();
            alert('告警处理成功！');
        },
        
        // 创建工单
        createTicket(alarm) {
            window.location.href = `order.html#create-ticket?alarmId=${alarm.id}`;
        },
        
        // 响应式布局调整
        adjustLayout() {
            const width = window.innerWidth;
            const contentContainer = document.querySelector('.content-container');
            const aside = document.querySelector('aside');
            
            if (width < 768) {
                if (contentContainer) contentContainer.style.left = '0';
                if (aside) aside.style.display = 'none';
            } else {
                if (contentContainer) contentContainer.style.left = '240px';
                if (aside) aside.style.display = 'block';
            }
        }
    },
    
    mounted() {
        // 初始化告警趋势图表
        const ctx = document.getElementById('alarmTrendChart').getContext('2d');
        this.alarmTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6月10日', '6月11日', '6月12日', '6月13日', '6月14日', '6月15日', '6月16日'],
                datasets: [{
                    label: '严重告警',
                    data: [3, 2, 4, 1, 2, 3, 2],
                    borderColor: 'rgba(239, 68, 68, 0.8)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 2
                }, {
                    label: '警告告警',
                    data: [5, 7, 4, 6, 8, 5, 7],
                    borderColor: 'rgba(245, 158, 11, 0.8)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(243, 244, 246, 0.5)'
                        },
                        ticks: {
                            stepSize: 2,
                            font: {
                                size: 10
                            },
                            color: '#9ca3af'
                        }
                    }
                }
            }
        });
        
        // 响应窗口大小变化
        window.addEventListener('resize', this.adjustLayout);
        this.adjustLayout();
    },
    
    beforeDestroy() {
        // 清理事件监听器
        window.removeEventListener('resize', this.adjustLayout);
        
        // 销毁图表实例
        if (this.alarmTrendChart) {
            this.alarmTrendChart.destroy();
        }
    }
});