// MongoDB initialization script for HawkEye Brand Protection

// Create database and collections
db = db.getSiblingDB('hawkeye_brand_protection');

// Create collections
db.createCollection('users');
db.createCollection('domains');
db.createCollection('alerts');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });

db.domains.createIndex({ "userId": 1 });
db.domains.createIndex({ "name": 1 });
db.domains.createIndex({ "status": 1 });
db.domains.createIndex({ "lastScan": 1 });
db.domains.createIndex({ "riskScore": 1 });

db.alerts.createIndex({ "userId": 1 });
db.alerts.createIndex({ "domainId": 1 });
db.alerts.createIndex({ "type": 1 });
db.alerts.createIndex({ "severity": 1 });
db.alerts.createIndex({ "status": 1 });
db.alerts.createIndex({ "createdAt": 1 });
db.alerts.createIndex({ "resolvedAt": 1 });

// Create compound indexes for common queries
db.alerts.createIndex({ "userId": 1, "createdAt": -1 });
db.alerts.createIndex({ "userId": 1, "severity": 1 });
db.alerts.createIndex({ "domainId": 1, "createdAt": -1 });
db.domains.createIndex({ "userId": 1, "status": 1 });

// Create text indexes for search functionality
db.alerts.createIndex({ "title": "text", "description": "text" });
db.domains.createIndex({ "name": "text" });

// Insert default admin user (password: admin123)
db.users.insertOne({
  username: "admin",
  email: "admin@hawkeye.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8e", // admin123
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert sample domain for testing
db.domains.insertOne({
  userId: db.users.findOne({ email: "admin@hawkeye.com" })._id,
  name: "example.com",
  status: "active",
  riskScore: 25,
  scanInterval: 6,
  lastScan: new Date(),
  nextScan: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
  whoisInfo: {
    registrar: "Example Registrar",
    creationDate: new Date("2020-01-01"),
    expirationDate: new Date("2025-01-01"),
    status: "active"
  },
  dnsInfo: {
    a: ["93.184.216.34"],
    mx: ["mail.example.com"],
    ns: ["ns1.example.com", "ns2.example.com"]
  },
  sslInfo: {
    valid: true,
    issuer: "Let's Encrypt",
    validFrom: new Date("2023-01-01"),
    validTo: new Date("2024-01-01")
  },
  threatIntelligence: {
    virustotalScore: 0,
    shodanResults: [],
    riskFactors: []
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert sample alerts
const sampleAlerts = [
  {
    userId: db.users.findOne({ email: "admin@hawkeye.com" })._id,
    domainId: db.domains.findOne({ name: "example.com" })._id,
    title: "Suspicious domain detected",
    description: "A domain similar to example.com was found on a suspicious website",
    type: "domain",
    severity: "medium",
    status: "open",
    source: "manual_scan",
    metadata: {
      suspiciousDomain: "examp1e.com",
      similarity: 0.95
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: db.users.findOne({ email: "admin@hawkeye.com" })._id,
    domainId: db.domains.findOne({ name: "example.com" })._id,
    title: "Brand mention on dark web",
    description: "Brand name found in dark web marketplace",
    type: "dark_web",
    severity: "high",
    status: "open",
    source: "dark_web_scan",
    metadata: {
      marketplace: "sample_marketplace",
      url: "http://sample.onion",
      content: "Sample brand mention"
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
];

db.alerts.insertMany(sampleAlerts);

print("HawkEye Brand Protection database initialized successfully!");
print("Default admin user created: admin@hawkeye.com / admin123");
print("Sample domain and alerts added for testing"); 