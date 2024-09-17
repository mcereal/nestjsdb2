import { Db2Client } from "../src/db/db2-client";
import { Db2ConfigOptions } from "../src/interfaces";
import { Db2ConnectionState } from "../src/enums";
import * as ibmdb from "ibm_db";
import { Logger } from "@nestjs/common";

jest.mock("ibm_db", () => ({
  Pool: function () {
    return {
      open: jest
        .fn()
        .mockImplementationOnce((connStr, callback) => {
          callback(new Error("Connection error"), null); // First attempt fails
        })
        .mockImplementationOnce((connStr, callback) => {
          callback(new Error("Connection error"), null); // Second attempt fails
        })
        .mockImplementation((connStr, callback) => {
          const connection = {
            setAutoCommit: jest.fn().mockResolvedValue(undefined),
          };
          callback(null, connection); // Third attempt succeeds
        }),
      close: jest.fn(),
      closeAll: jest.fn(),
      getPoolStatus: jest.fn().mockReturnValue({ availablePoolSize: 1 }),
    };
  },
  Connection: function () {
    return {
      prepareSync: jest.fn().mockReturnValue({
        setQueryTimeout: jest.fn(),
        setAttr: jest.fn(),
        execute: jest.fn((params, callback) => callback(null, { rows: [] })),
        closeSync: jest.fn(),
      }),
      setAutoCommit: jest.fn().mockReturnValue(undefined), // Mock the setAutoCommit to do nothing
    };
  },
}));

describe("Db2Client", () => {
  let db2Client: Db2Client;
  let mockConfig: Db2ConfigOptions;
  let mockPool: any;
  let mockConnection: any;

  beforeEach(() => {
    mockConfig = {
      host: "localhost",
      port: 50000,
      database: "testdb",
      auth: {
        authType: "password",
        username: "testuser",
        password: "testpassword",
      },
      retry: {
        maxReconnectAttempts: 3, // Limit retries to prevent infinite loop
        reconnectInterval: 1000,
      },
    };

    mockPool = new ibmdb.Pool();
    mockConnection = new ibmdb.Connection();

    db2Client = new Db2Client(mockConfig);
    (db2Client as any).pool = mockPool; // Inject the mock pool directly
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with the correct configuration", () => {
    expect(db2Client.getConfig()).toEqual(expect.objectContaining(mockConfig));
  });

  it("should connect to the database successfully", async () => {
    (mockPool.open as jest.Mock).mockImplementation((_, callback) => {
      callback(null, mockConnection); // Simulate successful connection
    });

    await db2Client.connect();

    expect(mockPool.open).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function)
    );
    expect(db2Client.getState()).toBe(Db2ConnectionState.CONNECTED);
  });

  it("should handle connection errors and retry before failing", async () => {
    // Adjust mock to simulate connection failure and subsequent retry
    (mockPool.open as jest.Mock)
      .mockImplementationOnce((_, callback) =>
        callback(new Error("Connection error"), null)
      ) // First attempt fails
      .mockImplementationOnce((_, callback) =>
        callback(new Error("Connection error"), null)
      ) // Second attempt fails
      .mockImplementationOnce((_, callback) => callback(null, mockConnection)); // Third attempt succeeds

    await db2Client.connect();

    expect(mockPool.open).toHaveBeenCalledTimes(3); // Expect 3 attempts
    expect(db2Client.getState()).toBe(Db2ConnectionState.CONNECTED);
  });

  it("should handle connection errors and fail after all retries", async () => {
    (mockPool.open as jest.Mock).mockImplementation((_, callback) => {
      callback(new Error("Connection error"), null);
    });

    await expect(db2Client.connect()).rejects.toThrow(
      "All reconnection attempts failed. No failover host configured."
    );
    expect(db2Client.getState()).toBe(Db2ConnectionState.ERROR);
    expect(mockPool.open).toHaveBeenCalledTimes(3); // Matches maxReconnectAttempts
  });

  it("should transition through correct states during successful connection", async () => {
    (mockPool.open as jest.Mock).mockImplementation((_, callback) => {
      callback(null, mockConnection); // Simulate successful connection
    });

    await db2Client.connect();

    expect(db2Client.getState()).toBe(Db2ConnectionState.CONNECTED);
  });

  it("should handle setting auto-commit mode successfully", async () => {
    (mockPool.open as jest.Mock).mockImplementation((_, callback) => {
      callback(null, mockConnection); // Simulate successful connection
    });

    await db2Client.connect();

    expect(mockConnection.setAutoCommit).toHaveBeenCalledWith(true);
    expect(db2Client.getState()).toBe(Db2ConnectionState.CONNECTED);
  });

  it("should handle idle timeout and attempt to reconnect", async () => {
    // Simulate successful connection and then idle timeout
    (mockPool.open as jest.Mock)
      .mockImplementationOnce((_, callback) => callback(null, mockConnection)) // Initial connection success
      .mockImplementationOnce((_, callback) =>
        callback(new Error("Connection error"), null)
      ); // Fail on reconnect

    await db2Client.connect(); // Initial connect
    await db2Client["checkIdleTimeout"](); // Trigger idle timeout check

    expect(mockPool.open).toHaveBeenCalledTimes(2); // Initial connection + reconnect
    expect(db2Client.getState()).toBe(Db2ConnectionState.ERROR);
  });

  // Additional tests to verify different aspects of Db2Client...
});
