import { useEffect, useState } from "react";
import api, { createEventSource } from "../lib/api";

export default function QueueBoard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ----- 1️⃣ Fetch initial board -----
    api.get("/board")
      .then((res) => {
        setQueue(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch board:", err);
        setError("Failed to load board");
        setLoading(false);
      });

    // ----- 2️⃣ Open SSE connection -----
    const sse = createEventSource("/stream/events");

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setQueue((prev) => [...prev, data]); // Append new event
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    sse.onerror = (err) => {
      console.error("SSE connection error:", err);
      sse.close(); // close on error to prevent spam
    };

    // ----- 3️⃣ Cleanup on unmount -----
    return () => sse.close();
  }, []);

  // ----- Render -----
  if (loading) return <p>Loading queue...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Queue Board</h2>
      <ul>
        {queue.map((item, idx) => (
          <li key={idx}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
}
