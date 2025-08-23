/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Connection } from "mongoose";

interface MongoDBConnection {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

const MONGO_URI = process.env.DATABASE_URL!;

if (!MONGO_URI) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

let cached: MongoDBConnection = (global as any).mongoose || {
  conn: null,
  promise: null,
};

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

async function connectDb(): Promise<Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error("Error connecting to database:", error);
    throw new Error(`Database connection failed: ${error}`);
  }
}

export default connectDb;
