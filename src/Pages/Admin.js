"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend, Tooltip
} from "recharts";
import './Admin.css';
import {
  FiShoppingCart, FiTrendingUp, FiTrendingDown, FiPackage, FiDollarSign, FiClock, FiEye, FiCalendar, FiFilter,
  FiPhone, FiChevronLeft, FiChevronRight, FiMapPin, FiMail, FiUser, FiBarChart2, FiPieChart, FiImage, FiCreditCard,
  FiX, FiCheck, FiGlobe
} from "react-icons/fi";
import { BsWhatsapp, BsCheckCircle, BsBoxSeam, BsGraphUp, BsCurrencyRupee } from "react-icons/bs";
import { MdDashboard, MdAgriculture, MdAnalytics, MdInventory } from "react-icons/md";

// === WhatsApp Message Language Selection Modal ===
const WhatsAppLanguageModal = ({ isOpen, onClose, onSelectLanguage, orderDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="whatsapp-language-modal">
        <div className="modal-header">
          <h3>
            <BsWhatsapp className="whatsapp-icon" />
            Select Message Language
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="order-preview">
            <p><strong>Order:</strong> {orderDetails?.orderId}</p>
            <p><strong>Customer:</strong> {orderDetails?.customerInfo?.firstName} {orderDetails?.customerInfo?.lastName}</p>
          </div>

          <div className="language-buttons">
            <button
              onClick={() => onSelectLanguage('english')}
              className="language-btn english-btn"
            >
              <FiGlobe />
              English Message
            </button>
            <button
              onClick={() => onSelectLanguage('marathi')}
              className="language-btn marathi-btn"
            >
              🇮🇳
              मराठी संदेश (Marathi)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// === Confirmation Modal Component ===
const StatusConfirmationModal = ({ isOpen, onClose, onConfirm, orderDetails, loading }) => {
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adminName.trim()) {
      setError('Admin name is required');
      return;
    }
    if (adminName.trim().length < 2) {
      setError('Admin name must be at least 2 characters');
      return;
    }
    onConfirm(adminName.trim());
  };

  const handleClose = () => {
    setAdminName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="confirmation-modal">
        <div className="modal-header">
          <h3>Confirm Status Change</h3>
          <button onClick={handleClose} className="modal-close-btn">
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="order-info">
            <p><strong>Order ID:</strong> {orderDetails?.orderId}</p>
            <p><strong>Customer:</strong> {orderDetails?.customerInfo?.firstName} {orderDetails?.customerInfo?.lastName}</p>
            <p><strong>Current Status:</strong>
              <span className={`status-badge ${orderDetails?.status}`}>
                {orderDetails?.status === 'delivered' ? 'Delivered' : orderDetails?.status === 'payment_pending' ? 'Payment Pending' : 'Pending'}
              </span>
            </p>
            <p><strong>New Status:</strong>
              <span className={`status-badge ${orderDetails?.status === 'pending' ? 'delivered' : 'pending'}`}>
                {orderDetails?.status === 'pending' ? 'Delivered' : 'Pending'}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="adminName">Your Name (Admin) *</label>
              <input
                type="text"
                id="adminName"
                value={adminName}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your full name"
                className={error ? 'error' : ''}
                disabled={loading}
                autoFocus
              />
              {error && <span className="error-text">{error}</span>}
              <small className="form-help">This will be recorded for security and audit purposes</small>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button
            onClick={handleClose}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-confirm"
            disabled={loading || !adminName.trim()}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Updating...
              </>
            ) : (
              <>
                <FiCheck />
                Confirm Change
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// === Chart Tooltip ===
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-orders">
          <span className="tooltip-color orders-color"></span>
          {`Orders: ${payload[0]?.value || 0}`}
        </p>
        <p className="tooltip-earnings">
          <span className="tooltip-color earnings-color"></span>
          {`Earnings: ₹${payload[1]?.value?.toLocaleString() || 0}`}
        </p>
      </div>
    );
  }
  return null;
};

const apiBase = "https://krushi-backend-7l03.onrender.com/api";

export default function AdminDashboard() {
  // === SEPARATE STATES FOR DIFFERENT SECTIONS ===

  // Overall dashboard filters (affects stats and charts only)
  const [overallYear, setOverallYear] = useState("2025");
  const [chartView, setChartView] = useState("weekly");

  // Orders table specific filters (affects only the table)
  const [tableStatusFilter, setTableStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [allOrders, setAllOrders] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewingOrderId, setViewingOrderId] = useState(null);

  // Loading states
  const [statsLoading, setStatsLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    orderDetails: null,
    loading: false
  });

  const [whatsappModal, setWhatsappModal] = useState({
    isOpen: false,
    orderDetails: null
  });

  const ordersPerPage = 5;
  const currentYear = new Date().getFullYear();

  // === GENERATE WHATSAPP MESSAGE ===
  const generateWhatsAppMessage = (order, language = 'english') => {
    const customerName = `${order.customerInfo?.firstName} ${order.customerInfo?.lastName}`;
    const orderDate = new Date(order.orderDate).toLocaleDateString('en-IN');
    const paymentMethod = order.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery';
    const statusText = order.status === 'delivered' ? 'Delivered' :
      order.status === 'payment_pending' ? 'Payment Pending' : 'Pending';

    // Products list
    const productsList = order.items?.map((item, index) => {
      if (language === 'marathi') {
        return `${index + 1}. ${item.name || item.title}\n   मात्रा: ${item.quantity}\n   किंमत: ₹${item.price}\n   एकूण: ₹${item.quantity * item.price}`;
      } else {
        return `${index + 1}. ${item.name || item.title}\n   Qty: ${item.quantity}\n   Price: ₹${item.price}\n   Total: ₹${item.quantity * item.price}`;
      }
    }).join('\n\n') || '';

    if (language === 'marathi') {
      return `🙏 नमस्कार ${customerName},

🏪 *कृषिविश्व बायोटेक* कडून तुमच्या ऑर्डरबद्दल माहिती:

📋 *ऑर्डर तपशील:*
🆔 ऑर्डर आयडी: ${order.orderId}
📅 ऑर्डर दिनांक: ${orderDate}
📦 स्थिती: ${statusText}

🛍️ *उत्पादने:*
${productsList}

💰 *पेमेंट माहिती:*
💳 पेमेंट पद्धत: ${paymentMethod === 'Online Payment' ? 'ऑनलाइन पेमेंट' : 'कॅश ऑन डिलिव्हरी'}
💵 एकूण रक्कम: ₹${order.pricing?.total?.toLocaleString() || '0'}

📍 *डिलिव्हरी पत्ता:*
${order.customerInfo?.address}, ${order.customerInfo?.city}, ${order.customerInfo?.state} - ${order.customerInfo?.zipCode}

${order.specialInstructions ? `📝 *विशेष सूचना:* ${order.specialInstructions}\n\n` : ''}धन्यवाद! 🙏
कृषिविश्व बायोटेक संघ

📞 कोणत्याही प्रश्नासाठी संपर्क करा.`;
    } else {
      return `🙏 Hello ${customerName},

🏪 *Krishivishwa Biotech* - Your Order Information:

📋 *Order Details:*
🆔 Order ID: ${order.orderId}
📅 Order Date: ${orderDate}
📦 Status: ${statusText}

🛍️ *Products Ordered:*
${productsList}

💰 *Payment Information:*
💳 Payment Method: ${paymentMethod}
💵 Total Amount: ₹${order.pricing?.total?.toLocaleString() || '0'}

📍 *Delivery Address:*
${order.customerInfo?.address}, ${order.customerInfo?.city}, ${order.customerInfo?.state} - ${order.customerInfo?.zipCode}

${order.specialInstructions ? `📝 *Special Instructions:* ${order.specialInstructions}\n\n` : ''}Thank you for choosing us! 🙏
Krishivishwa Biotech Team

📞 Contact us for any queries.`;
    }
  };

  // === FETCH ALL ORDERS FOR STATS AND CHARTS ===
  const fetchAllOrders = async () => {
    setStatsLoading(true);
    try {
      const params = {
        limit: 1000,
        sortBy: 'orderDate',
        sortOrder: 'desc'
      };

      if (overallYear !== "all") params.year = overallYear;

      const response = await axios.get(`${apiBase}/orders`, { params });

      if (response.data.success) {
        setAllOrders(response.data.orders || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching all orders:', err);
      setAllOrders([]);
    } finally {
      setStatsLoading(false);
    }
  };

  // === FETCH PAGINATED ORDERS FOR TABLE ===
  const fetchTableOrders = async () => {
    setTableLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: ordersPerPage,
        sortBy: 'orderDate',
        sortOrder: 'desc'
      };

      if (tableStatusFilter !== "all") params.status = tableStatusFilter;

      const response = await axios.get(`${apiBase}/orders`, { params });

      if (response.data.success) {
        setTableOrders(response.data.orders || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalOrders(response.data.pagination?.totalOrders || 0);
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching table orders:', err);
      setError(err.message || 'Failed to fetch orders');
      setTableOrders([]);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setTableLoading(false);
    }
  };

  // === EFFECTS ===
  useEffect(() => {
    fetchAllOrders();
  }, [overallYear]);

  useEffect(() => {
    fetchTableOrders();
  }, [tableStatusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableStatusFilter]);

  // === CALCULATE STATS FROM ALL ORDERS ===
  const stats = useMemo(() => {
    if (!allOrders.length) {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalRevenue: 0,
        revenueChange: 0,
        mostSoldProduct: "No data"
      };
    }

    const totalOrdersCount = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "payment_pending").length;
    const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);

    const previousRevenue = totalRevenue * 0.85;
    const revenueChange = previousRevenue === 0 ? 0 : (((totalRevenue - previousRevenue) / previousRevenue) * 100);

    const productCounts = {};
    allOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.name || item.title || 'Unknown Product';
          productCounts[productName] = (productCounts[productName] || 0) + (item.quantity || 0);
        });
      }
    });

    const mostSoldProduct = Object.keys(productCounts).length > 0
      ? Object.keys(productCounts).reduce((a, b) => (productCounts[a] > productCounts[b] ? a : b))
      : "No data";

    return {
      totalOrders: totalOrdersCount,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      revenueChange: Number.parseFloat(revenueChange.toFixed(1)),
      mostSoldProduct
    };
  }, [allOrders]);

  // === FIXED WEEKLY CHART DATA ===
  const weeklyData = useMemo(() => {
    const weekAgg = [
      { name: "Mon", orders: 0, earnings: 0 },
      { name: "Tue", orders: 0, earnings: 0 },
      { name: "Wed", orders: 0, earnings: 0 },
      { name: "Thu", orders: 0, earnings: 0 },
      { name: "Fri", orders: 0, earnings: 0 },
      { name: "Sat", orders: 0, earnings: 0 },
      { name: "Sun", orders: 0, earnings: 0 },
    ];

    const dayMapping = {
      1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6
    };

    allOrders.forEach(order => {
      const d = new Date(order.orderDate);
      const dayIndex = d.getDay();
      const mappedIndex = dayMapping[dayIndex];

      if (mappedIndex !== undefined) {
        weekAgg[mappedIndex].orders += 1;
        weekAgg[mappedIndex].earnings += order.pricing?.total || 0;
      }
    });

    return weekAgg;
  }, [allOrders]);

  // === MONTHLY CHART DATA ===
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthAgg = months.map(month => ({ name: month, orders: 0, earnings: 0 }));

    allOrders.forEach(order => {
      const d = new Date(order.orderDate);
      const monthIndex = d.getMonth();
      monthAgg[monthIndex].orders += 1;
      monthAgg[monthIndex].earnings += order.pricing?.total || 0;
    });

    return monthAgg;
  }, [allOrders]);

  // === HANDLE STATUS TOGGLE WITH CONFIRMATION ===
  const handleStatusToggle = (order) => {
    setConfirmationModal({
      isOpen: true,
      orderDetails: order,
      loading: false
    });
  };

  const handleConfirmStatusChange = async (adminName) => {
    setConfirmationModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await axios.patch(
        `${apiBase}/orders/toggle-status/${confirmationModal.orderDetails._id}`,
        { adminName }
      );

      if (response.data.success) {
        setAllOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === confirmationModal.orderDetails._id
              ? response.data.order
              : order
          )
        );

        setTableOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === confirmationModal.orderDetails._id
              ? response.data.order
              : order
          )
        );

        if (selectedOrder && selectedOrder._id === confirmationModal.orderDetails._id) {
          setSelectedOrder(response.data.order);
        }

        setConfirmationModal({ isOpen: false, orderDetails: null, loading: false });
        alert(`Order status updated successfully by ${adminName}`);
      } else {
        alert('Failed to update order status: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Error updating order status: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseConfirmation = () => {
    if (!confirmationModal.loading) {
      setConfirmationModal({ isOpen: false, orderDetails: null, loading: false });
    }
  };

  // === HANDLE WHATSAPP CLICK WITH LANGUAGE SELECTION ===
  const handleWhatsAppClick = (order) => {
    setWhatsappModal({
      isOpen: true,
      orderDetails: order
    });
  };

  const handleWhatsAppLanguageSelect = (language) => {
    const order = whatsappModal.orderDetails;
    const message = generateWhatsAppMessage(order, language);
    const cleanPhone = order.customerInfo?.phone.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
    setWhatsappModal({ isOpen: false, orderDetails: null });
  };

  const handleCloseWhatsApp = () => {
    setWhatsappModal({ isOpen: false, orderDetails: null });
  };

  // === PAGINATION LOGIC ===
  const getPaginationNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const handlePageChange = (page) => {
    if (typeof page === 'number' && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // === VIEW ORDER DETAILS ===
  const handleViewOrder = (order) => {
    if (viewingOrderId === order._id) {
      setViewingOrderId(null);
      setSelectedOrder(null);
    } else {
      setViewingOrderId(order._id);
      setSelectedOrder(order);
    }
  };

  const startIndex = (currentPage - 1) * ordersPerPage;

  return (
    <div className="dashboard-container">
      {/* Status Confirmation Modal */}
      <StatusConfirmationModal
        isOpen={confirmationModal.isOpen}
        orderDetails={confirmationModal.orderDetails}
        loading={confirmationModal.loading}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmStatusChange}
      />

      {/* WhatsApp Language Selection Modal */}
      <WhatsAppLanguageModal
        isOpen={whatsappModal.isOpen}
        orderDetails={whatsappModal.orderDetails}
        onClose={handleCloseWhatsApp}
        onSelectLanguage={handleWhatsAppLanguageSelect}
      />

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="brand-icon">
            <MdAgriculture className="icon" />
          </div>
          <div>
            <h1 className="main-title">Krishivishwa Dashboard</h1>
            <p className="dashboard-subtitle">Agricultural Business Management System</p>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <MdAnalytics className="header-stat-icon" />
              <span>Analytics</span>
            </div>
            <div className="header-stat">
              <MdInventory className="header-stat-icon" />
              <span>Inventory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Dashboard Filter */}
      <div className="filter-section">
        <div className="filter-content">
          <div className="calendar-icon">
            <FiCalendar className="icon" />
          </div>
          <div>
            <label className="filter-label">Dashboard Year Filter</label>
            <select
              value={overallYear}
              onChange={e => setOverallYear(e.target.value)}
              className="year-select"
            >
              <option value="all">All Years</option>
              {[...Array(5)].map((_, idx) => {
                const yearOption = (currentYear - idx).toString();
                return (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="year-badge">
          <MdDashboard className="year-badge-icon" />
          Dashboard showing data for {overallYear === "all" ? "all years" : overallYear}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card-green">
          <div className="stat-header">
            <h3 className="stat-title">Total Orders</h3>
            <div className="stat-icon stat-icon-green">
              <FiShoppingCart className="icon" />
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {statsLoading ? "Loading..." : stats.totalOrders}
            </div>
            <div className="stat-trend">
              <FiTrendingUp className="trend-icon" />
              <span>+12% from last month</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-emerald">
          <div className="stat-header">
            <h3 className="stat-title">Most Sold Product</h3>
            <div className="stat-icon stat-icon-emerald">
              <BsBoxSeam className="icon" />
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-product">
              {statsLoading ? "Loading..." : stats.mostSoldProduct}
            </div>
            <div className="stat-badge">
              <BsGraphUp className="stat-badge-icon" />
              <span>Top performing item</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-teal">
          <div className="stat-header">
            <h3 className="stat-title">Revenue vs Previous</h3>
            <div className="stat-icon stat-icon-teal">
              <BsCurrencyRupee className="icon" />
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {statsLoading ? "Loading..." : `₹${stats.totalRevenue.toLocaleString()}`}
            </div>
            <div className="stat-trend">
              {stats.revenueChange >= 0 ? (
                <>
                  <FiTrendingUp className="trend-icon" />
                  <span>+{stats.revenueChange}%</span>
                </>
              ) : (
                <>
                  <FiTrendingDown className="trend-icon" />
                  <span>{stats.revenueChange}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-amber">
          <div className="stat-header">
            <h3 className="stat-title">Pending Orders</h3>
            <div className="stat-icon stat-icon-amber">
              <FiClock className="icon" />
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {statsLoading ? "Loading..." : stats.pendingOrders}
            </div>
            <div className="stat-badge">
              <FiClock className="stat-badge-icon" />
              <span>Awaiting processing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-section">
            <div>
              <h3 className="chart-title">
                <FiBarChart2 className="chart-title-icon" />
                Sales Analytics
              </h3>
              <p className="chart-description">
                Orders count and earnings overview {statsLoading && "(Loading...)"}
              </p>
            </div>
            <div className="chart-buttons">
              <button
                onClick={() => setChartView("weekly")}
                className={chartView === "weekly" ? "chart-btn-active" : "chart-btn-outline"}
              >
                <FiCalendar className="chart-btn-icon" />
                Weekly
              </button>
              <button
                onClick={() => setChartView("monthly")}
                className={chartView === "monthly" ? "chart-btn-active" : "chart-btn-outline"}
              >
                <FiPieChart className="chart-btn-icon" />
                Monthly
              </button>
            </div>
          </div>
        </div>
        <div className="chart-content">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartView === "weekly" ? weeklyData : monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#374151" fontSize={12} fontWeight={500} />
                <YAxis yAxisId="left" stroke="#374151" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#374151" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="#16a34a"
                  name="Orders"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="earnings"
                  fill="#10b981"
                  name="Earnings (₹)"
                  radius={[4, 4, 0, 0]}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Orders Table Section */}
      <div className="orders-card">
        <div className="orders-header">
          <div className="orders-title-section">
            <div>
              <h3 className="orders-title">
                <FiPackage className="orders-title-icon" />
                Product Orders
              </h3>
              <p className="orders-description">
                Manage and track all customer orders
                {tableLoading && " (Loading...)"}
              </p>
            </div>
            <div className="orders-filter">
              <div className="filter-icon">
                <FiFilter className="icon" />
              </div>
              <select
                value={tableStatusFilter}
                onChange={e => setTableStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="payment_pending">Payment Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="orders-content">
          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
              <button onClick={fetchTableOrders} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {!error && (
            <div className="table-container">
              <table className="orders-table">
                <thead className="table-header">
                  <tr className="header-row">
                    <th className="table-th">Order ID</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Location</th>
                    <th className="table-th">Product</th>
                    <th className="table-th">Total Price</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableOrders.map((order, index) => (
                    <React.Fragment key={order._id}>
                      <tr className={`table-row ${index % 2 === 0 ? "row-even" : "row-odd"}`}>
                        <td className="table-td">
                          <div className="order-id">{order.orderId}</div>
                          <div className="order-date">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </div>
                          <div className="order-time">
                            {new Date(order.orderDate).toLocaleTimeString()}
                          </div>
                        </td>

                        <td className="table-td">
                          <div className="customer-name">
                            <FiUser className="customer-icon" />
                            {order.customerInfo?.firstName} {order.customerInfo?.lastName}
                          </div>
                          <div className="customer-email">
                            <FiMail className="customer-icon" />
                            {order.customerInfo?.email}
                          </div>
                          <div className="customer-phone">
                            <FiPhone className="customer-icon" />
                            {order.customerInfo?.phone}
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="location">

                            {order.customerInfo?.city}, {order.customerInfo?.state}
                          </div>
                          <div className="zipcode">{order.customerInfo?.zipCode}</div>
                        </td>
                        <td className="table-td">
                          <div className="product-info">
                            {order.items && order.items.length > 0 ? (
                              <>
                                <div className="product-name">
                                  {order.items[0].name || order.items.title}
                                </div>
                                <div className="product-details">
                                  Qty: {order.items[0].quantity} × ₹{order.items.price}
                                </div>
                                <div className="product-category">{order.items[0].category}</div>
                                {order.items.length > 1 && (
                                  <div className="more-items">
                                    +{order.items.length - 1} more item(s)
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="product-name">No items</div>
                            )}
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="total-price">
                            ₹{order.pricing?.total?.toLocaleString() || '0'}
                          </div>
                          <div className="payment-method">
                            {order.paymentMethod === "online" ? "Online Payment" : "Cash on Delivery"}
                          </div>
                        </td>
                        <td className="table-td">
                          <span className={
                            order.status === "delivered"
                              ? "status-delivered"
                              : order.status === "payment_pending"
                                ? "status-payment-pending"
                                : "status-pending"
                          }>
                            {order.status === "delivered" ? (
                              <>
                                <BsCheckCircle className="status-icon" />
                                Delivered
                              </>
                            ) : order.status === "payment_pending" ? (
                              <>
                                <FiClock className="status-icon" />
                                Payment Pending
                              </>
                            ) : (
                              <>
                                <FiClock className="status-icon" />
                                Pending
                              </>
                            )}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="action-buttons">
                            <button
                              onClick={() => handleWhatsAppClick(order)}
                              className="action-btn whatsapp-btn"
                              title="Send WhatsApp Message"
                            >
                              <BsWhatsapp />
                            </button>
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="action-btn view-btn"
                              title="View Order Details"
                            >
                              <FiEye />
                            </button>
                            <button
                              onClick={() => handleStatusToggle(order)}
                              className={`action-btn ${order.status === "delivered"
                                  ? "confirm-btn-delivered"
                                  : "confirm-btn-pending"
                                }`}
                              title={
                                order.status === "delivered"
                                  ? "Mark as Pending"
                                  : "Mark as Delivered"
                              }
                            >
                              <BsCheckCircle />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Order Details Row - keeping existing code for brevity */}
                      {viewingOrderId === order._id && selectedOrder && (
                        <tr key={`${order._id}-details`} className="order-details-row">
                          <td colSpan="7" className="order-details-cell">
                            <div className="inline-order-details">
                              <div className="inline-details-header">
                                <div className="inline-header-content">
                                  <FiPackage className="inline-icon" />
                                  <h4 className="inline-title">Order Details - {selectedOrder.orderId}</h4>
                                </div>
                                <button
                                  className="inline-close-btn"
                                  onClick={() => {
                                    setViewingOrderId(null);
                                    setSelectedOrder(null);
                                  }}
                                >
                                  ×
                                </button>
                              </div>

                              <div className="inline-details-content">
                                {/* Customer Information */}
                                <div className="inline-section">
                                  <div className="inline-section-header">
                                    <FiUser className="inline-section-icon" />
                                    <h5>Customer Information</h5>
                                  </div>
                                  <div className="inline-details-grid">
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Name:</span>
                                      <span className="inline-value">
                                        {selectedOrder.customerInfo?.firstName} {selectedOrder.customerInfo?.lastName}
                                      </span>
                                    </div>
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Email:</span>
                                      <span className="inline-value">{selectedOrder.customerInfo?.email}</span>
                                    </div>
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Phone:</span>
                                      <span className="inline-value">{selectedOrder.customerInfo?.phone}</span>
                                    </div>
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Address:</span>
                                      <span className="inline-value">
                                        {selectedOrder.customerInfo?.address}, {selectedOrder.customerInfo?.city},{" "}
                                        {selectedOrder.customerInfo?.state} {selectedOrder.customerInfo?.zipCode}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Products */}
                                <div className="inline-section">
                                  <div className="inline-section-header">
                                    <BsBoxSeam className="inline-section-icon" />
                                    <h5>Products</h5>
                                  </div>
                                  <div className="inline-products-list">
                                    {selectedOrder.items?.map((item, index) => (
                                      <div key={index} className="inline-product-card">
                                        <img
                                          src={item.image ? `${apiBase.replace('/api', '')}${item.image}` : "/placeholder.svg"}
                                          alt={item.name || item.title}
                                          className="inline-product-image"
                                        />
                                        <div className="inline-product-info">
                                          <h6 className="inline-product-name">{item.name || item.title}</h6>
                                          <p className="inline-product-category">{item.category}</p>
                                          <div className="inline-product-pricing">
                                            <span>Qty: {item.quantity}</span>
                                            <span>₹{item.price} each</span>
                                            <span className="inline-product-total">
                                              Total: ₹{(item.quantity * item.price).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )) || <p>No items found</p>}
                                  </div>
                                </div>

                                {/* Payment Information Section */}
                                {selectedOrder.paymentMethod === "online" && (
                                  <div className="inline-section payment-proof-section">
                                    <div className="inline-section-header">
                                      <FiCreditCard className="inline-section-icon" />
                                      <h5>Payment Verification</h5>
                                    </div>
                                    <div className="payment-proof-container">
                                      {/* Transaction Screenshot */}
                                      {selectedOrder.paymentData?.transactionScreenshot ? (
                                        <div className="payment-proof-item">
                                          <div className="proof-header">
                                            <FiImage className="proof-icon" />
                                            <h6>Payment Screenshot</h6>
                                            <span className="proof-status verified">✓ Provided</span>
                                          </div>
                                          <div className="screenshot-container">
                                            <img
                                              src={`${apiBase.replace('/api', '')}${selectedOrder.paymentData.transactionScreenshot}`}
                                              alt="Payment Screenshot"
                                              className="payment-screenshot"
                                              onClick={(e) => {
                                                window.open(e.target.src, '_blank');
                                              }}
                                            />
                                            <div className="screenshot-overlay">
                                              <span>Click to view full size</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="payment-proof-item">
                                          <div className="proof-header">
                                            <FiImage className="proof-icon" />
                                            <h6>Payment Screenshot</h6>
                                            <span className="proof-status missing">✗ Not Provided</span>
                                          </div>
                                          <div className="no-screenshot">
                                            <p>No payment screenshot uploaded</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Transaction ID */}
                                      <div className="payment-proof-item">
                                        <div className="proof-header">
                                          <FiCreditCard className="proof-icon" />
                                          <h6>Transaction ID <span className="optional-label">(Optional)</span></h6>
                                          <span className={`proof-status ${selectedOrder.paymentData?.transactionId ? 'verified' : 'missing'}`}>
                                            {selectedOrder.paymentData?.transactionId ? '✓ Provided' : '✗ Not Provided'}
                                          </span>
                                        </div>
                                        <div className="transaction-id-display">
                                          {selectedOrder.paymentData?.transactionId ? (
                                            <div className="transaction-id-value">
                                              <code>{selectedOrder.paymentData.transactionId}</code>
                                              <button
                                                className="copy-transaction-id"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(selectedOrder.paymentData.transactionId);
                                                  alert('Transaction ID copied to clipboard!');
                                                }}
                                                title="Copy Transaction ID"
                                              >
                                                Copy
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="no-transaction-id">
                                              <p>No transaction ID provided</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Pricing Breakdown */}
                                <div className="inline-section">
                                  <div className="inline-section-header">
                                    <FiDollarSign className="inline-section-icon" />
                                    <h5>Pricing Breakdown</h5>
                                  </div>
                                  <div className="inline-pricing-breakdown">
                                    <div className="inline-pricing-row">
                                      <span>Subtotal:</span>
                                      <span>₹{selectedOrder.pricing?.subtotal?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="inline-pricing-row">
                                      <span>Shipping:</span>
                                      <span>
                                        {selectedOrder.pricing?.shippingFee === 0
                                          ? "FREE"
                                          : `₹${selectedOrder.pricing?.shippingFee?.toLocaleString() || '0'}`}
                                      </span>
                                    </div>
                                    <div className="inline-pricing-row">
                                      <span>Tax (GST):</span>
                                      <span>₹{selectedOrder.pricing?.tax?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="inline-pricing-total">
                                      <span>Total Amount:</span>
                                      <span>₹{selectedOrder.pricing?.total?.toLocaleString() || '0'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Order Information - WITH CONFIRMATION DETAILS */}
                                <div className="inline-section">
                                  <div className="inline-section-header">
                                    <FiPackage className="inline-section-icon" />
                                    <h5>Order Information</h5>
                                  </div>
                                  <div className="inline-details-grid">
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Date:</span>
                                      <span className="inline-value">
                                        {new Date(selectedOrder.orderDate).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Payment Method:</span>
                                      <span className="inline-value">
                                        {selectedOrder.paymentMethod === "online"
                                          ? "Online Payment"
                                          : "Cash on Delivery"}
                                      </span>
                                    </div>
                                    <div className="inline-detail-item">
                                      <span className="inline-label">Status:</span>
                                      <span className={`inline-value inline-status-badge ${selectedOrder.status}`}>
                                        {selectedOrder.status === "delivered" ? (
                                          <>
                                            <BsCheckCircle className="inline-status-icon" />
                                            Delivered
                                          </>
                                        ) : selectedOrder.status === "payment_pending" ? (
                                          <>
                                            <FiClock className="inline-status-icon" />
                                            Payment Pending
                                          </>
                                        ) : (
                                          <>
                                            <FiClock className="inline-status-icon" />
                                            Pending
                                          </>
                                        )}
                                      </span>
                                    </div>

                                    {/* Show confirmation details */}
                                    {selectedOrder.confirmedBy && (
                                      <>
                                        <div className="inline-detail-item">
                                          <span className="inline-label">Confirmed By:</span>
                                          <span className="inline-value confirmed-by">
                                            <FiUser className="inline-status-icon" />
                                            {selectedOrder.confirmedBy}
                                          </span>
                                        </div>
                                        <div className="inline-detail-item">
                                          <span className="inline-label">Confirmed At:</span>
                                          <span className="inline-value">
                                            {new Date(selectedOrder.confirmedAt).toLocaleString()}
                                          </span>
                                        </div>
                                      </>
                                    )}

                                    {selectedOrder.specialInstructions && (
                                      <div className="inline-detail-item inline-full-width">
                                        <span className="inline-label">Special Instructions:</span>
                                        <span className="inline-value">{selectedOrder.specialInstructions}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {!tableLoading && tableOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="no-orders">
                        <div className="no-orders-content">
                          <FiPackage className="no-orders-icon" />
                          <p>No orders found</p>
                          <small>Try adjusting your filters</small>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!error && totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, totalOrders)} of {totalOrders} orders
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <FiChevronLeft className="icon" />
                  Previous
                </button>
                <div className="pagination-numbers">
                  {getPaginationNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(page)}
                      disabled={page === "..."}
                      className={
                        page === currentPage ? "pagination-active"
                          : page === "..." ? "pagination-dots"
                            : "pagination-number"
                      }
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                  <FiChevronRight className="icon" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
