import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "/";

export function useSocket(token, studentId = null) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketRef.current.on("connect", () => {
      setConnected(true);
      if (studentId) {
        socketRef.current.emit("student:join", { studentId });
      }
    });

    socketRef.current.on("disconnect", () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, studentId]);

  return { socketRef, connected };
}
