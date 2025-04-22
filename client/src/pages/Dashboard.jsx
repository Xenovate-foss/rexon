import { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  Clock, 
  Users, 
  Database, 
  HardDrive, 
  Cpu,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { io } from "socket.io-client";

// Register Chart.js components
Chart.register(ArcElement, ChartTooltip, Legend);

const ServerStatusDashboard = () => {
  const socketRef = useRef(null);
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Create a fallback server data for initial render or when API fails
  const fallbackData = {
    status: "ok",
    uptime: 1207.572683071,
    connections: 0,
    serverStatus: "online",
    memoryUsage: {
      rss: 135397376,
      heapTotal: 19505152,
      heapUsed: 17707168,
      external: 3686460,
      arrayBuffers: 43305
    },
    systemUsage: {
      disk: {
        total: "30G",
        available: "17G",
        used: "13G",
        usagePercent: "44"
      },
      ram: {
        total: "7.77 GB",
        free: "3.54 GB",
        used: "4.23 GB",
        usagePercent: "54.41"
      }
    }
  };

  // Format uptime to hours, minutes, seconds
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const connectToServer = () => {
    try {
      setLoading(true);
      
      // Initialize socket connection if not already connected
      if (!socketRef.current) {
        // Connect to the server URL
        socketRef.current = io("/");
        
        // Set up event listeners
        socketRef.current.on("connect", () => {
          setError(null);
          console.log("Socket connected successfully");
        });
        
        socketRef.current.on("connect_error", (err) => {
          console.error('Socket connection error:', err);
          setError('Failed to connect to server. Using fallback data.');
          setServerData(fallbackData);
          setLoading(false);
        });
        
        socketRef.current.on("server:health", (data) => {
          setServerData(data);
          setLastUpdated(new Date());
          setError(null);
          setLoading(false);
        });
      }
      
      // Emit an event to request data if needed
      socketRef.current.emit("client:requestHealth");
      
    } catch (err) {
      console.error('Error connecting to server:', err);
      setError('Failed to connect to server. Using fallback data.');
      
      // Use fallback data if we don't have any server data yet
      if (!serverData) {
        setServerData(fallbackData);
      }
      setLoading(false);
    }
  };

  // Manual refresh function
  const fetchServerData = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("client:requestHealth");
      setLoading(true);
    } else {
      connectToServer();
    }
  };

  useEffect(() => {
    // Initial connection
    connectToServer();
    
    // Clean up socket connection on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Show loading state
  if (loading && !serverData) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-6xl mx-auto flex flex-col items-center justify-center min-h-64">
        <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading server status...</p>
      </div>
    );
  }

  // If there's no data at all, show placeholder with retry button
  if (!serverData) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-6xl mx-auto flex flex-col items-center justify-center min-h-64">
        <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
        <p className="text-gray-600 font-medium">No server data available</p>
        <button 
          onClick={fetchServerData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Data
        </button>
      </div>
    );
  }

  // Now that we have serverData, prepare chart data
  
  // Chart data for memory usage
  const memoryChartData = {
    labels: ['Heap Used', 'Heap Available', 'External', 'Other RSS'],
    datasets: [
      {
        data: [
          serverData.memoryUsage.heapUsed,
          serverData.memoryUsage.heapTotal - serverData.memoryUsage.heapUsed,
          serverData.memoryUsage.external,
          serverData.memoryUsage.rss - serverData.memoryUsage.heapTotal - serverData.memoryUsage.external
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for disk usage
  const diskChartData = {
    labels: ['Used', 'Available'],
    datasets: [
      {
        data: [
          parseInt(serverData.systemUsage.disk.usagePercent),
          100 - parseInt(serverData.systemUsage.disk.usagePercent)
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for RAM usage
  const ramChartData = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [
          parseFloat(serverData.systemUsage.ram.usagePercent),
          100 - parseFloat(serverData.systemUsage.ram.usagePercent)
        ],
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 10
          }
        }
      }
    },
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Server className="h-6 w-6 mr-2 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Server Dashboard</h1>
        </div>
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center">
            <span className="font-medium text-gray-700 mr-2">Status:</span>
            {serverData.serverStatus === "online" ? (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">Online</span>
              </div>
            ) : (
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-1" />
                <span className="text-red-500 font-medium">Offline</span>
              </div>
            )}
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <button 
              onClick={fetchServerData} 
              className="mr-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {lastUpdated && (
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Error banner if there's an error but we're using fallback data */}
      {error && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-700">{error}</p>
            <button 
              onClick={fetchServerData} 
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry connection
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Uptime */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-2">
            <Clock className="h-5 w-5 mr-2" />
            <h2 className="text-sm font-medium">Uptime</h2>
          </div>
          <div className="text-xl font-bold text-gray-800">{formatUptime(serverData.uptime)}</div>
        </div>

        {/* Connections */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-2">
            <Users className="h-5 w-5 mr-2" />
            <h2 className="text-sm font-medium">Active Connections</h2>
          </div>
          <div className="text-xl font-bold text-gray-800">{serverData.connections}</div>
        </div>

        {/* Memory */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-2">
            <Cpu className="h-5 w-5 mr-2" />
            <h2 className="text-sm font-medium">Memory Usage</h2>
          </div>
          <div className="text-xl font-bold text-gray-800">{formatBytes(serverData.memoryUsage.heapUsed)} / {formatBytes(serverData.memoryUsage.heapTotal)}</div>
        </div>

        {/* Disk */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-2">
            <HardDrive className="h-5 w-5 mr-2" />
            <h2 className="text-sm font-medium">Disk Usage</h2>
          </div>
          <div className="text-xl font-bold text-gray-800">{serverData.systemUsage.disk.used} / {serverData.systemUsage.disk.total}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Memory Usage Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-4">
            <Database className="h-5 w-5 mr-2" />
            <h2 className="font-medium">Memory Distribution</h2>
          </div>
          <div className="h-64">
            <Doughnut data={memoryChartData} options={chartOptions} />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Total RSS: {formatBytes(serverData.memoryUsage.rss)}</span>
              <span>Array Buffers: {formatBytes(serverData.memoryUsage.arrayBuffers)}</span>
            </div>
          </div>
        </div>

        {/* Disk Usage Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-4">
            <HardDrive className="h-5 w-5 mr-2" />
            <h2 className="font-medium">Disk Usage</h2>
          </div>
          <div className="h-64">
            <Doughnut data={diskChartData} options={chartOptions} />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Used: {serverData.systemUsage.disk.used}</span>
              <span>Available: {serverData.systemUsage.disk.available}</span>
            </div>
          </div>
        </div>

        {/* RAM Usage Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center text-gray-600 mb-4">
            <Cpu className="h-5 w-5 mr-2" />
            <h2 className="font-medium">RAM Usage</h2>
          </div>
          <div className="h-64">
            <Doughnut data={ramChartData} options={chartOptions} />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Used: {serverData.systemUsage.ram.used}</span>
              <span>Free: {serverData.systemUsage.ram.free}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatusDashboard;