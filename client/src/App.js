import { useEffect, useRef } from "react";
import socket from "./socket";

function App() {
  const videoRef = useRef(null);

  useEffect(() => {
    socket.emit("join-room", "room1");

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    .then(stream => {
      videoRef.current.srcObject = stream;
    })
    .catch(err => {
      console.error("Camera error:", err);
    });

  }, []);

  return (
    <div>
      <h2>My Camera</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "400px" }}
      />
    </div>
  );
}

export default App;
