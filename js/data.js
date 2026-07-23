// ============================================================
//  SHUROQ ERP – MOCK DATA
// ============================================================

const DB = {
  // ---- EMPLOYEES ----
  employees: [
    { id: 'EMP001', firstName: 'Arjun', lastName: 'Sharma', gender: 'Male', dob: '1995-04-12', contact: '+91 98765 43210', email: 'arjun.sharma@shuroq.com', department: 'Engineering', position: 'Senior Developer', joinDate: '2021-03-01', empType: 'Full-time', address: '12 MG Road', city: 'Bangalore', state: 'Karnataka', country: 'India', status: 'Active', performanceRating: 4, avatar: 'AS' },
    { id: 'EMP002', firstName: 'Priya', lastName: 'Patel', gender: 'Female', dob: '1997-08-22', contact: '+91 87654 32109', email: 'priya.patel@shuroq.com', department: 'HR', position: 'HR Manager', joinDate: '2020-07-15', empType: 'Full-time', address: '45 Nagar Street', city: 'Chennai', state: 'Tamil Nadu', country: 'India', status: 'Active', performanceRating: 5, avatar: 'PP' },
    { id: 'EMP003', firstName: 'Rahul', lastName: 'Menon', gender: 'Male', dob: '1993-01-30', contact: '+91 76543 21098', email: 'rahul.menon@shuroq.com', department: 'Sales', position: 'Sales Manager', joinDate: '2019-11-01', empType: 'Full-time', address: '88 Park Ave', city: 'Mumbai', state: 'Maharashtra', country: 'India', status: 'Active', performanceRating: 4, avatar: 'RM' },
    { id: 'EMP004', firstName: 'Sneha', lastName: 'Krishnan', gender: 'Female', dob: '1999-06-14', contact: '+91 65432 10987', email: 'sneha.k@shuroq.com', department: 'Design', position: 'UI/UX Designer', joinDate: '2022-01-10', empType: 'Full-time', address: '7 Lake View', city: 'Hyderabad', state: 'Telangana', country: 'India', status: 'Active', performanceRating: 4, avatar: 'SK' },
    { id: 'EMP005', firstName: 'Vikram', lastName: 'Nair', gender: 'Male', dob: '1991-11-05', contact: '+91 54321 09876', email: 'vikram.nair@shuroq.com', department: 'Engineering', position: 'DevOps Engineer', joinDate: '2018-06-20', empType: 'Full-time', address: '23 Hill Road', city: 'Pune', state: 'Maharashtra', country: 'India', status: 'Inactive', performanceRating: 3, avatar: 'VN' },
    { id: 'EMP006', firstName: 'Ananya', lastName: 'Roy', gender: 'Female', dob: '2000-03-18', contact: '+91 43210 98765', email: 'ananya.roy@shuroq.com', department: 'Finance', position: 'Financial Analyst', joinDate: '2022-08-01', empType: 'Part-time', address: '5 Central Park', city: 'Kolkata', state: 'West Bengal', country: 'India', status: 'Active', performanceRating: 5, avatar: 'AR' },
    { id: 'EMP007', firstName: 'Karthik', lastName: 'Bala', gender: 'Male', dob: '1996-09-25', contact: '+91 32109 87654', email: 'karthik.b@shuroq.com', department: 'Engineering', position: 'ML Engineer', joinDate: '2021-09-15', empType: 'Full-time', address: '19 Tech Park', city: 'Bangalore', state: 'Karnataka', country: 'India', status: 'Active', performanceRating: 4, avatar: 'KB' },
    { id: 'EMP008', firstName: 'Divya', lastName: 'Iyer', gender: 'Female', dob: '1994-12-08', contact: '+91 21098 76543', email: 'divya.iyer@shuroq.com', department: 'Marketing', position: 'Marketing Lead', joinDate: '2020-02-14', empType: 'Full-time', address: '33 Orchid Lane', city: 'Chennai', state: 'Tamil Nadu', country: 'India', status: 'Active', performanceRating: 3, avatar: 'DI' },
  ],

  // ---- ATTENDANCE ----
  attendance: [
    { id: 'ATT001', empId: 'EMP001', empName: 'Arjun Sharma', date: '2026-06-26', checkIn: '09:02', checkOut: '18:05', status: 'Present', hours: 9.05 },
    { id: 'ATT002', empId: 'EMP002', empName: 'Priya Patel', date: '2026-06-26', checkIn: '08:55', checkOut: '18:00', status: 'Present', hours: 9.08 },
    { id: 'ATT003', empId: 'EMP003', empName: 'Rahul Menon', date: '2026-06-26', checkIn: '09:30', checkOut: '17:30', status: 'Late', hours: 8.0 },
    { id: 'ATT004', empId: 'EMP004', empName: 'Sneha Krishnan', date: '2026-06-26', checkIn: '--', checkOut: '--', status: 'Absent', hours: 0 },
    { id: 'ATT005', empId: 'EMP006', empName: 'Ananya Roy', date: '2026-06-26', checkIn: '10:00', checkOut: '14:00', status: 'Half Day', hours: 4.0 },
    { id: 'ATT006', empId: 'EMP007', empName: 'Karthik Bala', date: '2026-06-26', checkIn: '08:45', checkOut: '18:30', status: 'Present', hours: 9.75 },
    { id: 'ATT007', empId: 'EMP008', empName: 'Divya Iyer', date: '2026-06-26', checkIn: '09:10', checkOut: '18:10', status: 'Present', hours: 9.0 },
    { id: 'ATT008', empId: 'EMP001', empName: 'Arjun Sharma', date: '2026-06-25', checkIn: '09:00', checkOut: '18:00', status: 'Present', hours: 9.0 },
    { id: 'ATT009', empId: 'EMP003', empName: 'Rahul Menon', date: '2026-06-25', checkIn: '09:05', checkOut: '18:05', status: 'Present', hours: 9.0 },
    { id: 'ATT010', empId: 'EMP004', empName: 'Sneha Krishnan', date: '2026-06-25', checkIn: '09:00', checkOut: '18:00', status: 'Present', hours: 9.0 },
  ],

  // ---- LEAVES ----
  leaves: [
    { id: 'LEA001', empId: 'EMP001', empName: 'Arjun Sharma', type: 'Casual Leave', from: '2026-07-05', to: '2026-07-06', days: 2, reason: 'Personal work', status: 'Pending', applied: '2026-06-24' },
    { id: 'LEA002', empId: 'EMP003', empName: 'Rahul Menon', type: 'Sick Leave', from: '2026-06-20', to: '2026-06-21', days: 2, reason: 'Fever and flu', status: 'Approved', applied: '2026-06-19' },
    { id: 'LEA003', empId: 'EMP004', empName: 'Sneha Krishnan', type: 'Annual Leave', from: '2026-06-26', to: '2026-06-28', days: 3, reason: 'Vacation trip', status: 'Approved', applied: '2026-06-18' },
    { id: 'LEA004', empId: 'EMP008', empName: 'Divya Iyer', type: 'Casual Leave', from: '2026-07-10', to: '2026-07-10', days: 1, reason: 'Family function', status: 'Pending', applied: '2026-06-25' },
    { id: 'LEA005', empId: 'EMP006', empName: 'Ananya Roy', type: 'Maternity Leave', from: '2026-08-01', to: '2026-10-01', days: 60, reason: 'Maternity leave', status: 'Approved', applied: '2026-06-20' },
    { id: 'LEA006', empId: 'EMP007', empName: 'Karthik Bala', type: 'Sick Leave', from: '2026-06-15', to: '2026-06-15', days: 1, reason: 'Medical appointment', status: 'Rejected', applied: '2026-06-14' },
  ],

  // ---- PERFORMANCE ----
  performance: [
    { id: 'PER001', empId: 'EMP001', empName: 'Arjun Sharma', quarter: 'Q2 2026', rating: 4, review: 'Excellent work on the microservices migration. Consistently delivers on time.', goals: 'Lead the API redesign project', reviewer: 'Priya Patel' },
    { id: 'PER002', empId: 'EMP002', empName: 'Priya Patel', quarter: 'Q2 2026', rating: 5, review: 'Outstanding leadership in HR transformation. Reduced attrition by 20%.', goals: 'Implement new onboarding system', reviewer: 'Admin' },
    { id: 'PER003', empId: 'EMP003', empName: 'Rahul Menon', quarter: 'Q2 2026', rating: 4, review: 'Closed 8 enterprise deals this quarter. Strong pipeline management.', goals: 'Expand into 3 new territories', reviewer: 'Admin' },
    { id: 'PER004', empId: 'EMP007', empName: 'Karthik Bala', quarter: 'Q2 2026', rating: 4, review: 'Delivered ML model with 94% accuracy. Proactive in knowledge sharing.', goals: 'Deploy production AI pipeline', reviewer: 'Arjun Sharma' },
    { id: 'PER005', empId: 'EMP008', empName: 'Divya Iyer', quarter: 'Q2 2026', rating: 3, review: 'Good campaign management but needs to improve response time on escalations.', goals: 'Launch new brand campaign', reviewer: 'Admin' },
  ],

  // ---- PRODUCTS / INVENTORY ----
  products: [
    { id: 'PRD001', name: 'Laptop Pro 15', category: 'Electronics', sku: 'LPRO-15-001', supplier: 'TechSupply Co.', price: 85000, costPrice: 72000, stock: 24, minStock: 10, unit: 'Piece', status: 'Active' },
    { id: 'PRD002', name: 'Wireless Mouse', category: 'Electronics', sku: 'WM-BT-002', supplier: 'GadgetHub', price: 1800, costPrice: 1200, stock: 3, minStock: 15, unit: 'Piece', status: 'Active' },
    { id: 'PRD003', name: 'Mechanical Keyboard', category: 'Electronics', sku: 'MK-RGB-003', supplier: 'KeyMaster', price: 4500, costPrice: 3200, stock: 8, minStock: 10, unit: 'Piece', status: 'Active' },
    { id: 'PRD004', name: 'Office Chair Ergonomic', category: 'Furniture', sku: 'OCE-BLK-004', supplier: 'FurnishCo', price: 22000, costPrice: 16000, stock: 2, minStock: 5, unit: 'Piece', status: 'Active' },
    { id: 'PRD005', name: 'A4 Paper Ream', category: 'Stationery', sku: 'PAP-A4-005', supplier: 'PaperWorld', price: 380, costPrice: 290, stock: 120, minStock: 20, unit: 'Ream', status: 'Active' },
    { id: 'PRD006', name: 'USB-C Hub 7-in-1', category: 'Electronics', sku: 'USB-HUB-006', supplier: 'TechSupply Co.', price: 2800, costPrice: 1900, stock: 1, minStock: 8, unit: 'Piece', status: 'Active' },
    { id: 'PRD007', name: '27" Monitor 4K', category: 'Electronics', sku: 'MON-4K-007', supplier: 'DisplayPro', price: 35000, costPrice: 28000, stock: 6, minStock: 5, unit: 'Piece', status: 'Active' },
    { id: 'PRD008', name: 'Whiteboard Markers Set', category: 'Stationery', sku: 'WBM-SET-008', supplier: 'PaperWorld', price: 250, costPrice: 160, stock: 40, minStock: 10, unit: 'Set', status: 'Active' },
    { id: 'PRD009', name: 'Server Rack Unit', category: 'Infrastructure', sku: 'SRV-RCK-009', supplier: 'DataCenter Solutions', price: 120000, costPrice: 95000, stock: 0, minStock: 2, unit: 'Unit', status: 'Inactive' },
    { id: 'PRD010', name: 'Noise Cancelling Headphones', category: 'Electronics', sku: 'NCH-PRO-010', supplier: 'GadgetHub', price: 8500, costPrice: 6200, stock: 11, minStock: 5, unit: 'Piece', status: 'Active' },
  ],

  // ---- PROJECTS ----
  projects: [
    { id: 'PRJ001', name: 'ERP System V1', description: 'Build the complete Enterprise Resource Planning system for Shuroq.', status: 'In Progress', priority: 'Critical', startDate: '2026-06-10', endDate: '2026-06-28', progress: 68, team: ['EMP001', 'EMP007'], manager: 'Arjun Sharma', tasksTotal: 45, tasksDone: 31, tags: ['Web', 'Backend', 'AI'] },
    { id: 'PRJ002', name: 'Marketing Campaign Q3', description: 'Plan and execute the Q3 digital marketing campaign across all channels.', status: 'In Progress', priority: 'High', startDate: '2026-07-01', endDate: '2026-09-30', progress: 15, team: ['EMP008'], manager: 'Divya Iyer', tasksTotal: 20, tasksDone: 3, tags: ['Marketing', 'Social'] },
    { id: 'PRJ003', name: 'Office Renovation', description: 'Renovate Bangalore office floor 3 with modern collaborative spaces.', status: 'On Hold', priority: 'Medium', startDate: '2026-05-01', endDate: '2026-08-01', progress: 30, team: ['EMP002'], manager: 'Priya Patel', tasksTotal: 12, tasksDone: 4, tags: ['Infrastructure'] },
    { id: 'PRJ004', name: 'Sales Pipeline Automation', description: 'Automate CRM workflows and lead scoring for the sales team.', status: 'Not Started', priority: 'High', startDate: '2026-07-15', endDate: '2026-09-15', progress: 0, team: ['EMP003', 'EMP001'], manager: 'Rahul Menon', tasksTotal: 28, tasksDone: 0, tags: ['CRM', 'Automation'] },
    { id: 'PRJ005', name: 'HR Policy Redesign', description: 'Review and redesign all HR policies and employee handbook.', status: 'Completed', priority: 'Medium', startDate: '2026-04-01', endDate: '2026-06-01', progress: 100, team: ['EMP002', 'EMP006'], manager: 'Priya Patel', tasksTotal: 18, tasksDone: 18, tags: ['HR', 'Policy'] },
  ],

  // ---- TASKS ----
  tasks: [
    { id: 'TSK001', projId: 'PRJ001', title: 'Database schema design', status: 'Done', priority: 'High', assignee: 'Karthik Bala', dueDate: '2026-06-12', tag: 'Backend' },
    { id: 'TSK002', projId: 'PRJ001', title: 'Authentication & JWT setup', status: 'Done', priority: 'High', assignee: 'Arjun Sharma', dueDate: '2026-06-13', tag: 'Backend' },
    { id: 'TSK003', projId: 'PRJ001', title: 'HRM API development', status: 'In Progress', priority: 'High', assignee: 'Karthik Bala', dueDate: '2026-06-20', tag: 'Backend' },
    { id: 'TSK004', projId: 'PRJ001', title: 'Inventory API development', status: 'In Progress', priority: 'Medium', assignee: 'Karthik Bala', dueDate: '2026-06-22', tag: 'Backend' },
    { id: 'TSK005', projId: 'PRJ001', title: 'Dashboard Frontend', status: 'In Progress', priority: 'High', assignee: 'Arjun Sharma', dueDate: '2026-06-21', tag: 'Frontend' },
    { id: 'TSK006', projId: 'PRJ001', title: 'AI Analytics Integration', status: 'Review', priority: 'High', assignee: 'Arjun Sharma', dueDate: '2026-06-25', tag: 'AI' },
    { id: 'TSK007', projId: 'PRJ001', title: 'User testing & QA', status: 'Not Started', priority: 'Medium', assignee: 'Karthik Bala', dueDate: '2026-06-27', tag: 'QA' },
    { id: 'TSK008', projId: 'PRJ001', title: 'Final demo preparation', status: 'Not Started', priority: 'Critical', assignee: 'Arjun Sharma', dueDate: '2026-06-28', tag: 'PM' },
    { id: 'TSK009', projId: 'PRJ002', title: 'Content strategy plan', status: 'Done', priority: 'High', assignee: 'Divya Iyer', dueDate: '2026-07-05', tag: 'Strategy' },
    { id: 'TSK010', projId: 'PRJ002', title: 'Social media calendar', status: 'In Progress', priority: 'Medium', assignee: 'Divya Iyer', dueDate: '2026-07-10', tag: 'Social' },
  ],

  // ---- ROLES & PERMISSIONS ----
  roles: [
    { id: 'ROLE1', name: 'SUPER_ADMIN', description: 'Full access' },
    { id: 'ROLE2', name: 'HR_MANAGER', description: 'HR access' },
    { id: 'ROLE3', name: 'EMPLOYEE', description: 'Standard employee access' }
  ],
  
  permissions: [
    { id: 'PERM1', module: 'HR', action: 'ALL', roleId: 'ROLE2' }
  ],

  // ---- DEPARTMENTS & DESIGNATIONS ----
  departments: [
    { id: 'DEPT1', name: 'Engineering' },
    { id: 'DEPT2', name: 'HR' },
    { id: 'DEPT3', name: 'Sales' }
  ],
  
  designations: [
    { id: 'DESG1', title: 'Senior Developer' },
    { id: 'DESG2', title: 'HR Manager' }
  ],

  // ---- CRM MODULE ----
  leads: [
    { id: 'LD001', name: 'Acme Corp', email: 'info@acmecorp.com', phone: '+91 98765 11111', company: 'Acme Corporation', source: 'Website', status: 'New' },
    { id: 'LD002', name: 'Global Tech', email: 'sales@globaltech.io', phone: '+91 98765 22222', company: 'Global Tech Solutions', source: 'Referral', status: 'Contacted' },
    { id: 'LD003', name: 'Pinnacle Systems', email: 'lead@pinnacle.in', phone: '+91 98765 33333', company: 'Pinnacle Systems Pvt Ltd', source: 'LinkedIn', status: 'Qualified' },
    { id: 'LD004', name: 'CloudNine Labs', email: 'biz@cloudnine.dev', phone: '+91 98765 44444', company: 'CloudNine Labs', source: 'Cold Outreach', status: 'New' },
    { id: 'LD005', name: 'Vertex Analytics', email: 'hello@vertex.ai', phone: '+91 98765 55555', company: 'Vertex Analytics Inc', source: 'Trade Show', status: 'Converted' },
    { id: 'LD006', name: 'NovaTech', email: 'contact@novatech.com', phone: '+91 98765 66666', company: 'NovaTech Industries', source: 'Website', status: 'Lost' },
    { id: 'LD007', name: 'Skyline Ventures', email: 'partnerships@skyline.vc', phone: '+91 98765 77777', company: 'Skyline Venture Capital', source: 'Referral', status: 'Contacted' },
    { id: 'LD008', name: 'Quantum Software', email: 'info@quantumsw.com', phone: '+91 98765 88888', company: 'Quantum Software Pvt Ltd', source: 'LinkedIn', status: 'Qualified' },
  ],
  
  customers: [
    { id: 'CUST001', name: 'TechSolutions Inc', email: 'contact@techsolutions.com', phone: '+91 12345 67890', company: 'TechSolutions Inc', convertedFromLeadId: null, totalDeals: 3, totalValue: 250000 },
    { id: 'CUST002', name: 'Innovate LLC', email: 'hello@innovate.com', phone: '+91 09876 54321', company: 'Innovate LLC', convertedFromLeadId: null, totalDeals: 2, totalValue: 180000 },
    { id: 'CUST003', name: 'Vertex Analytics Inc', email: 'hello@vertex.ai', phone: '+91 98765 55555', company: 'Vertex Analytics Inc', convertedFromLeadId: 'LD005', totalDeals: 1, totalValue: 95000 },
    { id: 'CUST004', name: 'DataForge Systems', email: 'sales@dataforge.io', phone: '+91 88888 99999', company: 'DataForge Systems', convertedFromLeadId: null, totalDeals: 4, totalValue: 420000 },
    { id: 'CUST005', name: 'BrightPath Digital', email: 'info@brightpath.co', phone: '+91 77777 11111', company: 'BrightPath Digital', convertedFromLeadId: null, totalDeals: 1, totalValue: 65000 },
    { id: 'CUST006', name: 'Atlas Engineering', email: 'contact@atlaseng.in', phone: '+91 66666 22222', company: 'Atlas Engineering Pvt Ltd', convertedFromLeadId: null, totalDeals: 2, totalValue: 310000 },
  ],

  opportunities: [
    { id: 'OPP001', customerId: 'CUST001', value: 50000, stage: 'Proposal', expectedCloseDate: '2026-07-15', description: 'CRM integration package' },
    { id: 'OPP002', customerId: 'CUST002', value: 120000, stage: 'Negotiation', expectedCloseDate: '2026-07-20', description: 'Enterprise license renewal' },
    { id: 'OPP003', customerId: 'CUST004', value: 200000, stage: 'Discovery', expectedCloseDate: '2026-08-10', description: 'Data warehouse migration' },
    { id: 'OPP004', customerId: 'CUST003', value: 95000, stage: 'Closed Won', expectedCloseDate: '2026-06-30', description: 'AI analytics platform' },
    { id: 'OPP005', customerId: 'CUST006', value: 180000, stage: 'Proposal', expectedCloseDate: '2026-08-01', description: 'Infrastructure modernization' },
    { id: 'OPP006', customerId: 'CUST001', value: 75000, stage: 'Closed Lost', expectedCloseDate: '2026-06-15', description: 'Mobile app development' },
    { id: 'OPP007', customerId: 'CUST005', value: 65000, stage: 'Negotiation', expectedCloseDate: '2026-07-25', description: 'Digital marketing automation' },
    { id: 'OPP008', customerId: 'CUST004', value: 150000, stage: 'Closed Won', expectedCloseDate: '2026-06-20', description: 'Cloud migration phase 2' },
  ],
  
  followUps: [
    { id: 'FU001', customerId: 'CUST001', leadId: null, date: '2026-06-25', notes: 'Sent proposal, waiting for feedback on pricing tier', nextActionDate: '2026-07-02' },
    { id: 'FU002', leadId: 'LD002', customerId: null, date: '2026-06-28', notes: 'Initial discovery call completed — strong interest in CRM tools', nextActionDate: '2026-07-05' },
    { id: 'FU003', customerId: 'CUST004', leadId: null, date: '2026-07-01', notes: 'Demo scheduled for data warehouse solution', nextActionDate: '2026-07-08' },
    { id: 'FU004', leadId: 'LD007', customerId: null, date: '2026-07-03', notes: 'Follow-up email sent after trade show meeting', nextActionDate: '2026-07-10' },
    { id: 'FU005', customerId: 'CUST006', leadId: null, date: '2026-07-05', notes: 'Contract review in progress with legal team', nextActionDate: '2026-07-12' },
  ],

  // ---- INVENTORY ADDITIONS ----
  purchaseOrders: [
    { id: 'PO001', supplierId: 'SUP001', productId: 'PRD001', quantity: 50, orderDate: '2026-06-20', status: 'Delivered' }
  ],
  
  stockMovements: [
    { id: 'SM001', productId: 'PRD001', changeAmount: 50, reason: 'Restock', date: '2026-06-22' },
    { id: 'SM002', productId: 'PRD001', changeAmount: -5, reason: 'Sale', date: '2026-06-25' }
  ],

  // ---- PROJECTS ADDITIONS ----
  milestones: [
    { id: 'MS001', projectId: 'PRJ001', title: 'Phase 1 MVP', dueDate: '2026-06-30', status: 'Pending' },
    { id: 'MS002', projectId: 'PRJ001', title: 'UAT Testing', dueDate: '2026-07-15', status: 'Pending' }
  ],

  // ---- NEW SAKSHI REVIEW ADDITIONS ----
  authentications: [
    { id: 'AUTH001', userId: 'USER001', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy...', deviceInfo: 'Chrome on Windows', ipAddress: '127.0.0.1', isActive: true, expiresAt: '2026-07-10' }
  ],

  suppliers: [
    { id: 'SUP001', name: 'TechSupply Co.', contactPerson: 'John Doe', email: 'john@techsupply.com', phone: '+91 99999 88888', address: '44 Innovation St', city: 'Bangalore', country: 'India', status: 'Active' },
    { id: 'SUP002', name: 'GadgetHub', contactPerson: 'Jane Smith', email: 'jane@gadgethub.com', phone: '+91 77777 66666', address: '12 Commerce Rd', city: 'Mumbai', country: 'India', status: 'Active' }
  ],

  assignments: [
    { id: 'ASG001', taskId: 'TSK001', projectId: 'PRJ001', employeeId: 'EMP007', role: 'Database Architect', assignedAt: '2026-06-11' },
    { id: 'ASG002', taskId: 'TSK002', projectId: 'PRJ001', employeeId: 'EMP001', role: 'Lead Developer', assignedAt: '2026-06-12' }
  ]
};

// Lightweight persistence using localStorage
function saveData() { localStorage.setItem('erpDB', JSON.stringify(DB)); }
function loadData() {
  const saved = localStorage.getItem('erpDB');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge per-key so new default arrays (e.g. customers, leads) are not wiped
      // by old cached data that doesn't have them
      for (const key of Object.keys(parsed)) {
        if (parsed[key] !== undefined) {
          DB[key] = parsed[key];
        }
      }
    } catch(e) { /* use defaults */ }
  }
}

// Clear stale cache if it's missing new entities or CRM data is old format
(function migrateCache() {
  const saved = localStorage.getItem('erpDB');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // If cached data is missing new entities or CRM data lacks expanded fields, clear cache
      const needsMigration = !parsed.customers || !parsed.leads || !parsed.opportunities || 
        !parsed.authentications || !parsed.suppliers || !parsed.assignments ||
        (parsed.leads && parsed.leads.length > 0 && !parsed.leads[0].company) ||
        (parsed.customers && parsed.customers.length > 0 && parsed.customers[0].totalValue === undefined);
      if (needsMigration) {
        localStorage.removeItem('erpDB');
      }
    } catch(e) { localStorage.removeItem('erpDB'); }
  }
})();

loadData();
