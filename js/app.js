const { createApp, ref, reactive, onMounted, onBeforeUnmount, nextTick } = Vue;

createApp({
  setup() {
    // --- Reactive State ---
    const map = ref(null); // AMap instance
    const powerChartInstance = ref(null); // ECharts power chart instance
    const incomeChartInstance = ref(null); // ECharts income chart instance
    const powerChartDiv = ref(null); // Ref for power chart div
    const incomeChartDiv = ref(null); // Ref for income chart div

    const sidebarOpen = ref(window.innerWidth > 1024);
    const isMobile = ref(window.innerWidth <= 1024);
    const showInfoCard = ref(true); // 控制信息卡片显示状态
    
    // 侧边栏子菜单状态
    const submenuStates = reactive({
      battery: false,
    });

    // Site Data (Multi-site approach is better)
    const sites = ref([
        { id: 'site1', name: '北京朝阳储能电站', position: [116.481964, 39.990633], capacity: '10MW/20MWh', status: 'discharging', soc: 65, address: '北京市朝阳区酒仙桥路4号', siteId: 'BJ-CY-001' },
        
    ]);
    const currentSite = ref(sites.value[0]); // Initially display the first site

    // Alarm Data (From main.js sample)
    const alarms = ref([
      { timestamp: Date.now() - 2 * 60 * 1000, level: '严重', description: '电池包#3 电压异常', device: 'BMS-01' },
      { timestamp: Date.now() - 5 * 60 * 1000, level: '警告', description: 'PCS#1 通讯中断', device: 'PCS-01' },
      { timestamp: Date.now() - 15 * 60 * 1000, level: '提示', description: '环境温度略高', device: 'ENV-Sensor' },
      { timestamp: Date.now() - 60 * 60 * 1000, level: '警告', description: '电池柜#2 风扇故障', device: 'BCU-02' },
      { timestamp: Date.now() - 120 * 60 * 1000, level: '严重', description: '绝缘电阻过低', device: 'PCS-03' },
      { timestamp: Date.now() - 180 * 60 * 1000, level: '提示', description: '系统自检建议更新固件', device: 'BMS-Control' },
      { timestamp: Date.now() - 12 * 60 * 60 * 1000, level: '警告', description: '电池组#5 温度传感器异常', device: 'BMS-05' },
      { timestamp: Date.now() - 24 * 60 * 60 * 1000, level: '提示', description: '系统运行已满30天，建议检查', device: 'System' },
      { timestamp: Date.now() - 72 * 60 * 60 * 1000, level: '严重', description: '防火系统触发误报', device: 'FireControl' }
    ]);

    // Real-time Data Simulation
    const realtimeData = reactive({
        powerOutput: 5.2,
        temperature: 28.5,
        humidity: 65,
        fanStatus: '正常',
        doorStatus: '已锁定'
        // Add efficiency if needed, main.js updated #efficiency but didn't use it in interval
        // efficiency: 83.8 
    });
    let dataUpdateInterval = null;

    // --- Methods ---

    // ** Map Related **
    const initMapAndMarkers = () => {
      if (!document.getElementById('map-container')) {
          return;
      }
      if (!AMap) {
          return;
      }

      try {
          map.value = new AMap.Map('map-container', {
              zoom: 17, // 调整缩放级别以更好地显示街道
              center: currentSite.value.position, // 以当前站点为中心
              viewMode: '3D', // 3D视图
              pitch: 60, // 增加俯仰角度，强化3D效果
              rotation: 30, // 稍微旋转以获得更好的街景视角
              mapStyle: 'amap://styles/light', // 使用浅色主题
              features: ['bg', 'building', 'road'], // 保留背景、建筑和道路
              buildingAnimation: true, // 启用建筑物动画效果
              skyColor: '#B0E2FF', // 浅蓝色天空
              expandZoomRange: true, // 扩展缩放范围
              zooms: [3, 20], // 允许更高级别的缩放
              viewModeOptions: {
                  skyColor: '#B0E2FF', // 浅蓝色天空
              },
              showBuildingBlock: true, // 显示建筑物块状效果
              showIndoorMap: false, // 隐藏室内地图
              showLabel: false // 隐藏标签文字
          });

          // 添加3D控制条
          const controlBar = new AMap.ControlBar({
              position: {
                  right: '10px',
                  top: '10px'
              },
              showZoomBar: true,
              showControlButton: true,
              showTilt: true,
              showRotate: true
          });
          map.value.addControl(controlBar);

          map.value.on('complete', () => {
              // 添加站点标记
              addSiteMarkers();
              
              // 设置地图样式，显示街道但隐藏文字标注
              map.value.setMapStyle('amap://styles/light', {
                  'roads': { 
                      visible: true, // 保持道路可见
                      visibleRoad: true // 保持街道可见
                  },
                  'labels': {
                      visible: false, // 隐藏所有文字标签
                      visibleRoad: false, // 隐藏道路名称
                      visiblePoi: false, // 隐藏兴趣点名称
                      visibleDistrict: false // 隐藏行政区名称
                  },
                  'buildings': {
                      visible: true, // 保持建筑物可见
                      fillColor: '#E6F0F4', // 浅蓝色建筑物
                      strokeColor: '#D3E5F0' // 浅蓝色建筑物轮廓
                  }
              });
          });
          
          map.value.on('error', (e) => { });

      } catch (error) {
      }
    };

    const addSiteMarkers = () => {
        if (!map.value) return;
        let currentInfoWindow = null;
        let activeMarker = null; // 跟踪当前选中的标记
        let markerClickable = true; // 添加标记是否可点击的标志，防止快速点击

        sites.value.forEach(site => {
            const statusColor = getStatusColor(site.status);
            const marker = new AMap.Marker({
                position: site.position,
                content: `
                  <div style="position:relative;width:72px;height:110px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
                    <div style=\"box-shadow:0 0 12px 4px #3b82f6,0 2px 8px rgba(0,0,0,0.25);border-radius:12px;padding:4px;background:#fff;\">
                      <img src=\"img/station-icon.png\" style=\"width:64px;height:96px;object-fit:contain;display:block;\" />
                    </div>
                    <div style=\"width:40px;height:12px;background:rgba(59,130,246,0.18);border-radius:50%;margin-top:-8px;filter:blur(1px);\"></div>
                  </div>
                `,
                title: site.name,
                offset: new AMap.Pixel(-36, -110),
                extData: site
            });

            const infoWindowContent = `
                <div class="p-3 bg-white rounded-lg shadow-md min-w-[180px] max-w-[240px] text-xs font-sans">
                    <div class="flex items-center mb-2 border-b border-gray-200 pb-1.5">
                        <i class="fas fa-charging-station text-blue-500 mr-2 text-sm"></i>
                        <h3 class="font-semibold text-sm text-gray-800 truncate">${site.name}</h3>
                    </div>
                    <div class="space-y-1.5">
                        <div class="flex justify-between"><span class="text-gray-500">容量:</span><span class="font-medium text-gray-700">${site.capacity}</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-500">状态:</span><span class="px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${getStatusBadgeClass(currentSite.value.status)}">${getStatusText(currentSite.value.status)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">SOC:</span><span class="font-semibold text-blue-600">${site.soc}%</span></div>
                    </div>
                </div>
            `;
            const infoWindow = new AMap.InfoWindow({ 
                content: infoWindowContent, 
                offset: new AMap.Pixel(0, -130),
                closeWhenClickMap: false, 
                isCustom: true, 
                anchor: 'bottom-center',
                autoMove: false, 
                closeWhenClick: false
            });

            marker.on('click', function (e) {
                // 防止快速点击引起的问题
                if (!markerClickable) return;
                markerClickable = false;
                setTimeout(() => { markerClickable = true; }, 300);
                
                // 更新当前站点数据
                currentSite.value = e.target.getExtData();
                
                console.log("点击的标记:", marker.getTitle());
                console.log("当前活动标记:", activeMarker ? activeMarker.getTitle() : "无");
                console.log("信息窗口状态:", currentInfoWindow ? "已打开" : "已关闭");
                
                // 如果点击同一个站点标记，切换信息窗口的显示状态
                if (activeMarker === marker) {
                    console.log("点击同一个标记，切换状态");
                    if (currentInfoWindow) {
                        // 如果信息窗口已经打开，则关闭它
                        console.log("关闭信息窗口");
                        currentInfoWindow.close();
                        currentInfoWindow = null;
                    } else {
                        // 如果信息窗口已关闭，则打开它
                        console.log("打开信息窗口");
                        infoWindow.open(map.value, marker.getPosition());
                        currentInfoWindow = infoWindow;
                    }
                } else {
                    // 如果点击的是不同的站点标记，总是显示信息窗口
                    console.log("点击不同标记，显示新窗口");
                    if (currentInfoWindow) { 
                        currentInfoWindow.close(); 
                    }
                    infoWindow.open(map.value, marker.getPosition());
                    currentInfoWindow = infoWindow;
                    activeMarker = marker;
                }
            });
            marker.setMap(map.value);
        });

        map.value.on('click', (e) => {
            // 确保点击的是地图本身而不是标记
            if (!e.target || e.target.CLASS_NAME === 'AMap.Map') {
                console.log("点击地图空白处");
                if (currentInfoWindow) { 
                    currentInfoWindow.close(); 
                    currentInfoWindow = null;
                    activeMarker = null;
                }
            }
        });
    };

    // ** Chart Related **
    const initCharts = () => {
        // 直接顺序初始化图表，不使用嵌套setTimeout
        initPowerChart();
        
        // 稍微延迟初始化第二个图表，避免资源竞争
        setTimeout(() => {
            initIncomeChart();
        }, 200);
    };

    const initPowerChart = () => {
        const chartCanvas = document.getElementById('main');
        
        if (typeof Chart === 'undefined') {
            return;
        }
        
        if (!chartCanvas) {
            return;
        }
        
        try {
            // 清理旧实例
            if (powerChartInstance.value) { 
                powerChartInstance.value.destroy(); 
            }
            
            // Chart.js配置 - 按照home.html的样式
            const chartConfig = {
                type: 'line',
                data: {
                    labels: ['8/9', '8/10', '8/11', '8/12', '8/13', '8/14', '8/15'],
                    datasets: [{
                        label: '充电量',
                        data: [42.5, 44.2, 40.8, 46.3, 43.1, 41.9, 45.6],
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2
                    }, {
                        label: '放电量',
                        data: [35.7, 37.1, 34.3, 38.9, 36.2, 35.2, 38.2],
                        borderColor: 'rgba(16, 185, 129, 0.8)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2
                    }, {
                        label: '循环效率',
                        data: [84.0, 83.9, 84.1, 84.0, 84.0, 84.0, 83.8],
                        borderColor: 'rgba(156, 163, 175, 0.8)',
                        backgroundColor: 'rgba(156, 163, 175, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2,
                        yAxisID: 'y1'
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
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#1f2937',
                            bodyColor: '#4b5563',
                            borderColor: 'rgba(229, 231, 235, 1)',
                            borderWidth: 1,
                            padding: 8,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    var label = context.dataset.label;
                                    var value = context.raw;
                                    if (label === '循环效率') {
                                        return label + ': ' + value.toFixed(1) + '%';
                                    } else {
                                        return label + ': ' + value.toFixed(1) + 'MWh';
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 8
                                },
                                color: '#9ca3af'
                            }
                        },
                        y: {
                            position: 'left',
                            grid: {
                                color: 'rgba(243, 244, 246, 0.5)'
                            },
                            ticks: {
                                font: {
                                    size: 8
                                },
                                color: '#9ca3af',
                                callback: function(value) {
                                    return value + 'MWh';
                                }
                            }
                        },
                        y1: {
                            position: 'right',
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 8
                                },
                                color: '#9ca3af',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            min: 80,
                            max: 90
                        }
                    }
                }
            };
            
            // 初始化Chart.js图表
            powerChartInstance.value = new Chart(chartCanvas, chartConfig);
        } catch (error) {
        }
    };

    const initIncomeChart = () => {
        const chartCanvas = document.getElementById('incomeMain');
        
        if (typeof Chart === 'undefined') {
            return;
        }
        
        if (!chartCanvas) {
            return;
        }
        
        try {
            // 清理旧实例
            if (incomeChartInstance.value) {
                incomeChartInstance.value.destroy();
            }
            
            // Chart.js配置
            const chartConfig = {
                type: 'line',
                data: {
                    labels: ['8/9', '8/10', '8/11', '8/12', '8/13', '8/14', '8/15'],
                    datasets: [{
                        label: '总收益',
                        data: [2350, 2420, 2280, 2510, 2374, 2298, 2586],
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2
                    }, {
                        label: '峰谷价差',
                        data: [1175, 1210, 1140, 1255, 1187, 1149, 1293],
                        borderColor: 'rgba(16, 185, 129, 0.8)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2
                    }, {
                        label: '辅助服务',
                        data: [1175, 1210, 1140, 1255, 1187, 1149, 1293],
                        borderColor: 'rgba(139, 92, 246, 0.8)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 2
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
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#1f2937',
                            bodyColor: '#4b5563',
                            borderColor: 'rgba(229, 231, 235, 1)',
                            borderWidth: 1,
                            padding: 8,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ¥' + context.raw.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 8
                                },
                                color: '#9ca3af'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(243, 244, 246, 0.5)'
                            },
                            ticks: {
                                font: {
                                    size: 8
                                },
                                color: '#9ca3af',
                                callback: function(value) {
                                    return '¥' + value;
                                }
                            }
                        }
                    }
                }
            };
            
            // 初始化Chart.js图表
            incomeChartInstance.value = new Chart(chartCanvas, chartConfig);
        } catch (error) {
        }
    };
    
    const logChartWarning = (chartName, divRef) => {
        if (typeof Chart === 'undefined') return;
        if (!divRef) return;
    }

    // ** Real-time Data Update **
    const updateRealtimeData = () => {
        realtimeData.powerOutput = (4 + Math.random() * 3).toFixed(1); // Simulate +/- 1.5 MW around 5.2
        realtimeData.temperature = (27 + Math.random() * 3).toFixed(1); // Simulate +/- 1.5 C around 28.5
        realtimeData.humidity = Math.floor(60 + Math.random() * 11); // Simulate 60-70%
        realtimeData.fanStatus = Math.random() > 0.1 ? '正常' : '异常';
        realtimeData.doorStatus = Math.random() > 0.05 ? '已锁定' : '已开启';
        // Also update currentSite SOC for dashboard display
        currentSite.value.soc = Math.floor(60 + Math.random() * 11); // Simulate 60-70%
    };

    const startDataUpdates = () => {
        if (dataUpdateInterval) clearInterval(dataUpdateInterval); // Clear previous interval if any
        dataUpdateInterval = setInterval(updateRealtimeData, 5000); // Update every 5 seconds
    };

    const stopDataUpdates = () => {
        if (dataUpdateInterval) {
            clearInterval(dataUpdateInterval);
            dataUpdateInterval = null;
        }
    };

    // ** 侧边栏菜单方法 **
    const toggleSubmenu = (submenuId) => {
      submenuStates[submenuId] = !submenuStates[submenuId];
    };

    // ** Sidebar and Layout **
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
      
      // 获取侧边栏元素并添加/移除类
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        if (sidebarOpen.value) {
          sidebar.classList.add('show');
        } else {
          sidebar.classList.remove('show');
        }
      }
      
      // 切换覆盖遮罩
      const overlay = document.querySelector('.dashboard-overlay');
      if (overlay && isMobile.value) {
        if (sidebarOpen.value) {
          overlay.style.opacity = '0.7'; // 当侧边栏打开时，降低卡片透明度
        } else {
          overlay.style.opacity = '1'; // 当侧边栏关闭时，恢复卡片透明度
        }
      }
      
      // 延迟调整地图大小，给侧边栏动画时间完成
      if (isMobile.value) {
        resizeMapAndChartsWithDelay(350); 
      }
    };

    const updateWidth = () => {
      const currentWidth = window.innerWidth;
      isMobile.value = currentWidth <= 1024;
      
      // 自动控制侧边栏状态
      if (isMobile.value) {
        sidebarOpen.value = false; // 移动设备默认隐藏侧边栏
      } else {
        sidebarOpen.value = true; // 桌面设备默认显示侧边栏
      }
      
      // 获取侧边栏元素
      const sidebar = document.querySelector('aside');
      const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
      const mainContent = document.querySelector('.dashboard-overlay');
      const mapContainer = document.getElementById('map-container');
      
      if (sidebar) {
        // 移动端侧边栏样式调整
        if (isMobile.value) {
          // 添加移动端样式
          sidebar.classList.add('mobile-sidebar');
          
          // 默认隐藏侧边栏
          sidebar.classList.remove('show');
          
          // 切换按钮由Vue的v-if控制显示，这里只设置样式
          if (sidebarToggleBtn) {
            sidebarToggleBtn.style.display = 'flex';
            sidebarToggleBtn.style.alignItems = 'center';
            sidebarToggleBtn.style.justifyContent = 'center';
          }
          
          // 调整内容区域和地图
          if (mainContent) {
            mainContent.style.left = '0';
            mainContent.style.width = '100%';
          }
          
          if (mapContainer) {
            mapContainer.style.left = '0';
            mapContainer.style.width = '100%';
          }
        } else {
          // 桌面端侧边栏样式
          sidebar.classList.remove('mobile-sidebar');
          
          // 切换按钮由Vue的v-if控制显示
          
          // 调整内容区域和地图
          if (mainContent) {
            mainContent.style.left = '240px';
            mainContent.style.width = 'calc(100% - 240px)';
          }
          
          if (mapContainer) {
            mapContainer.style.left = '240px';
            mapContainer.style.width = 'calc(100% - 240px)';
          }
        }
      }
      
      // 地图设置 - 在所有设备上使用相同的桌面端设置
      if (map.value) {
        map.value.setStatus({
          dragEnable: true,
          zoomEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
          touchZoom: true,
        });
        
        // 使用桌面端的俯视角度和旋转角度
        map.value.setPitch(60);
        map.value.setRotation(30);
      }
      
      // 立即进行一次重新布局和大小调整
      resizeMapAndChartsWithDelay(100);
    };
    
    const resizeMapAndChartsWithDelay = (delay = 100) => {
        setTimeout(() => {
           if (map.value) {
             // 调整地图视图
             map.value.resize();
             
             // 统一使用桌面端的缩放级别和中心点
             map.value.setZoom(17);
             
             // 确保标记点可见
             if (currentSite.value && currentSite.value.position) {
               map.value.setCenter(currentSite.value.position);
             }
           }
       }, delay);
    };

    // ** Helpers **
    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };
    const getAlarmLevelClass = (level) => {
      switch (level) {
        case '严重': return 'text-red-500 font-semibold';
        case '警告': return 'text-yellow-500 font-semibold';
        case '提示': return 'text-blue-500';
        default: return 'text-gray-700';
      }
    };
    const getStatusColor = (status) => {
        if (status === 'charging') return '#3B82F6'; // blue-500
        if (status === 'discharging') return '#10B981'; // green-500
        if (status === 'idle') return '#6B7280'; // gray-500
        if (status === 'fault') return '#EF4444'; // red-500
        return '#9CA3AF'; // gray-400
    };
    const getStatusBadgeClass = (status) => {
        return `bg-[${getStatusColor(status)}]`; // Use arbitrary value variant
    };
    const getStatusText = (status) => {
        if (status === 'charging') return '充电中';
        if (status === 'discharging') return '放电中';
        if (status === 'idle') return '待机中';
        if (status === 'fault') return '故障';
        return '未知';
    };

    // 切换仪表盘信息卡片的显示状态
    const toggleDashboardCards = (show) => {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            if (show) {
                dashboardContent.style.opacity = '1';
                dashboardContent.style.pointerEvents = 'auto';
            } else {
                dashboardContent.style.opacity = '0';
                dashboardContent.style.pointerEvents = 'none';
            }
      }
    };

    // --- Lifecycle Hooks ---
    onMounted(() => {
      window.addEventListener('resize', updateWidth);
      updateWidth(); // Initial setup
      startDataUpdates(); // Start simulation
      
      // 填充告警表格数据
      updateAlarmTable();
      
      nextTick(() => {
          initMapAndMarkers();
          initCharts();
      });
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', updateWidth);
        stopDataUpdates();
        map.value?.destroy();
        powerChartInstance.value?.destroy();
        incomeChartInstance.value?.destroy();
    });

    // 添加更新告警表格的方法
    const updateAlarmTable = () => {
        const tableBody = document.getElementById('alarm-table-body');
        if (!tableBody) {
            return;
        }
        
        // 清空现有内容
        tableBody.innerHTML = '';
        
        // 对告警按时间降序排序（最新的在前）
        const sortedAlarms = [...alarms.value].sort((a, b) => b.timestamp - a.timestamp);
        
        // 创建表格行
        sortedAlarms.forEach(alarm => {
            const row = document.createElement('tr');
            row.className = alarm.level === '严重' ? 'bg-red-50' : alarm.level === '警告' ? 'bg-yellow-50' : '';
            
            // 时间列
            const timeCell = document.createElement('td');
            timeCell.className = 'px-2 py-1';
            timeCell.textContent = formatTimestamp(alarm.timestamp);
            row.appendChild(timeCell);
            
            // 级别列
            const levelCell = document.createElement('td');
            levelCell.className = 'px-2 py-1';
            const levelSpan = document.createElement('span');
            levelSpan.className = getAlarmLevelClass(alarm.level);
            levelSpan.textContent = alarm.level;
            levelCell.appendChild(levelSpan);
            row.appendChild(levelCell);
            
            // 描述列
            const descCell = document.createElement('td');
            descCell.className = 'px-2 py-1';
            descCell.textContent = alarm.description;
            row.appendChild(descCell);
            
            // 设备列
            const deviceCell = document.createElement('td');
            deviceCell.className = 'px-2 py-1 text-gray-600';
            deviceCell.textContent = alarm.device;
            row.appendChild(deviceCell);
            
            // 添加到表格
            tableBody.appendChild(row);
        });
    };

    // --- Return state and methods to template ---
    return {
      sidebarOpen,
      isMobile,
      alarms,
      sites,
      currentSite,
      realtimeData,
      submenuStates, // 添加子菜单状态
      powerChartDiv, // For ref binding
      incomeChartDiv, // For ref binding
      toggleSubmenu, // 添加子菜单切换方法
      toggleSidebar,
      formatTimestamp,
      getAlarmLevelClass,
      getStatusBadgeClass, // For info window
      getStatusText, // For info window
      showInfoCard, // 添加信息卡片状态
      toggleDashboardCards // 添加切换仪表盘信息卡片的方法
    };
  }
}).mount('#app');
