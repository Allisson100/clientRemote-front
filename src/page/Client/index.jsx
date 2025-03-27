import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://42f2-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function Client() {
  const { roomId } = useParams();
  const videoRef = useRef(null);

  useEffect(() => {
    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      alert("Sala não está mais disponível!");
    });

    // Recebendo a transmissão da tela
    socket.on("screenShareSignal", (track) => {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(track);
      videoRef.current.srcObject = mediaStream;
    });

    // Parar a exibição caso o host desligue a tela
    socket.on("screenShareStopped", () => {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    });
  }, [roomId]);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Cliente Conectado na Sala {roomId}</h1>
      <p>Arraste o dedo na tela para controlar o mouse do Host.</p>

      <video
        ref={videoRef}
        autoPlay
        style={{ width: "90vw", border: "2px solid black" }}
      ></video>
    </div>
  );
}
