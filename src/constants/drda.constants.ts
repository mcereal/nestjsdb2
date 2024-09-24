export enum DRDAConstants {
  // Code points
  EXCSAT = 0x1041, // Exchange Server Attributes
  EXTNAM = 0x115e, // External Name
  SRVCLSNM = 0x1147, // Server Class Name
  SRVRLSNM = 0x1159, // Server Release Name
  SRVNAM = 0x116d, // Server Name
  MGRLVLLS = 0x1404, // Manager Level List
  CCSIDSBC = 0x119c, // CCSID for SBCS
  ACCSEC = 0x106d, // Access Security
  SECCHK = 0x106e, // Security Check
  SECCHKCD = 0x11a4, // Security Check Code (corrected from 0x11A3)
  ACCRDB = 0x2001, // Access RDB
  RDBNAM = 0x2110, // Relational Database Name
  USRID = 0x11a0, // User ID
  PASSWORD = 0x11a1, // Password
  SECMEC = 0x11a2, // Security Mechanism
  SECTKN = 0x11dc, // Security Token
  PRDID = 0x112e, // Product ID
  SRVRLSLV = 0x115a, // Server Release Level
  // Managers and levels
  AGENT = 0x1403, // Agent Manager
  SQLAM = 0x2407, // SQLAM Manager
  RDB = 0x240f, // RDB Manager
  SECMGR = 0x1444, // Security Manager
  // Security mechanisms
  SECMEC_USRIDPWD = 0x03, // User ID and Password
  SECMEC_USRIDONL = 0x04, // User ID Only
  SECMEC_EUSRIDPWD = 0x09, // Encrypted User ID and Password
  // Response code points
  EXCSATRD = 0x1443, // Exchange Server Attributes Reply Data
  ACCSECRM = 0x14ac, // Access Security Reply Message
  SECCHKRM = 0x1219, // Security Check Reply Message
  RDBACCRD = 0x2201, // RDB Access Reply Data
  ACCRDBRM = 0x2205, // Access RDB Reply Message
  // Additional code points
  SVRCOD = 0x1149, // Severity Code
  RDBACCCL = 0x2107, // RDB Access Confirmation Code
  PRCCNVRM = 0x1254, // Protocol Conversion Reply Message
  SQLERRRM = 0x2408, // SQL Error Reply Message (corrected from 0x1245)
  // SQL related code points
  EXCSQLSET = 0x2415, // Execute SQL Statement with Parameters
  SQLCARD = 0x121b, // SQL Communications Area Reply Data
  RSMD = 0x2411, // Result Set Metadata
  QRYDTA = 0x2412, // Query Data
  // Newly added or corrected code points
  SQLATTR = 0x1c01, // SQL Attribute
  PKGID = 0x2112, // Package Identifier

  // 0xd043 to mark Chained Request Data Stream (CHNRQSDSS).
  CHNRQSDSS = 0xd043,
}
