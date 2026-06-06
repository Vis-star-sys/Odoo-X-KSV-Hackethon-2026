CREATE DATABASE IF NOT EXISTS vendorbridge;
USE vendorbridge;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'procurement_officer', 'vendor', 'manager') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  company_name VARCHAR(150) NOT NULL,
  vendor_category VARCHAR(100),
  gst_number VARCHAR(50),
  contact_person VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
  rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE rfqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INT,
  budget DECIMAL(15,2),
  deadline DATE,
  attachment VARCHAR(255),
  created_by INT NOT NULL,
  status ENUM('draft', 'published', 'closed', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE rfq_vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id INT NOT NULL,
  vendor_id INT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id INT NOT NULL,
  vendor_id INT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  delivery_days INT NOT NULL,
  warranty VARCHAR(100),
  notes TEXT,
  status ENUM('submitted', 'under_review', 'approved', 'rejected') DEFAULT 'submitted',
  ai_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  manager_id INT NOT NULL,
  remarks TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_at TIMESTAMP NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  quotation_id INT NOT NULL,
  vendor_id INT NOT NULL,
  status ENUM('generated', 'sent', 'acknowledged', 'completed', 'cancelled') DEFAULT 'generated',
  pdf_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  po_id INT NOT NULL,
  subtotal DECIMAL(15,2),
  tax DECIMAL(5,2) DEFAULT 18.00,
  total DECIMAL(15,2),
  pdf_url VARCHAR(255),
  status ENUM('generated', 'sent', 'paid') DEFAULT 'generated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed users (password for all: password123)
-- Hash generated with bcrypt rounds=10 for "password123"
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@vendorbridge.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
('John Manager', 'manager@vendorbridge.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager'),
('Sarah Officer', 'officer@vendorbridge.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'procurement_officer');

-- Seed sample vendors
INSERT INTO users (name, email, password, role) VALUES
('ABC Tech Contact', 'vendor1@abctech.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'vendor'),
('XYZ Electronics Contact', 'vendor2@xyzelectronics.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'vendor'),
('PQR Solutions Contact', 'vendor3@pqrsolutions.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'vendor');

INSERT INTO vendors (user_id, company_name, vendor_category, gst_number, contact_person, email, phone, address, status, rating) VALUES
(4, 'ABC Technologies Pvt Ltd', 'IT Equipment', '27AABCU9603R1ZX', 'ABC Tech Contact', 'vendor1@abctech.com', '+91-9876543210', 'Mumbai, Maharashtra', 'active', 4.80),
(5, 'XYZ Electronics Ltd', 'Electronics', '29AABCX1234K1Z5', 'XYZ Electronics Contact', 'vendor2@xyzelectronics.com', '+91-9876543211', 'Bangalore, Karnataka', 'active', 4.70),
(6, 'PQR Solutions Inc', 'Software & IT', '07AABCP9876M1ZY', 'PQR Solutions Contact', 'vendor3@pqrsolutions.com', '+91-9876543212', 'Delhi, NCR', 'active', 4.50);
