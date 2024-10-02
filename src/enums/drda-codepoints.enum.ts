export enum DRDACodePoints {
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
  // SRVRLSLV = 0x114A,
  // SRVRLSLV = 0x1147,
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
  CHRNRQSDSS = 0xd043, // Chained Request Data Stream

  EXCSQLPREP = 0x2416, // Execute SQL Prepare
  EXCSQLPREPRM = 0x2417, // Execute SQL Prepare Reply Message
  STMTHDL = 0x2418, // Statement Handle
  EXCSQLEXPRQ = 0x2419, // Execute SQL Statement Request
  PARAM = 0x241a, // Parameter Marker Data
  CLOSESTM = 0x241b, // Close Statement

  CMDCOLNAM = 0x2404, // Command Column Name
  CMDCOLDAT = 0x2405, // Command Column Data
  CMDCOLLEN = 0x2406, // Command Column Length
  CMDCOLNUL = 0x2407, // Command Column Null

  // Server Public Key
  SRVCLSNM_PK = 0x1148, // Server Class Name Public Key
  ODBC_ERROR = 0xf289,
  CLOSESTM_RM = 0x241b, // Close Statement Reply Message

  MSG_TEXT = 0x2409, // Message Text
  SERVER_KEY = 0x11d3, // Server Public Key
  SERVER_VERSION = 0x11d4, // Server Version
  RESULT_SET = 0x2411, // Result Set
  COLNAM = 0x2404, // Column Name
  TYPID = 0x2405, // Type ID
  LENGTH = 0x2406, // Length
  SCALE = 0x2407, // Scale
  NULLS = 0x2408, // Nulls
  PARAMETER = 0x241a, // Parameter
  EXCSQLEXP = 0x2419, // Execute SQL Statement Request
}

export enum DRDAMessageTypes {
  EXCSAT = 'EXCSAT',
  EXTNAM = 'EXTNAM',
  CHNRQSDSS = 'CHNRQSDSS',
  CHRNRQSDSS = 'CHRNRQSDSS',
  EXCSATRD = 'EXCSATRD',
  ACCSECRM = 'ACCSECRM',
  SECCHKRM = 'SECCHKRM',
  ACCRDBRM = 'ACCRDBRM',
  EXCSQLSET = 'EXCSQLSET',
  SECCHK = 'SECCHK',
  ACCRDB = 'ACCRDB',
  RDBACCRD = 'RDBACCRD',
  PRCCNVRM = 'PRCCNVRM',
  SQLERRRM = 'SQLERRRM',
  EXCSQLPREP = 'EXCSQLPREP',
  EXCSQLPREPRM = 'EXCSQLPREPRM',
  STMTHDL = 'STMTHDL',
  EXCSQLEXPRQ = 'EXCSQLEXPRQ',
  PARAM = 'PARAM',
  CLOSESTM = 'CLOSESTM',
  SQLATTR = 'SQLATTR',
  PKGID = 'PKGID',
  SQLCARD = 'SQLCARD',
  RSMD = 'RSMD',
  QRYDTA = 'QRYDTA',
  CMDCOLNAM = 'CMDCOLNAM',
  CMDCOLDAT = 'CMDCOLDAT',
  CMDCOLLEN = 'CMDCOLLEN',
  CMDCOLNUL = 'CMDCOLNUL',
  SRVCLSNM_PK = 'SRVCLSNM_PK',
  CLOSESTM_RM = 'CLOSESTM_RM',
  MSG_TEXT = 'MSG_TEXT',
  SERVER_KEY = 'SERVER_KEY',
  SERVER_VERSION = 'SERVER_VERSION',
  RESULT_SET = 'RESULT_SET',
  SVRCOD = 'SRV_COD',
  UNKNOWN = 'UNKNOWN',
  ODBC_ERROR = 'ODBC_ERROR',
}

export enum DB2DataTypes {
  // Character Types
  CHAR = 0x0001, // Fixed-length character string
  VARCHAR = 0x000e, // Variable-length character string
  CLOB = 0x0016, // Character Large Object

  // Binary Types
  BINARY = 0x0002, // Fixed-length binary string
  VARBINARY = 0x0003, // Variable-length binary string
  BLOB = 0x0015, // Binary Large Object

  // Numeric Types
  SMALLINT = 0x0004, // 2-byte signed integer
  INTEGER = 0x0005, // 4-byte signed integer
  REAL = 0x0006, // Single-precision floating-point
  FLOAT = 0x0007, // Double-precision floating-point (commonly used as FLOAT)
  DOUBLE = 0x0008, // Alias for FLOAT or double-precision floating-point
  DECIMAL = 0x000f, // Exact numeric with fixed decimal point
  NUMERIC = 0x000f, // Alias for DECIMAL

  // Date and Time Types
  DATE = 0x0010, // Calendar date
  TIME = 0x0011, // Time of day
  TIMESTAMP = 0x0012, // Combination of date and time

  // Large Object Types
  DBCLOB = 0x0017, // Double-byte Character Large Object

  // Other Data Types
  BOOLEAN = 0x0014, // Boolean type (if supported)
  XML = 0x0018, // XML data type
  JSON = 0x0019, // JSON data type (if supported)
  ARRAY = 0x001a, // Array data type (if supported)
  STRUCT = 0x001b, // Structured data type (if supported)

  // User-Defined Types
  UDT = 0x001c, // User-Defined Type
}
