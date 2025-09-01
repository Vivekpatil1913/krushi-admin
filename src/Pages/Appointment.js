import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiCheck, FiX, FiSearch, FiChevronLeft, FiChevronRight,
  FiPhone, FiMail, FiCalendar
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import './Appointment.css';


const backendURL = "http://localhost:5000/api/appointments";
const appointmentsPerPage = 4;

const Appointment = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [dateFilter, setDateFilter] = useState(""); // for filtering appointments by Booking date (YYYY-MM-DD)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [notif, setNotif] = useState({ show: false, type: "", msg: "" });

  // control visible state of calendar input for filter
  const [showDateInput, setShowDateInput] = useState(false);

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        const params = { page: currentPage, limit: appointmentsPerPage };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (statusFilter && statusFilter !== "All Status") params.status = statusFilter;
        if (paymentFilter && paymentFilter !== "All Payments") params.paymentStatus = paymentFilter;
        if (dateFilter) params.date = dateFilter; // expect yyyy-mm-dd
        const { data } = await axios.get(backendURL, { params });
        setAppointments(data.appointments || []);
        setTotalAppointments(data.total || 0);
      } catch (err) {
        setNotif({ show: true, type: "error", msg: "Failed to load appointments." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppointments();
  }, [currentPage, searchTerm, statusFilter, paymentFilter, dateFilter]);

  const totalPages = Math.ceil(totalAppointments / appointmentsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  // Toggle payment status (Paid <-> Pending)
  const togglePaymentStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Paid" ? "Pending" : "Paid";
    try {
      await axios.put(`${backendURL}/${id}`, { paymentStatus: newStatus });
      setAppointments((apps) =>
        apps.map((app) =>
          (app._id || app.id) === id ? { ...app, paymentStatus: newStatus } : app
        )
      );
    } catch {
      setNotif({ show: true, type: "error", msg: "Failed to update payment status." });
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${backendURL}/${id}`, { status: newStatus });
      setAppointments((apps) =>
        apps.map((app) =>
          (app._id || app.id) === id ? { ...app, status: newStatus } : app
        )
      );
      setNotif({ show: true, type: "success", msg: `Status set to ${newStatus}.` });
    } catch {
      setNotif({ show: true, type: "error", msg: "Failed to update status." });
    }
  };

  // WhatsApp helper
  const handleWhatsApp = (mobile) => {
    const message =
      "Hello, I'm following up on our appointment. Please let me know if you have any questions.";
    const phone = mobile.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;

  // Format booking date/time from .date + .time fields
  const getBookingDateTime = (appointment) => {
    const d = appointment.date ? new Date(appointment.date) : null;
    if (!d || isNaN(d.getTime())) return "N/A";
    const dateStr = d.toLocaleDateString();
    let timeStr = appointment.time || "N/A";
    // Format time string as HH:mm if it's in that form, else just show as is
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hour, min] = timeStr.split(":");
      let h = parseInt(hour, 10);
      const m = min.padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      timeStr = `${h}:${m} ${ampm}`;
    }
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="appointment-container">
      {notif.show && (
        <div className={`notification ${notif.type}`}>
          {notif.msg}
          <button className="notification-close" onClick={() => setNotif({ ...notif, show: false })}>×</button>
        </div>
      )}

     <div className="appointment-header">
  <div className="header-content">
    {/* Left side: Icon, Title, Subtitle */}
    <div className="header-left">
      <div className="header-icon">
        <FiCalendar />
      </div>
      <div>
        <h1>Appointment & Consultancy</h1>
        <p>Farmer Appointment Management Portal</p>
      </div>
    </div>

    {/* Right side: Stats */}
    <div className="header-stats">
      <div className="stat-card">
        <span className="stat-number">{totalAppointments}</span>
        <span className="stat-label">Total Appointments</span>
      </div>
    </div>
  </div>
</div>
      <div className="table-controls">
        <h3>
          <span className="table-icon">📅</span>
          Appointment Schedule
        </h3>
        <div className="controls-right">
          <div className="appointment-search-box">
            <FiSearch className="appointment-search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="status-filter"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Cancelled</option>
          </select>
          <select
            className="payment-filter"
            value={paymentFilter}
            onChange={e => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
          >
            <option>All Payments</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Refunded</option>
          </select>
          {/* Calendar Date Filter */}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 7px",
              fontSize: "1.34em",
              color: "#19753a",
              outline: "none",
              verticalAlign: "middle"
            }}
            title="Filter by booking date"
            aria-label="Filter by booking date"
            type="button"
            onClick={() => setShowDateInput((v) => !v)}
          >
            <FiCalendar />
          </button>
          {showDateInput && (
            <input
              type="date"
              className="date-filter"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
              style={{ marginLeft: 0 }}
              aria-label="Select booking date"
            />
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="appointment-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Booking Date</th>
              <th className="farmer-col">Farmer Details</th>
              <th className="farm-col">Farm Info</th>
              <th className="crop-col" style={{ textAlign: "center" }}>
                Counsaltancy Type
              </th>
              <th className="contact-col">Contact Info</th>
              <th className="payment-col">Payment</th>
              <th className="status-col">Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="loading-cell">
                  Loading...
                </td>
              </tr>
            ) : appointments.length > 0 ? (
              appointments.map((appointment) => (
                <tr key={appointment._id || appointment.id}>
                  {/* Booking Date/Time */}
                  <td style={{ fontWeight: 600, fontSize: "1em", color: "#34693d" }}>
                    <FiCalendar style={{ marginRight: 6, fontSize: "1.18em", verticalAlign: "-2px" }} />
                    {getBookingDateTime(appointment)}
                  </td>
                  {/* Farmer Details */}
                  <td className="farmer-info">
                    <div className="farmer-details">
                      <h4>{appointment.farmerName}</h4>
                      <p className="farmer-location">{appointment.location}</p>
                    </div>
                  </td>
                  <td className="farm-info">
                    <div className="farm-size"><strong>Farm Size:</strong> {appointment.farmSize}</div>
                    <div className="crop-type"><strong>Crop:</strong> {appointment.cropType}</div>
                  </td>
                  <td className="crop-info centered-consultancy" style={{ textAlign: 'center' }}>
                    <div className="crop-badge">{appointment.consultationType}</div>
                  </td>
                  <td className="contact-info">
                    <div className="contact-item">
                      <FiPhone className="contact-icon" />
                      <a href={`tel:${appointment.mobile}`}>{appointment.mobile}</a>
                    </div>
                    <div className="contact-item">
                      <FiMail className="contact-icon" />
                      <a href={`mailto:${appointment.email}`}>{appointment.email}</a>
                    </div>
                  </td>
                  {/* Payment toggle */}
                  <td>
                    <button
                      className={`payment-badge ${appointment.paymentStatus?.toLowerCase()}`}
                      style={{
                        border: "none",
                        outline: "none",
                        padding: "7px 16px",
                        background: "none",
                        cursor: "pointer"
                      }}
                      type="button"
                      onClick={() => togglePaymentStatus(appointment._id || appointment.id, appointment.paymentStatus)}
                      aria-label="Toggle payment status"
                    >
                      {appointment.paymentStatus}
                    </button>
                  </td>
                  <td>
                    <span className={`status-badge ${appointment.status.toLowerCase()}`}>
                      {appointment.status}
                      {appointment.status === "Pending" && (
                        <span className="status-pulse"></span>
                      )}
                    </span>
                  </td>
                  <td className="appointment-action-buttons">
                    <div className="actions-container">
                      <button
                        className="btn-action whatsapp"
                        onClick={() => handleWhatsApp(appointment.mobile)}
                        title="Message on WhatsApp"
                      >
                        <FaWhatsapp />
                      </button>
                      {appointment.status !== "Approved" && (
                        <button
                          className="btn-action approve"
                          onClick={() =>
                            handleStatusChange(
                              appointment._id || appointment.id,
                              "Approved"
                            )
                          }
                          title="Approve appointment"
                        >
                          <FiCheck />
                        </button>
                      )}
                      {appointment.status !== "Cancelled" && (
                        <button
                          className="btn-action cancel"
                          onClick={() =>
                            handleStatusChange(
                              appointment._id || appointment.id,
                              "Cancelled"
                            )
                          }
                          title="Cancel appointment"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="no-results">
                <td colSpan="8">
                  <div className="no-results-content">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/4076/4076478.png"
                      alt="No results"
                    />
                    <p>No appointments found matching your criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-footer">
        <div className="footer-info">
          Showing {indexOfFirstAppointment + 1}-
          {Math.min(indexOfLastAppointment, totalAppointments)} of {totalAppointments} appointments
        </div>
        <div className="pagination-controls">
          <button
            className={`page-btn prev ${currentPage === 1 ? "disabled" : ""}`}
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FiChevronLeft /> Previous
          </button>
          {getPageNumbers().map((number, idx) =>
            number === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="page-btn disabled"
                style={{ cursor: "default" }}
              >
                ...
              </span>
            ) : (
              <button
                key={number}
                className={`page-btn ${currentPage === number ? "active" : ""}`}
                onClick={() => setCurrentPage(number)}
              >
                {number}
              </button>
            )
          )}
          <button
            className={`page-btn next ${currentPage === totalPages ? "disabled" : ""}`}
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Appointment;
